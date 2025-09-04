"use client";
import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

type Props = {
  file?: File | null;
  onReadyAction?: (ws: WaveSurfer) => void;
  onTimeUpdateAction?: (t: number) => void;
};

export default function Waveform({ file, onReadyAction, onTimeUpdateAction }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 80,
      waveColor: "#cbd5e1",     // light gray
      progressColor: "#0ea5e9", // sky blue
      cursorColor: "#0f172a",   // dark gray cursor
      cursorWidth: 2,
      barWidth: 2,
      barRadius: 2,
      normalize: true,
    });
    wsRef.current = ws;
    ws.on("ready", () => onReadyAction?.(ws));
    ws.on("timeupdate", (t) => onTimeUpdateAction?.(t));
    return () => ws.destroy();
  }, [onReadyAction, onTimeUpdateAction]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.empty();
    if (!file) return;
    ws.loadBlob(file);
  }, [file]);

  return <div ref={containerRef} className="w-full" />;
}
