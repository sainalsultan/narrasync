import type { Project, Timeline } from '@narrasync/shared';
import { api } from '../api/client.ts';
import { getAudioContext, loadBuffer } from './audio-context.ts';

export type Track = 'narration' | 'sfx';

export interface PreviewItem {
  url: string;
  /** Absolute start (s). */
  start: number;
  gain: number;
  track: Track;
}

/** Same placement and gain rules as the server-side ffmpeg mix. */
export function buildPreviewItems(project: Project, timeline: Timeline): PreviewItem[] {
  const items: PreviewItem[] = [];
  for (const ta of timeline.acts) {
    const clip = project.acts[ta.index]?.clip;
    if (clip && ta.narrationStart !== null) {
      items.push({ url: api.clipUrl(clip.id), start: ta.narrationStart, gain: 1, track: 'narration' });
    }
  }
  for (const cue of timeline.cues) {
    items.push({ url: api.sfxUrl(cue.sfx), start: cue.start, gain: cue.gain, track: 'sfx' });
  }
  return items;
}

/**
 * Plays the narration + SFX mix directly with the Web Audio API
 * (no file render needed). Each track has its own gain node for muting.
 */
class PreviewEngine {
  private sources: AudioBufferSourceNode[] = [];
  private trackGains: Record<Track, GainNode> | null = null;
  private muted: Record<Track, boolean> = { narration: false, sfx: false };
  private startedAt = 0;
  private offset = 0;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private playing = false;

  private gains(): Record<Track, GainNode> {
    if (!this.trackGains) {
      const ac = getAudioContext();
      const limiter = ac.createDynamicsCompressor(); // mirrors alimiter in the export
      limiter.threshold.value = -1;
      limiter.ratio.value = 20;
      limiter.connect(ac.destination);
      const make = (t: Track) => {
        const g = ac.createGain();
        g.gain.value = this.muted[t] ? 0 : 1;
        g.connect(limiter);
        return g;
      };
      this.trackGains = { narration: make('narration'), sfx: make('sfx') };
    }
    return this.trackGains;
  }

  get isPlaying() {
    return this.playing;
  }

  /** Current position in seconds. */
  position(): number {
    return this.playing ? this.offset + (getAudioContext().currentTime - this.startedAt) : this.offset;
  }

  setMuted(track: Track, muted: boolean): void {
    this.muted[track] = muted;
    if (this.trackGains) this.trackGains[track].gain.value = muted ? 0 : 1;
  }

  async play(items: PreviewItem[], from: number, total: number, onEnded: () => void): Promise<void> {
    this.stop();
    const ac = getAudioContext();
    const gains = this.gains();
    const buffers = await Promise.all(items.map((i) => loadBuffer(i.url)));

    const t0 = ac.currentTime + 0.05;
    items.forEach((item, idx) => {
      const buffer = buffers[idx]!;
      if (item.start + buffer.duration <= from) return;
      const src = ac.createBufferSource();
      src.buffer = buffer;
      const g = ac.createGain();
      g.gain.value = item.gain;
      src.connect(g).connect(gains[item.track]);
      const delay = Math.max(0, item.start - from);
      const offset = Math.max(0, from - item.start);
      src.start(t0 + delay, offset);
      this.sources.push(src);
    });

    this.offset = from;
    this.startedAt = t0;
    this.playing = true;
    this.endTimer = setTimeout(() => {
      this.stop(total);
      onEnded();
    }, (total - from) * 1000 + 50);
  }

  /** Stop playback; keep position (or move it to `at`). */
  stop(at?: number): void {
    const pos = at ?? this.position();
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
      s.disconnect();
    }
    this.sources = [];
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = null;
    this.playing = false;
    this.offset = pos;
  }

  seek(t: number): void {
    this.stop(t);
  }
}

export const previewEngine = new PreviewEngine();
