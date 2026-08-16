import type { FillStatus } from '@/domain/volume';

export interface ProgressBarProps {
  value: number;
  max: number;
  /** Drives the bar colour; defaults to the accent. */
  status?: FillStatus;
  label?: string;
}

const STATUS_COLOR: Record<FillStatus, string> = {
  ok: 'var(--app-accent)',
  amber: 'var(--app-accent)',
  red: 'var(--app-danger)',
};

/**
 * Square progress meter. Replaces the spec's ProgressRing: a ring is a circle,
 * and this design has no round geometry.
 */
export function ProgressBar({ value, max, status = 'ok', label }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max;

  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? 'Progress'}
        className={[
          'relative h-1.5 flex-1',
          // An empty trip gets a hairline, not a full-width dark bar that
          // reads as a filled track.
          max > 0 ? 'bg-[var(--app-sunken)]' : 'border-b border-[var(--app-border)]',
        ].join(' ')}
      >
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-[var(--dur)] ease-[var(--ease)]"
          style={{ width: `${ratio * 100}%`, background: STATUS_COLOR[status] }}
        />
        {/* Over-capacity gets a hatched overflow cap rather than a longer bar. */}
        {over ? (
          <div
            className="absolute inset-y-0 right-0 w-1.5"
            style={{ background: 'var(--app-danger)' }}
          />
        ) : null}
      </div>
      <span className="u-data shrink-0 text-[0.6875rem] text-[var(--app-muted)]">
        {value}/{max}
      </span>
    </div>
  );
}
