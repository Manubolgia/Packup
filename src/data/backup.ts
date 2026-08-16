import { db, PackupDb } from './db';
import { defaultDeps, type RepoDeps } from './repo';
import { err, ok, type Result } from '@/domain/result';
import type { Container, Item, Trip, Traveller, UUID } from '@/domain/types';

export const SCHEMA_VERSION = 1;

export interface TripBackup {
  schemaVersion: number;
  exportedAt: number;
  trip: Trip;
  travellers: Traveller[];
  containers: Container[];
  items: Item[];
}

export async function exportTrip(
  tripId: UUID,
  database: PackupDb = db,
): Promise<Result<TripBackup>> {
  const trip = await database.trips.get(tripId);
  if (!trip) return err('not-found', 'Trip not found.');

  const travellers = await database.travellers.where({ tripId }).toArray();
  const containers = await database.containers
    .where('travellerId')
    .anyOf(travellers.map((t) => t.id))
    .toArray();
  const items = await database.items.where({ tripId }).toArray();

  return ok({
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    trip,
    travellers,
    containers,
    items,
  });
}

export function serializeBackup(backup: TripBackup): string {
  return JSON.stringify(backup, null, 2);
}

export function backupFilename(backup: TripBackup): string {
  const slug =
    backup.trip.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'trip';
  return `packup-${slug}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Structural validation — an imported file is untrusted input. */
export function parseBackup(raw: string): Result<TripBackup> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return err('invalid-field', 'That file is not valid JSON.');
  }
  if (!isRecord(parsed)) return err('invalid-field', 'That file is not a Packup backup.');

  const { schemaVersion, trip, travellers, containers, items } = parsed;
  if (typeof schemaVersion !== 'number') {
    return err('invalid-field', 'That file is not a Packup backup.');
  }
  if (schemaVersion > SCHEMA_VERSION) {
    return err('invalid-field', 'This backup was made by a newer version of Packup.');
  }
  if (!isRecord(trip) || typeof trip.name !== 'string') {
    return err('invalid-field', 'That backup has no trip in it.');
  }
  if (!Array.isArray(travellers) || !Array.isArray(containers) || !Array.isArray(items)) {
    return err('invalid-field', 'That backup is missing entries.');
  }

  return ok({
    schemaVersion,
    exportedAt: typeof parsed.exportedAt === 'number' ? parsed.exportedAt : Date.now(),
    trip: trip as unknown as Trip,
    travellers: travellers as Traveller[],
    containers: containers as Container[],
    items: items as Item[],
  });
}

/**
 * Imports as a NEW trip: every id is remapped so importing a backup twice, or
 * onto the device it came from, cannot collide with what is already stored.
 */
export async function importTrip(
  backup: TripBackup,
  database: PackupDb = db,
  deps: RepoDeps = defaultDeps,
): Promise<Result<Trip>> {
  const { trips, travellers, containers, items } = database;
  return database.transaction('rw', [trips, travellers, containers, items], async () => {
    const now = deps.now();
    const idMap = new Map<UUID, UUID>();
    const remap = (id: UUID): UUID => {
      const existing = idMap.get(id);
      if (existing) return existing;
      const next = deps.uuid();
      idMap.set(id, next);
      return next;
    };

    const trip: Trip = {
      ...backup.trip,
      id: remap(backup.trip.id),
      createdAt: backup.trip.createdAt ?? now,
      updatedAt: now,
    };
    await trips.add(trip);

    for (const t of backup.travellers) {
      await travellers.add({ ...t, id: remap(t.id), tripId: trip.id });
    }

    for (const c of backup.containers) remap(c.id);
    for (const c of backup.containers) {
      const next: Container = {
        ...c,
        id: remap(c.id),
        travellerId: remap(c.travellerId),
      };
      if (c.parentContainerId) next.parentContainerId = remap(c.parentContainerId);
      await containers.add(next);
    }

    for (const item of backup.items) {
      await items.add({
        ...item,
        id: remap(item.id),
        tripId: trip.id,
        containerId: item.containerId ? remap(item.containerId) : null,
      });
    }

    return ok(trip);
  });
}
