// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { PackupDb } from './db';
import { DexieRepo, type RepoDeps } from './repo';
import { exportTrip, importTrip, parseBackup, serializeBackup } from './backup';
import { seedSampleTrip } from './seed';
import { resolveLocation } from '@/domain/location';
import { fillStatus, fillRatio, usedUnitsDeep } from '@/domain/volume';

/** Deterministic ids and clock so assertions are exact. */
function makeDeps(): RepoDeps {
  let n = 0;
  let clock = 1_700_000_000_000;
  return {
    now: () => (clock += 1),
    uuid: () => `id-${String(++n).padStart(4, '0')}`,
  };
}

let db: PackupDb;
let repo: DexieRepo;
let deps: RepoDeps;
let dbIndex = 0;

beforeEach(async () => {
  // A fresh named database per test — no cross-test bleed.
  db = new PackupDb(`packup-test-${++dbIndex}`);
  deps = makeDeps();
  repo = new DexieRepo(db, deps);
  await db.open();
});

async function tripWithTraveller() {
  const trip = await repo.createTrip({ name: 'Test trip' });
  const traveller = await repo.addTraveller(trip.id, {
    name: 'Me',
    accentColor: '#E8A317',
    isSelf: true,
  });
  return { trip, traveller };
}

const suitcase = (label: string) =>
  ({ kind: 'suitcase', subtype: 'hardshell-large', label, colorHex: '#14171A' }) as const;

describe('container caps are enforced by the API, not just the UI (C6)', () => {
  it('refuses a 4th suitcase through the repo', async () => {
    const { traveller } = await tripWithTraveller();
    for (let i = 1; i <= 3; i++) {
      expect((await repo.addContainer(traveller.id, suitcase(`Case ${i}`))).ok).toBe(true);
    }
    const fourth = await repo.addContainer(traveller.id, suitcase('Case 4'));
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) expect(fourth.code).toBe('cap-reached');

    expect(await db.containers.where({ travellerId: traveller.id }).count()).toBe(3);
  });

  it('refuses a 2nd person container', async () => {
    const { traveller } = await tripWithTraveller();
    const first = await repo.addContainer(traveller.id, {
      kind: 'person',
      subtype: 'pockets',
      label: 'On me',
      colorHex: '#E8A317',
    });
    expect(first.ok).toBe(true);
    const second = await repo.addContainer(traveller.id, {
      kind: 'person',
      subtype: 'worn',
      label: 'Worn',
      colorHex: '#E8A317',
    });
    expect(second.ok).toBe(false);
  });

  it('assigns sequential slots automatically', async () => {
    const { traveller } = await tripWithTraveller();
    const slots: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await repo.addContainer(traveller.id, suitcase(`Case ${i}`));
      if (r.ok) slots.push(r.value.slotIndex);
    }
    expect(slots).toEqual([0, 1, 2]);
  });

  it('refuses nesting that breaks the one-level rule', async () => {
    const { traveller } = await tripWithTraveller();
    const caseR = await repo.addContainer(traveller.id, suitcase('Big'));
    expect(caseR.ok).toBe(true);
    if (!caseR.ok) return;

    const pouchR = await repo.addContainer(traveller.id, {
      kind: 'pouch',
      subtype: 'packing-cube',
      label: 'Cube',
      colorHex: '#E8A317',
      parentContainerId: caseR.value.id,
    });
    expect(pouchR.ok).toBe(true);
    if (!pouchR.ok) return;

    const deep = await repo.addContainer(traveller.id, {
      kind: 'pouch',
      subtype: 'ziplock',
      label: 'Ziplock',
      colorHex: '#F2F2F0',
      parentContainerId: pouchR.value.id,
    });
    expect(deep.ok).toBe(false);
    if (!deep.ok) expect(deep.code).toBe('nesting-invalid-parent');
  });
});

