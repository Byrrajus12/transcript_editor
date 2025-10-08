"use client";
import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

type Props = {
  file?: string | File | null;
  onReadyAction?: (ws: WaveSurfer) => void;
  onTimeUpdateAction?: (t: number) => void;
};

export default function Waveform({ file, onReadyAction, onTimeUpdateAction }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);

  // Create WaveSurfer only once
  useEffect(() => {
    if (!containerRef.current || wsRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 80,
      waveColor: "#cbd5e1",
      progressColor: "#0ea5e9",
      cursorColor: "#0f172a",
      cursorWidth: 2,
      barWidth: 2,
      barRadius: 2,
      normalize: true,
    });
    wsRef.current = ws;
    ws.on("ready", () => onReadyAction?.(ws));
    ws.on("timeupdate", (t) => onTimeUpdateAction?.(t));

    return () => {
      // Guard destroy so it doesn't cancel an in-flight load
      try {
        wsRef.current?.destroy();
        wsRef.current = null;
      } catch (err) {
        console.warn("WaveSurfer cleanup skipped:", err);
      }
    };
  }, []); // only once

  // Load new file when it changes
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.empty();

    if (!file) return;
    if (typeof file === "string") {
      ws.load(file).catch(() => {}); // prevent AbortError logs
    } else {
      ws.loadBlob(file).catch(() => {});
    }
  }, [file]);

  return <div ref={containerRef} className="w-full" />;
}
