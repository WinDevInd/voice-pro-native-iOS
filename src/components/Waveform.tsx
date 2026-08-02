import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";

interface WaveformProps {
  active: boolean;
}

export function Waveform({ active }: WaveformProps) {
  const [levels, setLevels] = useState(() =>
    Array.from({ length: 28 }, () => 0.12),
  );
  const frame = useRef<number>();

  useEffect(() => {
    if (!active) {
      setLevels(Array.from({ length: 28 }, () => 0.12));
      return;
    }

    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;

    const animateFallback = () => {
      setLevels((current) =>
        current.map(
          (_, index) =>
            0.18 + Math.abs(Math.sin(Date.now() / 180 + index)) * 0.46,
        ),
      );
      frame.current = requestAnimationFrame(animateFallback);
    };

    const begin = async () => {
      if (
        Capacitor.isNativePlatform() ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        animateFallback();
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 64;
        context.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const animate = () => {
          analyser.getByteFrequencyData(data);
          setLevels(
            Array.from({ length: 28 }, (_, index) =>
              Math.max(0.1, data[index] / 255),
            ),
          );
          frame.current = requestAnimationFrame(animate);
        };
        animate();
      } catch {
        animateFallback();
      }
    };

    void begin();
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      stream?.getTracks().forEach((track) => track.stop());
      void context?.close();
    };
  }, [active]);

  return (
    <div
      className="waveform"
      aria-label={active ? "Live microphone level" : "Microphone idle"}
    >
      {levels.map((level, index) => (
        <span key={index} style={{ transform: `scaleY(${level})` }} />
      ))}
    </div>
  );
}
