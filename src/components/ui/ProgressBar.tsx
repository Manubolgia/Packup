export interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
}

/**
 * Square progress meter. Replaces the spec's ProgressRing: a ring is a circle,
 * and this design has no round geometry.
 */
export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;

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
          style={{ width: `${ratio * 100}%`, background: 'var(--app-accent)' }}
        />
      </div>
      <span className="u-data shrink-0 text-[0.6875rem] text-[var(--app-muted)]">
        {value}/{max}
      </span>
    </div>
  );
}
