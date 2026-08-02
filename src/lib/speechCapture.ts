import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";

export type SpeechHandler = (text: string) => void;
export type ErrorHandler = (message: string) => void;
export type VolumeHandler = (level: number) => void;
export type ListeningHandler = (listening: boolean) => void;

export interface SpeechCapture {
  start(language: string): Promise<void>;
  stop(): Promise<void>;
  onResult(handler: SpeechHandler): () => void;
  onInterimResult(handler: SpeechHandler): () => void;
  onError(handler: ErrorHandler): () => void;
  onVolumeLevel(handler: VolumeHandler): () => void;
  onListeningChange(handler: ListeningHandler): () => void;
}

class HandlerRegistry {
  final = new Set<SpeechHandler>();
  interim = new Set<SpeechHandler>();
  errors = new Set<ErrorHandler>();
  volume = new Set<VolumeHandler>();
  listening = new Set<ListeningHandler>();

  subscribe<T>(set: Set<T>, handler: T) {
    set.add(handler);
    return () => set.delete(handler);
  }
}

export class BrowserSpeechCapture implements SpeechCapture {
  private recognition: SpeechRecognition | null = null;
  private readonly handlers = new HandlerRegistry();

  async start(language: string) {
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition)
      throw new Error("Speech recognition is not supported in this browser.");

    this.recognition = new Recognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = language;
    this.recognition.onresult = (event) => {
      let interim = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          this.handlers.final.forEach((handler) => handler(transcript.trim()));
        } else {
          interim += transcript;
        }
      }
      this.handlers.interim.forEach((handler) => handler(interim.trim()));
    };
    this.recognition.onerror = (event) => {
      this.handlers.errors.forEach((handler) =>
        handler(event.message || event.error),
      );
    };
    this.recognition.onend = () => {
      this.handlers.listening.forEach((handler) => handler(false));
    };
    this.recognition.start();
    this.handlers.listening.forEach((handler) => handler(true));
  }

  async stop() {
    this.recognition?.stop();
    this.recognition = null;
  }

  onResult(handler: SpeechHandler) {
    return this.handlers.subscribe(this.handlers.final, handler);
  }

  onInterimResult(handler: SpeechHandler) {
    return this.handlers.subscribe(this.handlers.interim, handler);
  }

  onError(handler: ErrorHandler) {
    return this.handlers.subscribe(this.handlers.errors, handler);
  }

  onVolumeLevel(handler: VolumeHandler) {
    return this.handlers.subscribe(this.handlers.volume, handler);
  }

  onListeningChange(handler: ListeningHandler) {
    return this.handlers.subscribe(this.handlers.listening, handler);
  }
}

export class NativeSpeechCapture implements SpeechCapture {
  private readonly handlers = new HandlerRegistry();
  private listeners: PluginListenerHandle[] = [];

  private async removePluginListeners() {
    const listeners = this.listeners;
    this.listeners = [];
    await Promise.all(listeners.map((listener) => listener.remove()));
  }

  async start(language: string) {
    await this.removePluginListeners();
    const availability = await SpeechRecognition.available();
    if (!availability.available)
      throw new Error("Native speech recognition is unavailable.");

    const permission = await SpeechRecognition.requestPermissions();
    if (permission.speechRecognition !== "granted") {
      throw new Error("Speech recognition permission was denied.");
    }

    try {
      this.listeners.push(
        await SpeechRecognition.addListener("partialResults", ({ matches }) => {
          const text = matches?.[0]?.trim() ?? "";
          this.handlers.interim.forEach((handler) => handler(text));
        }),
      );
      this.listeners.push(
        await SpeechRecognition.addListener("volumeLevel", ({ level }) => {
          const normalizedLevel = Math.max(0, Math.min(1, level));
          this.handlers.volume.forEach((handler) => handler(normalizedLevel));
        }),
      );
      this.listeners.push(
        await SpeechRecognition.addListener("speechError", ({ message }) => {
          this.handlers.errors.forEach((handler) => handler(message));
          this.handlers.volume.forEach((handler) => handler(0));
          void this.removePluginListeners();
        }),
      );
      this.listeners.push(
        await SpeechRecognition.addListener("listeningState", ({ status }) => {
          const listening = status === "started";
          this.handlers.listening.forEach((handler) => handler(listening));
          if (!listening) {
            this.handlers.volume.forEach((handler) => handler(0));
            void this.removePluginListeners();
          }
        }),
      );
      const result = await SpeechRecognition.start({
        language,
        maxResults: 1,
        partialResults: true,
        popup: false,
      });
      const finalText = result.matches?.[0]?.trim();
      if (finalText)
        this.handlers.final.forEach((handler) => handler(finalText));
    } catch (error) {
      await this.removePluginListeners();
      throw error;
    }
  }

  async stop() {
    await SpeechRecognition.stop();
    this.handlers.volume.forEach((handler) => handler(0));
    await this.removePluginListeners();
  }

  onResult(handler: SpeechHandler) {
    return this.handlers.subscribe(this.handlers.final, handler);
  }

  onInterimResult(handler: SpeechHandler) {
    return this.handlers.subscribe(this.handlers.interim, handler);
  }

  onError(handler: ErrorHandler) {
    return this.handlers.subscribe(this.handlers.errors, handler);
  }

  onVolumeLevel(handler: VolumeHandler) {
    return this.handlers.subscribe(this.handlers.volume, handler);
  }

  onListeningChange(handler: ListeningHandler) {
    return this.handlers.subscribe(this.handlers.listening, handler);
  }
}

export function createSpeechCapture(): SpeechCapture {
  return Capacitor.isNativePlatform()
    ? new NativeSpeechCapture()
    : new BrowserSpeechCapture();
}
