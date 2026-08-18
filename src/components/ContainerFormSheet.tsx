import { useEffect, useMemo, useState } from 'react';
import type { Container, ContainerKind, ContainerSubtype } from '@/domain/types';
import {
  CONTAINER_COLORS,
  KIND_LABEL,
  KIND_PLURAL,
  subtypeSpec,
  subtypesForKind,
} from '@/domain/catalog';
import { CONTAINER_CAPS, containersOfKind } from '@/domain/rules';
import { IconCheck, IconForKind } from './icons/Icon';
import { Button } from './ui/Button';
import { Field, Input } from './ui/Field';
import { Sheet } from './ui/Sheet';

const KINDS: readonly ContainerKind[] = ['suitcase', 'bag', 'pouch', 'person'];

export interface ContainerFormValues {
  kind: ContainerKind;
  subtype: ContainerSubtype;
  label: string;
  colorHex: string;
  /** '' means top-level; otherwise the id of the suitcase/bag holding it. */
  parentContainerId: string;
}

export interface ContainerFormSheetProps {
  open: boolean;
  /** Absent = add, present = edit. */
  container?: Container | undefined;
  /** Preselects the kind when opened from a specific "+ Add …" slot. */
  initialKind?: ContainerKind | undefined;
  /** Every container belonging to the current traveller, for caps and nesting. */
  siblings: readonly Container[];
  travellerId: string;
  onSubmit: (values: ContainerFormValues) => void;
  onClose: () => void;
}

