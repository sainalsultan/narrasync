import { useEffect, useMemo, useState } from 'react';
import { computeTimeline } from '@narrasync/shared';
import { previewEngine } from '../audio/preview-engine.ts';
import { usePlayerStore } from '../store/player-store.ts';
import { useProjectStore } from '../store/project-store.ts';

/** Derived absolute timeline of the current project (pure, memoised). */
export function useTimeline() {
  const project = useProjectStore((s) => s.project);
  return useMemo(() => computeTimeline(project), [project]);
}

/** Live playhead position, animated with requestAnimationFrame while playing. */
export function usePlayhead(): number {
  const playing = usePlayerStore((s) => s.playing);
  const paused = usePlayerStore((s) => s.position);
  const [live, setLive] = useState(paused);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      setLive(previewEngine.position());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return playing ? live : paused;
}
