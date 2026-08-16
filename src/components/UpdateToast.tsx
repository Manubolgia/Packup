import { useRegisterSW } from 'virtual:pwa-register/react';
import { IconClose } from './icons/Icon';

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
      <div className="flex items-center gap-3 border border-[var(--app-border-strong)] bg-[var(--app-surface)] py-2 pr-2 pl-4">
        <span className="text-sm">Update available</span>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="u-label min-h-9 bg-[var(--app-accent)] px-3 text-[0.625rem] text-[var(--color-main)]"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss update notice"
          className="grid h-9 w-9 place-items-center text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:text-[var(--app-fg)]"
        >
          <IconClose size={16} />
        </button>
      </div>
    </div>
  );
}
