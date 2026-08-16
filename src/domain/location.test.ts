import { describe, expect, it } from 'vitest';
import { containersForTraveller, formatLocation, resolveLocation } from './location';
import type { Container, Traveller } from './types';

const marta: Traveller = {
  id: 't1',
  tripId: 'trip',
  name: 'Marta',
  accentColor: '#E8A317',
  isSelf: false,
  createdAt: 0,
};

const suitcase: Container = {
  id: 'c1',
  travellerId: 't1',
  kind: 'suitcase',
  subtype: 'hardshell-large',
  label: 'Big black Samsonite',
  colorHex: '#14171A',
  slotIndex: 0,
  capacityUnits: 120,
  createdAt: 0,
};

const cube: Container = {
  id: 'c2',
  travellerId: 't1',
  kind: 'pouch',
  subtype: 'packing-cube',
  label: 'Blue cube',
  colorHex: '#E8A317',
  slotIndex: 0,
  capacityUnits: 15,
  parentContainerId: 'c1',
  createdAt: 0,
};

const ctx = { containers: [suitcase, cube], travellers: [marta] };

describe('resolveLocation', () => {
  it('returns Unassigned for an unpacked item', () => {
    expect(resolveLocation({ containerId: null }, ctx)).toEqual(['Unassigned']);
  });

  it('returns traveller › container for a top-level container', () => {
    expect(resolveLocation({ containerId: 'c1' }, ctx)).toEqual(['Marta', 'Big black Samsonite']);
  });

  it('returns the full chain for a nested pouch, outermost first', () => {
    expect(resolveLocation({ containerId: 'c2' }, ctx)).toEqual([
      'Marta',
      'Big black Samsonite',
      'Blue cube',
    ]);
  });

  it('falls back to Unassigned when the container was deleted', () => {
    expect(resolveLocation({ containerId: 'gone' }, ctx)).toEqual(['Unassigned']);
  });

  it('formats a breadcrumb on one line', () => {
    expect(formatLocation(resolveLocation({ containerId: 'c2' }, ctx))).toBe(
      'Marta › Big black Samsonite › Blue cube',
    );
  });
});

describe('containersForTraveller', () => {
  it('lists parents immediately followed by their children', () => {
    const bag: Container = {
      ...suitcase,
      id: 'c3',
      kind: 'bag',
      subtype: 'backpack',
      label: 'Daypack',
    };
    const ordered = containersForTraveller([cube, bag, suitcase], 't1');
    expect(ordered.map((c) => c.id)).toEqual(['c3', 'c1', 'c2']);
  });

  it('excludes other travellers', () => {
    const theirs: Container = { ...suitcase, id: 'c9', travellerId: 't2' };
    expect(containersForTraveller([suitcase, theirs], 't1').map((c) => c.id)).toEqual(['c1']);
  });
});
