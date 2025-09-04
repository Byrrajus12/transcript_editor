"use client";
import { useEffect, useMemo, useRef } from "react";
import type { Segment } from "@/lib/parseTranscript";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  segments: Segment[];
  currentTime: number;
  onChangeAction: (segments: Segment[]) => void;
  onSeekAction: (t: number) => void;
};

export default function TranscriptEditor({
  segments,
  currentTime,
  onChangeAction,
  onSeekAction,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeId = useMemo(() => {
    const s = segments.find((x) => currentTime >= x.start && currentTime < x.end);
    return s?.id;
  }, [segments, currentTime]);

  useEffect(() => {
    if (!activeId || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLDivElement>(`[data-id="${activeId}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const handleEdit = (id: string, field: "text" | "speaker", value: string) => {
    const next = segments.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    onChangeAction(next);
  };

  return (
    <div ref={containerRef} className="max-h-[420px] overflow-auto p-3 space-y-3">
      {segments.map((s) => (
        <div
          key={s.id}
          data-id={s.id}
          onClick={() => onSeekAction(s.start)}
          className={cn(
            "p-3 rounded-md cursor-pointer space-y-2 border border-gray-200 bg-white shadow-sm",
            s.id === activeId && "border-sky-400 bg-sky-50"
          )}
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Input
              value={s.speaker}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleEdit(s.id, "speaker", e.target.value)}
              className="w-28"
            />
            <span>
              [{fmt(s.start)} → {fmt(s.end)}]
            </span>
          </div>
          <textarea
            value={s.text}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleEdit(s.id, "text", e.target.value)}
            onInput={e => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
            style={{ overflow: 'hidden' }}
            className="w-full bg-white text-sm border border-gray-200 rounded-md p-3 resize-none focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </div>
      ))}
    </div>
  );
}

const fmt = (t: number) => {
  const hh = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  const ss = Math.floor(t % 60);
  const ms = Math.floor((t - Math.floor(t)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}.${String(ms).padStart(3, "0")}`;
};
