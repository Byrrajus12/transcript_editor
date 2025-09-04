import { timeToSeconds, secondsToTime } from "./time";

export type Segment = {
  id: string;
  speaker: string;
  start: number;
  end: number;
  text: string;
};

const LINE_RE = /^\s*\[(SPEAKER_\d+)]\s+\[(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})]:\s*(.+?)\s*$/;

export function parseTranscript(raw: string): Segment[] {
  const lines = raw.split(/\r?\n/);
  const out: Segment[] = [];
  let i = 0;
  for (const line of lines) {
    const m = line.match(LINE_RE);
    if (!m) continue;
    const [, speaker, startStr, endStr, text] = m;
    out.push({
      id: `seg_${i++}`,
      speaker,
      start: timeToSeconds(startStr),
      end: timeToSeconds(endStr),
      text: text.trim(),
    });
  }
  return out;
}

export function serializeTXT(segments: Segment[]): string {
  return segments
    .map(
      (s) =>
        `[${s.speaker}] [${secondsToTime(s.start)} --> ${secondsToTime(s.end)}]: ${s.text}`
    )
    .join("\n");
}
