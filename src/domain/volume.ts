import type { Container, ContainerSubtype, Item, ItemSize } from './types';

/** §5 volume model: a coarse abstraction, deliberately not litres. */
export const SIZE_UNITS: Record<ItemSize, number> = {
  small: 1,
  medium: 3,
  large: 8,
};

/** Starting capacity per subtype. User-editable per container afterwards. */
export const DEFAULT_CAPACITY: Record<ContainerSubtype, number> = {
  // suitcase
  'hardshell-large': 120,
  'hardshell-cabin': 60,
  duffel: 80,
  // bag
  backpack: 40,
  tote: 30,
  'shoulder-bag': 20,
  'laptop-bag': 18,
  // pouch
  'packing-cube': 15,
  'toiletry-bag': 10,
  purse: 8,
  ziplock: 5,
  // person
  pockets: 6,
  worn: 12,
};

export type FillStatus = 'ok' | 'amber' | 'red';

/** Amber at 100%, red at 120%. Neither ever blocks a write (§5). */
export const FILL_AMBER = 1;
export const FILL_RED = 1.2;

export function itemUnits(item: Pick<Item, 'size' | 'quantity'>): number {
  return SIZE_UNITS[item.size] * Math.max(1, item.quantity);
}

export function usedUnits(items: readonly Pick<Item, 'size' | 'quantity'>[]): number {
  return items.reduce((total, item) => total + itemUnits(item), 0);
}

/**
 * A container's own items plus everything in its direct children — a pouch
 * inside a suitcase consumes the suitcase's space (nesting is one level, §3).
 */
export function usedUnitsDeep(
  containerId: string,
  containers: readonly Container[],
  items: readonly Item[],
): number {
  const childIds = new Set(
    containers.filter((c) => c.parentContainerId === containerId).map((c) => c.id),
  );
  return usedUnits(
    items.filter(
      (i) => i.containerId === containerId || (i.containerId && childIds.has(i.containerId)),
    ),
  );
}

export function fillRatio(used: number, capacityUnits: number): number {
  if (capacityUnits <= 0) return used > 0 ? Number.POSITIVE_INFINITY : 0;
  return used / capacityUnits;
}

export function fillStatus(ratio: number): FillStatus {
  if (ratio >= FILL_RED) return 'red';
  if (ratio >= FILL_AMBER) return 'amber';
  return 'ok';
}
