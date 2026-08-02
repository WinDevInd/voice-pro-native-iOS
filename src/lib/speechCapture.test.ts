import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserSpeechCapture, NativeSpeechCapture } from "./speechCapture";

const nativePlugin = vi.hoisted(() => ({
  available: vi.fn(),
  requestPermissions: vi.fn(),
  addListener: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("@capacitor-community/speech-recognition", () => ({
  SpeechRecognition: nativePlugin,
}));

class MockRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

describe("BrowserSpeechCapture", () => {
  let recognition: MockRecognition;

  beforeEach(() => {
    recognition = new MockRecognition();
    window.SpeechRecognition = vi.fn(
      () => recognition,
    ) as unknown as SpeechRecognitionConstructor;
  });

  it("configures recognition and emits final and interim results", async () => {
    const capture = new BrowserSpeechCapture();
    const onFinal = vi.fn();
    const onInterim = vi.fn();
    capture.onResult(onFinal);
    capture.onInterimResult(onInterim);

    await capture.start("en-GB");
    expect(recognition.lang).toBe("en-GB");
    expect(recognition.continuous).toBe(true);
    expect(recognition.start).toHaveBeenCalled();

    recognition.onresult?.({
      resultIndex: 0,
      results: {
        0: { 0: { transcript: "finished thought" }, isFinal: true },
        1: { 0: { transcript: "still speaking" }, isFinal: false },
        length: 2,
      },
    } as unknown as SpeechRecognitionEvent);

    expect(onFinal).toHaveBeenCalledWith("finished thought");
    expect(onInterim).toHaveBeenCalledWith("still speaking");
  });
});

describe("NativeSpeechCapture", () => {
  const listeners = new Map<string, (data: never) => void>();
  const removeListeners = vi.fn();

  beforeEach(() => {
    listeners.clear();
    removeListeners.mockReset();
    nativePlugin.available.mockResolvedValue({ available: true });
    nativePlugin.requestPermissions.mockResolvedValue({
      speechRecognition: "granted",
    });
    nativePlugin.addListener.mockImplementation(
      (eventName: string, listener: (data: never) => void) => {
        listeners.set(eventName, listener);
        return Promise.resolve({ remove: removeListeners });
      },
    );
    nativePlugin.start.mockResolvedValue({});
    nativePlugin.stop.mockResolvedValue(undefined);
  });

  it("emits normalized native volume and removes plugin listeners on stop", async () => {
    const capture = new NativeSpeechCapture();
    const onVolume = vi.fn();
    capture.onVolumeLevel(onVolume);

    await capture.start("en-US");
    listeners.get("listeningState")?.({ status: "started" } as never);
    listeners.get("volumeLevel")?.({ level: 1.4 } as never);
    listeners.get("volumeLevel")?.({ level: -0.2 } as never);

    expect(onVolume).toHaveBeenNthCalledWith(1, 1);
    expect(onVolume).toHaveBeenNthCalledWith(2, 0);

    await capture.stop();
    expect(nativePlugin.stop).toHaveBeenCalled();
    expect(removeListeners).toHaveBeenCalledTimes(4);
    expect(onVolume).toHaveBeenLastCalledWith(0);
  });
});
