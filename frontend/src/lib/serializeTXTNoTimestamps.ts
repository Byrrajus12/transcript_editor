import { Segment } from "./parseTranscript";

export function serializeTXTNoTimestamps(segments: Segment[]): string {
  return segments
    .map((s) => `[${s.speaker}]: ${s.text}`)
    .join("\n");
}
