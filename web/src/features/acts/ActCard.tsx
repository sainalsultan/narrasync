import { memo, useState } from 'react';
import type { Act, TimelineAct, VoiceSettings } from '@narrasync/shared';
import { LicenseUpload } from '../../components/LicenseUpload.tsx';
import { NumberField } from '../../components/NumberField.tsx';
import { fmtClock, fmtSec } from '../../lib/format.ts';
import { clipStatus, generateAct, uploadClip, useBusyStore } from '../../store/commands.ts';
import { sfxName, useLibraryStore } from '../../store/library-store.ts';
import { useProjectStore } from '../../store/project-store.ts';
import { ClipPlayer } from './ClipPlayer.tsx';

interface Props {
  act: Act;
  index: number;
  count: number;
  timing: TimelineAct | undefined;
  voice: VoiceSettings;
}

export const ActCard = memo(function ActCard({ act, index, count, timing, voice }: Props) {
  const { updateAct, removeAct, moveAct, setClip, selectCue } = useProjectStore.getState();
  const job = useBusyStore((s) => s.acts[act.id]);
  const sfx = useLibraryStore((s) => s.sfx);
  const [uploading, setUploading] = useState(false);
  const status = clipStatus(act, voice);
  const extended = timing && timing.length > act.base;

  return (
    <article className={`act-card ${status === 'stale' ? 'act-card--stale' : ''}`}>
      <header className="act-card__head">
        <span className="act-card__num">Act {index + 1}</span>
        {timing && (
          <span className="muted mono">
            {fmtClock(timing.start)} → {fmtClock(timing.end)}
          </span>
        )}
        <span className={`chip ${extended ? 'chip--accent' : ''}`} title="max(dasar, lead-in + clip + pad)">
          {timing ? fmtSec(timing.length) : '–'}
          {extended && ' (diperpanjang)'}
        </span>
        <span className="act-card__tools">
          <button className="icon-btn" disabled={index === 0} onClick={() => moveAct(act.id, -1)} aria-label="Naikkan">
            ↑
          </button>
          <button className="icon-btn" disabled={index === count - 1} onClick={() => moveAct(act.id, 1)} aria-label="Turunkan">
            ↓
          </button>
          <button
            className="icon-btn icon-btn--danger"
            onClick={() => confirm(`Hapus act ${index + 1}?`) && removeAct(act.id)}
            aria-label="Hapus act"
          >
            ✕
          </button>
        </span>
      </header>

      <div className="act-card__body">
        <NumberField label="Durasi dasar" suffix="dtk" value={act.base} step={0.5} onChange={(base) => updateAct(act.id, { base })} />
        <textarea
          className="act-card__text"
          placeholder="Tulis narasi untuk act ini…"
          value={act.text}
          rows={3}
          onChange={(e) => updateAct(act.id, { text: e.target.value })}
        />
      </div>

      <div className="act-card__clip">
        {act.clip ? (
          <>
            <ClipPlayer clipId={act.clip.id} />
            <div className="row row--wrap">
              <span className="chip">{fmtSec(act.clip.duration)}</span>
              <span className="chip">{act.clip.origin === 'edge' ? `Edge · ${act.clip.voice}` : 'Upload manual'}</span>
              {act.clip.license.commercial ? (
                <span className="chip chip--ok">Lisensi komersial</span>
              ) : (
                <span className="chip chip--warn" title={act.clip.license.source}>
                  Belum berlisensi komersial
                </span>
              )}
              {status === 'stale' && <span className="chip chip--danger">Naskah/suara berubah — generate ulang</span>}
              <button className="link-btn" onClick={() => setClip(act.id, undefined)}>
                Lepas clip
              </button>
            </div>
          </>
        ) : (
          <p className="muted small">Belum ada clip suara. Panjang act memakai durasi dasar.</p>
        )}
      </div>

      {uploading ? (
        <LicenseUpload
          accept="audio/*,.mp3,.wav,.m4a"
          submitLabel="Pakai clip ini"
          busy={job === 'upload'}
          onCancel={() => setUploading(false)}
          onSubmit={async (file, license) => {
            await uploadClip(act.id, file, license);
            setUploading(false);
          }}
        />
      ) : (
        <footer className="row">
          <button className="btn btn--primary" disabled={!!job || !act.text.trim()} onClick={() => void generateAct(act.id)}>
            {job === 'tts' ? 'Membuat suara…' : status === 'ok' ? 'Generate ulang' : 'Generate suara'}
          </button>
          <button className="btn btn--ghost" disabled={!!job} onClick={() => setUploading(true)}>
            Upload clip
          </button>
          <span className="topbar__spacer" />
          {act.cues.length > 0 && (
            <span className="act-card__cues">
              {act.cues.map((c) => (
                <button key={c.id} className="chip chip--sfx" onClick={() => selectCue(c.id)} title={`${c.t} dtk · vol ${c.vol}`}>
                  {sfxName(sfx, c.sfx)} @{c.t.toFixed(1)}
                </button>
              ))}
            </span>
          )}
        </footer>
      )}
    </article>
  );
});
