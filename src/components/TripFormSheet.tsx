import { useEffect, useState } from 'react';
import type { Trip } from '@/domain/types';
import { Button } from './ui/Button';
import { Field, Input } from './ui/Field';
import { Sheet } from './ui/Sheet';

export interface TripFormValues {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export interface TripFormSheetProps {
  open: boolean;
  /** Absent = create, present = edit. */
  trip?: Trip | undefined;
  onSubmit: (values: TripFormValues) => void;
  onClose: () => void;
}

const EMPTY: TripFormValues = { name: '', destination: '', startDate: '', endDate: '' };

export function TripFormSheet({ open, trip, onSubmit, onClose }: TripFormSheetProps) {
  const [values, setValues] = useState<TripFormValues>(EMPTY);

  // Reset whenever the sheet opens, so a cancelled edit leaves no residue.
  useEffect(() => {
    if (!open) return;
    setValues(
      trip
        ? {
            name: trip.name,
            destination: trip.destination ?? '',
            startDate: trip.startDate ?? '',
            endDate: trip.endDate ?? '',
          }
        : EMPTY,
    );
  }, [open, trip]);

  const set = <K extends keyof TripFormValues>(key: K, value: TripFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const canSubmit = values.name.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    onSubmit(values);
  }

  return (
    <Sheet
      open={open}
      title={trip ? 'Edit trip' : 'New trip'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button block onClick={submit} disabled={!canSubmit}>
            {trip ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Trip name">
          {({ id }) => (
            <Input
              id={id}
              value={values.name}
              autoFocus
              placeholder="Japan, October"
              onChange={(e) => set('name', e.target.value)}
            />
          )}
        </Field>

        <Field label="Destination">
          {({ id }) => (
            <Input
              id={id}
              value={values.destination}
              placeholder="Tokyo & Kyoto"
              onChange={(e) => set('destination', e.target.value)}
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={values.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            )}
          </Field>
          <Field label="To">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={values.endDate}
                min={values.startDate || undefined}
                onChange={(e) => set('endDate', e.target.value)}
              />
            )}
          </Field>
        </div>

        {/* Submit on Enter without showing a second button. */}
        <button type="submit" className="sr-only-focusable" tabIndex={-1} aria-hidden="true" />
      </form>
    </Sheet>
  );
}
