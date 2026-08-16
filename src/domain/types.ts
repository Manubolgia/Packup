export type UUID = string;

export interface Trip {
  id: UUID;
  name: string; // "Japan, October"
  destination?: string;
  startDate?: string; // ISO date, no time
  endDate?: string;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
}

export interface Traveller {
  id: UUID;
  tripId: UUID;
  name: string; // "Me", "Marta", "Kid"
  accentColor: string; // hex, used in 3D + list
  isSelf: boolean;
  // Tab order. Without it, Dexie returns travellers in primary-key order —
  // i.e. by random UUID — so the tab strip reshuffles between loads.
  createdAt: number;
}

export type ContainerKind = 'suitcase' | 'bag' | 'pouch' | 'person';

export type ContainerSubtype =
  | 'hardshell-large'
  | 'hardshell-cabin'
  | 'duffel' // suitcase
  | 'backpack'
  | 'tote'
  | 'shoulder-bag'
  | 'laptop-bag' // bag
  | 'packing-cube'
  | 'toiletry-bag'
  | 'purse'
  | 'ziplock' // pouch
  | 'pockets'
  | 'worn'; // person

export interface Container {
  id: UUID;
  travellerId: UUID;
  kind: ContainerKind;
  subtype: ContainerSubtype;
  label: string; // "Big black Samsonite"
  colorHex: string;
  slotIndex: 0 | 1 | 2; // position in its row of the 3D scene
  capacityUnits: number; // see §5 volume model
  parentContainerId?: UUID; // a pouch may live inside a suitcase/bag. ONE level only.
  createdAt: number;
}

export type ItemSize = 'small' | 'medium' | 'large'; // 1 / 3 / 8 units

export interface Item {
  id: UUID;
  tripId: UUID;
  name: string;
  category: string; // free text with suggested presets
  quantity: number; // >= 1
  size: ItemSize;
  containerId: UUID | null; // null = unassigned ("still to pack")
  packed: boolean; // physically in the bag right now
  essential: boolean; // surfaces in the "don't leave without" filter
  notes?: string;
  photoDataUrl?: string; // optional, downscaled to <= 512px, JPEG q0.7
  createdAt: number;
  updatedAt: number;
}
