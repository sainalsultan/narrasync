import { useToastStore } from '../store/toast-store.ts';

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`} onClick={() => dismiss(t.id)}>
          <strong>{t.title}</strong>
          {t.lines?.map((l, i) => (
            <div key={i} className="toast__line">
              {l}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
