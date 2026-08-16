import { useEffect, useMemo, useRef, useState } from 'react';
import type { Container, Item, Traveller } from '@/domain/types';
import {
  containersForTraveller,
  formatLocation,
  resolveLocation,
  UNASSIGNED_LABEL,
} from '@/domain/location';
import { Input } from './ui/Field';
import { Button } from './ui/Button';
import { ItemRow } from './ItemRow';

export type DrawerFilter = 'all' | 'unpacked' | 'unassigned' | 'essentials';

export interface InventoryDrawerProps {
  open: boolean;
  /** 'half' normally; 'collapsed' after tapping through to the 3D scene (§4.3). */
  height: 'collapsed' | 'half' | 'full';
  items: readonly Item[];
  containers: readonly Container[];
  travellers: readonly Traveller[];
  selectedContainerId: string | null;
  onToggle: () => void;
  onSetHeight: (height: 'collapsed' | 'half' | 'full') => void;
  /** Tapping a row: locate it in 3D (§4.3). */
  onLocate: (item: Item) => void;
  onTogglePacked: (item: Item) => void;
  onMove: (items: readonly Item[]) => void;
}

const FILTERS: { id: DrawerFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unpacked', label: 'Unpacked' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'essentials', label: 'Essentials' },
];

const HEIGHT_CLASS = {
  collapsed: 'h-[35dvh]',
  half: 'h-[55dvh]',
  full: 'h-[85dvh]',
} as const;

/**
 * The inventory drawer (§4.3). Slides up over the canvas, which is deliberately
 * left mounted underneath so the camera move stays visible while the drawer
 * collapses to 35%.
 */
