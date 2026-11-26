export const fmtSec = (s: number, digits = 2) => `${s.toFixed(digits)} dtk`;

/** m:ss.cc */
export function fmtClock(s: number): string {
  const safe = Math.max(0, s);
  const m = Math.floor(safe / 60);
  const rest = safe - m * 60;
  return `${m}:${rest.toFixed(2).padStart(5, '0')}`;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Parse "+10%" ⇄ 10 for the rate slider. */
export const rateToPercent = (rate: string) => Number.parseInt(rate, 10) || 0;
export const percentToRate = (p: number) => `${p >= 0 ? '+' : ''}${Math.round(p)}%`;
