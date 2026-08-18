import { useRef, useState } from 'react';
import type { Item } from '@/domain/types';
import { IconCheck, IconTrash } from './icons/Icon';

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
  /** When present, swiping the row left reveals a delete button. */
  onDelete?: (item: Item) => void;
}

/** How far the row must travel before the delete button stays open. */
const SWIPE_OPEN_PX = 72;
const SWIPE_THRESHOLD_PX = 40;

/**
 * One item, everywhere it appears. The whole row is the tap target for the
 * drawer's locate interaction (§4.3); the packed checkbox and stepper are
 * separate targets that must not trigger it. Swiping the row left reveals
 * delete, the way a phone list is expected to behave.
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
  onDelete,
}: ItemRowProps) {
  const [dragX, setDragX] = useState(0);
  const [open, setOpen] = useState(false);
  const drag = useRef<{ startX: number; startY: number; active: boolean; moved: boolean } | null>(
    null,
  );
  /** A swipe must not double as a tap; click fires after pointerup. */
  const suppressClick = useRef(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function startPress() {
    if (!onLongPress) return;
    pressTimer.current = setTimeout(() => onLongPress(item), 500);
  }
  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { startX: e.clientX, startY: e.clientY, active: false, moved: false };
    // Optional call: jsdom (component tests) has no pointer capture.
    if (onDelete) e.currentTarget.setPointerCapture?.(e.pointerId);
    startPress();
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !onDelete) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    // Horizontal intent only: a vertical move is the list scrolling.
    if (!d.active && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      d.active = true;
      cancelPress();
    }
    if (!d.active) return;
    d.moved = true;
    const base = open ? -SWIPE_OPEN_PX : 0;
    setDragX(Math.min(0, Math.max(-SWIPE_OPEN_PX - 12, base + dx)));
  }

  function onPointerEnd() {
    cancelPress();
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    suppressClick.current = true;
    const shouldOpen = dragX < -SWIPE_THRESHOLD_PX;
    setOpen(shouldOpen);
    setDragX(shouldOpen ? -SWIPE_OPEN_PX : 0);
  }

  function tapped() {
    // A drag that moved must not also count as a tap; an open row closes first.
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (open) {
      setOpen(false);
      setDragX(0);
      return;
    }
    onTap(item);
  }

  const translate = drag.current?.active ? dragX : open ? -SWIPE_OPEN_PX : 0;

  return (
    <div className="relative overflow-hidden border-b border-[var(--app-border)]">
      {/* The red shelf under the row, revealed by the swipe. */}
      {onDelete ? (
        <button
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          aria-label={`Delete ${item.name}`}
          onClick={() => {
            setOpen(false);
            setDragX(0);
            onDelete(item);
          }}
          className="absolute inset-y-0 right-0 grid place-items-center bg-[var(--app-danger)] text-[var(--color-secondary)]"
          style={{ width: SWIPE_OPEN_PX }}
        >
          <IconTrash size={18} />
        </button>
      ) : null}

      <div
        className={[
          // --row-bg lets a host surface (the container sheet) recolour the
          // opaque face that slides over the delete shelf.
          'relative flex items-center gap-2 bg-[var(--row-bg,var(--app-bg))] py-1.5',
          selected ? 'bg-[var(--app-surface)]' : '',
          drag.current?.active
            ? ''
            : 'transition-transform duration-[var(--dur)] ease-[var(--ease)]',
        ].join(' ')}
        style={{ transform: `translateX(${translate}px)` }}
      >
        {onTogglePacked ? (
          <button
            onClick={() => onTogglePacked(item)}
            aria-pressed={item.packed}
            aria-label={`${item.packed ? 'Mark unpacked' : 'Mark packed'}: ${item.name}`}
            className={[
              'grid h-9 w-9 shrink-0 place-items-center border',
              'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
              item.packed
                ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-on-accent)]'
                : 'border-[var(--app-border-strong)] text-transparent hover:text-[var(--app-faint)]',
            ].join(' ')}
          >
            <span
              className={item.packed ? 'motion-safe:animate-[pop-in_var(--dur)_var(--ease)]' : ''}
            >
              <IconCheck size={16} />
            </span>
          </button>
        ) : null}

        <button
          onClick={tapped}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerLeave={onPointerEnd}
          onPointerCancel={onPointerEnd}
          // The row's own label carries the state a sighted user reads from the
          // checkbox and breadcrumb, so screen-reader users get it in one go.
          aria-label={`${item.name}${item.quantity > 1 ? `, ${item.quantity}` : ''}${
            location ? `, in ${location}` : ''
          }${item.packed ? ', packed' : ''}${item.essential ? ', essential' : ''}`}
          className="min-h-11 min-w-0 flex-1 touch-pan-y text-left"
        >
          <span className="flex items-center gap-1.5">
            {selectionMode ? (
              <span
                aria-hidden="true"
                className={[
                  'grid h-4 w-4 shrink-0 place-items-center border',
                  'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
                  selected
                    ? 'border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-on-accent)]'
                    : 'border-[var(--app-border-strong)] text-transparent',
                ].join(' ')}
              >
                <IconCheck size={11} />
              </span>
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
            <span className="u-data shrink-0 pr-1 text-[0.625rem] text-[var(--app-muted)]">
              ×{item.quantity}
            </span>
          )
        )}
      </div>
    </div>
  );
}
