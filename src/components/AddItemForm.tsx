import { useMemo, useState } from 'react';
import type { Item, ItemSize } from '@/domain/types';
import { ITEM_CATEGORIES, suggestItems, type ItemPreset } from '@/domain/presets';
import { SIZE_UNITS } from '@/domain/volume';
import { Button } from './ui/Button';
import { Input } from './ui/Field';

export interface AddItemValues {
  name: string;
  category: string;
  size: ItemSize;
  quantity: number;
  essential: boolean;
}

export interface AddItemFormProps {
  /** Items already in this trip, so the autocomplete learns from real use. */
  tripItems: readonly Item[];
  onAdd: (values: AddItemValues) => void;
}

const SIZES: readonly ItemSize[] = ['small', 'medium', 'large'];

/**
 * The "add item here" input (§4.2). One line plus a suggestion list: picking a
 * suggestion fills category and size too, so the common case is two taps.
 */
export function AddItemForm({ tripItems, onAdd }: AddItemFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(ITEM_CATEGORIES[0]);
  const [size, setSize] = useState<ItemSize>('small');
  const [essential, setEssential] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Names already in the trip, deduped, as autocomplete candidates.
  const fromTrip = useMemo<ItemPreset[]>(() => {
    const seen = new Set<string>();
    const out: ItemPreset[] = [];
    for (const item of tripItems) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: item.name, category: item.category, size: item.size });
    }
    return out;
  }, [tripItems]);

  const suggestions = useMemo(() => suggestItems(name, fromTrip), [name, fromTrip]);

  function submit(values?: Partial<AddItemValues>) {
    const finalName = (values?.name ?? name).trim();
    if (!finalName) return;
    onAdd({
      name: finalName,
      category: values?.category ?? category,
      size: values?.size ?? size,
      quantity: 1,
      essential: values?.essential ?? essential,
    });
    setName('');
    setEssential(false);
    setExpanded(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          value={name}
          placeholder="Add an item…"
          aria-label="Item name"
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setExpanded(true)}
        />
        <Button type="submit" disabled={!name.trim()}>
          Add
        </Button>
      </form>

      {suggestions.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <li key={`${s.name}-${s.category}`}>
              <button
                onClick={() => submit({ name: s.name, category: s.category, size: s.size, essential: s.essential ?? false })}
                className="u-data border border-[var(--app-border)] px-2 py-1 text-[0.625rem] text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-fg)]"
              >
                {s.name}
                <span className="ml-1.5 text-[var(--app-faint)]">{SIZE_UNITS[s.size]}u</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {expanded ? (
        <div className="flex flex-col gap-2 border-t border-[var(--app-border)] pt-2">
          <div className="flex flex-wrap gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={[
                  'u-label border px-2 py-1.5 text-[0.5rem]',
                  size === s
                    ? 'border-[var(--app-fg)] text-[var(--app-fg)]'
                    : 'border-[var(--app-border)] text-[var(--app-muted)]',
                ].join(' ')}
              >
                {s} · {SIZE_UNITS[s]}u
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={category}
              aria-label="Category"
              onChange={(e) => setCategory(e.target.value)}
              className="min-h-9 flex-1 border border-[var(--app-border)] bg-[var(--app-sunken)] px-2 text-xs text-[var(--app-fg)]"
            >
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="flex min-h-9 items-center gap-2">
              <input
                type="checkbox"
                checked={essential}
                onChange={(e) => setEssential(e.target.checked)}
                className="h-4 w-4 accent-[var(--app-accent)]"
              />
              <span className="u-label text-[0.5rem] text-[var(--app-muted)]">Essential</span>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
