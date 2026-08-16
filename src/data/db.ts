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
  }
}

export const db = new PackupDb();
