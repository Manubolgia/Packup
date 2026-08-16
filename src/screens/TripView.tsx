import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Container, ContainerKind, Traveller } from '@/domain/types';
import { repo } from '@/data/repo';
import { useContainers, useItems, useTravellers, useTrip } from '@/data/hooks';
import { useUiStore } from '@/store/ui';
import { platform } from '@/platform';
import { IconChevronLeft, IconPlus } from '@/components/icons/Icon';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TravellerFormSheet, type TravellerFormValues } from '@/components/TravellerFormSheet';
import { ContainerFormSheet, type ContainerFormValues } from '@/components/ContainerFormSheet';
import { LuggageView } from '@/components/LuggageView';

export function TripView() {
  const { tripId } = useParams();
  const trip = useTrip(tripId);
  const travellers = useTravellers(tripId);
  const containers = useContainers(tripId);
  const items = useItems(tripId);

  const selectedTravellerId = useUiStore((s) => s.selectedTravellerId);
  const selectTraveller = useUiStore((s) => s.selectTraveller);
  const selectedContainerId = useUiStore((s) => s.selectedContainerId);
  const selectContainer = useUiStore((s) => s.selectContainer);
  const highlightedContainerId = useUiStore((s) => s.highlightedContainerId);
  const pushToast = useUiStore((s) => s.pushToast);

  const [travellerFormOpen, setTravellerFormOpen] = useState(false);
  const [editingTraveller, setEditingTraveller] = useState<Traveller | undefined>(undefined);
  const [pendingTravellerDelete, setPendingTravellerDelete] = useState<Traveller | null>(null);

  const [containerFormOpen, setContainerFormOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | undefined>(undefined);
  const [addKind, setAddKind] = useState<ContainerKind | undefined>(undefined);
  const [pendingContainerDelete, setPendingContainerDelete] = useState<Container | null>(null);

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
    .filter((t) => t.id !== editingTraveller?.id)
    .map((t) => t.accentColor);

  async function submitTraveller(values: TravellerFormValues) {
    if (!tripId) return;
    if (editingTraveller) {
      await repo.updateTraveller(editingTraveller.id, values);
      pushToast('Traveller updated');
    } else {
      const created = await repo.addTraveller(tripId, values);
      selectTraveller(created.id);
      pushToast(`${created.name} added`);
    }
    setTravellerFormOpen(false);
    setEditingTraveller(undefined);
    void platform.haptic('success');
  }

  async function confirmDeleteTraveller() {
    if (!pendingTravellerDelete) return;
    const name = pendingTravellerDelete.name;
    await repo.deleteTraveller(pendingTravellerDelete.id);
    setPendingTravellerDelete(null);
    pushToast(`${name} removed — their items are back in the unpacked pile`);
  }

  async function submitContainer(values: ContainerFormValues) {
    if (!selected) return;
    const parent = values.parentContainerId || undefined;

    if (editingContainer) {
      const result = await repo.updateContainer(editingContainer.id, {
        subtype: values.subtype,
        label: values.label,
        colorHex: values.colorHex,
        capacityUnits: values.capacityUnits,
        parentContainerId: parent,
      });
      if (!result.ok) {
        pushToast(result.message, { tone: 'error' });
        return;
      }
      pushToast(`${values.label} updated`);
    } else {
      const result = await repo.addContainer(selected.id, {
        kind: values.kind,
        subtype: values.subtype,
        label: values.label,
        colorHex: values.colorHex,
        capacityUnits: values.capacityUnits,
        ...(parent ? { parentContainerId: parent } : {}),
      });
      // The repo is the authority on caps (C6) — the UI grey-out is a courtesy.
      if (!result.ok) {
        pushToast(result.message, { tone: 'error' });
        return;
      }
      selectContainer(result.value.id);
      pushToast(`${result.value.label} added`);
    }

    setContainerFormOpen(false);
    setEditingContainer(undefined);
    setAddKind(undefined);
    void platform.haptic('success');
  }

  /**
   * §3: deleting a container unassigns its items rather than deleting them, so
   * undo only has to put the container back and re-point the items at it.
   */
  async function confirmDeleteContainer() {
    if (!pendingContainerDelete) return;
    const gone = pendingContainerDelete;
    const orphanedItemIds = (items ?? [])
      .filter((i) => i.containerId === gone.id)
      .map((i) => i.id);
    const nestedChildIds = (containers ?? [])
      .filter((c) => c.parentContainerId === gone.id)
      .map((c) => c.id);

    await repo.deleteContainer(gone.id);
    setPendingContainerDelete(null);
    if (selectedContainerId === gone.id) selectContainer(null);

    pushToast(`${gone.label} removed`, {
      undo: () => {
        void (async () => {
          const restored = await repo.addContainer(gone.travellerId, {
            kind: gone.kind,
            subtype: gone.subtype,
            label: gone.label,
            colorHex: gone.colorHex,
            slotIndex: gone.slotIndex,
            capacityUnits: gone.capacityUnits,
            ...(gone.parentContainerId ? { parentContainerId: gone.parentContainerId } : {}),
          });
          if (!restored.ok) {
            pushToast(restored.message, { tone: 'error' });
            return;
          }
          for (const itemId of orphanedItemIds) {
            await repo.moveItem(itemId, restored.value.id);
          }
          for (const childId of nestedChildIds) {
            await repo.updateContainer(childId, { parentContainerId: restored.value.id });
          }
        })();
      },
    });
  }

  const selectedContainer = myContainers.find((c) => c.id === selectedContainerId);

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
                setEditingTraveller(t);
                setTravellerFormOpen(true);
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
            setEditingTraveller(undefined);
            setTravellerFormOpen(true);
          }}
          className="grid h-11 w-11 shrink-0 place-items-center border border-dashed border-[var(--app-border-strong)] text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:text-[var(--app-fg)]"
        >
          <IconPlus size={18} />
        </button>
      </div>

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
                setEditingTraveller(undefined);
                setTravellerFormOpen(true);
              }}
            >
              Add traveller
            </Button>
          </div>
        ) : (
          <>
            <LuggageView
              containers={myContainers}
              items={items ?? []}
              accentColor={selected.accentColor}
              selectedContainerId={selectedContainerId}
              highlightedContainerId={highlightedContainerId}
              onSelect={(id) => {
                selectContainer(id === selectedContainerId ? null : id);
                if (id) void platform.haptic('light');
              }}
              onAdd={(kind) => {
                setEditingContainer(undefined);
                setAddKind(kind);
                setContainerFormOpen(true);
              }}
            />

            {selectedContainer ? (
              <div className="mt-4 flex gap-2 border-t border-[var(--app-border)] pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingContainer(selectedContainer);
                    setAddKind(undefined);
                    setContainerFormOpen(true);
                  }}
                >
                  Edit {selectedContainer.label}
                </Button>
                <Button variant="ghost" onClick={() => setPendingContainerDelete(selectedContainer)}>
                  Remove
                </Button>
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between gap-2 border-t border-[var(--app-border)] pt-4">
              <p className="u-data text-[0.6875rem] text-[var(--app-faint)]">
                {items?.length ?? 0} items · {myContainers.length} containers
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingTraveller(selected);
                    setTravellerFormOpen(true);
                  }}
                >
                  Edit {selected.name}
                </Button>
                <Button variant="ghost" onClick={() => setPendingTravellerDelete(selected)}>
                  Remove
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      <TravellerFormSheet
        open={travellerFormOpen}
        traveller={editingTraveller}
        usedColors={usedColors}
        onSubmit={submitTraveller}
        onClose={() => {
          setTravellerFormOpen(false);
          setEditingTraveller(undefined);
        }}
      />

      {selected ? (
        <ContainerFormSheet
          open={containerFormOpen}
          container={editingContainer}
          initialKind={addKind}
          siblings={myContainers}
          travellerId={selected.id}
          onSubmit={submitContainer}
          onClose={() => {
            setContainerFormOpen(false);
            setEditingContainer(undefined);
            setAddKind(undefined);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={pendingTravellerDelete !== null}
        title="Remove traveller"
        message={`${pendingTravellerDelete?.name}’s bags will be removed. Their items are kept and moved back to the unpacked pile.`}
        confirmLabel="Remove"
        destructive
        onConfirm={confirmDeleteTraveller}
        onCancel={() => setPendingTravellerDelete(null)}
      />

      <ConfirmDialog
        open={pendingContainerDelete !== null}
        title="Remove luggage"
        message={`${pendingContainerDelete?.label} will be removed. Anything inside it goes back to the unpacked pile — you can undo this.`}
        confirmLabel="Remove"
        destructive
        onConfirm={confirmDeleteContainer}
        onCancel={() => setPendingContainerDelete(null)}
      />
    </main>
  );
}
