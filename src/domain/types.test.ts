import { describe, it, expect } from 'vitest';
import type { Container, ContainerKind, Item } from './types';

/**
 * M0 smoke test: proves domain/ imports cleanly under plain Node with no
 * browser globals (spec §8). Real rule coverage lands in M1.
 */
describe('domain types', () => {
  it('imports without any browser global', () => {
    expect(typeof globalThis.window).toBe('undefined');
  });

  it('models a container and an item', () => {
    const kind: ContainerKind = 'suitcase';
    const container: Container = {
      id: 'c1',
      travellerId: 't1',
      kind,
      subtype: 'hardshell-large',
      label: 'Big black Samsonite',
      colorHex: '#0ea5e9',
      slotIndex: 0,
      capacityUnits: 120,
      createdAt: 0,
    };

    const item: Item = {
      id: 'i1',
      tripId: 'trip1',
      name: 'Charger',
      category: 'Electronics',
      quantity: 1,
      size: 'small',
      containerId: container.id,
      packed: false,
      essential: true,
      createdAt: 0,
      updatedAt: 0,
    };

    expect(container.parentContainerId).toBeUndefined();
    expect(item.containerId).toBe('c1');
  });
});
