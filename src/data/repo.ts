import { db, PackupDb } from './db';
import { canAddContainer, canNest, type SlotIndex } from '@/domain/rules';
import { DEFAULT_CAPACITY } from '@/domain/volume';
import { err, ok, type Result } from '@/domain/result';
import type {
  Container,
  ContainerKind,
  ContainerSubtype,
  Item,
  ItemSize,
  Trip,
  Traveller,
  UUID,
} from '@/domain/types';

/** Injectable so tests can use a deterministic clock and ids. */
export interface RepoDeps {
  now: () => number;
  uuid: () => UUID;
}

export const defaultDeps: RepoDeps = {
  now: () => Date.now(),
  uuid: () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
};

export interface TripInput {
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
}

export interface TravellerInput {
  name: string;
  accentColor: string;
  isSelf?: boolean;
}

export interface ContainerInput {
  kind: ContainerKind;
  subtype: ContainerSubtype;
  label: string;
  colorHex: string;
  slotIndex?: SlotIndex;
  capacityUnits?: number;
  parentContainerId?: UUID;
}

/**
 * `parentContainerId: undefined` is meaningful here — it detaches a nested
 * pouch — so it must be explicitly allowed under exactOptionalPropertyTypes.
 */
export type ContainerPatch = Partial<Omit<ContainerInput, 'kind' | 'parentContainerId'>> & {
  parentContainerId?: UUID | undefined;
};

export interface ItemInput {
  name: string;
  category: string;
  quantity?: number;
  size?: ItemSize;
  containerId?: UUID | null;
  essential?: boolean;
  notes?: string;
  photoDataUrl?: string;
}

/**
 * The single seam between the app and persistence. Every invariant from §3 is
 * enforced here, so the API refuses a fourth suitcase even if a caller forgets
 * to check (C6).
 */
export interface Repo {
  listTrips(): Promise<Trip[]>;
  getTrip(id: UUID): Promise<Trip | undefined>;
  createTrip(input: TripInput): Promise<Trip>;
  updateTrip(id: UUID, patch: Partial<TripInput>): Promise<void>;
  setArchived(id: UUID, archived: boolean): Promise<void>;
  deleteTrip(id: UUID): Promise<void>;
  duplicateTrip(id: UUID, name?: string): Promise<Result<Trip>>;

  listTravellers(tripId: UUID): Promise<Traveller[]>;
  addTraveller(tripId: UUID, input: TravellerInput): Promise<Traveller>;
  updateTraveller(id: UUID, patch: Partial<TravellerInput>): Promise<void>;
  deleteTraveller(id: UUID): Promise<void>;

  listContainers(tripId: UUID): Promise<Container[]>;
  addContainer(travellerId: UUID, input: ContainerInput): Promise<Result<Container>>;
  updateContainer(id: UUID, patch: ContainerPatch): Promise<Result<null>>;
  deleteContainer(id: UUID): Promise<void>;

  listItems(tripId: UUID): Promise<Item[]>;
  addItem(tripId: UUID, input: ItemInput): Promise<Item>;
  updateItem(id: UUID, patch: Partial<ItemInput> & { packed?: boolean }): Promise<void>;
  moveItem(id: UUID, containerId: UUID | null): Promise<Result<null>>;
  setPacked(id: UUID, packed: boolean): Promise<void>;
  deleteItem(id: UUID): Promise<void>;

  wipe(): Promise<void>;
}

export class DexieRepo implements Repo {
  constructor(
    private readonly database: PackupDb = db,
    private readonly deps: RepoDeps = defaultDeps,
  ) {}

  // ---- trips ----

  listTrips(): Promise<Trip[]> {
    return this.database.trips.orderBy('updatedAt').reverse().toArray();
  }

  getTrip(id: UUID): Promise<Trip | undefined> {
    return this.database.trips.get(id);
  }

