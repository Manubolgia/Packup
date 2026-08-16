import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * "Update available — reload" toast (spec §6), wired to the vite-plugin-pwa hook.
 */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: 'var(--safe-bottom)' }}
    >
      <div className="flex items-center gap-3 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-raised)] py-2 pr-2 pl-4 shadow-lg">
        <span className="text-sm">Update available</span>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="rounded-full bg-[var(--app-accent)] px-4 py-1.5 text-sm font-medium text-white"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss update notice"
          className="grid h-8 w-8 place-items-center rounded-full text-[var(--app-muted)]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