export function InventoryDrawer({
  open,
  height,
  items,
  containers,
  travellers,
  selectedContainerId,
  onToggle,
  onSetHeight,
  onLocate,
  onTogglePacked,
  onMove,
}: InventoryDrawerProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DrawerFilter>('all');
  const [flat, setFlat] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const groupRefs = useRef(new Map<string, HTMLElement>());

  const selectionMode = selectedIds.size > 0;

  const locationOf = useMemo(() => {
    const ctx = { containers, travellers };
    const map = new Map<string, string>();
    for (const item of items) {
      map.set(item.id, formatLocation(resolveLocation(item, ctx)));
    }
    return map;
  }, [items, containers, travellers]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) {
        return false;
      }
      if (filter === 'unpacked') return !item.packed;
      if (filter === 'unassigned') return item.containerId === null;
      if (filter === 'essentials') return item.essential;
      return true;
    });
  }, [items, query, filter]);

  /** Grouped by container, unassigned last — the order you actually pack in. */
  const groups = useMemo(() => {
    if (flat) {
      return [
        {
          id: 'flat',
          label: 'All items',
          items: [...visible].sort((a, b) => a.name.localeCompare(b.name)),
        },
      ];
    }
    const out: { id: string; label: string; items: Item[] }[] = [];
    // Parents before their nested pouches, per traveller — the order the
    // luggage is physically arranged in, not Dexie's insertion order.
    const ordered = travellers.flatMap((t) => containersForTraveller(containers, t.id));
    for (const container of ordered) {
      const mine = visible.filter((i) => i.containerId === container.id);
      if (mine.length > 0) out.push({ id: container.id, label: container.label, items: mine });
    }
    const loose = visible.filter((i) => i.containerId === null);
    if (loose.length > 0) out.push({ id: 'unassigned', label: UNASSIGNED_LABEL, items: loose });
    return out;
  }, [visible, containers, travellers, flat]);

  // §4.3 reverse direction: selecting a container in 3D scrolls to its group.
  useEffect(() => {
    if (!open || !selectedContainerId || flat) return;
    groupRefs.current.get(selectedContainerId)?.scrollIntoView({ block: 'nearest' });
  }, [selectedContainerId, open, flat]);

  function toggleSelected(item: Item) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  const packedCount = items.filter((i) => i.packed).length;

  return (
    <div
      className={[
        'fixed inset-x-0 bottom-0 z-30 flex flex-col border-t border-[var(--app-border-strong)] bg-[var(--app-bg)]',
        'transition-[height] duration-[var(--dur)] ease-[var(--ease)]',
        open ? HEIGHT_CLASS[height] : 'h-auto',
      ].join(' ')}
      style={{
        paddingRight: 'var(--safe-right)',
        paddingLeft: 'var(--safe-left)',
        paddingBottom: open ? 0 : 'var(--safe-bottom)',
      }}
    >
      {/* The persistent handle: always visible, always the way in and out. */}
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-11 shrink-0 items-center justify-between gap-3 px-1"
      >
        <span className="u-label text-[0.625rem] text-[var(--app-fg)]">Inventory</span>
        <span className="u-data text-[0.625rem] text-[var(--app-muted)]">
          {packedCount}/{items.length} packed
        </span>
      </button>

      {open ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 pb-2">
          <div className="flex shrink-0 gap-2">
            <Input
              value={query}
              placeholder="Search items…"
              aria-label="Search items"
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              onClick={() => onSetHeight(height === 'full' ? 'half' : 'full')}
              aria-label={height === 'full' ? 'Shrink drawer' : 'Expand drawer'}
              className="u-label shrink-0 border border-[var(--app-border)] px-2 text-[0.5rem] text-[var(--app-muted)]"
            >
              {height === 'full' ? 'Less' : 'More'}
            </button>
          </div>

          <div className="flex shrink-0 gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={[
                  'u-label shrink-0 border px-2 py-1.5 text-[0.5rem]',
                  filter === f.id
                    ? 'border-[var(--app-fg)] text-[var(--app-fg)]'
                    : 'border-[var(--app-border)] text-[var(--app-muted)]',
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={() => setFlat((v) => !v)}
              aria-pressed={flat}
              className="u-label ml-auto shrink-0 border border-[var(--app-border)] px-2 py-1.5 text-[0.5rem] text-[var(--app-muted)]"
            >
              {flat ? 'Grouped' : 'A–Z'}
            </button>
          </div>

          {selectionMode ? (
            <div className="flex shrink-0 items-center gap-2 border border-[var(--app-accent)] p-2">
              <span className="u-label flex-1 text-[0.5625rem] text-[var(--app-fg)]">
                {selectedIds.size} selected
              </span>
              <Button
                onClick={() => {
                  onMove(items.filter((i) => selectedIds.has(i.id)));
                  setSelectedIds(new Set());
                }}
              >
                Move {selectedIds.size} to…
              </Button>
              <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Cancel
              </Button>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="u-data py-6 text-center text-[0.625rem] text-[var(--app-faint)]">
                {items.length === 0 ? 'No items yet.' : 'Nothing matches that filter.'}
              </p>
            ) : (
              groups.map((group) => (
                <section
                  key={group.id}
                  ref={(el) => {
                    if (el) groupRefs.current.set(group.id, el);
                    else groupRefs.current.delete(group.id);
                  }}
                  className="mb-3"
                >
                  <h3
                    className={[
                      'u-label sticky top-0 bg-[var(--app-bg)] py-1 text-[0.5625rem]',
                      group.id === selectedContainerId
                        ? 'text-[var(--app-accent)]'
                        : 'text-[var(--app-muted)]',
                    ].join(' ')}
                  >
                    {group.label}
                  </h3>
                  {group.items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      location={flat ? locationOf.get(item.id) : undefined}
                      selected={selectedIds.has(item.id)}
                      selectionMode={selectionMode}
                      onTap={(i) => (selectionMode ? toggleSelected(i) : onLocate(i))}
                      onLongPress={toggleSelected}
                      onTogglePacked={onTogglePacked}
                    />
                  ))}
                </section>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
