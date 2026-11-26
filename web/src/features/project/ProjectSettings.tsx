import { useMemo, useState } from 'react';
import { NumberField } from '../../components/NumberField.tsx';
import { percentToRate, rateToPercent } from '../../lib/format.ts';
import { generateMissing } from '../../store/commands.ts';
import { useLibraryStore } from '../../store/library-store.ts';
import { useProjectStore } from '../../store/project-store.ts';

export function ProjectSettings() {
  const project = useProjectStore((s) => s.project);
  const { updateSettings, updateVoice } = useProjectStore.getState();
  const voices = useLibraryStore((s) => s.voices);
  const providers = useLibraryStore((s) => s.health?.providers);
  const [locale, setLocale] = useState(() => project.voice.id.split('-').slice(0, 2).join('-'));

  const locales = useMemo(() => [...new Set(voices.map((v) => v.locale))].sort(), [voices]);
  const filtered = voices.filter((v) => v.locale === locale || v.id === project.voice.id);
  const provider = providers?.find((p) => p.id === project.voice.provider);
  const rate = rateToPercent(project.voice.rate);

  return (
    <section className="panel">
      <h2 className="panel__title">Suara &amp; timing</h2>

      <div className="grid-2">
        <label className="field">
          <span className="field__label">Bahasa</span>
          <select className="select" value={locale} onChange={(e) => setLocale(e.target.value)}>
            {locales.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Suara</span>
          <select className="select" value={project.voice.id} onChange={(e) => updateVoice({ id: e.target.value })}>
            {!filtered.some((v) => v.id === project.voice.id) && <option>{project.voice.id}</option>}
            {filtered.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.gender === 'Female' ? 'P' : 'L'}
              </option>
            ))}
          </select>
        </label>
      </div>
      {provider && !provider.commercial && (
        <p className="note note--warn">{provider.name}: clip belum berlisensi komersial. Buat ulang dengan penyedia resmi sebelum monetisasi.</p>
      )}

      <label className="field">
        <span className="field__label">
          Kecepatan bicara <b>{project.voice.rate}</b>
        </span>
        <input
          type="range"
          min={-50}
          max={50}
          step={5}
          value={rate}
          onChange={(e) => updateVoice({ rate: percentToRate(Number(e.target.value)) })}
        />
      </label>

      <div className="grid-3">
        <NumberField label="Lead-in" suffix="dtk" value={project.leadIn} onChange={(leadIn) => updateSettings({ leadIn })} title="Jeda sebelum narasi di awal act" />
        <NumberField label="Pad" suffix="dtk" value={project.pad} onChange={(pad) => updateSettings({ pad })} title="Jeda setelah narasi" />
        <NumberField label="Vol. efek" value={project.sfxVolume} max={2} step={0.05} onChange={(sfxVolume) => updateSettings({ sfxVolume })} title="Pengali volume semua efek suara" />
      </div>

      <label className="field">
        <span className="field__label">Folder project Motion Canvas</span>
        <input
          className="input mono"
          placeholder="/Users/kamu/Projects/smart-motion-light"
          value={project.targetDir}
          onChange={(e) => updateSettings({ targetDir: e.target.value.trim() })}
          spellCheck={false}
        />
      </label>

      <button className="btn btn--block" onClick={() => void generateMissing()}>
        Generate semua act yang belum/berubah
      </button>
    </section>
  );
}