  async createTrip(input: TripInput): Promise<Trip> {
    const now = this.deps.now();
    const trip: Trip = {
      id: this.deps.uuid(),
      name: input.name.trim() || 'Untitled trip',
      createdAt: now,
      updatedAt: now,
      ...definedOnly({
        destination: input.destination,
        startDate: input.startDate,
        endDate: input.endDate,
      }),
    };
    await this.database.trips.add(trip);
    return trip;
  }

  async updateTrip(id: UUID, patch: Partial<TripInput>): Promise<void> {
    await this.database.trips.update(id, { ...patch, updatedAt: this.deps.now() });
  }

  /** Archiving is a distinct operation because unarchiving must remove the key. */
  async setArchived(id: UUID, archived: boolean): Promise<void> {
    const now = this.deps.now();
    if (archived) {
      await this.database.trips.update(id, { archivedAt: now, updatedAt: now });
      return;
    }
    await this.database.trips.where({ id }).modify((trip) => {
      delete trip.archivedAt;
      trip.updatedAt = now;
    });
  }

  async deleteTrip(id: UUID): Promise<void> {
    const { trips, travellers, containers, items } = this.database;
    await this.database.transaction('rw', [trips, travellers, containers, items], async () => {
      const travellerIds = (await travellers.where({ tripId: id }).toArray()).map((t) => t.id);
      await containers.where('travellerId').anyOf(travellerIds).delete();
      await items.where({ tripId: id }).delete();
      await travellers.where({ tripId: id }).delete();
      await trips.delete(id);
    });
  }

