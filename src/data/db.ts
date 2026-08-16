import Dexie, { type EntityTable } from 'dexie';
import type { Container, Item, Trip, Traveller } from '@/domain/types';

/**
 * Schema v1. Only src/data/* may import this module (C3, enforced by ESLint) —
 * everything above goes through repo.ts, so a native SQLite driver can replace
 * this file without touching a component.
 */
export class PackupDb extends Dexie {
  trips!: EntityTable<Trip, 'id'>;
  travellers!: EntityTable<Traveller, 'id'>;
  containers!: EntityTable<Container, 'id'>;
  items!: EntityTable<Item, 'id'>;

  constructor(name = 'packup') {
    super(name);

    // Indexes are the query shapes the screens actually use: a trip's
    // travellers, a traveller's containers by kind (cap checks), a trip's
    // items, and an item's container (the drawer and "where is it?").
    this.version(1).stores({
      trips: 'id, createdAt, updatedAt, archivedAt',
      travellers: 'id, tripId, [tripId+isSelf]',
      containers: 'id, travellerId, parentContainerId, [travellerId+kind]',
      items: 'id, tripId, containerId, packed, essential, [tripId+containerId], [tripId+packed]',
    });

    // v2 adds traveller.createdAt so the tab strip has a stable order. Rows
    // written by v1 have no such field; they are backfilled from the trip's own
    // creation time, which keeps existing installs from reordering on upgrade.
    this.version(2)
      .stores({ travellers: 'id, tripId, [tripId+createdAt], [tripId+isSelf]' })
      .upgrade(async (tx) => {
        const trips = await tx.table<Trip>('trips').toArray();
        const createdByTrip = new Map(trips.map((t) => [t.id, t.createdAt]));
        await tx.table<Traveller>('travellers').toCollection().modify((traveller) => {
          traveller.createdAt ??= createdByTrip.get(traveller.tripId) ?? Date.now();
        });
      });
  }
}

export const db = new PackupDb();
