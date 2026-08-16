import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAPACITY,
  SIZE_UNITS,
  fillRatio,
  fillStatus,
  itemUnits,
  usedUnits,
  usedUnitsDeep,
} from './volume';
import type { Container, ContainerSubtype, Item } from './types';

function item(size: Item['size'], quantity = 1, containerId: string | null = null): Item {
  return {
    id: `i-${size}-${quantity}-${containerId}`,
    tripId: 'trip',
    name: size,
    category: 'test',
    quantity,
    size,
    containerId,
    packed: false,
    essential: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('volume model', () => {
  it('uses the 1/3/8 unit scale', () => {
    expect(SIZE_UNITS).toEqual({ small: 1, medium: 3, large: 8 });
  });

  it('multiplies units by quantity', () => {
    expect(itemUnits(item('medium', 4))).toBe(12);
  });

  it('treats a quantity below 1 as 1 rather than free space', () => {
    expect(itemUnits({ size: 'large', quantity: 0 })).toBe(8);
  });

  it('sums a list', () => {
    expect(usedUnits([item('small'), item('medium'), item('large')])).toBe(12);
  });

  it('has a default capacity for all 13 subtypes', () => {
    const subtypes: ContainerSubtype[] = [
      'hardshell-large',
      'hardshell-cabin',
      'duffel',
      'backpack',
      'tote',
      'shoulder-bag',
      'laptop-bag',
      'packing-cube',
      'toiletry-bag',
      'purse',
      'ziplock',
      'pockets',
      'worn',
    ];
    expect(Object.keys(DEFAULT_CAPACITY).sort()).toEqual([...subtypes].sort());
    for (const s of subtypes) expect(DEFAULT_CAPACITY[s]).toBeGreaterThan(0);
  });
});

describe('fill thresholds', () => {
  it('is ok below capacity', () => {
    expect(fillStatus(fillRatio(59, 60))).toBe('ok');
  });

  it('turns amber at exactly 100%', () => {
    expect(fillStatus(fillRatio(60, 60))).toBe('amber');
  });

  it('stays amber just under 120%', () => {
    expect(fillStatus(fillRatio(71, 60))).toBe('amber');
  });

  it('turns red at exactly 120%', () => {
    expect(fillStatus(fillRatio(72, 60))).toBe('red');
  });

  it('reports an empty container as ok, not divide-by-zero', () => {
    expect(fillRatio(0, 0)).toBe(0);
    expect(fillStatus(fillRatio(0, 0))).toBe('ok');
  });
});

describe('nested volume', () => {
  const suitcase: Container = {
    id: 'suitcase',
    travellerId: 't',
    kind: 'suitcase',
    subtype: 'hardshell-large',
    label: 'Big',
    colorHex: '#F2F2F0',
    slotIndex: 0,
    capacityUnits: 120,
    createdAt: 0,
  };
  const pouch: Container = {
    id: 'pouch',
    travellerId: 't',
    kind: 'pouch',
    subtype: 'packing-cube',
    label: 'Cube',
    colorHex: '#E8A317',
    slotIndex: 0,
    capacityUnits: 15,
    parentContainerId: 'suitcase',
    createdAt: 0,
  };

  it('counts a nested pouch’s items against its parent', () => {
    const items = [item('large', 1, 'suitcase'), item('medium', 2, 'pouch')];
    expect(usedUnitsDeep('suitcase', [suitcase, pouch], items)).toBe(8 + 6);
    expect(usedUnitsDeep('pouch', [suitcase, pouch], items)).toBe(6);
  });

  it('ignores items in an unrelated container', () => {
    const items = [item('large', 1, 'other')];
    expect(usedUnitsDeep('suitcase', [suitcase, pouch], items)).toBe(0);
  });
});
