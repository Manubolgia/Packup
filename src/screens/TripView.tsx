import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Traveller } from '@/domain/types';
import { repo } from '@/data/repo';
import { useContainers, useItems, useTravellers, useTrip } from '@/data/hooks';
import { CONTAINER_CAPS } from '@/domain/rules';
import { useUiStore } from '@/store/ui';
import { platform } from '@/platform';
import { IconChevronLeft, IconForKind, IconPlus } from '@/components/icons/Icon';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TravellerFormSheet, type TravellerFormValues } from '@/components/TravellerFormSheet';

const KINDS = ['suitcase', 'bag', 'pouch', 'person'] as const;

export function TripView() {
  const { tripId } = useParams();
  const trip = useTrip(tripId);
  const travellers = useTravellers(tripId);
  const containers = useContainers(tripId);
  const items = useItems(tripId);

  const selectedTravellerId = useUiStore((s) => s.selectedTravellerId);
  const selectTraveller = useUiStore((s) => s.selectTraveller);
  const pushToast = useUiStore((s) => s.pushToast);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Traveller | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<Traveller | null>(null);

  // Default to the first traveller, and recover if the selected one is deleted.
  useEffect(() => {
    if (!travellers || travellers.length === 0) return;
    const stillExists = travellers.some((t) => t.id === selectedTravellerId);
    if (!stillExists) {
      const self = travellers.find((t) => t.isSelf) ?? travellers[0]!;
      selectTraveller(self.id);
    }
  }, [travellers, selectedTravellerId, selectTraveller]);

  if (trip === undefined && tripId) {
    return (
      <main className="grid h-full place-items-center p-6">
        <p className="u-data text-xs text-[var(--app-faint)]">Loading…</p>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="grid h-full place-items-center gap-4 p-6 text-center">
        <div>
          <h1 className="u-label text-sm">Trip not found</h1>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            It may have been deleted on this device.
          </p>
        </div>
        <Link to="/" className="u-label text-xs text-[var(--app-accent)]">
          Back to trips
        </Link>
      </main>
    );
  }

  const selected = travellers?.find((t) => t.id === selectedTravellerId);
  const myContainers = containers?.filter((c) => c.travellerId === selected?.id) ?? [];
  const usedColors = (travellers ?? [])
    .filter((t) => t.id !== editing?.id)
    .map((t) => t.accentColor);

  async function submitTraveller(values: TravellerFormValues) {
    if (!tripId) return;
    if (editing) {
      await repo.updateTraveller(editing.id, values);
      pushToast('Traveller updated');
    } else {
      const created = await repo.addTraveller(tripId, values);
      selectTraveller(created.id);
      pushToast(`${created.name} added`);
    }
    setFormOpen(false);
    setEditing(undefined);
    void platform.haptic('success');
  }

  async function confirmDeleteTraveller() {
    if (!pendingDelete) return;
    const name = pendingDelete.name;
    await repo.deleteTraveller(pendingDelete.id);
    setPendingDelete(null);
    pushToast(`${name} removed — their items are back in the unpacked pile`);
  }

  return (
    <main
      className="flex h-full flex-col overflow-hidden"
      style={{
        paddingTop: 'var(--safe-top)',
        paddingRight: 'var(--safe-right)',
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'var(--safe-left)',
      }}
    >
      <header className="flex items-center gap-1 pb-4">
        <Link
          to="/"
          aria-label="Back to trips"
          className="-ml-2 grid h-11 w-11 shrink-0 place-items-center text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:text-[var(--app-fg)]"
        >
          <IconChevronLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="u-label truncate text-base text-[var(--app-fg)]">{trip.name}</h1>
          {trip.destination ? (
            <p className="u-data truncate text-[0.6875rem] text-[var(--app-muted)]">
              {trip.destination}
            </p>
          ) : null}
        </div>
      </header>

      {/* Traveller tab strip */}
      <div
        role="tablist"
        aria-label="Travellers"
        className="flex gap-2 overflow-x-auto border-b border-[var(--app-border)] pb-3"
      >
        {(travellers ?? []).map((t) => {
          const active = t.id === selectedTravellerId;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => selectTraveller(t.id)}
              onDoubleClick={() => {
                setEditing(t);
                setFormOpen(true);
              }}
              className={[
                'flex min-h-11 shrink-0 items-center gap-2 border px-3',
                'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
                active
                  ? 'border-[var(--app-fg)] bg-[var(--app-surface)]'
                  : 'border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-fg)]',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0"
                style={{ background: t.accentColor }}
              />
              <span className="u-label text-[0.625rem]">{t.name}</span>
            </button>
          );
        })}
        <button
          aria-label="Add traveller"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          className="grid h-11 w-11 shrink-0 place-items-center border border-dashed border-[var(--app-border-strong)] text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:text-[var(--app-fg)]"
        >
          <IconPlus size={18} />
        </button>
      </div>

      {/* 3D scene lands here in M4. */}
      {/* pb leaves room for a toast to appear without covering the last row. */}
      <section className="flex flex-1 flex-col overflow-y-auto pt-4 pb-20">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <h2 className="u-label text-sm">No travellers yet</h2>
            <p className="max-w-xs text-sm text-[var(--app-muted)]">
              Add whoever is coming along — each one gets their own luggage.
            </p>
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              Add traveller
            </Button>
          </div>
        ) : (
          <>
            <div className="grid aspect-[4/3] max-h-[45dvh] shrink-0 place-items-center border border-dashed border-[var(--app-border)]">
              <p className="u-data px-4 text-center text-[0.6875rem] text-[var(--app-faint)]">
                3D luggage view — milestone 4
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-4 gap-2">
              {KINDS.map((kind) => {
                const count = myContainers.filter((c) => c.kind === kind).length;
                return (
                  <div
                    key={kind}
                    className="flex flex-col items-center gap-1.5 border border-[var(--app-border)] py-3"
                  >
                    <span className="text-[var(--app-muted)]">
                      <IconForKind kind={kind} size={20} />
                    </span>
                    <dt className="sr-only-focusable">{kind}</dt>
                    <dd className="u-data text-[0.6875rem] text-[var(--app-fg)]">
                      {count}/{CONTAINER_CAPS[kind]}
                    </dd>
                  </div>
                );
              })}
            </dl>

            <p className="u-data mt-3 text-[0.6875rem] text-[var(--app-faint)]">
              {items?.length ?? 0} items · {myContainers.length} containers for {selected.name}
            </p>

            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(selected);
                  setFormOpen(true);
                }}
              >
                Edit {selected.name}
              </Button>
              <Button variant="ghost" onClick={() => setPendingDelete(selected)}>
                Remove
              </Button>
            </div>
          </>
        )}
      </section>

      <TravellerFormSheet
        open={formOpen}
        traveller={editing}
        usedColors={usedColors}
        onSubmit={submitTraveller}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove traveller"
        message={`${pendingDelete?.name}’s bags will be removed. Their items are kept and moved back to the unpacked pile.`}
        confirmLabel="Remove"
        destructive
        onConfirm={confirmDeleteTraveller}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}
