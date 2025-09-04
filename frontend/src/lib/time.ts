export function timeToSeconds(ts: string): number {
  const m = ts.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
  if (!m) return 0;
  const [, hh, mm, ss, ms] = m.map(Number) as unknown as number[];
  return hh * 3600 + mm * 60 + ss + Number(ms) / 1000;
}

export function secondsToTime(sec: number): string {
  const s = Math.max(0, sec);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}.${pad(ms, 3)}`;
}
