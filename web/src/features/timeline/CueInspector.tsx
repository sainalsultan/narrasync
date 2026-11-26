import { api } from '../../api/client.ts';
import { playOnce } from '../../audio/audio-context.ts';
import { NumberField } from '../../components/NumberField.tsx';
import { useLibraryStore } from '../../store/library-store.ts';
import { selectCue, useProjectStore } from '../../store/project-store.ts';

export function CueInspector() {
  const project = useProjectStore((s) => s.project);
  const selectedId = useProjectStore((s) => s.selectedCueId);
  const { updateCue, moveCue, removeCue, selectCue: select } = useProjectStore.getState();
  const sfx = useLibraryStore((s) => s.sfx);
  const found = selectCue(project, selectedId);

  if (!found) {
    return (
      <aside className="inspector inspector--empty">
        <p className="muted small">
          Pilih cue di timeline untuk mengatur volume.
          <br />
          <kbd>Spasi</kbd> putar/jeda · <kbd>Del</kbd> hapus cue · klik ruler untuk pindah posisi.
        </p>
      </aside>
    );
  }

  const { act, cue } = found;
  const actIndex = project.acts.indexOf(act);

  return (
    <aside className="inspector">
      <div className="row">
        <strong>Cue · Act {actIndex + 1}</strong>
        <span className="topbar__spacer" />
        <button className="icon-btn" onClick={() => select(null)} aria-label="Tutup">
          ✕
        </button>
      </div>
      <label className="field">
        <span className="field__label">Efek</span>
        <select className="select" value={cue.sfx} onChange={(e) => updateCue(cue.id, { sfx: e.target.value })}>
          {sfx.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <NumberField label="Waktu dari awal act" suffix="dtk" step={0.05} value={cue.t} onChange={(t) => moveCue(cue.id, act.id, t)} />
      <label className="field">
        <span className="field__label">
          Volume <b>{cue.vol.toFixed(2)}</b> <span className="muted">× {project.sfxVolume}</span>
        </span>
        <input type="range" min={0} max={2} step={0.05} value={cue.vol} onChange={(e) => updateCue(cue.id, { vol: Number(e.target.value) })} />
      </label>
      <div className="row">
        <button className="btn btn--ghost" onClick={() => void playOnce(api.sfxUrl(cue.sfx), cue.vol * project.sfxVolume)}>
          ▶ Dengar
        </button>
        <button className="btn btn--danger" onClick={() => removeCue(cue.id)}>
          Hapus cue
        </button>
      </div>
    </aside>
  );
}
