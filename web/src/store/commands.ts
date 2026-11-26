/**
 * Async workflows that talk to the server and then update the stores.
 * Components call these; stores themselves stay synchronous and pure.
 */
import { create } from 'zustand';
import { type Act, type LicenseInfo, Project, type VoiceSettings, computeTimeline, renderVoiceTimingTs, slugify } from '@narrasync/shared';
import { api } from '../api/client.ts';
import { downloadBlob, downloadText } from '../lib/download.ts';
import { useLibraryStore } from './library-store.ts';
import { useProjectStore } from './project-store.ts';
import { toast } from './toast-store.ts';

type ActJob = 'tts' | 'upload';

interface BusyState {
  acts: Record<string, ActJob>;
  /** Label of a project-wide job (render/export/save), or null. */
  global: string | null;
}

export const useBusyStore = create<BusyState>()(() => ({ acts: {}, global: null }));

const setActBusy = (actId: string, job: ActJob | null) =>
  useBusyStore.setState((s) => {
    const acts = { ...s.acts };
    if (job) acts[actId] = job;
    else delete acts[actId];
    return { acts };
  });

async function withGlobal<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  if (useBusyStore.getState().global) return undefined;
  useBusyStore.setState({ global: label });
  try {
    return await fn();
  } catch (err) {
    toast.error(`${label} gagal`, [(err as Error).message]);
    return undefined;
  } finally {
    useBusyStore.setState({ global: null });
  }
}

const project = () => useProjectStore.getState().project;

export type ClipStatus = 'none' | 'ok' | 'stale';

/** A TTS clip is stale when the text, voice or rate changed after generation. */
export function clipStatus(act: Act, voice: VoiceSettings): ClipStatus {
  const clip = act.clip;
  if (!clip) return 'none';
  if (clip.origin === 'upload') return 'ok';
  const changed = (clip.text ?? '').trim() !== act.text.trim() || clip.voice !== voice.id || clip.rate !== voice.rate;
  return changed ? 'stale' : 'ok';
}

// ── Narration ────────────────────────────────────────────────────────────────

export async function generateAct(actId: string): Promise<boolean> {
  const { voice, acts } = project();
  const act = acts.find((a) => a.id === actId);
  if (!act || useBusyStore.getState().acts[actId]) return false;
  if (!act.text.trim()) {
    toast.warning('Naskah act masih kosong');
    return false;
  }
  setActBusy(actId, 'tts');
  try {
    const { cached, ...clip } = await api.tts({ provider: voice.provider, voice: voice.id, rate: voice.rate, text: act.text });
    useProjectStore.getState().setClip(actId, clip);
    return true;
  } catch (err) {
    toast.error('Generate suara gagal', [(err as Error).message]);
    return false;
  } finally {
    setActBusy(actId, null);
  }
}

/** Generate every act whose clip is missing or stale (cache makes repeats free). */
export async function generateMissing(): Promise<void> {
  const { voice, acts } = project();
  const todo = acts.filter((a) => a.text.trim() && clipStatus(a, voice) !== 'ok');
  if (todo.length === 0) {
    toast.info('Semua act sudah punya clip terbaru');
    return;
  }
  let ok = 0;
  for (const act of todo) if (await generateAct(act.id)) ok++;
  toast.success(`${ok}/${todo.length} act selesai di-generate`);
}

export async function uploadClip(actId: string, file: File, license: LicenseInfo): Promise<void> {
  setActBusy(actId, 'upload');
  try {
    useProjectStore.getState().setClip(actId, await api.uploadClip(file, license));
  } catch (err) {
    toast.error('Upload clip gagal', [(err as Error).message]);
  } finally {
    setActBusy(actId, null);
  }
}

export async function uploadSfx(file: File, license: LicenseInfo): Promise<void> {
  try {
    const meta = await api.uploadSfx(file, license);
    useLibraryStore.getState().addSfx(meta);
    toast.success(`Efek suara "${meta.name}" ditambahkan`);
  } catch (err) {
    toast.error('Upload efek suara gagal', [(err as Error).message]);
  }
}

// ── Project files ────────────────────────────────────────────────────────────

export const saveProject = () =>
  withGlobal('Simpan project', async () => {
    const summary = await api.saveProject(project());
    useProjectStore.getState().markSaved(summary.slug);
    toast.success(`Tersimpan: projects/${summary.slug}/audio-project.json`);
  });

export const openProject = (slug: string) =>
  withGlobal('Buka project', async () => {
    const data = Project.parse(await api.project(slug));
    useProjectStore.getState().loadProject(data, slug);
  });

export async function importProjectFile(file: File): Promise<void> {
  try {
    const data = Project.parse(JSON.parse(await file.text()));
    useProjectStore.getState().loadProject(data, null);
    toast.success(`Project "${data.name}" dibuka dari file`);
  } catch (err) {
    toast.error('File audio-project.json tidak valid', [(err as Error).message]);
  }
}

export function downloadProjectFile(): void {
  downloadText(`${JSON.stringify(project(), null, 2)}\n`, 'audio-project.json', 'application/json');
}

// ── Export ───────────────────────────────────────────────────────────────────

export function downloadTimingTs(): void {
  const p = project();
  downloadText(renderVoiceTimingTs(computeTimeline(p), p.name), 'voice-timing.ts');
}

export const downloadVoiceover = () =>
  withGlobal('Render MP3', async () => {
    const p = project();
    downloadBlob(await api.render(p), `${slugify(p.name)}-voiceover.mp3`);
  });

export const exportToMotionCanvas = () =>
  withGlobal('Ekspor ke Motion Canvas', async () => {
    const result = await api.exportToFolder(project());
    toast.success(`Ekspor selesai · total ${result.total} dtk`, [
      ...result.files.map((f) => `✓ ${f}`),
      ...result.warnings.map((w) => `⚠ ${w}`),
    ]);
  });
