import { Link } from 'react-router-dom';
import type { Trip, Traveller } from '@/domain/types';
import { IconMore } from './icons/Icon';
import { ProgressBar } from './ui/ProgressBar';

export interface TripCardProps {
  trip: Trip;
  travellers: Traveller[];
  packed: number;
  total: number;
  onMenu: (trip: Trip) => void;
}

/** "12 Oct — 26 Oct", or a single date, or nothing. */
function formatRange(start?: string, end?: string): string | null {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  if (start && end) return `${fmt(start)} — ${fmt(end)}`;
  if (start) return fmt(start);
  return null;
}

/**
 * One letter where that is unambiguous, two when travellers collide — "Me" and
 * "Marta" on the same trip must not both render as "M".
 */
function initials(name: string, all: readonly Traveller[]): string {
  const first = name.trim().slice(0, 1).toUpperCase();
  const collides = all.filter((t) => t.name.trim().slice(0, 1).toUpperCase() === first).length > 1;
  if (!collides) return first;
  const words = name.trim().split(/\s+/);
  if (words.length > 1) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

export function TripCard({ trip, travellers, packed, total, onMenu }: TripCardProps) {
  const range = formatRange(trip.startDate, trip.endDate);
  const meta = [trip.destination, range].filter(Boolean).join(' · ');

  return (
    <li className="border border-[var(--app-border)] bg-[var(--app-surface)] motion-safe:animate-[row-in_var(--dur)_var(--ease)]">
      <div className="flex items-stretch">
        <Link
          to={`/trip/${trip.id}`}
          className="flex min-w-0 flex-1 flex-col gap-3 p-4 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--app-sunken)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="u-label truncate text-sm text-[var(--app-fg)]">{trip.name}</h3>
              {meta ? (
                <p className="u-data mt-1 truncate text-[0.6875rem] text-[var(--app-muted)]">
                  {meta}
                </p>
              ) : null}
            </div>
            {trip.archivedAt ? (
              <span className="u-label shrink-0 border border-[var(--app-border)] px-2 py-1 text-[0.5625rem] text-[var(--app-faint)]">
                Archived
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {/* Square initial tiles, one per traveller, in their accent.
                Allowed to shrink so a crowded trip never pushes the row wider
                than the card on a 320px screen. */}
            <div className="flex min-w-0 shrink gap-1 overflow-hidden">
              {travellers.map((t) => (
                <span
                  key={t.id}
                  title={t.name}
                  className="u-data grid h-6 min-w-6 place-items-center px-1 text-[0.625rem] font-medium"
                  style={{ background: t.accentColor, color: 'var(--color-main)' }}
                >
                  {initials(t.name, travellers)}
                </span>
              ))}
            </div>
            <div className="flex-1">
              <ProgressBar value={packed} max={total} label={`${trip.name} packing progress`} />
            </div>
          </div>
        </Link>

        <button
          aria-label={`Options for ${trip.name}`}
          onClick={() => onMenu(trip)}
          className="grid w-12 shrink-0 place-items-center border-l border-[var(--app-border)] text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--app-sunken)] hover:text-[var(--app-fg)]"
        >
          <IconMore size={20} />
        </button>
      </div>
    </li>
  );
}
