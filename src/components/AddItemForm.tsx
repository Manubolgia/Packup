import { useMemo, useState } from 'react';
import type { Item, ItemSize } from '@/domain/types';
import { ITEM_CATEGORIES, suggestItems, type ItemPreset } from '@/domain/presets';
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
                onClick={() =>
                  submit({
                    name: s.name,
                    category: s.category,
                    size: s.size,
                    essential: s.essential ?? false,
                  })
                }
                className="u-data border border-[var(--app-border)] px-2 py-1 text-[0.625rem] text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-fg)]"
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {expanded ? (
        <div className="flex flex-col gap-3 border-t border-[var(--app-border)] pt-3 motion-safe:animate-[row-in_var(--dur)_var(--ease)]">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="u-label text-[0.5625rem] text-[var(--app-muted)]">Size</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  aria-pressed={size === s}
                  className={[
                    'u-label min-h-10 border px-2 text-[0.5625rem]',
                    'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
                    size === s
                      ? 'border-[var(--app-fg)] bg-[var(--app-sunken)] text-[var(--app-fg)]'
                      : 'border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-fg)]',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="u-label text-[0.5625rem] text-[var(--app-muted)]">Category</legend>
            <div className="grid grid-cols-4 gap-1.5">
              {ITEM_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={[
                    'u-label min-h-10 border px-1 text-[0.5625rem]',
                    'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
                    category === c
                      ? 'border-[var(--app-fg)] bg-[var(--app-sunken)] text-[var(--app-fg)]'
                      : 'border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-fg)]',
                  ].join(' ')}
                >
                  {c}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={() => setEssential(!essential)}
            aria-pressed={essential}
            className={[
              'flex min-h-11 items-center justify-between border px-3',
              'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
              essential
                ? 'border-[var(--app-accent)] text-[var(--app-fg)]'
                : 'border-[var(--app-border)] text-[var(--app-muted)]',
            ].join(' ')}
          >
            <span className="u-label text-[0.5625rem]">Essential — don’t leave without it</span>
            <span
              aria-hidden="true"
              className={[
                'u-label text-[0.5625rem]',
                essential ? 'text-[var(--app-accent)]' : 'text-[var(--app-faint)]',
              ].join(' ')}
            >
              {essential ? 'On' : 'Off'}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
