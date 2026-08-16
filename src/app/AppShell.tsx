import { Outlet } from 'react-router-dom';

/**
 * Layout shell. Owns the safe-area padding contract (C7) so screens can lay
 * out edge-to-edge without each re-deriving insets.
 */
export function AppShell() {
  return (
    <div className="flex h-full flex-col bg-[var(--app-bg)] text-[var(--app-fg)]">
      <Outlet />
    </div>
  );
}
