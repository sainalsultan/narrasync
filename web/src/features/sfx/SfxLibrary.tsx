import { useState } from 'react';
import { api } from '../../api/client.ts';
import { playOnce } from '../../audio/audio-context.ts';
import { LicenseUpload } from '../../components/LicenseUpload.tsx';
import { usePlayhead, useTimeline } from '../../lib/hooks.ts';
import { uploadSfx } from '../../store/commands.ts';
import { useLibraryStore } from '../../store/library-store.ts';
import { useProjectStore } from '../../store/project-store.ts';
import { toast } from '../../store/toast-store.ts';

export const SFX_DRAG_TYPE = 'application/x-narrasync-sfx';

export function SfxLibrary() {
  const sfx = useLibraryStore((s) => s.sfx);
  const sfxVolume = useProjectStore((s) => s.project.sfxVolume);
  const timeline = useTimeline();
  const playhead = usePlayhead();
  const [uploading, setUploading] = useState(false);

  /** Insert at the playhead (keyboard/touch friendly alternative to drag). */
  const addAtPlayhead = (id: string) => {
    const act = timeline.acts.find((a) => playhead >= a.start && playhead < a.end) ?? timeline.acts.at(-1);
    if (!act) return toast.warning('Tambah act dulu');
    useProjectStore.getState().addCue(act.actId, id, Math.min(playhead, act.end) - act.start);
  };

  return (
    <section className="panel">
      <h2 className="panel__title">Efek suara</h2>
      <p className="muted small">Drag ke track efek suara di timeline, atau klik + untuk menaruh di playhead.</p>
      <ul className="sfx-list">
        {sfx.map((s) => (
          <li
            key={s.id}
            className={`sfx-item ${s.kind === 'upload' ? 'sfx-item--upload' : ''}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(SFX_DRAG_TYPE, s.id);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            title={`${s.duration.toFixed(2)} dtk · ${s.license.source}${s.license.commercial ? '' : ' · belum berlisensi komersial'}`}
          >
            <button className="icon-btn" onClick={() => void playOnce(api.sfxUrl(s.id), sfxVolume)} aria-label={`Dengar ${s.name}`}>
              ▶
            </button>
            <span className="sfx-item__name">{s.name}</span>
            <button className="icon-btn" onClick={() => addAtPlayhead(s.id)} aria-label={`Tambah ${s.name} di playhead`}>
              +
            </button>
          </li>
        ))}
      </ul>
      {uploading ? (
        <LicenseUpload
          accept="audio/*,.wav,.mp3"
          submitLabel="Tambah ke library"
          onCancel={() => setUploading(false)}
          onSubmit={async (file, license) => {
            await uploadSfx(file, license);
            setUploading(false);
          }}
        />
      ) : (
        <button className="btn btn--ghost btn--block" onClick={() => setUploading(true)}>
          Upload WAV/MP3
        </button>
      )}
    </section>
  );
}
