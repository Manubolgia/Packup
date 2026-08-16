import type { ContainerKind, ContainerSubtype } from './types';

/**
 * The subtype picker's source of truth, shared by the add-luggage sheet (M3)
 * and the 3D geometry switch (M4) so the two can never disagree about which
 * subtypes belong to which kind.
 */
export interface SubtypeSpec {
  subtype: ContainerSubtype;
  kind: ContainerKind;
  label: string;
  /** Placeholder shown in the label field — a plausible real-world name. */
  placeholder: string;
}

export const SUBTYPES: readonly SubtypeSpec[] = [
  {
    subtype: 'hardshell-large',
    kind: 'suitcase',
    label: 'Hardshell large',
    placeholder: 'Big black Samsonite',
  },
  {
    subtype: 'hardshell-cabin',
    kind: 'suitcase',
    label: 'Cabin case',
    placeholder: 'Carry-on',
  },
  { subtype: 'duffel', kind: 'suitcase', label: 'Duffel', placeholder: 'Grey duffel' },

  { subtype: 'backpack', kind: 'bag', label: 'Backpack', placeholder: 'Day pack' },
  { subtype: 'tote', kind: 'bag', label: 'Tote', placeholder: 'Canvas tote' },
  { subtype: 'shoulder-bag', kind: 'bag', label: 'Shoulder bag', placeholder: 'Sling' },
  { subtype: 'laptop-bag', kind: 'bag', label: 'Laptop bag', placeholder: 'Work bag' },

  { subtype: 'packing-cube', kind: 'pouch', label: 'Packing cube', placeholder: 'Blue cube' },
  { subtype: 'toiletry-bag', kind: 'pouch', label: 'Toiletry bag', placeholder: 'Washbag' },
  { subtype: 'purse', kind: 'pouch', label: 'Purse', placeholder: 'Coin purse' },
  { subtype: 'ziplock', kind: 'pouch', label: 'Ziplock', placeholder: 'Liquids bag' },

  { subtype: 'pockets', kind: 'person', label: 'Pockets', placeholder: 'Pockets' },
  { subtype: 'worn', kind: 'person', label: 'Worn', placeholder: 'What I’m wearing' },
];

export function subtypesForKind(kind: ContainerKind): SubtypeSpec[] {
  return SUBTYPES.filter((s) => s.kind === kind);
}

export function subtypeSpec(subtype: ContainerSubtype): SubtypeSpec {
  const found = SUBTYPES.find((s) => s.subtype === subtype);
  if (!found) throw new Error(`Unknown subtype: ${subtype}`);
  return found;
}

export const KIND_LABEL: Record<ContainerKind, string> = {
  suitcase: 'Suitcase',
  bag: 'Bag',
  pouch: 'Pouch',
  person: 'On me',
};

/** Plural form for cap messages: "3 of 3 suitcases". */
export const KIND_PLURAL: Record<ContainerKind, string> = {
  suitcase: 'suitcases',
  bag: 'bags',
  pouch: 'pouches',
  person: 'person',
};

/**
 * Muted, luggage-plausible palette. Deliberately not the traveller accents.
 * The mid-grey leads because it is the default: the near-black reads as a hole
 * against the 3D ground plane, so it is a choice, never the fallback.
 */
export const CONTAINER_COLORS = [
  '#8A8F96',
  '#4A6FA5',
  '#5F7A61',
  '#C2401F',
  '#E8A317',
  '#2B3138',
] as const;
