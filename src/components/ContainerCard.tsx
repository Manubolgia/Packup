import type { Container, Item } from '@/domain/types';
import { subtypeSpec } from '@/domain/catalog';
import { fillRatio, fillStatus, usedUnitsDeep } from '@/domain/volume';
import { IconForKind } from './icons/Icon';
import { ProgressBar } from './ui/ProgressBar';

export interface ContainerCardProps {
  container: Container;
  containers: readonly Container[];
  items: readonly Item[];
  /** Pouches nested inside this one, rendered as a strip (§4.2). */
  children?: readonly Container[];
  selected?: boolean;
  onSelect: (id: string) => void;
}

/**
 * The flat counterpart to a 3D container (M3). It stays in the codebase after
 * M4 as the WebGL fallback list (C8), so it must be complete on its own:
 * label, fill, over-capacity warning and nested pouches.
 */
export function ContainerCard({
  container,
  containers,
  items,
  children = [],
  selected = false,
  onSelect,
}: ContainerCardProps) {
  const used = usedUnitsDeep(container.id, containers, items);
  const ratio = fillRatio(used, container.capacityUnits);
  const status = fillStatus(ratio);
  const directCount = items.filter((i) => i.containerId === container.id).length;
  const percent = Math.round(ratio * 100);

  return (
    <button
      type="button"
      onClick={() => onSelect(container.id)}
      aria-pressed={selected}
      aria-label={`${container.label}, ${directCount} items, ${percent} percent full`}
      className={[
        'flex w-full flex-col gap-3 border p-3 text-left',
        'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
        selected
          ? 'border-[var(--app-fg)] bg-[var(--app-surface)]'
          : 'border-[var(--app-border)] hover:border-[var(--app-border-strong)]',
      ].join(' ')}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center"
          style={{ background: container.colorHex, color: 'var(--color-secondary)' }}
        >
          <IconForKind kind={container.kind} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="u-label block truncate text-[0.6875rem] text-[var(--app-fg)]">
            {container.label}
          </span>
          <span className="u-data block truncate text-[0.625rem] text-[var(--app-faint)]">
            {subtypeSpec(container.subtype).label} · {directCount}{' '}
            {directCount === 1 ? 'item' : 'items'}
          </span>
        </span>
        {status !== 'ok' ? (
          <span
            className="u-label shrink-0 px-1.5 py-0.5 text-[0.5rem]"
            style={{
              color: status === 'red' ? 'var(--color-secondary)' : 'var(--color-main)',
              background: status === 'red' ? 'var(--app-danger)' : 'var(--app-accent)',
            }}
          >
            {status === 'red' ? 'Won’t fit' : 'Full'}
          </span>
        ) : null}
      </div>

      <ProgressBar
        value={used}
        max={container.capacityUnits}
        status={status}
        label={`${container.label} fill`}
      />

      {children.length > 0 ? (
        <span className="flex flex-wrap gap-1.5 border-t border-[var(--app-border)] pt-2">
          {children.map((child) => (
            <span
              key={child.id}
              className="u-data flex items-center gap-1 border border-[var(--app-border)] px-1.5 py-0.5 text-[0.5625rem] text-[var(--app-muted)]"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0"
                style={{ background: child.colorHex }}
              />
              {child.label}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}
