import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Container, ContainerKind, Item, Traveller } from '@/domain/types';
import { repo } from '@/data/repo';
import { useContainers, useItems, useTravellers, useTrip } from '@/data/hooks';
import { formatLocation, resolveLocation } from '@/domain/location';
import { useUiStore } from '@/store/ui';
import { platform } from '@/platform';
import { IconChevronLeft, IconPlus } from '@/components/icons/Icon';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TravellerFormSheet, type TravellerFormValues } from '@/components/TravellerFormSheet';
import { ContainerFormSheet, type ContainerFormValues } from '@/components/ContainerFormSheet';
import { LuggageView } from '@/components/LuggageView';
import { ContainerSheet } from '@/components/ContainerSheet';
import { ContainerPicker } from '@/components/ContainerPicker';
import { InventoryDrawer } from '@/components/InventoryDrawer';
import type { AddItemValues } from '@/components/AddItemForm';

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
  const locatedLabel = useUiStore((s) => s.locatedLabel);
  const locateItem = useUiStore((s) => s.locateItem);
  const drawerOpen = useUiStore((s) => s.drawerOpen);
  const setDrawerOpen = useUiStore((s) => s.setDrawerOpen);
  const drawerHeight = useUiStore((s) => s.drawerHeight);
  const setDrawerHeight = useUiStore((s) => s.setDrawerHeight);
  const pushToast = useUiStore((s) => s.pushToast);

  const [travellerFormOpen, setTravellerFormOpen] = useState(false);
  const [editingTraveller, setEditingTraveller] = useState<Traveller | undefined>(undefined);
  const [pendingTravellerDelete, setPendingTravellerDelete] = useState<Traveller | null>(null);

  const [containerFormOpen, setContainerFormOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | undefined>(undefined);
  const [addKind, setAddKind] = useState<ContainerKind | undefined>(undefined);
  const [pendingContainerDelete, setPendingContainerDelete] = useState<Container | null>(null);

  const [containerSheetOpen, setContainerSheetOpen] = useState(false);
  /** Items awaiting a destination: one from "move to…", many from multi-select. */
  const [movingItems, setMovingItems] = useState<readonly Item[]>([]);

  // Default to the first traveller, and recover if the selected one is deleted.
  useEffect(() => {
    if (!travellers || travellers.length === 0) return;
    const stillExists = travellers.some((t) => t.id === selectedTravellerId);
    if (!stillExists) {
      const self = travellers.find((t) => t.isSelf) ?? travellers[0]!;
      selectTraveller(self.id);
    }
  }, [travellers, selectedTravellerId, selectTraveller]);

  // undefined = still querying; null = queried and absent (see useTrip).
  if (trip === undefined) {
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

  async function addItemToContainer(values: AddItemValues) {
    if (!tripId || !selectedContainer) return;
    await repo.addItem(tripId, {
      name: values.name,
      category: values.category,
      size: values.size,
      quantity: values.quantity,
      essential: values.essential,
      containerId: selectedContainer.id,
    });
    void platform.haptic('light');
  }

  async function toggleItemPacked(item: Item) {
    await repo.setPacked(item.id, !item.packed);
    void platform.haptic(item.packed ? 'light' : 'success');
  }

  async function changeItemQuantity(item: Item, quantity: number) {
    if (quantity < 1) return;
    await repo.updateItem(item.id, { quantity });
  }

  /**
   * §4.3: tap an item → the drawer collapses, the camera frames its container,
   * the container pulses, the breadcrumb shows, and one haptic tick fires.
   */
  function locate(item: Item) {
    const crumbs = resolveLocation(item, {
      containers: containers ?? [],
      travellers: travellers ?? [],
    });

    if (!item.containerId) {
      // Unassigned: there is nothing to fly to, so offer to place it instead.
      setMovingItems([item]);
      return;
    }

    // The item may belong to another traveller; switch tabs so the scene
    // actually contains the container we are about to frame.
    const owner = (containers ?? []).find((c) => c.id === item.containerId);
    if (owner && owner.travellerId !== selectedTravellerId) {
      selectTraveller(owner.travellerId);
    }

    locateItem(item.containerId, formatLocation(crumbs.slice(1).reverse(), ' → '));
    void platform.haptic('light');
  }

  async function commitMove(containerId: string | null) {
    const moving = movingItems;
    setMovingItems([]);
    if (moving.length === 0) return;

    for (const item of moving) {
      const result = await repo.moveItem(item.id, containerId);
      if (!result.ok) {
        pushToast(result.message, { tone: 'error' });
        return;
      }
    }

    const destination = containerId
      ? ((containers ?? []).find((c) => c.id === containerId)?.label ?? 'container')
      : 'the unpacked pile';
    pushToast(
      moving.length === 1
        ? `${moving[0]!.name} moved to ${destination}`
        : `${moving.length} items moved to ${destination}`,
    );
    void platform.haptic('success');
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

      {/* pb clears the fixed drawer handle and leaves room for a toast. */}
      <section className="flex flex-1 flex-col overflow-y-auto pt-4 pb-28">
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
            <div className="relative">
              <LuggageView
                containers={myContainers}
                items={items ?? []}
                accentColor={selected.accentColor}
                selectedContainerId={selectedContainerId}
                highlightedContainerId={highlightedContainerId}
                onSelect={(id) => {
                  selectContainer(id);
                  if (id) {
                    setContainerSheetOpen(true);
                    void platform.haptic('light');
                  }
                }}
                onAdd={(kind) => {
                  setEditingContainer(undefined);
                  setAddKind(kind);
                  setContainerFormOpen(true);
                }}
              />

              {/* §4.3 step 4: the breadcrumb floats over the canvas while the
                  located container pulses. */}
              {locatedLabel ? (
                <p
                  role="status"
                  className="u-data pointer-events-none absolute inset-x-2 top-2 border border-[var(--app-accent)] bg-[var(--app-bg)] px-2 py-1.5 text-center text-[0.625rem] text-[var(--app-fg)]"
                >
                  {locatedLabel}
                </p>
              ) : null}

              {/* §5 accessibility: selection is announced, since the visual
                  cue (a highlighted mesh) is invisible to a screen reader. */}
              <p aria-live="polite" className="sr-only-focusable">
                {selectedContainer
                  ? `${selectedContainer.label} selected, ${
                      (items ?? []).filter((i) => i.containerId === selectedContainer.id).length
                    } items`
                  : ''}
              </p>
            </div>

            {/* Container edit/remove live in the container sheet; this row is
                the traveller's own actions. */}
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

      <ContainerSheet
        open={containerSheetOpen && selectedContainer !== undefined}
        container={selectedContainer}
        containers={containers ?? []}
        travellers={travellers ?? []}
        items={items ?? []}
        onClose={() => setContainerSheetOpen(false)}
        onAddItem={addItemToContainer}
        onTogglePacked={toggleItemPacked}
        onQuantityChange={changeItemQuantity}
        onMoveItem={(item) => setMovingItems([item])}
        onSelectContainer={(id) => selectContainer(id)}
        onEdit={(container) => {
          setContainerSheetOpen(false);
          setEditingContainer(container);
          setAddKind(undefined);
          setContainerFormOpen(true);
        }}
        onDelete={(container) => {
          setContainerSheetOpen(false);
          setPendingContainerDelete(container);
        }}
      />

      <ContainerPicker
        open={movingItems.length > 0}
        title={movingItems.length > 1 ? `Move ${movingItems.length} items to…` : 'Move to…'}
        containers={containers ?? []}
        travellers={travellers ?? []}
        excludeId={movingItems.length === 1 ? (movingItems[0]!.containerId ?? undefined) : undefined}
        onPick={commitMove}
        onClose={() => setMovingItems([])}
      />

      <InventoryDrawer
        open={drawerOpen}
        height={drawerHeight}
        items={items ?? []}
        containers={containers ?? []}
        travellers={travellers ?? []}
        selectedContainerId={selectedContainerId}
        onToggle={() => setDrawerOpen(!drawerOpen)}
        onSetHeight={setDrawerHeight}
        onLocate={locate}
        onTogglePacked={toggleItemPacked}
        onMove={(selection) => setMovingItems(selection)}
      />
    </main>
  );
}
