import { useEffect, useState } from 'react';
import type { ProjectSummary } from '@narrasync/shared';
import { api } from '../../api/client.ts';
import { pickFile } from '../../lib/download.ts';
import {
  downloadProjectFile,
  downloadTimingTs,
  downloadVoiceover,
  exportToMotionCanvas,
  importProjectFile,
  openProject,
  saveProject,
  useBusyStore,
} from '../../store/commands.ts';
import { useLibraryStore } from '../../store/library-store.ts';
import { useProjectStore } from '../../store/project-store.ts';

export function ProjectBar() {
  const name = useProjectStore((s) => s.project.name);
  const dirty = useProjectStore((s) => s.dirty);
  const targetDir = useProjectStore((s) => s.project.targetDir);
  const { updateSettings, newProject } = useProjectStore.getState();
  const busy = useBusyStore((s) => s.global);
  const mode = useLibraryStore((s) => s.health?.mode ?? 'local');
  const [saved, setSaved] = useState<ProjectSummary[]>([]);

  const refreshList = () => api.projects().then(setSaved).catch(() => setSaved([]));
  useEffect(() => void refreshList(), []);

  return (
    <header className="topbar">
      <div className="brand" title="NarraSync · Studio Audio Motion">
        <span className="brand__logo" aria-hidden>
          ▮▮▮
        </span>
        NarraSync
      </div>

      <input
        className="topbar__name"
        value={name}
        onChange={(e) => updateSettings({ name: e.target.value })}
        aria-label="Nama project"
        spellCheck={false}
      />
      <span className={`dot ${dirty ? 'dot--dirty' : ''}`} title={dirty ? 'Ada perubahan belum disimpan' : 'Tersimpan'} />

      <div className="topbar__group">
        <button className="btn btn--ghost" onClick={() => newProject('video-baru')}>
          Baru
        </button>
        <select
          className="select"
          value=""
          onFocus={refreshList}
          onChange={(e) => e.target.value && void openProject(e.target.value)}
          aria-label="Buka project tersimpan"
        >
          <option value="">Buka…</option>
          {saved.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => void saveProject().then(refreshList)} disabled={!!busy}>
          Simpan
        </button>
        <button className="btn btn--ghost" onClick={() => pickFile('.json,application/json').then((f) => f && importProjectFile(f))}>
          Impor JSON
        </button>
        <button className="btn btn--ghost" onClick={downloadProjectFile}>
          Unduh JSON
        </button>
      </div>

      <div className="topbar__spacer" />

      <div className="topbar__group">
        <button className="btn btn--ghost" onClick={downloadTimingTs} title="src/voice-timing.ts">
          voice-timing.ts
        </button>
        <button className="btn btn--ghost" onClick={() => void downloadVoiceover()} disabled={!!busy}>
          Unduh MP3
        </button>
        {mode === 'local' && (
          <button
            className="btn btn--primary"
            onClick={() => void exportToMotionCanvas()}
            disabled={!!busy || !targetDir}
            title={targetDir ? `Tulis ke ${targetDir}` : 'Isi folder project Motion Canvas dulu'}
          >
            {busy === 'Ekspor ke Motion Canvas' ? 'Mengekspor…' : 'Ekspor ke Motion Canvas'}
          </button>
        )}
      </div>
    </header>
  );
}
