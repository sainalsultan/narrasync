import { create } from 'zustand';
import type { HealthResponse, SfxMeta, VoiceInfo } from '@narrasync/shared';
import { api } from '../api/client.ts';

/** Read-mostly data loaded from the server: health, voices, SFX library. */
interface LibraryState {
  health: HealthResponse | null;
  serverError: string | null;
  voices: VoiceInfo[];
  sfx: SfxMeta[];
  load(): Promise<void>;
  addSfx(meta: SfxMeta): void;
}

export const useLibraryStore = create<LibraryState>()((set) => ({
  health: null,
  serverError: null,
  voices: [],
  sfx: [],
  async load() {
    try {
      const [health, voices, sfx] = await Promise.all([api.health(), api.voices(), api.sfxList()]);
      set({ health, voices, sfx, serverError: null });
    } catch (err) {
      set({ serverError: (err as Error).message });
    }
  },
  addSfx: (meta) => set((s) => ({ sfx: s.sfx.some((x) => x.id === meta.id) ? s.sfx : [...s.sfx, meta] })),
}));

export const sfxName = (list: SfxMeta[], id: string) => list.find((s) => s.id === id)?.name ?? id;
