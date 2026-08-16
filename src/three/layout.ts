import type { Container, ContainerKind } from '@/domain/types';

/**
 * Scene layout (§5). Rows run front-to-back along Z, small to large, so the
 * user looks over the pouches at the suitcases behind. Slots run along X.
 *
 * Pure maths, no three.js import — unit-tested and reused by the camera framing
 * code, which must agree with the mesh positions exactly.
 */

export type Vec3 = readonly [number, number, number];

/** Z of each row's centre. Negative is further from the camera. */
export const ROW_Z: Record<ContainerKind, number> = {
  pouch: 1.5,
  bag: 0,
  suitcase: -1.6,
  person: 0.2,
};

/** Horizontal gap between slot centres, per kind — bigger things need room. */
const SLOT_PITCH: Record<ContainerKind, number> = {
  pouch: 0.75,
  bag: 1.05,
  suitcase: 1.35,
  person: 0,
};

/** The person stands to the right of the rows rather than in one (§5). */
export const PERSON_X = 2.5;

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

/**
 * Camera target and distance for framing one container (§4.3: the drawer taps
 * through to here). Distance scales with the object so a pouch fills as much
 * of the frame as a suitcase does.
 */
export interface CameraFraming {
  target: Vec3;
  distance: number;
}

export function frameContainer(placed: PlacedContainer): CameraFraming {
  const size = KIND_SIZE[placed.container.kind];
  // The diagonal, not the largest single axis: a suitcase viewed at an angle
  // presents roughly its diagonal, so framing on height alone overshoots and
  // pushes the object past the edges of the canvas.
  const diagonal = Math.hypot(size[0], size[1], size[2]);
  return {
    target: placed.position,
    // 5.5x the half-diagonal leaves headroom around the object rather than
    // filling the frame edge to edge.
    distance: Math.max(2.6, diagonal * 5.5),
  };
}

/**
 * The default view: far enough back to see all three rows and the person, and
 * aimed at mid-height so the suitcase row does not clip against the top edge.
 */
export const HOME_CAMERA: CameraFraming = {
  // Centred between the rows (around x=0) and the person at PERSON_X, so both
  // fit the frame rather than the person hanging off the right edge. Z sits
  // slightly back of the pouch row so the luggage lands mid-frame instead of
  // riding the top edge above a stretch of empty floor.
  target: [PERSON_X / 2, 0.55, -0.4],
  distance: 6.4,
};

/**
 * Fill blocks drawn inside a selected container (§5). Returns the count of
 * unit blocks to stack, capped so an absurdly over-filled bag stays drawable.
 */
export function fillBlockCount(usedUnits: number, capacityUnits: number, maxBlocks = 12): number {
  if (capacityUnits <= 0 || usedUnits <= 0) return 0;
  const ratio = Math.min(usedUnits / capacityUnits, 1);
  return Math.max(1, Math.round(ratio * maxBlocks));
}
