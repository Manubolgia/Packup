import { err, ok, type Result } from './result';
import type { Container, ContainerKind, UUID } from './types';

/**
 * C6: per traveller, at most 3 suitcases, 3 bags, 3 pouches and 1 person.
 * The person container is the traveller themself (pockets / worn).
 */
export const CONTAINER_CAPS: Record<ContainerKind, number> = {
  suitcase: 3,
  bag: 3,
  pouch: 3,
  person: 1,
};

/** Slots are the three positions in a kind's row of the 3D scene. */
export type SlotIndex = 0 | 1 | 2;

export function containersOfKind(
  containers: readonly Container[],
  travellerId: UUID,
  kind: ContainerKind,
): Container[] {
  return containers.filter((c) => c.travellerId === travellerId && c.kind === kind);
}

/** Lowest slot not already taken for this (traveller, kind), or an error. */
export function nextFreeSlot(
  containers: readonly Container[],
  travellerId: UUID,
  kind: ContainerKind,
): Result<SlotIndex> {
  const taken = new Set(containersOfKind(containers, travellerId, kind).map((c) => c.slotIndex));
  const cap = CONTAINER_CAPS[kind];
  for (let slot = 0; slot < cap; slot++) {
    if (!taken.has(slot as SlotIndex)) return ok(slot as SlotIndex);
  }
  return err('no-free-slot', `All ${cap} ${kind} slots are in use for this traveller.`);
}

/**
 * May this traveller gain another container of this kind, and where does it go?
 * `desiredSlot` is honoured when free; otherwise the first free slot is chosen.
 */
export function canAddContainer(
  containers: readonly Container[],
  travellerId: UUID,
  kind: ContainerKind,
  desiredSlot?: SlotIndex,
): Result<SlotIndex> {
  const existing = containersOfKind(containers, travellerId, kind);
  const cap = CONTAINER_CAPS[kind];

  if (existing.length >= cap) {
    return err(
      'cap-reached',
      kind === 'person'
        ? 'A traveller already has their person container.'
        : `A traveller can have at most ${cap} ${kind}s.`,
    );
  }

  if (desiredSlot === undefined) return nextFreeSlot(containers, travellerId, kind);

  if (desiredSlot >= cap) {
    return err('invalid-field', `Slot ${desiredSlot} is out of range for ${kind}.`);
  }
  if (existing.some((c) => c.slotIndex === desiredSlot)) {
    return err('slot-taken', `Slot ${desiredSlot} is already used by another ${kind}.`);
  }
  return ok(desiredSlot);
}

/** Kinds that may hold a nested child. A pouch inside a pouch is not a thing. */
const PARENT_KINDS: readonly ContainerKind[] = ['suitcase', 'bag'];

/**
 * §3: a pouch may live inside a suitcase or bag, ONE level only, and never
 * across travellers. Passing `parentId: undefined` (detach) is always valid.
 */
export function canNest(
  containers: readonly Container[],
  childId: UUID,
  parentId: UUID | undefined,
): Result<null> {
  if (parentId === undefined) return ok(null);
  if (childId === parentId) return err('nesting-self', 'A container cannot contain itself.');

  const child = containers.find((c) => c.id === childId);
  const parent = containers.find((c) => c.id === parentId);
  if (!child) return err('not-found', 'Container not found.');
  if (!parent) return err('not-found', 'Parent container not found.');

  if (child.travellerId !== parent.travellerId) {
    return err(
      'nesting-cross-traveller',
      'A container can only nest inside the same traveller’s luggage.',
    );
  }
  if (!PARENT_KINDS.includes(parent.kind)) {
    return err('nesting-invalid-parent', 'Only a suitcase or bag can hold another container.');
  }
  if (child.kind !== 'pouch') {
    return err('nesting-invalid-parent', 'Only a pouch can be packed inside another container.');
  }
  // One level: the parent must itself be top-level, and the child must be childless.
  if (parent.parentContainerId !== undefined) {
    return err('nesting-too-deep', 'Nesting is limited to one level.');
  }
  if (containers.some((c) => c.parentContainerId === childId)) {
    return err('nesting-too-deep', 'This container already holds another container.');
  }
  return ok(null);
}

/** Immediate children of a container. */
export function childrenOf(containers: readonly Container[], containerId: UUID): Container[] {
  return containers.filter((c) => c.parentContainerId === containerId);
}
