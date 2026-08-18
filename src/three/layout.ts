import type { Container, ContainerKind } from '@/domain/types';

/**
 * Scene layout (§5). The luggage stands in a fixed hotel-room view: rows run
 * front-to-back along Z, small to large, so the user looks over the pouches at
 * the suitcases against the back wall. Slots run along X. The camera never
 * moves — new luggage simply appears in its slot.
 *
 * Pure maths, no three.js import — unit-tested and reused by the room props,
 * which must agree with the mesh positions exactly.
 */

export type Vec3 = readonly [number, number, number];

/** Z of each row's centre. Negative is further from the camera. */
export const ROW_Z: Record<ContainerKind, number> = {
  pouch: 0.85,
  bag: -0.35,
  suitcase: -1.65,
  person: -0.9,
};

/** Horizontal gap between slot centres, per kind — bigger things need room.
    Tight on purpose: a phone canvas is portrait, so width is the scarce axis. */
const SLOT_PITCH: Record<ContainerKind, number> = {
  pouch: 0.72,
  bag: 0.95,
  suitcase: 1.15,
  person: 0,
};

/** The person stands to the right of the rows, back by the window (§5).
    Clear of every slot by depth, and narrow enough for a portrait frame. */
export const PERSON_X = 1.45;

/** Half-extents (x, y, z) of each kind's shell, used for framing and stacking. */
export const KIND_SIZE: Record<ContainerKind, Vec3> = {
  suitcase: [0.5, 0.68, 0.22],
  bag: [0.38, 0.45, 0.25],
  pouch: [0.26, 0.17, 0.12],
  person: [0.26, 0.85, 0.18],
};

/**
 * Where a container sits. Nested pouches are not placed in the pouch row —
 * they ride on top of their parent, which is what makes nesting readable.
 */
export function slotPosition(kind: ContainerKind, slotIndex: number): Vec3 {
  if (kind === 'person') return [PERSON_X, KIND_SIZE.person[1], ROW_Z.person];

  const pitch = SLOT_PITCH[kind];
  // Slots are centred on X: 3 slots become -pitch, 0, +pitch.
  const x = (slotIndex - 1) * pitch;
  return [x, KIND_SIZE[kind][1], ROW_Z[kind]];
}

/** A nested pouch sits on the parent's lid, offset so both stay visible. */
export function nestedPosition(parent: Container, indexAmongSiblings: number): Vec3 {
  const [px, , pz] = slotPosition(parent.kind, parent.slotIndex);
  const parentTop = KIND_SIZE[parent.kind][1] * 2;
  return [
    px + (indexAmongSiblings - 1) * 0.3,
    parentTop + KIND_SIZE.pouch[1],
    pz + KIND_SIZE.pouch[2],
  ];
}

export interface PlacedContainer {
  container: Container;
  position: Vec3;
  /** Nested pouches ride on their parent and are drawn smaller. */
  nested: boolean;
}

/**
 * Resolves every container of one traveller to a world position. Children are
 * placed relative to their parent, so a pouch moved into a suitcase visibly
 * moves in the scene.
 */
export function placeContainers(containers: readonly Container[]): PlacedContainer[] {
  const byParent = new Map<string, Container[]>();
  for (const c of containers) {
    if (!c.parentContainerId) continue;
    const list = byParent.get(c.parentContainerId) ?? [];
    list.push(c);
    byParent.set(c.parentContainerId, list);
  }

  const placed: PlacedContainer[] = [];
  for (const container of containers) {
    if (container.parentContainerId) continue;
    placed.push({
      container,
      position: slotPosition(container.kind, container.slotIndex),
      nested: false,
    });

    const children = (byParent.get(container.id) ?? []).sort((a, b) => a.slotIndex - b.slotIndex);
    children.forEach((child, i) => {
      placed.push({ container: child, position: nestedPosition(container, i), nested: true });
    });
  }
  return placed;
}
