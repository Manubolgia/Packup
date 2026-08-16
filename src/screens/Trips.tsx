/**
 * M0 placeholder. Becomes the real trip list in M2.
 */
export function Trips() {
  return (
    <main
      className="flex h-full flex-col"
      style={{
        paddingTop: 'var(--safe-top)',
        paddingRight: 'var(--safe-right)',
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'var(--safe-left)',
      }}
    >
      <header className="pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Trips</h1>
        <p className="mt-1 text-sm text-[var(--app-muted)]">Know which item is in which bag.</p>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div
          aria-hidden="true"
          className="grid h-16 w-16 place-items-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-3xl"
        >
          🧳
        </div>
        <h2 className="text-lg font-semibold">No trips yet</h2>
        <p className="max-w-xs text-sm text-[var(--app-muted)]">
          Trip creation arrives in milestone 2. This shell is here to prove the build deploys and
          runs offline.
        </p>
        <span className="mt-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1 text-xs text-[var(--app-muted)]">
          Milestone 0 — skeleton
        </span>
      </div>
    </main>
  );
}
