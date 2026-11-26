import { fmtClock } from '../../lib/format.ts';
import { usePlayhead, useTimeline } from '../../lib/hooks.ts';
import { usePlayerStore } from '../../store/player-store.ts';

export function Transport({ zoom, onZoom }: { zoom: number; onZoom(z: number): void }) {
  const { playing, loading, toggle, seek } = usePlayerStore();
  const playhead = usePlayhead();
  const { total } = useTimeline();

  return (
    <div className="transport">
      <button className="btn btn--primary transport__play" onClick={toggle} disabled={loading || total <= 0} aria-label="Putar/jeda (Spasi)">
        {loading ? '…' : playing ? '❚❚ Jeda' : '▶ Putar'}
      </button>
      <button className="btn btn--ghost" onClick={() => seek(0)} aria-label="Ke awal">
        ⏮
      </button>
      <span className="transport__time mono">
        {fmtClock(playhead)} <span className="muted">/ {fmtClock(total)}</span>
      </span>
      <span className="topbar__spacer" />
      <label className="transport__zoom">
        <span className="muted small">Zoom</span>
        <input type="range" min={20} max={300} value={zoom} onChange={(e) => onZoom(Number(e.target.value))} />
      </label>
    </div>
  );
}
