import { create } from 'zustand';
import { computeTimeline } from '@narrasync/shared';
import { buildPreviewItems, previewEngine, type Track } from '../audio/preview-engine.ts';
import { useProjectStore } from './project-store.ts';
import { toast } from './toast-store.ts';

interface PlayerState {
  playing: boolean;
  loading: boolean;
  /** Position when paused (live position comes from `previewEngine.position()`). */
  position: number;
  muted: Record<Track, boolean>;
  play(): Promise<void>;
  pause(): void;
  toggle(): void;
  seek(t: number): void;
  toggleMute(track: Track): void;
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
  playing: false,
  loading: false,
  position: 0,
  muted: { narration: false, sfx: false },

  async play() {
    const project = useProjectStore.getState().project;
    const timeline = computeTimeline(project);
    if (timeline.total <= 0) return;
    const from = get().position >= timeline.total - 0.05 ? 0 : get().position;
    set({ loading: true });
    try {
      await previewEngine.play(buildPreviewItems(project, timeline), from, timeline.total, () =>
        set({ playing: false, position: 0 }),
      );
      set({ playing: true });
    } catch (err) {
      toast.error('Preview gagal', [(err as Error).message]);
    } finally {
      set({ loading: false });
    }
  },
  pause() {
    previewEngine.stop();
    set({ playing: false, position: previewEngine.position() });
  },
  toggle() {
    if (get().playing) get().pause();
    else void get().play();
  },
  seek(t) {
    const wasPlaying = get().playing;
    previewEngine.seek(t);
    set({ position: Math.max(0, t), playing: false });
    if (wasPlaying) void get().play();
  },
  toggleMute(track) {
    const muted = { ...get().muted, [track]: !get().muted[track] };
    previewEngine.setMuted(track, muted[track]);
    set({ muted });
  },
}));
