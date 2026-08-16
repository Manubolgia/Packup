import type { Item } from '@/domain/types';
import { itemUnits } from '@/domain/volume';
import { IconCheck } from './icons/Icon';

export interface ItemRowProps {
  item: Item;
  /** Breadcrumb shown under the name; omitted inside a container's own list. */
  location?: string | undefined;
  selected?: boolean;
  selectionMode?: boolean;
  onTap: (item: Item) => void;
  onLongPress?: (item: Item) => void;
  onTogglePacked?: (item: Item) => void;
  onQuantityChange?: (item: Item, quantity: number) => void;
}

/**
 * One item, everywhere it appears. The whole row is the tap target for the
 * drawer's locate interaction (§4.3); the packed checkbox and stepper are
 * separate targets that must not trigger it.
 */
export function ItemRow({
  item,
  location,
  selected = false,
  selectionMode = false,
  onTap,
  onLongPress,
  onTogglePacked,
  onQuantityChange,
}: ItemRowProps) {
  let pressTimer: ReturnType<typeof setTimeout> | undefined;

  function startPress() {
    if (!onLongPress) return;
    pressTimer = setTimeout(() => onLongPress(item), 500);
  }
  function cancelPress() {
    if (pressTimer) clearTimeout(pressTimer);
  }

  return (
    <div
      className={[
        'flex items-center gap-2 border-b border-[var(--app-border)] py-1.5',
        selected ? 'bg-[var(--app-surface)]' : '',
      ].join(' ')}
    >
      {onTogglePacked ? (
        <button
          onClick={() => onTogglePacked(item)}
          aria-pressed={item.packed}
          aria-label={`${item.packed ? 'Mark unpacked' : 'Mark packed'}: ${item.name}`}
          className={[
            'grid h-9 w-9 shrink-0 place-items-center border',
            item.packed
              ? 'border-[var(--app-accent)] text-[var(--app-accent)]'
              : 'border-[var(--app-border-strong)] text-transparent',
          ].join(' ')}
        >
          <IconCheck size={16} />
        </button>
      ) : null}

      <button
        onClick={() => onTap(item)}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        // The row's own label carries the state a sighted user reads from the
        // checkbox and breadcrumb, so screen-reader users get it in one go.
        aria-label={`${item.name}${item.quantity > 1 ? `, ${item.quantity}` : ''}${
          location ? `, in ${location}` : ''
        }${item.packed ? ', packed' : ''}${item.essential ? ', essential' : ''}`}
        className="min-h-11 min-w-0 flex-1 text-left"
      >
        <span className="flex items-center gap-1.5">
          {selectionMode ? (
            <span
              aria-hidden="true"
              className={[
                'h-3 w-3 shrink-0 border',
                selected
                  ? 'border-[var(--app-accent)] bg-[var(--app-accent)]'
                  : 'border-[var(--app-border-strong)]',
              ].join(' ')}
            />
          ) : null}
          <span
            className={[
              'truncate text-sm',
              item.packed ? 'text-[var(--app-faint)] line-through' : 'text-[var(--app-fg)]',
            ].join(' ')}
          >
            {item.name}
          </span>
          {item.essential ? (
            <span
              aria-hidden="true"
              title="Essential"
              className="u-label shrink-0 text-[0.5rem] text-[var(--app-accent)]"
            >
              ●
            </span>
          ) : null}
        </span>
        {location ? (
          <span className="u-data block truncate text-[0.5625rem] text-[var(--app-faint)]">
            {location}
          </span>
        ) : null}
      </button>

      {onQuantityChange ? (
        <span className="flex shrink-0 items-center">
          <button
            onClick={() => onQuantityChange(item, item.quantity - 1)}
            disabled={item.quantity <= 1}
            aria-label={`Fewer ${item.name}`}
            className="grid h-9 w-8 place-items-center text-[var(--app-muted)] disabled:opacity-30"
          >
            −
          </button>
          <span className="u-data w-5 text-center text-[0.6875rem] text-[var(--app-fg)]">
            {item.quantity}
          </span>
          <button
            onClick={() => onQuantityChange(item, item.quantity + 1)}
            aria-label={`More ${item.name}`}
            className="grid h-9 w-8 place-items-center text-[var(--app-muted)]"
          >
            +
          </button>
        </span>
      ) : (
        item.quantity > 1 && (
          <span className="u-data shrink-0 text-[0.625rem] text-[var(--app-muted)]">
            ×{item.quantity}
          </span>
        )
      )}

      <span className="u-data w-8 shrink-0 text-right text-[0.5625rem] text-[var(--app-faint)]">
        {itemUnits(item)}u
      </span>
    </div>
  );
}
