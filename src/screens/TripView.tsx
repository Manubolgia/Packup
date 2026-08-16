import { Link, useParams } from 'react-router-dom';

/**
 * M0 placeholder. Traveller strip + 3D canvas land in M2/M4.
 */
export function TripView() {
  const { tripId } = useParams();

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
      <Link to="/" className="self-start text-sm text-[var(--app-accent)]">
        ← Trips
      </Link>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--app-muted)]">Trip {tripId} — coming in milestone 2.</p>
      </div>
    </main>
  );
}
