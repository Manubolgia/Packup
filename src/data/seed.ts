import { DexieRepo, type Repo } from './repo';
import { unwrap } from '@/domain/result';
import type { ItemSize, Trip, UUID } from '@/domain/types';

/**
 * The one-tap sample trip (§4.1). This is the first thing a store reviewer
 * sees, so it is a plausible two-person trip with a partly-packed state, not
 * lorem ipsum: some items packed, some still loose, one bag over capacity.
 */

const ACCENTS = ['#E8A317', '#F2F2F0'] as const;

interface SeedItem {
  name: string;
  category: string;
  size: ItemSize;
  quantity?: number;
  packed?: boolean;
  essential?: boolean;
  slot: string;
}

export async function seedSampleTrip(repo: Repo = new DexieRepo()): Promise<Trip> {
  const today = new Date();
  const start = new Date(today.getTime() + 21 * 86_400_000);
  const end = new Date(start.getTime() + 13 * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const trip = await repo.createTrip({
    name: 'Japan, October',
    destination: 'Tokyo & Kyoto',
    startDate: iso(start),
    endDate: iso(end),
  });

  const me = await repo.addTraveller(trip.id, {
    name: 'Me',
    accentColor: ACCENTS[0],
    isSelf: true,
  });
  const marta = await repo.addTraveller(trip.id, {
    name: 'Marta',
    accentColor: ACCENTS[1],
  });

  const containerIds = new Map<string, UUID>();
  const add = async (
    key: string,
    travellerId: UUID,
    input: Parameters<Repo['addContainer']>[1],
  ) => {
    const created = unwrap(await repo.addContainer(travellerId, input));
    containerIds.set(key, created.id);
    return created;
  };

  const bigCase = await add('big-case', me.id, {
    kind: 'suitcase',
    subtype: 'hardshell-large',
    label: 'Big black Samsonite',
    colorHex: '#14171A',
  });
  await add('daypack', me.id, {
    kind: 'bag',
    subtype: 'backpack',
    label: 'Grey daypack',
    colorHex: '#4A4F55',
  });
  await add('tech-pouch', me.id, {
    kind: 'pouch',
    subtype: 'packing-cube',
    label: 'Tech pouch',
    colorHex: '#E8A317',
    parentContainerId: bigCase.id,
  });
  await add('on-me', me.id, {
    kind: 'person',
    subtype: 'pockets',
    label: 'On me',
    colorHex: '#E8A317',
  });

  const martaCase = await add('marta-case', marta.id, {
    kind: 'suitcase',
    subtype: 'hardshell-cabin',
    label: 'Cabin trolley',
    colorHex: '#8A8F96',
  });
  await add('toiletries', marta.id, {
    // Overridden below the subtype default so the sample shows an over-capacity
    // state on load — the amber ring is a headline feature and should be visible.
    capacityUnits: 8,
    kind: 'pouch',
    subtype: 'toiletry-bag',
    label: 'Toiletries',
    colorHex: '#C2401F',
    parentContainerId: martaCase.id,
  });
  await add('tote', marta.id, {
    kind: 'bag',
    subtype: 'tote',
    label: 'Canvas tote',
    colorHex: '#F2F2F0',
  });

  const items: SeedItem[] = [
    // Deliberately over-capacity: the toiletry bag shows an amber ring.
    {
      name: 'Shampoo bar',
      category: 'Toiletries',
      size: 'small',
      slot: 'toiletries',
      packed: true,
    },
    {
      name: 'Toothbrush',
      category: 'Toiletries',
      size: 'small',
      slot: 'toiletries',
      packed: true,
      quantity: 2,
    },
    { name: 'Sunscreen', category: 'Toiletries', size: 'medium', slot: 'toiletries', packed: true },
    { name: 'Makeup bag', category: 'Toiletries', size: 'medium', slot: 'toiletries' },

    {
      name: 'Passport',
      category: 'Documents',
      size: 'small',
      slot: 'on-me',
      packed: true,
      essential: true,
    },
    {
      name: 'Wallet',
      category: 'Documents',
      size: 'small',
      slot: 'on-me',
      packed: true,
      essential: true,
    },
    {
      name: 'Phone',
      category: 'Tech',
      size: 'small',
      slot: 'on-me',
      packed: true,
      essential: true,
    },

    {
      name: 'Laptop charger',
      category: 'Tech',
      size: 'small',
      slot: 'tech-pouch',
      packed: true,
      essential: true,
    },
    {
      name: 'Power adapter (Type A)',
      category: 'Tech',
      size: 'small',
      slot: 'tech-pouch',
      packed: true,
      essential: true,
    },
    {
      name: 'Camera battery',
      category: 'Tech',
      size: 'small',
      slot: 'tech-pouch',
      packed: true,
      quantity: 3,
    },
    { name: 'Headphones', category: 'Tech', size: 'small', slot: 'tech-pouch' },

    {
      name: 'Merino t-shirts',
      category: 'Clothes',
      size: 'small',
      quantity: 5,
      slot: 'big-case',
      packed: true,
    },
    {
      name: 'Jeans',
      category: 'Clothes',
      size: 'medium',
      quantity: 2,
      slot: 'big-case',
      packed: true,
    },
    { name: 'Rain shell', category: 'Clothes', size: 'medium', slot: 'big-case', packed: true },
    { name: 'Running shoes', category: 'Shoes', size: 'large', slot: 'big-case' },
    { name: 'Packing cubes (spare)', category: 'Misc', size: 'medium', slot: 'big-case' },

    {
      name: 'Laptop',
      category: 'Tech',
      size: 'medium',
      slot: 'daypack',
      packed: true,
      essential: true,
    },
    { name: 'Water bottle', category: 'Misc', size: 'medium', slot: 'daypack', packed: true },
    { name: 'Guidebook', category: 'Misc', size: 'small', slot: 'daypack' },

    {
      name: 'Dresses',
      category: 'Clothes',
      size: 'medium',
      quantity: 3,
      slot: 'marta-case',
      packed: true,
    },
    { name: 'Cardigan', category: 'Clothes', size: 'medium', slot: 'marta-case', packed: true },
    { name: 'Trainers', category: 'Shoes', size: 'large', slot: 'marta-case' },

    { name: 'Sunglasses', category: 'Misc', size: 'small', slot: 'tote', packed: true },
    { name: 'Book', category: 'Misc', size: 'small', slot: 'tote' },

    // Unassigned — the "still to pack" pile the drawer opens on.
    { name: 'JR Rail Pass', category: 'Documents', size: 'small', slot: '', essential: true },
    { name: 'Umbrella', category: 'Misc', size: 'medium', slot: '' },
    { name: 'Gifts for hosts', category: 'Misc', size: 'medium', quantity: 2, slot: '' },
  ];

  for (const spec of items) {
    const containerId = spec.slot ? (containerIds.get(spec.slot) ?? null) : null;
    const created = await repo.addItem(trip.id, {
      name: spec.name,
      category: spec.category,
      size: spec.size,
      quantity: spec.quantity ?? 1,
      containerId,
      essential: spec.essential ?? false,
    });
    if (spec.packed) await repo.setPacked(created.id, true);
  }

  return trip;
}
