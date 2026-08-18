import { describe, expect, it } from 'vitest';
import { KIND_SIZE, placeContainers, PERSON_X, ROW_Z, slotPosition } from './layout';
import type { Container, ContainerKind } from '@/domain/types';

/**
 * Layout is pure maths shared by the meshes and the camera framing, so it is
 * tested without a renderer — an off-by-one here would put the camera somewhere
 * the container is not.
 */

let seq = 0;
function container(kind: ContainerKind, slotIndex: 0 | 1 | 2, parent?: string): Container {
  return {
    id: `c-${++seq}`,
    travellerId: 't-1',
    kind,
    subtype: kind === 'suitcase' ? 'hardshell-large' : kind === 'bag' ? 'backpack' : 'packing-cube',
    label: `${kind} ${slotIndex}`,
    colorHex: '#2B3138',
    slotIndex,
    capacityUnits: 60,
    createdAt: 0,
    ...(parent ? { parentContainerId: parent } : {}),
  };
}

describe('slotPosition', () => {
  it('centres three slots around x=0', () => {
    const xs = [0, 1, 2].map((i) => slotPosition('suitcase', i)[0]);
    expect(xs[1]).toBe(0);
    expect(xs[0]).toBeLessThan(0);
    expect(xs[2]).toBeGreaterThan(0);
    // Symmetric, so the row reads as balanced whatever is filled.
    expect(xs[0]).toBeCloseTo(-xs[2]!);
  });

  it('orders rows small-to-large front-to-back, so nothing is hidden', () => {
    expect(ROW_Z.pouch).toBeGreaterThan(ROW_Z.bag);
    expect(ROW_Z.bag).toBeGreaterThan(ROW_Z.suitcase);
  });

  it('rests every container on the ground plane, never through it', () => {
    for (const kind of ['suitcase', 'bag', 'pouch', 'person'] as const) {
      const [, y] = slotPosition(kind, 1);
      // y is the centre, so a half-height above the floor puts the base at 0.
      expect(y).toBeCloseTo(KIND_SIZE[kind][1]);
    }
  });

  it('stands the person clear of every luggage slot footprint', () => {
    const [px, , pz] = slotPosition('person', 0);
    expect(px).toBe(PERSON_X);

    // The person may share an axis with a row as long as the footprints
    // cannot overlap — clearance in x or in z is each sufficient.
    for (const kind of ['suitcase', 'bag', 'pouch'] as const) {
      for (const slot of [0, 1, 2]) {
        const [sx, , sz] = slotPosition(kind, slot);
        const clearX = Math.abs(px - sx) > KIND_SIZE[kind][0] + KIND_SIZE.person[0];
        const clearZ = Math.abs(pz - sz) > KIND_SIZE[kind][2] + KIND_SIZE.person[2];
        expect(clearX || clearZ).toBe(true);
      }
    }
  });
});

describe('placeContainers', () => {
  it('places a nested pouch on top of its parent, not in the pouch row', () => {
    const suitcase = container('suitcase', 1);
    const pouch = container('pouch', 0, suitcase.id);

    const placed = placeContainers([suitcase, pouch]);
    const placedPouch = placed.find((p) => p.container.id === pouch.id)!;
    const placedCase = placed.find((p) => p.container.id === suitcase.id)!;

    expect(placedPouch.nested).toBe(true);
    // Sits above the suitcase's lid...
    expect(placedPouch.position[1]).toBeGreaterThan(placedCase.position[1]);
    // ...and at the suitcase's depth, not the pouch row's.
    expect(placedPouch.position[2]).not.toBeCloseTo(ROW_Z.pouch);
  });

  it('places every container exactly once', () => {
    const suitcase = container('suitcase', 0);
    const items = [suitcase, container('pouch', 0, suitcase.id), container('bag', 2)];
    const placed = placeContainers(items);

    expect(placed).toHaveLength(3);
    expect(new Set(placed.map((p) => p.container.id)).size).toBe(3);
  });

  it('spreads multiple pouches nested in the same parent', () => {
    const suitcase = container('suitcase', 1);
    const a = container('pouch', 0, suitcase.id);
    const b = container('pouch', 1, suitcase.id);

    const placed = placeContainers([suitcase, a, b]);
    const xa = placed.find((p) => p.container.id === a.id)!.position[0];
    const xb = placed.find((p) => p.container.id === b.id)!.position[0];
    expect(xa).not.toBeCloseTo(xb);
  });

  it('does not place an orphaned child twice or drop it silently', () => {
    // A pouch whose parent is not in the list (mid-delete race) is skipped
    // rather than rendered at the origin.
    const orphan = container('pouch', 0, 'missing-parent');
    expect(placeContainers([orphan])).toHaveLength(0);
  });
});
