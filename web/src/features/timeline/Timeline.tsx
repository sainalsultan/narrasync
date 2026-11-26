import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import type { Timeline as TimelineData } from '@narrasync/shared';
import { api } from '../../api/client.ts';
import { clamp } from '../../lib/format.ts';
import { usePlayhead, useTimeline } from '../../lib/hooks.ts';
import { sfxName, useLibraryStore } from '../../store/library-store.ts';
import { usePlayerStore } from '../../store/player-store.ts';
import { useProjectStore } from '../../store/project-store.ts';
import { SFX_DRAG_TYPE } from '../sfx/SfxLibrary.tsx';
import { CueInspector } from './CueInspector.tsx';
import { Transport } from './Transport.tsx';
import { Waveform } from './Waveform.tsx';

const SNAP = 0.05;
const snap = (t: number) => Math.round(t / SNAP) * SNAP;

/** Absolute time → (act, time relative to act start). */
function locate(timeline: TimelineData, t: number) {
  const abs = clamp(t, 0, Math.max(0, timeline.total - 0.01));
  const act = [...timeline.acts].reverse().find((a) => abs >= a.start) ?? timeline.acts[0];
  return act ? { actId: act.actId, rel: Math.max(0, abs - act.start) } : null;
}

interface Drag {
  cueId: string;
  pointerOffset: number;
  t: number;
}

export function Timeline() {
  const project = useProjectStore((s) => s.project);
  const selectedCueId = useProjectStore((s) => s.selectedCueId);
  const { addCue, moveCue, selectCue } = useProjectStore.getState();
  const sfxMeta = useLibraryStore((s) => s.sfx);
  const { muted, toggleMute, seek } = usePlayerStore();
  const timeline = useTimeline();
  const playhead = usePlayhead();
  const [zoom, setZoom] = useState(80); // px per second
  const [drag, setDrag] = useState<Drag | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const width = Math.max(timeline.total * zoom + 240, 600);
  const timeAt = (clientX: number) => (clientX - (canvasRef.current?.getBoundingClientRect().left ?? 0)) / zoom;

  const onCuePointerDown = (e: ReactPointerEvent, cueId: string, start: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    selectCue(cueId);
    setDrag({ cueId, pointerOffset: timeAt(e.clientX) - start, t: start });
  };
  const onCuePointerMove = (e: ReactPointerEvent) => {
    if (!drag) return;
    setDrag({ ...drag, t: clamp(snap(timeAt(e.clientX) - drag.pointerOffset), 0, timeline.total - 0.01) });
  };
  const onCuePointerUp = () => {
    if (!drag) return;
    const loc = locate(timeline, drag.t);
    if (loc) moveCue(drag.cueId, loc.actId, loc.rel);
    setDrag(null);
  };

  const ticks: number[] = [];
  const tickStep = zoom >= 120 ? 0.5 : zoom >= 50 ? 1 : 2;
  for (let t = 0; t <= timeline.total + 3; t += tickStep) ticks.push(t);

  const actBands = timeline.acts.map((a) => (
    <div key={a.actId} className={`band ${a.index % 2 ? 'band--odd' : ''}`} style={{ left: a.start * zoom, width: a.length * zoom }} />
  ));

  return (
    <section className="timeline">
      <Transport zoom={zoom} onZoom={setZoom} />
      <div className="timeline__main">
        <div className="timeline__labels">
          <div className="timeline__label timeline__label--ruler" />
          <div className="timeline__label">
            Narasi
            <button className={`mute ${muted.narration ? 'mute--on' : ''}`} onClick={() => toggleMute('narration')} title="Mute narasi">
              M
            </button>
          </div>
          <div className="timeline__label">
            Efek suara
            <button className={`mute ${muted.sfx ? 'mute--on' : ''}`} onClick={() => toggleMute('sfx')} title="Mute efek suara">
              M
            </button>
          </div>
        </div>

        <div className="timeline__scroll">
          <div className="timeline__canvas" ref={canvasRef} style={{ width }}>
            {/* Ruler: ticks + act names; click to seek */}
            <div className="ruler" onPointerDown={(e) => seek(clamp(timeAt(e.clientX), 0, timeline.total))}>
              {ticks.map((t) => (
                <span key={t} className={`tick ${t % 1 === 0 ? 'tick--major' : ''}`} style={{ left: t * zoom }}>
                  {t % 1 === 0 && <span className="tick__label">{t}s</span>}
                </span>
              ))}
              {timeline.acts.map((a) => (
                <span key={a.actId} className="ruler__act" style={{ left: a.start * zoom, width: a.length * zoom }}>
                  Act {a.index + 1}
                </span>
              ))}
            </div>

            <div className={`track ${muted.narration ? 'track--muted' : ''}`}>
              {actBands}
              {timeline.acts.map((a) => {
                const clip = project.acts[a.index]?.clip;
                if (!clip || a.narrationStart === null) return null;
                const w = a.narrationDuration * zoom;
                return (
                  <div key={a.actId} className="clip-block" style={{ left: a.narrationStart * zoom, width: w }} title={clip.text}>
                    <Waveform url={api.clipUrl(clip.id)} width={w} height={46} color="#b7a8ff" />
                  </div>
                );
              })}
            </div>

            <div
              className={`track track--sfx ${muted.sfx ? 'track--muted' : ''}`}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(SFX_DRAG_TYPE)) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }
              }}
              onDrop={(e) => {
                const id = e.dataTransfer.getData(SFX_DRAG_TYPE);
                const loc = id ? locate(timeline, snap(timeAt(e.clientX))) : null;
                if (id && loc) addCue(loc.actId, id, loc.rel);
              }}
              onPointerDown={() => selectCue(null)}
            >
              {actBands}
              {timeline.cues.map((c) => {
                const t = drag?.cueId === c.cueId ? drag.t : c.start;
                const dur = sfxMeta.find((s) => s.id === c.sfx)?.duration ?? 0.3;
                return (
                  <div
                    key={c.cueId}
                    className={`cue ${selectedCueId === c.cueId ? 'cue--selected' : ''} ${drag?.cueId === c.cueId ? 'cue--dragging' : ''}`}
                    style={{ left: t * zoom, ['--tail' as string]: `${Math.max(4, dur * zoom)}px`, opacity: 0.45 + Math.min(1, c.gain) * 0.55 }}
                    onPointerDown={(e) => onCuePointerDown(e, c.cueId, c.start)}
                    onPointerMove={onCuePointerMove}
                    onPointerUp={onCuePointerUp}
                    title={`${sfxName(sfxMeta, c.sfx)} · ${t.toFixed(2)} dtk`}
                  >
                    <span className="cue__label">{sfxName(sfxMeta, c.sfx)}</span>
                  </div>
                );
              })}
            </div>

            {timeline.acts.map((a) => (
              <div key={a.actId} className="boundary" style={{ left: a.end * zoom }} />
            ))}
            <div className="playhead" style={{ left: playhead * zoom }} />
          </div>
        </div>

        <CueInspector />
      </div>
    </section>
  );
}