export function ContainerFormSheet({
  open,
  container,
  initialKind,
  siblings,
  travellerId,
  onSubmit,
  onClose,
}: ContainerFormSheetProps) {
  const [values, setValues] = useState<ContainerFormValues>(() => defaults('suitcase'));

  const remaining = useMemo(() => {
    const counts = {} as Record<ContainerKind, number>;
    for (const kind of KINDS) {
      const used = containersOfKind(siblings, travellerId, kind).length;
      // When editing, the container itself does not count against its own cap.
      const own = container?.kind === kind ? 1 : 0;
      counts[kind] = CONTAINER_CAPS[kind] - used + own;
    }
    return counts;
  }, [siblings, travellerId, container]);

  useEffect(() => {
    if (!open) return;
    if (container) {
      setValues({
        kind: container.kind,
        subtype: container.subtype,
        label: container.label,
        colorHex: container.colorHex,
        parentContainerId: container.parentContainerId ?? '',
      });
      return;
    }
    // The slot the user tapped wins; otherwise open on the first kind that
    // still has room, so the default is always actionable.
    const preferred =
      initialKind && remaining[initialKind] > 0
        ? initialKind
        : (KINDS.find((k) => remaining[k] > 0) ?? 'suitcase');
    setValues(defaults(preferred));
    // `remaining` is deliberately read but not depended on: it changes identity
    // on every parent render, and would reset the form mid-edit.
  }, [open, container, initialKind]);

  /** Possible parents: this traveller's top-level suitcases and bags (§3). */
  const parentOptions = useMemo(
    () =>
      siblings.filter(
        (c) =>
          (c.kind === 'suitcase' || c.kind === 'bag') &&
          !c.parentContainerId &&
          c.id !== container?.id,
      ),
    [siblings, container],
  );

  const spec = subtypeSpec(values.subtype);
  const canSubmit = remaining[values.kind] > 0;

  function selectKind(kind: ContainerKind) {
    if (remaining[kind] <= 0) return;
    const first = subtypesForKind(kind)[0]!;
    setValues((v) => ({
      ...v,
      kind,
      subtype: first.subtype,
      // Only a pouch may nest, so switching away from pouch drops the parent.
      parentContainerId: kind === 'pouch' ? v.parentContainerId : '',
    }));
  }

  function selectSubtype(subtype: ContainerSubtype) {
    setValues((v) => ({ ...v, subtype }));
  }

  function submit() {
    if (!canSubmit) return;
    onSubmit({
      ...values,
      label: values.label.trim() || spec.placeholder,
    });
  }

  return (
    <Sheet
      open={open}
      title={container ? 'Edit luggage' : 'Add luggage'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button block onClick={submit} disabled={!canSubmit}>
            {container ? 'Save' : 'Add'}
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
        <fieldset className="flex flex-col gap-2">
          <legend className="u-label text-[0.625rem] text-[var(--app-muted)]">Kind</legend>
          <div className="grid grid-cols-4 gap-2">
            {KINDS.map((kind) => {
              const free = remaining[kind];
              const full = free <= 0;
              const active = values.kind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  // §4.2: full options are greyed and explained, never hidden.
                  aria-label={
                    full
                      ? `${KIND_LABEL[kind]} — ${CONTAINER_CAPS[kind]} of ${CONTAINER_CAPS[kind]}, remove one first`
                      : KIND_LABEL[kind]
                  }
                  disabled={full}
                  onClick={() => selectKind(kind)}
                  className={[
                    'flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 border px-1',
                    'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
                    active
                      ? 'border-[var(--app-fg)] bg-[var(--app-sunken)] text-[var(--app-fg)]'
                      : 'border-[var(--app-border)] text-[var(--app-muted)]',
                    full ? 'opacity-40' : 'hover:text-[var(--app-fg)]',
                  ].join(' ')}
                >
                  <IconForKind kind={kind} size={20} />
                  <span className="u-label text-[0.5rem] leading-tight">{KIND_LABEL[kind]}</span>
                  <span className="u-data text-[0.5625rem] text-[var(--app-faint)]">
                    {CONTAINER_CAPS[kind] - free}/{CONTAINER_CAPS[kind]}
                  </span>
                </button>
              );
            })}
          </div>
          {!canSubmit ? (
            <p className="u-data text-[0.6875rem] text-[var(--app-danger)]">
              {CONTAINER_CAPS[values.kind]} of {CONTAINER_CAPS[values.kind]}{' '}
              {KIND_PLURAL[values.kind]} — remove one first.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="u-label text-[0.625rem] text-[var(--app-muted)]">Type</legend>
          <div className="grid grid-cols-2 gap-2">
            {subtypesForKind(values.kind).map((s) => {
              const active = values.subtype === s.subtype;
              return (
                <button
                  key={s.subtype}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => selectSubtype(s.subtype)}
                  className={[
                    'flex min-h-11 items-center justify-between gap-2 border px-3 text-left',
                    'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
                    active
                      ? 'border-[var(--app-fg)] bg-[var(--app-sunken)] text-[var(--app-fg)]'
                      : 'border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-fg)]',
                  ].join(' ')}
                >
                  <span className="u-label text-[0.5625rem] leading-tight">{s.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Field label="Label">
          {({ id }) => (
            <Input
              id={id}
              value={values.label}
              placeholder={spec.placeholder}
              onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
            />
          )}
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="u-label text-[0.625rem] text-[var(--app-muted)]">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {CONTAINER_COLORS.map((color) => {
              const selected = values.colorHex === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Colour ${color}`}
                  aria-pressed={selected}
                  onClick={() => setValues((v) => ({ ...v, colorHex: color }))}
                  className={[
                    'grid h-11 w-11 place-items-center border-2',
                    selected ? 'border-[var(--app-fg)]' : 'border-transparent',
                  ].join(' ')}
                  style={{ background: color }}
                >
                  {selected ? (
                    <IconCheck size={18} style={{ color: 'var(--color-secondary)' }} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Only a pouch nests, and only inside a top-level suitcase or bag. */}
        {values.kind === 'pouch' && parentOptions.length > 0 ? (
          <Field label="Packed inside">
            {({ id }) => (
              <select
                id={id}
                value={values.parentContainerId}
                onChange={(e) => setValues((v) => ({ ...v, parentContainerId: e.target.value }))}
                className="min-h-11 w-full border border-[var(--app-border)] bg-[var(--app-sunken)] px-3 text-base text-[var(--app-fg)] focus:border-[var(--app-accent)]"
              >
                <option value="">Nothing — on its own</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        ) : null}

        <button type="submit" className="sr-only-focusable" tabIndex={-1} aria-hidden="true" />
      </form>
    </Sheet>
  );
}

function defaults(kind: ContainerKind): ContainerFormValues {
  const first = subtypesForKind(kind)[0]!;
  return {
    kind,
    subtype: first.subtype,
    label: '',
    colorHex: CONTAINER_COLORS[0],
    parentContainerId: '',
  };
}