  /** Copies structure and items, resets `packed` — a template for next time. */
  async duplicateTrip(id: UUID, name?: string): Promise<Result<Trip>> {
    const { trips, travellers, containers, items } = this.database;
    return this.database.transaction('rw', [trips, travellers, containers, items], async () => {
      const source = await trips.get(id);
      if (!source) return err('not-found', 'Trip not found.');

      const now = this.deps.now();
      const copy: Trip = {
        ...source,
        id: this.deps.uuid(),
        name: name ?? `${source.name} (copy)`,
        createdAt: now,
        updatedAt: now,
      };
      delete copy.archivedAt;
      await trips.add(copy);

      const idMap = new Map<UUID, UUID>();
      const sourceTravellers = await travellers.where({ tripId: id }).toArray();
      for (const t of sourceTravellers) {
        const newId = this.deps.uuid();
        idMap.set(t.id, newId);
        await travellers.add({ ...t, id: newId, tripId: copy.id });
      }

      const sourceContainers = await containers
        .where('travellerId')
        .anyOf(sourceTravellers.map((t) => t.id))
        .toArray();
      // Two passes: every id must exist before parents are rewired.
      for (const c of sourceContainers) idMap.set(c.id, this.deps.uuid());
      for (const c of sourceContainers) {
        const next: Container = {
          ...c,
          id: idMap.get(c.id)!,
          travellerId: idMap.get(c.travellerId)!,
          createdAt: now,
        };
        if (c.parentContainerId) next.parentContainerId = idMap.get(c.parentContainerId)!;
        await containers.add(next);
      }

      for (const item of await items.where({ tripId: id }).toArray()) {
        await items.add({
          ...item,
          id: this.deps.uuid(),
          tripId: copy.id,
          containerId: item.containerId ? (idMap.get(item.containerId) ?? null) : null,
          packed: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      return ok(copy);
    });
  }

  // ---- travellers ----

  listTravellers(tripId: UUID): Promise<Traveller[]> {
    return this.database.travellers.where({ tripId }).toArray();
  }

  async addTraveller(tripId: UUID, input: TravellerInput): Promise<Traveller> {
    const traveller: Traveller = {
      id: this.deps.uuid(),
      tripId,
      name: input.name.trim() || 'Traveller',
      accentColor: input.accentColor,
      isSelf: input.isSelf ?? false,
    };
    await this.database.travellers.add(traveller);
    await this.touchTrip(tripId);
    return traveller;
  }

  async updateTraveller(id: UUID, patch: Partial<TravellerInput>): Promise<void> {
    await this.database.travellers.update(id, patch);
    const traveller = await this.database.travellers.get(id);
    if (traveller) await this.touchTrip(traveller.tripId);
  }

  /** Deletes their containers and unassigns any items that were inside. */
  async deleteTraveller(id: UUID): Promise<void> {
    const { travellers, containers, items } = this.database;
    await this.database.transaction(
      'rw',
      [this.database.trips, travellers, containers, items],
      async () => {
        const traveller = await travellers.get(id);
        const owned = await containers.where({ travellerId: id }).toArray();
        const ownedIds = owned.map((c) => c.id);
        await items.where('containerId').anyOf(ownedIds).modify({
          containerId: null,
          updatedAt: this.deps.now(),
        });
        await containers.bulkDelete(ownedIds);
        await travellers.delete(id);
        if (traveller) await this.touchTrip(traveller.tripId);
      },
    );
  }

  // ---- containers ----

  async listContainers(tripId: UUID): Promise<Container[]> {
    const travellerIds = (await this.database.travellers.where({ tripId }).toArray()).map(
      (t) => t.id,
    );
    return this.database.containers.where('travellerId').anyOf(travellerIds).toArray();
  }

  async addContainer(travellerId: UUID, input: ContainerInput): Promise<Result<Container>> {
    const { travellers, containers } = this.database;
    return this.database.transaction(
      'rw',
      [this.database.trips, travellers, containers],
      async () => {
        const traveller = await travellers.get(travellerId);
        if (!traveller) return err('not-found', 'Traveller not found.');

        // Cap + slot check reads the traveller's current containers inside the
        // transaction, so two rapid taps cannot both pass (C6).
        const siblings = await containers.where({ travellerId }).toArray();
        const slot = canAddContainer(siblings, travellerId, input.kind, input.slotIndex);
        if (!slot.ok) return slot;

        const container: Container = {
          id: this.deps.uuid(),
          travellerId,
          kind: input.kind,
          subtype: input.subtype,
          label: input.label.trim() || defaultLabel(input.kind),
          colorHex: input.colorHex,
          slotIndex: slot.value,
          capacityUnits: input.capacityUnits ?? DEFAULT_CAPACITY[input.subtype],
          createdAt: this.deps.now(),
        };

        if (input.parentContainerId) {
          const nesting = canNest([...siblings, container], container.id, input.parentContainerId);
          if (!nesting.ok) return nesting;
          container.parentContainerId = input.parentContainerId;
        }

        await containers.add(container);
        await this.touchTrip(traveller.tripId);
        return ok(container);
      },
    );
  }

  async updateContainer(id: UUID, patch: ContainerPatch): Promise<Result<null>> {
    const { containers } = this.database;
    return this.database.transaction(
      'rw',
      [this.database.trips, this.database.travellers, containers],
      async () => {
        const current = await containers.get(id);
        if (!current) return err('not-found', 'Container not found.');

        const siblings = await containers.where({ travellerId: current.travellerId }).toArray();

        if (patch.slotIndex !== undefined && patch.slotIndex !== current.slotIndex) {
          const taken = siblings.some(
            (c) => c.id !== id && c.kind === current.kind && c.slotIndex === patch.slotIndex,
          );
          if (taken) return err('slot-taken', `Slot ${patch.slotIndex} is already used.`);
        }

        const detaching = 'parentContainerId' in patch && patch.parentContainerId === undefined;
        if ('parentContainerId' in patch) {
          const nesting = canNest(siblings, id, patch.parentContainerId);
          if (!nesting.ok) return nesting;
        }

        // Detaching must remove the key rather than store an undefined value.
        const { parentContainerId: _parent, ...rest } = patch;
        await containers.update(id, detaching ? rest : patch);
        if (detaching) {
          await containers.where({ id }).modify((c) => {
            delete c.parentContainerId;
          });
        }
        const traveller = await this.database.travellers.get(current.travellerId);
        if (traveller) await this.touchTrip(traveller.tripId);
        return ok(null);
      },
    );
  }

  /** §3: deleting a container unassigns its items — it never deletes them. */
  async deleteContainer(id: UUID): Promise<void> {
    const { travellers, containers, items } = this.database;
    await this.database.transaction(
      'rw',
      [this.database.trips, travellers, containers, items],
      async () => {
        const container = await containers.get(id);
        if (!container) return;

        // A nested pouch is promoted to top level rather than deleted with its
        // parent. The key must be removed, not set to undefined, so that
        // `'parentContainerId' in container` stays a reliable nesting test.
        await containers.where({ parentContainerId: id }).modify((child) => {
          delete child.parentContainerId;
        });

        await items.where({ containerId: id }).modify({
          containerId: null,
          updatedAt: this.deps.now(),
        });
        await containers.delete(id);

        const traveller = await travellers.get(container.travellerId);
        if (traveller) await this.touchTrip(traveller.tripId);
      },
    );
  }

  // ---- items ----

  listItems(tripId: UUID): Promise<Item[]> {
    return this.database.items.where({ tripId }).toArray();
  }

  async addItem(tripId: UUID, input: ItemInput): Promise<Item> {
    const now = this.deps.now();
    const item: Item = {
      id: this.deps.uuid(),
      tripId,
      name: input.name.trim() || 'Item',
      category: input.category,
      quantity: Math.max(1, input.quantity ?? 1),
      size: input.size ?? 'small',
      containerId: input.containerId ?? null,
      packed: false,
      essential: input.essential ?? false,
      createdAt: now,
      updatedAt: now,
      ...definedOnly({ notes: input.notes, photoDataUrl: input.photoDataUrl }),
    };
    await this.database.items.add(item);
    await this.touchTrip(tripId);
    return item;
  }

  async updateItem(id: UUID, patch: Partial<ItemInput> & { packed?: boolean }): Promise<void> {
    const next: Record<string, unknown> = { ...patch, updatedAt: this.deps.now() };
    if (patch.quantity !== undefined) next.quantity = Math.max(1, patch.quantity);
    await this.database.items.update(id, next);
    const item = await this.database.items.get(id);
    if (item) await this.touchTrip(item.tripId);
  }

  async moveItem(id: UUID, containerId: UUID | null): Promise<Result<null>> {
    const { containers, items } = this.database;
    return this.database.transaction(
      'rw',
      [this.database.trips, this.database.travellers, containers, items],
      async () => {
        const item = await items.get(id);
        if (!item) return err('not-found', 'Item not found.');
        if (containerId !== null && !(await containers.get(containerId))) {
          return err('not-found', 'Container not found.');
        }
        await items.update(id, { containerId, updatedAt: this.deps.now() });
        await this.touchTrip(item.tripId);
        return ok(null);
      },
    );
  }

  async setPacked(id: UUID, packed: boolean): Promise<void> {
    await this.database.items.update(id, { packed, updatedAt: this.deps.now() });
    const item = await this.database.items.get(id);
    if (item) await this.touchTrip(item.tripId);
  }

  async deleteItem(id: UUID): Promise<void> {
    const item = await this.database.items.get(id);
    await this.database.items.delete(id);
    if (item) await this.touchTrip(item.tripId);
  }

  async wipe(): Promise<void> {
    const { trips, travellers, containers, items } = this.database;
    await this.database.transaction('rw', [trips, travellers, containers, items], async () => {
      await Promise.all([trips.clear(), travellers.clear(), containers.clear(), items.clear()]);
    });
  }

  private async touchTrip(tripId: UUID): Promise<void> {
    await this.database.trips.update(tripId, { updatedAt: this.deps.now() });
  }
}

function defaultLabel(kind: ContainerKind): string {
  const labels: Record<ContainerKind, string> = {
    suitcase: 'Suitcase',
    bag: 'Bag',
    pouch: 'Pouch',
    person: 'On me',
  };
  return labels[kind];
}

/**
 * `exactOptionalPropertyTypes` means an explicit `undefined` is not the same as
 * an absent key, and Dexie would store the key either way.
 */
function definedOnly<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export const repo: Repo = new DexieRepo();
