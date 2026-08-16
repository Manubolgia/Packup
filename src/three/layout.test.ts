import { describe, expect, it } from 'vitest';
import {
  fillBlockCount,
  frameContainer,
  KIND_SIZE,
  placeContainers,
  PERSON_X,
  ROW_Z,
  slotPosition,
} from './layout';
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

  it('stands the person off to the right of the rows', () => {
    const [x] = slotPosition('person', 0);
    expect(x).toBe(PERSON_X);
    // Clear of the widest row (suitcases at pitch 1.35 reach x=1.35).
    expect(x).toBeGreaterThan(1.35 + KIND_SIZE.suitcase[0]);
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

describe('frameContainer', () => {
  it('targets the container and keeps a workable minimum distance', () => {
    const placed = placeContainers([container('pouch', 0)])[0]!;
    const framing = frameContainer(placed);

    expect(framing.target).toEqual(placed.position);
    // A pouch is tiny; the camera must not end up inside it.
    expect(framing.distance).toBeGreaterThanOrEqual(2.6);
  });

  it('keeps the whole container inside the frame, not filling it edge to edge', () => {
    // Framing on the diagonal rather than the tallest axis: a suitcase seen at
    // an angle presents its diagonal, and overshooting pushes it off-canvas.
    const suitcase = placeContainers([container('suitcase', 0)])[0]!;
    const { distance } = frameContainer(suitcase);
    const diagonal = Math.hypot(...KIND_SIZE.suitcase);
    expect(distance).toBeGreaterThan(diagonal * 4);
  });

  it('pulls back further for a bigger container', () => {
    const suitcase = placeContainers([container('suitcase', 0)])[0]!;
    const pouch = placeContainers([container('pouch', 0)])[0]!;
    expect(frameContainer(suitcase).distance).toBeGreaterThan(frameContainer(pouch).distance);
  });
});

describe('fillBlockCount', () => {
  it('is zero when empty and capped when over-full', () => {
    expect(fillBlockCount(0, 60)).toBe(0);
    expect(fillBlockCount(120, 60, 12)).toBe(12);
  });

  it('shows at least one block for any non-zero contents', () => {
    // A single small item in a huge suitcase must still be visible.
    expect(fillBlockCount(1, 120, 12)).toBe(1);
  });

  it('scales roughly with the fill ratio', () => {
    expect(fillBlockCount(30, 60, 12)).toBe(6);
  });

  it('treats a zero-capacity container as undrawable rather than dividing by zero', () => {
    expect(fillBlockCount(5, 0)).toBe(0);
  });
});
