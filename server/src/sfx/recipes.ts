import type { BuiltinSfxId } from '@narrasync/shared';
import { addNoise, addTone, createBuffer, glide, normalize } from './dsp.ts';

/**
 * The 16 built-in effects, synthesised from formulas only
 * (no third-party samples → no licensing concerns).
 */
type Recipe = () => Float32Array;

const bell = (u: number) => Math.sin(Math.PI * u) ** 2;

export const SFX_RECIPES: Record<BuiltinSfxId, Recipe> = {
  pop() {
    const b = createBuffer(0.14);
    addTone(b, { dur: 0.12, freq: glide(950, 180, 0.09), decay: 0.035, attack: 0.001 });
    addNoise(b, { dur: 0.012, lowpass: 3500, amp: 0.3, decay: 0.004, seed: 2 });
    return normalize(b);
  },

  step() {
    const b = createBuffer(0.16);
    addNoise(b, { dur: 0.12, lowpass: 700, amp: 1, decay: 0.025, seed: 3 });
    addTone(b, { dur: 0.12, freq: glide(110, 70, 0.08), amp: 0.6, decay: 0.04 });
    return normalize(b, 0.8);
  },

  door() {
    const b = createBuffer(0.75);
    // latch click, then the door body thud and a short low rumble
    addNoise(b, { dur: 0.02, highpass: 2000, amp: 0.5, decay: 0.004, seed: 4 });
    addNoise(b, { start: 0.05, dur: 0.02, highpass: 1500, amp: 0.35, decay: 0.005, seed: 5 });
    addTone(b, { start: 0.08, dur: 0.5, freq: glide(95, 55, 0.3), amp: 1, decay: 0.12, attack: 0.004 });
    addNoise(b, { start: 0.08, dur: 0.45, lowpass: 350, amp: 0.8, decay: 0.1, seed: 6 });
    return normalize(b);
  },

  light_on() {
    const b = createBuffer(0.75);
    addNoise(b, { dur: 0.01, highpass: 2500, amp: 0.6, decay: 0.003, seed: 7 });
    addTone(b, { dur: 0.012, freq: 2400, amp: 0.3, decay: 0.004 });
    for (const [i, f] of [880, 1320, 1760].entries()) {
      addTone(b, { start: 0.03, dur: 0.7, freq: glide(f, f * 1.12, 0.25), amp: 0.35 / (i + 1), attack: 0.06, decay: 0.22 });
    }
    return normalize(b);
  },

  ping() {
    const b = createBuffer(0.9);
    addTone(b, { dur: 0.88, freq: 1318.5, amp: 1, decay: 0.25, attack: 0.002 });
    addTone(b, { dur: 0.5, freq: 2637, amp: 0.3, decay: 0.1 });
    return normalize(b, 0.8);
  },

  blip() {
    const b = createBuffer(0.09);
    addTone(b, { dur: 0.08, freq: 880, wave: 'square', amp: 0.4, decay: 0.035, attack: 0.002 });
    return normalize(b, 0.6);
  },

  alert() {
    const b = createBuffer(0.48);
    [880, 660, 880].forEach((f, i) =>
      addTone(b, { start: i * 0.15, dur: 0.12, freq: f, wave: 'square', amp: 0.35, attack: 0.004 }),
    );
    return normalize(b, 0.6);
  },

  confirm() {
    const b = createBuffer(0.45);
    addTone(b, { dur: 0.13, freq: 659.3, wave: 'triangle', amp: 0.8, decay: 0.08, attack: 0.003 });
    addTone(b, { start: 0.1, dur: 0.33, freq: 987.8, wave: 'triangle', amp: 0.9, decay: 0.12, attack: 0.003 });
    return normalize(b, 0.8);
  },

  whoosh() {
    const dur = 0.6;
    const b = createBuffer(dur);
    addNoise(b, {
      dur,
      amp: 1,
      seed: 8,
      q: 0.55,
      shape: bell,
      bandpass: (t) => {
        const u = t / dur;
        return u < 0.55 ? 300 * Math.pow(10, u / 0.55) : 3000 * Math.pow(0.25, (u - 0.55) / 0.45);
      },
    });
    return normalize(b);
  },

  process() {
    const seq = [660, 880, 740, 990, 830, 1108, 698, 1318];
    const b = createBuffer(seq.length * 0.075 + 0.05);
    seq.forEach((f, i) =>
      addTone(b, { start: i * 0.075, dur: 0.045, freq: f, wave: 'square', amp: 0.25, decay: 0.02, attack: 0.002 }),
    );
    return normalize(b, 0.55);
  },

  click() {
    const b = createBuffer(0.04);
    addNoise(b, { dur: 0.01, highpass: 3000, amp: 1, decay: 0.002, seed: 9 });
    addTone(b, { dur: 0.025, freq: 2200, amp: 0.5, decay: 0.004 });
    return normalize(b, 0.7);
  },

  power() {
    const dur = 0.8;
    const b = createBuffer(dur);
    const shape = (u: number) => Math.min(1, u / 0.15) * (u > 0.75 ? Math.max(0, 1 - (u - 0.75) / 0.25) : 1);
    addTone(b, { dur, freq: glide(110, 880, 0.6), amp: 0.8, shape });
    addTone(b, { dur, freq: glide(220, 1760, 0.6), amp: 0.25, shape });
    addTone(b, { dur, freq: glide(111, 885, 0.6), wave: 'saw', amp: 0.08, shape });
    return normalize(b, 0.75);
  },

  tap() {
    const b = createBuffer(0.07);
    addTone(b, { dur: 0.06, freq: glide(1000, 650, 0.05), amp: 0.7, decay: 0.014, attack: 0.001 });
    addNoise(b, { dur: 0.012, lowpass: 4000, amp: 0.3, decay: 0.003, seed: 10 });
    return normalize(b, 0.65);
  },

  wifi() {
    const b = createBuffer(0.4);
    [0.45, 0.65, 0.85].forEach((amp, i) =>
      addTone(b, { start: i * 0.1, dur: 0.09, freq: glide(1200, 1900, 0.08), amp, decay: 0.05, attack: 0.004 }),
    );
    return normalize(b, 0.7);
  },

  impact() {
    const b = createBuffer(1.1);
    addTone(b, { dur: 1.05, freq: glide(90, 42, 0.5), amp: 1, decay: 0.3, attack: 0.002 });
    addNoise(b, { dur: 0.35, lowpass: 900, amp: 0.9, decay: 0.07, seed: 11 });
    addNoise(b, { dur: 0.02, highpass: 2500, amp: 0.4, decay: 0.005, seed: 12 });
    return normalize(b, 0.95);
  },

  shine() {
    const b = createBuffer(0.95);
    [2093, 2637, 3136, 3951, 4186, 5274].forEach((f, i) =>
      addTone(b, { start: i * 0.055, dur: 0.6, freq: f, amp: 0.25, decay: 0.14, attack: 0.004 }),
    );
    addNoise(b, { dur: 0.9, highpass: 6000, amp: 0.15, shape: bell, seed: 13 });
    return normalize(b, 0.7);
  },
};
