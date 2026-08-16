import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';

export function ErrorBoundary() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong.';

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-4 text-center"
      style={{
        paddingTop: 'var(--safe-top)',
        paddingRight: 'var(--safe-right)',
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'var(--safe-left)',
      }}
    >
      <h1 className="u-label text-base">Packup hit a snag</h1>
      <p className="max-w-sm text-sm text-[var(--app-muted)]">{message}</p>
      <Link
        to="/"
        className="u-label inline-flex min-h-11 items-center bg-[var(--app-accent)] px-5 text-xs text-[var(--color-main)]"
      >
        Back to trips
      </Link>
    </div>
  );
}
