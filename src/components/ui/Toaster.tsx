import { useEffect } from 'react';
import { useUiStore, type Toast } from '@/store/ui';

const DISMISS_AFTER = 5000;

function ToastRow({ toast }: { toast: Toast }) {
  const dismissToast = useUiStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), DISMISS_AFTER);
    return () => clearTimeout(timer);
  }, [toast.id, dismissToast]);

  return (
    <div
      role="status"
      className={[
        'pointer-events-auto flex items-center gap-3 border px-4 py-3',
        'motion-safe:animate-[row-in_var(--dur)_var(--ease)]',
        toast.tone === 'error'
          ? 'border-[var(--app-danger)] bg-[var(--app-surface)]'
          : 'border-[var(--app-border-strong)] bg-[var(--app-surface)]',
      ].join(' ')}
    >
      <span className="flex-1 text-sm text-[var(--app-fg)]">{toast.message}</span>
      {toast.undo ? (
        <button
          onClick={() => {
            toast.undo?.();
            dismissToast(toast.id);
          }}
          className="u-label text-[0.625rem] text-[var(--app-accent)]"
        >
          Undo
        </button>
      ) : null}
    </div>
  );
}

/**
 * Toasts sit at z-40, below an open Sheet (z-50): a status message must never
 * cover the action row the user is reaching for.
 */
export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2"
      style={{
        paddingRight: 'var(--safe-right)',
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'var(--safe-left)',
      }}
    >
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