describe('cascade semantics', () => {
  it('deleting a container unassigns its items rather than deleting them', async () => {
    const { trip, traveller } = await tripWithTraveller();
    const caseR = await repo.addContainer(traveller.id, suitcase('Big'));
    if (!caseR.ok) throw new Error('setup failed');

    await repo.addItem(trip.id, {
      name: 'Jeans',
      category: 'Clothes',
      containerId: caseR.value.id,
    });
    await repo.deleteContainer(caseR.value.id);

    const items = await repo.listItems(trip.id);
    expect(items).toHaveLength(1);
    expect(items[0]?.containerId).toBeNull();
    expect(await db.containers.count()).toBe(0);
  });

  it('deleting a parent promotes its nested pouch to top level', async () => {
    const { traveller } = await tripWithTraveller();
    const caseR = await repo.addContainer(traveller.id, suitcase('Big'));
    if (!caseR.ok) throw new Error('setup failed');
    const pouchR = await repo.addContainer(traveller.id, {
      kind: 'pouch',
      subtype: 'packing-cube',
      label: 'Cube',
      colorHex: '#E8A317',
      parentContainerId: caseR.value.id,
    });
    if (!pouchR.ok) throw new Error('setup failed');

    await repo.deleteContainer(caseR.value.id);

    const pouch = await db.containers.get(pouchR.value.id);
    expect(pouch).toBeDefined();
    expect(pouch?.parentContainerId).toBeUndefined();
  });

  it('detaching a pouch removes the parent key entirely', async () => {
    const { traveller } = await tripWithTraveller();
    const caseR = await repo.addContainer(traveller.id, suitcase('Big'));
    if (!caseR.ok) throw new Error('setup failed');
    const pouchR = await repo.addContainer(traveller.id, {
      kind: 'pouch',
      subtype: 'packing-cube',
      label: 'Cube',
      colorHex: '#E8A317',
      parentContainerId: caseR.value.id,
    });
    if (!pouchR.ok) throw new Error('setup failed');

    const detached = await repo.updateContainer(pouchR.value.id, { parentContainerId: undefined });
    expect(detached.ok).toBe(true);

    const pouch = await db.containers.get(pouchR.value.id);
    expect(pouch && 'parentContainerId' in pouch).toBe(false);
  });

  it('deleting a traveller removes their containers and unassigns items', async () => {
    const { trip, traveller } = await tripWithTraveller();
    const caseR = await repo.addContainer(traveller.id, suitcase('Big'));
    if (!caseR.ok) throw new Error('setup failed');
    await repo.addItem(trip.id, {
      name: 'Jeans',
      category: 'Clothes',
      containerId: caseR.value.id,
    });

    await repo.deleteTraveller(traveller.id);

    expect(await db.containers.count()).toBe(0);
    expect(await db.travellers.count()).toBe(0);
    const items = await repo.listItems(trip.id);
    expect(items).toHaveLength(1);
    expect(items[0]?.containerId).toBeNull();
  });

  it('deleting a trip removes everything belonging to it', async () => {
    const { trip, traveller } = await tripWithTraveller();
    await repo.addContainer(traveller.id, suitcase('Big'));
    await repo.addItem(trip.id, { name: 'Jeans', category: 'Clothes' });

    await repo.deleteTrip(trip.id);

    expect(await db.trips.count()).toBe(0);
    expect(await db.travellers.count()).toBe(0);
    expect(await db.containers.count()).toBe(0);
    expect(await db.items.count()).toBe(0);
  });
});

describe('duplicate', () => {
  it('copies structure and items but resets packed', async () => {
    const trip = await seedSampleTrip(repo);
    const before = await repo.listItems(trip.id);
    expect(before.some((i) => i.packed)).toBe(true);

    const copyR = await repo.duplicateTrip(trip.id);
    expect(copyR.ok).toBe(true);
    if (!copyR.ok) return;

    const copiedItems = await repo.listItems(copyR.value.id);
    expect(copiedItems).toHaveLength(before.length);
    expect(copiedItems.every((i) => !i.packed)).toBe(true);

    // Containers are copied, and nesting is rewired to the NEW ids.
    const copiedContainers = await repo.listContainers(copyR.value.id);
    const originalContainers = await repo.listContainers(trip.id);
    expect(copiedContainers).toHaveLength(originalContainers.length);

    const copiedIds = new Set(copiedContainers.map((c) => c.id));
    for (const c of copiedContainers) {
      if (c.parentContainerId) expect(copiedIds.has(c.parentContainerId)).toBe(true);
    }
    // No id is shared with the original.
    for (const c of originalContainers) expect(copiedIds.has(c.id)).toBe(false);
  });
});

