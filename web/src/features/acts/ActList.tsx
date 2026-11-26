import { useTimeline } from '../../lib/hooks.ts';
import { fmtSec } from '../../lib/format.ts';
import { useProjectStore } from '../../store/project-store.ts';
import { ActCard } from './ActCard.tsx';

export function ActList() {
  const acts = useProjectStore((s) => s.project.acts);
  const voice = useProjectStore((s) => s.project.voice);
  const addAct = useProjectStore((s) => s.addAct);
  const timeline = useTimeline();

  return (
    <section className="acts">
      <div className="acts__head">
        <h2 className="panel__title">Naskah per act</h2>
        <span className="muted">
          {acts.length} act · total {fmtSec(timeline.total)}
        </span>
      </div>
      {acts.map((act, i) => (
        <ActCard key={act.id} act={act} index={i} count={acts.length} timing={timeline.acts[i]} voice={voice} />
      ))}
      <button className="btn btn--dashed btn--block" onClick={addAct}>
        + Tambah act
      </button>
    </section>
  );
}
