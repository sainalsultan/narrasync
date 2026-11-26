import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  type Act,
  type ClipRef,
  type Cue,
  Project,
  type VoiceSettings,
  createAct,
  createProject,
} from '@narrasync/shared';

type Settings = Pick<Project, 'name' | 'targetDir' | 'leadIn' | 'pad' | 'sfxVolume'>;

interface ProjectState {
  project: Project;
  /** Slug under which the project was last saved on the server. */
  savedSlug: string | null;
  dirty: boolean;
  selectedCueId: string | null;

  newProject(name: string): void;
  loadProject(project: Project, savedSlug: string | null): void;
  markSaved(slug: string): void;
  updateSettings(patch: Partial<Settings>): void;
  updateVoice(patch: Partial<VoiceSettings>): void;

  addAct(): void;
  updateAct(actId: string, patch: Partial<Pick<Act, 'base' | 'text'>>): void;
  removeAct(actId: string): void;
  moveAct(actId: string, delta: -1 | 1): void;
  setClip(actId: string, clip: ClipRef | undefined): void;

  addCue(actId: string, sfx: string, t: number): void;
  updateCue(cueId: string, patch: Partial<Pick<Cue, 'vol' | 'sfx'>>): void;
  /** Move a cue to `t` seconds inside `actId` (may change act). */
  moveCue(cueId: string, actId: string, t: number): void;
  removeCue(cueId: string): void;
  selectCue(cueId: string | null): void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function mapActs(project: Project, fn: (act: Act) => Act): Project {
  return { ...project, acts: project.acts.map(fn) };
}

function findCue(project: Project, cueId: string): { act: Act; cue: Cue } | null {
  for (const act of project.acts) {
    const cue = act.cues.find((c) => c.id === cueId);
    if (cue) return { act, cue };
  }
  return null;
}

const sortCues = (cues: Cue[]) => [...cues].sort((a, b) => a.t - b.t);

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => {
      /** Apply a project change and mark it dirty. */
      const edit = (fn: (p: Project) => Project) => set((s) => ({ project: fn(s.project), dirty: true }));

      return {
        project: createProject('video-baru'),
        savedSlug: null,
        dirty: false,
        selectedCueId: null,

        newProject: (name) => set({ project: createProject(name), savedSlug: null, dirty: false, selectedCueId: null }),
        loadProject: (project, savedSlug) => set({ project, savedSlug, dirty: false, selectedCueId: null }),
        markSaved: (slug) => set({ savedSlug: slug, dirty: false }),
        updateSettings: (patch) => edit((p) => ({ ...p, ...patch })),
        updateVoice: (patch) => edit((p) => ({ ...p, voice: { ...p.voice, ...patch } })),

        addAct: () => edit((p) => ({ ...p, acts: [...p.acts, createAct()] })),
        updateAct: (actId, patch) => edit((p) => mapActs(p, (a) => (a.id === actId ? { ...a, ...patch } : a))),
        removeAct: (actId) => edit((p) => ({ ...p, acts: p.acts.filter((a) => a.id !== actId) })),
        moveAct: (actId, delta) =>
          edit((p) => {
            const i = p.acts.findIndex((a) => a.id === actId);
            const j = i + delta;
            if (i < 0 || j < 0 || j >= p.acts.length) return p;
            const acts = [...p.acts];
            [acts[i], acts[j]] = [acts[j]!, acts[i]!];
            return { ...p, acts };
          }),
        setClip: (actId, clip) => edit((p) => mapActs(p, (a) => (a.id === actId ? { ...a, clip } : a))),

        addCue: (actId, sfx, t) => {
          const cue: Cue = { id: crypto.randomUUID(), t: round2(Math.max(0, t)), sfx, vol: 1 };
          edit((p) => mapActs(p, (a) => (a.id === actId ? { ...a, cues: sortCues([...a.cues, cue]) } : a)));
          set({ selectedCueId: cue.id });
        },
        updateCue: (cueId, patch) =>
          edit((p) => mapActs(p, (a) => ({ ...a, cues: a.cues.map((c) => (c.id === cueId ? { ...c, ...patch } : c)) }))),
        moveCue: (cueId, actId, t) => {
          const found = findCue(get().project, cueId);
          if (!found) return;
          const moved = { ...found.cue, t: round2(Math.max(0, t)) };
          edit((p) =>
            mapActs(p, (a) => {
              const without = a.cues.filter((c) => c.id !== cueId);
              return a.id === actId ? { ...a, cues: sortCues([...without, moved]) } : { ...a, cues: without };
            }),
          );
        },
        removeCue: (cueId) => {
          edit((p) => mapActs(p, (a) => ({ ...a, cues: a.cues.filter((c) => c.id !== cueId) })));
          if (get().selectedCueId === cueId) set({ selectedCueId: null });
        },
        selectCue: (selectedCueId) => set({ selectedCueId }),
      };
    },
    {
      // Autosave the working draft in the browser so a reload never loses work.
      name: 'narrasync:draft',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ project: s.project, savedSlug: s.savedSlug, dirty: s.dirty }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ProjectState> | undefined;
        const parsed = Project.safeParse(p?.project);
        return parsed.success ? { ...current, ...p, project: parsed.data } : current;
      },
    },
  ),
);

export const selectCue = (project: Project, cueId: string | null) => (cueId ? findCue(project, cueId) : null);
