import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserSpeechCapture } from "./speechCapture";

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