describe('export → wipe → import round-trip', () => {
  it('restores an equivalent trip', async () => {
    const trip = await seedSampleTrip(repo);

    const exported = await exportTrip(trip.id, db);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const json = serializeBackup(exported.value);
    const before = {
      travellers: exported.value.travellers.length,
      containers: exported.value.containers.length,
      items: exported.value.items.length,
    };

    await repo.wipe();
    expect(await db.trips.count()).toBe(0);

    const parsed = parseBackup(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const imported = await importTrip(parsed.value, db, deps);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const after = {
      travellers: (await repo.listTravellers(imported.value.id)).length,
      containers: (await repo.listContainers(imported.value.id)).length,
      items: (await repo.listItems(imported.value.id)).length,
    };
    expect(after).toEqual(before);
    expect(imported.value.name).toBe(trip.name);

    // Every breadcrumb resolves — proof the id remapping kept relations intact.
    const containers = await repo.listContainers(imported.value.id);
    const travellers = await repo.listTravellers(imported.value.id);
    const items = await repo.listItems(imported.value.id);
    const assigned = items.filter((i) => i.containerId);
    expect(assigned.length).toBeGreaterThan(0);
    for (const item of assigned) {
      const crumbs = resolveLocation(item, { containers, travellers });
      expect(crumbs[0]).not.toBe('Unassigned');
    }
  });

  it('imports as a new trip without colliding with the original', async () => {
    const trip = await seedSampleTrip(repo);
    const exported = await exportTrip(trip.id, db);
    if (!exported.ok) throw new Error('setup failed');

    const imported = await importTrip(exported.value, db, deps);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    expect(imported.value.id).not.toBe(trip.id);
    expect(await db.trips.count()).toBe(2);
    // The original's items are untouched.
    expect(await repo.listItems(trip.id)).toHaveLength(exported.value.items.length);
  });

  it('rejects malformed and future-version backups', async () => {
    expect(parseBackup('not json').ok).toBe(false);
    expect(parseBackup('{"schemaVersion":1}').ok).toBe(false);
    expect(
      parseBackup(
        JSON.stringify({
          schemaVersion: 99,
          trip: { name: 'x' },
          travellers: [],
          containers: [],
          items: [],
        }),
      ).ok,
    ).toBe(false);
  });
});

describe('sample trip', () => {
  it('produces a realistic partly-packed state', async () => {
    const trip = await seedSampleTrip(repo);

    const travellers = await repo.listTravellers(trip.id);
    const containers = await repo.listContainers(trip.id);
    const items = await repo.listItems(trip.id);

    expect(travellers).toHaveLength(2);
    expect(containers.length).toBeGreaterThanOrEqual(7);
    expect(items.length).toBeGreaterThanOrEqual(20);

    // Partly packed, with a visible "still to pack" pile.
    expect(items.some((i) => i.packed)).toBe(true);
    expect(items.some((i) => !i.packed)).toBe(true);
    expect(items.some((i) => i.containerId === null)).toBe(true);
    expect(items.some((i) => i.essential)).toBe(true);

    // Respects every cap it sets up.
    for (const t of travellers) {
      const mine = containers.filter((c) => c.travellerId === t.id);
      for (const kind of ['suitcase', 'bag', 'pouch', 'person'] as const) {
        const n = mine.filter((c) => c.kind === kind).length;
        expect(n).toBeLessThanOrEqual(kind === 'person' ? 1 : 3);
      }
    }

    // At least one container is at or over capacity, so the fill states show.
    const statuses = containers.map((c) =>
      fillStatus(fillRatio(usedUnitsDeep(c.id, containers, items), c.capacityUnits)),
    );
    expect(statuses).toContain('ok');
    expect(statuses.some((s) => s !== 'ok')).toBe(true);
  });
});
