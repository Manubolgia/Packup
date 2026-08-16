import type { ItemSize } from './types';

/**
 * The preset library behind the "add item" autocomplete (§4.2). Kept in domain/
 * because it is pure data with no React or browser dependency, and because the
 * sizes here are the same volume model the fill bars use.
 */
export interface ItemPreset {
  name: string;
  category: string;
  size: ItemSize;
  essential?: boolean;
}

export const ITEM_CATEGORIES = [
  'Clothing',
  'Tech',
  'Toiletries',
  'Documents',
  'Medical',
  'Shoes',
  'Kids',
  'Misc',
] as const;

export const ITEM_PRESETS: readonly ItemPreset[] = [
  { name: 'Passport', category: 'Documents', size: 'small', essential: true },
  { name: 'Wallet', category: 'Documents', size: 'small', essential: true },
  { name: 'Phone charger', category: 'Tech', size: 'small', essential: true },
  { name: 'Laptop', category: 'Tech', size: 'medium' },
  { name: 'Laptop charger', category: 'Tech', size: 'small' },
  { name: 'Headphones', category: 'Tech', size: 'small' },
  { name: 'Power bank', category: 'Tech', size: 'small' },
  { name: 'Travel adapter', category: 'Tech', size: 'small', essential: true },
  { name: 'Camera', category: 'Tech', size: 'medium' },

  { name: 'T-shirt', category: 'Clothing', size: 'small' },
  { name: 'Jeans', category: 'Clothing', size: 'medium' },
  { name: 'Jumper', category: 'Clothing', size: 'medium' },
  { name: 'Jacket', category: 'Clothing', size: 'large' },
  { name: 'Underwear', category: 'Clothing', size: 'small' },
  { name: 'Socks', category: 'Clothing', size: 'small' },
  { name: 'Pyjamas', category: 'Clothing', size: 'medium' },
  { name: 'Swimwear', category: 'Clothing', size: 'small' },
  { name: 'Trainers', category: 'Shoes', size: 'large' },
  { name: 'Sandals', category: 'Shoes', size: 'medium' },

  { name: 'Toothbrush', category: 'Toiletries', size: 'small' },
  { name: 'Toothpaste', category: 'Toiletries', size: 'small' },
  { name: 'Shampoo', category: 'Toiletries', size: 'small' },
  { name: 'Deodorant', category: 'Toiletries', size: 'small' },
  { name: 'Sunscreen', category: 'Toiletries', size: 'small' },
  { name: 'Razor', category: 'Toiletries', size: 'small' },

  { name: 'Medication', category: 'Medical', size: 'small', essential: true },
  { name: 'Plasters', category: 'Medical', size: 'small' },
  { name: 'Painkillers', category: 'Medical', size: 'small' },

  { name: 'Book', category: 'Misc', size: 'medium' },
  { name: 'Sunglasses', category: 'Misc', size: 'small' },
  { name: 'Water bottle', category: 'Misc', size: 'medium' },
  { name: 'Umbrella', category: 'Misc', size: 'medium' },
];

/**
 * Autocomplete over presets plus names already used in this trip, so the
 * second "T-shirt" is one tap and keeps the same category and size.
 */
export function suggestItems(
  query: string,
  existingNames: readonly ItemPreset[],
  limit = 6,
): ItemPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // Trip items first: what this traveller actually packs beats a generic list.
  const pool = [...existingNames, ...ITEM_PRESETS];
  const seen = new Set<string>();
  const matches: ItemPreset[] = [];

  for (const preset of pool) {
    const key = preset.name.toLowerCase();
    if (seen.has(key) || !key.includes(q)) continue;
    seen.add(key);
    matches.push(preset);
    if (matches.length >= limit) break;
  }

  // Prefix matches read as more relevant than mid-word ones.
  return matches.sort((a, b) => {
    const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return ap - bp;
  });
}
