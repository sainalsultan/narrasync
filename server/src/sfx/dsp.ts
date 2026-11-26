/**
 * Tiny offline DSP toolkit used to synthesise the built-in effects.
 * Everything is deterministic (seeded noise) so renders are reproducible.
 */

export const SAMPLE_RATE = 44100;

export type Wave = 'sine' | 'square' | 'saw' | 'triangle';
/** Constant frequency or a function of local time (seconds). */
export type Freq = number | ((t: number) => number);

export interface Envelope {
  /** Linear attack time (s). */
  attack?: number;
  /** Exponential decay time constant (s). Infinity = sustain. */
  decay?: number;
  /** Optional custom amplitude shape over normalised time 0..1 (overrides attack/decay). */
  shape?: (u: number) => number;
}

export function createBuffer(seconds: number): Float32Array {
  return new Float32Array(Math.ceil(seconds * SAMPLE_RATE));
}

/** Mulberry32 PRNG → values in [-1, 1). */
export function noiseSource(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1;
  };
}

/** Exponential glide between two frequencies over `dur` seconds. */
export const glide = (from: number, to: number, dur: number) => (t: number) =>
  from * Math.pow(to / from, Math.min(1, t / dur));

function envelopeAt(env: Envelope, t: number, dur: number): number {
  const u = t / dur;
  // 4 ms fade-out at the end of every event avoids clicks.
  const tail = Math.min(1, (dur - t) / 0.004);
  if (env.shape) return env.shape(u) * tail;
  const attack = env.attack ?? 0.002;
  const a = attack > 0 ? Math.min(1, t / attack) : 1;
  const decay = env.decay ?? Infinity;
  const d = Number.isFinite(decay) ? Math.exp(-Math.max(0, t - attack) / decay) : 1;
  return a * d * tail;
}

function oscillator(wave: Wave, phase: number): number {
  const p = phase - Math.floor(phase); // 0..1
  switch (wave) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'saw':
      return 2 * p - 1;
    case 'triangle':
      return 1 - 4 * Math.abs(p - 0.5);
  }
}

export interface ToneOptions extends Envelope {
  start?: number;
  dur: number;
  freq: Freq;
  amp?: number;
  wave?: Wave;
}

/** Mix an oscillator event into `out`. */
export function addTone(out: Float32Array, o: ToneOptions): void {
  const startIdx = Math.round((o.start ?? 0) * SAMPLE_RATE);
  const n = Math.round(o.dur * SAMPLE_RATE);
  const amp = o.amp ?? 1;
  const wave = o.wave ?? 'sine';
  const freq = typeof o.freq === 'number' ? () => o.freq as number : o.freq;
  let phase = 0;
  for (let i = 0; i < n && startIdx + i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    out[startIdx + i]! += oscillator(wave, phase) * envelopeAt(o, t, o.dur) * amp;
    phase += freq(t) / SAMPLE_RATE;
  }
}

export interface NoiseOptions extends Envelope {
  start?: number;
  dur: number;
  amp?: number;
  seed?: number;
  /** One-pole low-pass cutoff (Hz). */
  lowpass?: number;
  /** One-pole high-pass cutoff (Hz). */
  highpass?: number;
  /** Time-varying band-pass centre (Hz) — state-variable filter. */
  bandpass?: Freq;
  /** Band-pass resonance, 0.1 (wide) .. 1 (narrow). */
  q?: number;
}

const onePoleCoef = (fc: number) => 1 - Math.exp((-2 * Math.PI * fc) / SAMPLE_RATE);

/** Mix a filtered noise event into `out`. */
export function addNoise(out: Float32Array, o: NoiseOptions): void {
  const startIdx = Math.round((o.start ?? 0) * SAMPLE_RATE);
  const n = Math.round(o.dur * SAMPLE_RATE);
  const amp = o.amp ?? 1;
  const rnd = noiseSource(o.seed ?? 1);
  const lpA = o.lowpass ? onePoleCoef(o.lowpass) : 1;
  const hpA = o.highpass ? onePoleCoef(o.highpass) : 0;
  const bp = o.bandpass === undefined ? null : typeof o.bandpass === 'number' ? () => o.bandpass as number : o.bandpass;
  const damp = 2 * (1 - (o.q ?? 0.5));
  let lp = 0;
  let hpLow = 0;
  let svLow = 0;
  let svBand = 0;
  for (let i = 0; i < n && startIdx + i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    let x = rnd();
    lp += lpA * (x - lp);
    x = lp;
    if (hpA > 0) {
      hpLow += hpA * (x - hpLow);
      x -= hpLow;
    }
    if (bp) {
      const f = 2 * Math.sin((Math.PI * Math.min(bp(t), SAMPLE_RATE / 6)) / SAMPLE_RATE);
      svLow += f * svBand;
      const high = x - svLow - damp * svBand;
      svBand += f * high;
      x = svBand;
    }
    out[startIdx + i]! += x * envelopeAt(o, t, o.dur) * amp;
  }
}

/** Scale so the absolute peak equals `peak`. */
export function normalize(buf: Float32Array, peak = 0.89): Float32Array {
  let max = 0;
  for (const s of buf) max = Math.max(max, Math.abs(s));
  if (max > 0) {
    const k = peak / max;
    for (let i = 0; i < buf.length; i++) buf[i]! *= k;
  }
  return buf;
}
