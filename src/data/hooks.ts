import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Container, Item, Trip, Traveller, UUID } from '@/domain/types';

/**
 * Live reads. Components use these instead of touching Dexie (C3): useLiveQuery
 * re-renders on any write, so nothing persisted is ever mirrored into zustand.
 *
 * The queries live here rather than in repo.ts because the repo API is
 * promise-based and swappable; these are the React binding for it.
 */

export function useTrips(): Trip[] | undefined {
  return useLiveQuery(() => db.trips.orderBy('updatedAt').reverse().toArray(), []);
}

export function useTrip(tripId: UUID | undefined): Trip | undefined {
  return useLiveQuery(async () => (tripId ? db.trips.get(tripId) : undefined), [tripId]);
}

export function useTravellers(tripId: UUID | undefined): Traveller[] | undefined {
  return useLiveQuery(
    async () => (tripId ? db.travellers.where({ tripId }).toArray() : []),
    [tripId],
  );
}

export function useContainers(tripId: UUID | undefined): Container[] | undefined {
  return useLiveQuery(async () => {
    if (!tripId) return [];
    const travellerIds = (await db.travellers.where({ tripId }).toArray()).map((t) => t.id);
    return db.containers.where('travellerId').anyOf(travellerIds).toArray();
  }, [tripId]);
}

export function useItems(tripId: UUID | undefined): Item[] | undefined {
  return useLiveQuery(async () => (tripId ? db.items.where({ tripId }).toArray() : []), [tripId]);
}

export interface TripProgress {
  packed: number;
  total: number;
}

/** packed/total across every trip, for the list rows, in one pass. */
export function useTripProgress(): Map<UUID, TripProgress> | undefined {
  return useLiveQuery(async () => {
    const map = new Map<UUID, TripProgress>();
    await db.items.each((item) => {
      const current = map.get(item.tripId) ?? { packed: 0, total: 0 };
      current.total += 1;
      if (item.packed) current.packed += 1;
      map.set(item.tripId, current);
    });
    return map;
  }, []);
}

/** Traveller list per trip, for the avatar strip on each card. */
export function useTravellersByTrip(): Map<UUID, Traveller[]> | undefined {
  return useLiveQuery(async () => {
    const map = new Map<UUID, Traveller[]>();
    await db.travellers.each((t) => {
      const list = map.get(t.tripId) ?? [];
      list.push(t);
      map.set(t.tripId, list);
    });
    return map;
  }, []);
}
