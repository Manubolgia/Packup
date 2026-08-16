import { useEffect, useState } from 'react';
import type { Traveller } from '@/domain/types';
import { IconCheck } from './icons/Icon';
import { Button } from './ui/Button';
import { Field, Input } from './ui/Field';
import { Sheet } from './ui/Sheet';

/** Restrained set: the accent, the ink, and four muted travel-tag tones. */
export const TRAVELLER_COLORS = [
  '#E8A317',
  '#F2F2F0',
  '#8A8F96',
  '#C2401F',
  '#5F7A61',
  '#4A6FA5',
] as const;

export interface TravellerFormValues {
  name: string;
  accentColor: string;
  isSelf: boolean;
}

export interface TravellerFormSheetProps {
  open: boolean;
  traveller?: Traveller | undefined;
  /** Colours already taken by other travellers, shown as unavailable. */
  usedColors?: string[];
  onSubmit: (values: TravellerFormValues) => void;
  onClose: () => void;
}

export function TravellerFormSheet({
  open,
  traveller,
  usedColors = [],
  onSubmit,
  onClose,
}: TravellerFormSheetProps) {
  const [values, setValues] = useState<TravellerFormValues>({
    name: '',
    accentColor: TRAVELLER_COLORS[0],
    isSelf: false,
  });

  useEffect(() => {
    if (!open) return;
    if (traveller) {
      setValues({
        name: traveller.name,
        accentColor: traveller.accentColor,
        isSelf: traveller.isSelf,
      });
    } else {
      const free = TRAVELLER_COLORS.find((c) => !usedColors.includes(c)) ?? TRAVELLER_COLORS[0];
      setValues({ name: '', accentColor: free, isSelf: usedColors.length === 0 });
    }
    // usedColors is deliberately not a dependency: it is derived data, and
    // re-running on its identity change would reset the field mid-typing.
  }, [open, traveller]);

  const canSubmit = values.name.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    onSubmit(values);
  }

  return (
    <Sheet
      open={open}
      title={traveller ? 'Edit traveller' : 'Add traveller'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button block onClick={submit} disabled={!canSubmit}>
            {traveller ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Name">
          {({ id }) => (
            <Input
              id={id}
              value={values.name}
              autoFocus
              placeholder="Marta"
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
          )}
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="u-label text-[0.625rem] text-[var(--app-muted)]">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {TRAVELLER_COLORS.map((color) => {
              const selected = values.accentColor === color;
              const taken = usedColors.includes(color) && !selected;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Colour ${color}${taken ? ' (already used)' : ''}`}
                  aria-pressed={selected}
                  disabled={taken}
                  onClick={() => setValues((v) => ({ ...v, accentColor: color }))}
                  className={[
                    'relative grid h-11 w-11 place-items-center border-2 transition-opacity duration-[var(--dur)] ease-[var(--ease)]',
                    selected ? 'border-[var(--app-fg)]' : 'border-transparent',
                    taken ? 'opacity-30' : '',
                  ].join(' ')}
                  style={{ background: color }}
                >
                  {selected ? <IconCheck size={18} style={{ color: 'var(--color-main)' }} /> : null}
                  {/* A struck-through swatch reads as unavailable; dimming alone does not. */}
                  {taken ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 left-0 h-px w-full rotate-45 bg-[var(--color-main)]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={values.isSelf}
            onChange={(e) => setValues((v) => ({ ...v, isSelf: e.target.checked }))}
            className="h-5 w-5 accent-[var(--app-accent)]"
          />
          <span className="text-sm text-[var(--app-fg)]">This is me</span>
        </label>

        <button type="submit" className="sr-only-focusable" tabIndex={-1} aria-hidden="true" />
      </form>
    </Sheet>
  );
}
