import { describe, expect, it } from 'vitest';
import { canAddContainer, canNest, nextFreeSlot } from './rules';
import type { Container, ContainerKind, ContainerSubtype, UUID } from './types';

const T1 = 'traveller-1';
const T2 = 'traveller-2';

let seq = 0;
function container(
  travellerId: UUID,
  kind: ContainerKind,
  slotIndex: 0 | 1 | 2,
  extra: Partial<Container> = {},
): Container {
  const subtype: Record<ContainerKind, ContainerSubtype> = {
    suitcase: 'hardshell-large',
    bag: 'backpack',
    pouch: 'packing-cube',
    person: 'worn',
  };
  return {
    id: `c${++seq}`,
    travellerId,
    kind,
    subtype: subtype[kind],
    label: `${kind} ${slotIndex}`,
    colorHex: '#F2F2F0',
    slotIndex,
    capacityUnits: 60,
    createdAt: 0,
    ...extra,
  };
}

describe('container caps (C6)', () => {
  it.each([
    ['suitcase', 3],
    ['bag', 3],
    ['pouch', 3],
  ] as const)('refuses the %sth+1 %s', (kind, cap) => {
    const full = [0, 1, 2].map((s) => container(T1, kind, s as 0 | 1 | 2));
    expect(full).toHaveLength(cap);

    const result = canAddContainer(full, T1, kind);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('cap-reached');
  });

  it('allows exactly one person container, and refuses a second', () => {
    expect(canAddContainer([], T1, 'person').ok).toBe(true);

    const withPerson = [container(T1, 'person', 0)];
    const second = canAddContainer(withPerson, T1, 'person');
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe('cap-reached');
  });

  it('counts caps per traveller, not globally', () => {
    const t1Full = [0, 1, 2].map((s) => container(T1, 'suitcase', s as 0 | 1 | 2));
    const result = canAddContainer(t1Full, T2, 'suitcase');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(0);
  });
});

describe('slot assignment', () => {
  it('fills the lowest free slot', () => {
    const existing = [container(T1, 'bag', 0), container(T1, 'bag', 2)];
    const result = nextFreeSlot(existing, T1, 'bag');
    expect(result.ok && result.value).toBe(1);
  });

  it('rejects a slot already taken for that (traveller, kind)', () => {
    const existing = [container(T1, 'bag', 1)];
    const result = canAddContainer(existing, T1, 'bag', 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('slot-taken');
  });

  it('treats the same slot index in a different kind as free', () => {
    const existing = [container(T1, 'suitcase', 0)];
    expect(canAddContainer(existing, T1, 'bag', 0).ok).toBe(true);
  });

  it('rejects an out-of-range slot', () => {
    const result = canAddContainer([], T1, 'person', 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid-field');
  });
});

describe('nesting (one level only)', () => {
  it('allows a pouch inside a top-level suitcase', () => {
    const suitcase = container(T1, 'suitcase', 0);
    const pouch = container(T1, 'pouch', 0);
    expect(canNest([suitcase, pouch], pouch.id, suitcase.id).ok).toBe(true);
  });

  it('rejects a pouch inside a pouch (a pouch is never a parent)', () => {
    const suitcase = container(T1, 'suitcase', 0);
    const inner = container(T1, 'pouch', 0, { parentContainerId: suitcase.id });
    const outer = container(T1, 'pouch', 1);
    const result = canNest([suitcase, inner, outer], outer.id, inner.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('nesting-invalid-parent');
  });

  it('rejects nesting into a bag that is itself nested', () => {
    // Not reachable through the UI, but the rule must hold if data says so.
    const suitcase = container(T1, 'suitcase', 0);
    const bag = container(T1, 'bag', 0, { parentContainerId: suitcase.id });
    const pouch = container(T1, 'pouch', 0);
    const result = canNest([suitcase, bag, pouch], pouch.id, bag.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('nesting-too-deep');
  });

  it('rejects nesting a pouch that already holds a container', () => {
    const suitcase = container(T1, 'suitcase', 0);
    const pouch = container(T1, 'pouch', 0);
    const grandchild = container(T1, 'pouch', 1, { parentContainerId: pouch.id });
    const result = canNest([suitcase, pouch, grandchild], pouch.id, suitcase.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('nesting-too-deep');
  });

  it('rejects nesting across travellers', () => {
    const suitcase = container(T1, 'suitcase', 0);
    const pouch = container(T2, 'pouch', 0);
    const result = canNest([suitcase, pouch], pouch.id, suitcase.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('nesting-cross-traveller');
  });

  it('rejects a suitcase inside a suitcase', () => {
    const a = container(T1, 'suitcase', 0);
    const b = container(T1, 'suitcase', 1);
    const result = canNest([a, b], b.id, a.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('nesting-invalid-parent');
  });

  it('rejects a container inside itself', () => {
    const a = container(T1, 'pouch', 0);
    const result = canNest([a], a.id, a.id);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('nesting-self');
  });

  it('treats detaching (undefined parent) as always valid', () => {
    const a = container(T1, 'pouch', 0);
    expect(canNest([a], a.id, undefined).ok).toBe(true);
  });
});
