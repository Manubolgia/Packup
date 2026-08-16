import { useState } from 'react';
import type { Trip } from '@/domain/types';
import { repo } from '@/data/repo';
import { seedSampleTrip } from '@/data/seed';
import {
  backupFilename,
  exportTrip,
  importTrip,
  parseBackup,
  serializeBackup,
} from '@/data/backup';
import { useTripProgress, useTravellersByTrip, useTrips } from '@/data/hooks';
import { platform } from '@/platform';
import { useUiStore } from '@/store/ui';
import { IconImport, IconPlus, IconSuitcase } from '@/components/icons/Icon';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TripCard } from '@/components/TripCard';
import { TripFormSheet, type TripFormValues } from '@/components/TripFormSheet';
import { TripMenu } from '@/components/TripMenu';

/** Optional text fields are omitted rather than stored as empty strings. */
function toTripInput(values: TripFormValues) {
  const trimmed = {
    destination: values.destination.trim(),
    startDate: values.startDate,
    endDate: values.endDate,
  };
  return {
    name: values.name.trim(),
    ...(trimmed.destination ? { destination: trimmed.destination } : {}),
    ...(trimmed.startDate ? { startDate: trimmed.startDate } : {}),
    ...(trimmed.endDate ? { endDate: trimmed.endDate } : {}),
  };
}

export function Trips() {
  const trips = useTrips();
  const progress = useTripProgress();
  const travellersByTrip = useTravellersByTrip();
  const pushToast = useUiStore((s) => s.pushToast);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Trip | undefined>(undefined);
  const [menuTrip, setMenuTrip] = useState<Trip | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Trip | null>(null);
  const [busy, setBusy] = useState(false);

  const loading = trips === undefined;
  const isEmpty = !loading && trips.length === 0;

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  async function submitForm(values: TripFormValues) {
    const input = toTripInput(values);
    if (editing) {
      // updateTrip takes a partial: clear a field by sending an empty string.
      await repo.updateTrip(editing.id, {
        name: input.name,
        destination: input.destination ?? '',
        startDate: input.startDate ?? '',
        endDate: input.endDate ?? '',
      });
      pushToast('Trip updated');
    } else {
      await repo.createTrip(input);
      pushToast('Trip created');
    }
    setFormOpen(false);
    setEditing(undefined);
    void platform.haptic('success');
  }

  async function createSample() {
    setBusy(true);
    try {
      await seedSampleTrip(repo);
      pushToast('Sample trip created');
      void platform.haptic('success');
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(trip: Trip) {
    setMenuTrip(null);
    const result = await repo.duplicateTrip(trip.id);
    pushToast(result.ok ? `Duplicated “${trip.name}”` : result.message, {
      tone: result.ok ? 'info' : 'error',
    });
  }

  async function toggleArchive(trip: Trip) {
    setMenuTrip(null);
    await repo.setArchived(trip.id, !trip.archivedAt);
    pushToast(trip.archivedAt ? 'Trip unarchived' : 'Trip archived');
  }

  async function exportOne(trip: Trip) {
    setMenuTrip(null);
    const result = await exportTrip(trip.id);
    if (!result.ok) {
      pushToast(result.message, { tone: 'error' });
      return;
    }
    await platform.saveTextFile(backupFilename(result.value), serializeBackup(result.value));
    pushToast('Backup saved');
  }

  async function importOne() {
    const text = await platform.pickTextFile();
    if (text === null) return;

    const parsed = parseBackup(text);
    if (!parsed.ok) {
      pushToast(parsed.message, { tone: 'error' });
      return;
    }
    const imported = await importTrip(parsed.value);
    pushToast(imported.ok ? `Imported “${imported.value.name}”` : imported.message, {
      tone: imported.ok ? 'info' : 'error',
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const name = pendingDelete.name;
    await repo.deleteTrip(pendingDelete.id);
    setPendingDelete(null);
    pushToast(`Deleted “${name}”`);
    void platform.haptic('warning');
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
      <header className="flex items-start justify-between gap-3 pb-5">
        <div>
          <h1 className="u-label text-xl text-[var(--app-fg)]">Trips</h1>
          <p className="u-data mt-1 text-[0.6875rem] text-[var(--app-muted)]">
            Know which item is in which bag
          </p>
        </div>
        <div className="flex gap-2">
          <button
            aria-label="Import a backup"
            title="Import a backup"
            onClick={importOne}
            className="grid h-11 w-11 place-items-center border border-[var(--app-border-strong)] text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:text-[var(--app-fg)]"
          >
            <IconImport size={20} />
          </button>
          <button
            aria-label="New trip"
            title="New trip"
            onClick={openCreate}
            className="grid h-11 w-11 place-items-center border border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--color-main)] transition-[filter] duration-[var(--dur)] ease-[var(--ease)] hover:brightness-110"
          >
            <IconPlus size={20} />
          </button>
        </div>
      </header>

      {loading ? (
        <p className="u-data text-xs text-[var(--app-faint)]">Loading…</p>
      ) : isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-[15dvh] text-center">
          <span aria-hidden="true" className="text-[var(--app-border-strong)]">
            <IconSuitcase size={56} />
          </span>
          <div>
            <h2 className="u-label text-sm text-[var(--app-fg)]">No trips yet</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--app-muted)]">
              Start from scratch, or load a fully packed example to look around.
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <Button block onClick={createSample} disabled={busy}>
              Create a sample trip
            </Button>
            <Button variant="secondary" block onClick={openCreate}>
              New empty trip
            </Button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto pb-20">
          {trips.map((trip) => {
            const stats = progress?.get(trip.id) ?? { packed: 0, total: 0 };
            return (
              <TripCard
                key={trip.id}
                trip={trip}
                travellers={travellersByTrip?.get(trip.id) ?? []}
                packed={stats.packed}
                total={stats.total}
                onMenu={setMenuTrip}
              />
            );
          })}
        </ul>
      )}

      <TripFormSheet
        open={formOpen}
        trip={editing}
        onSubmit={submitForm}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
      />

      <TripMenu
        trip={menuTrip}
        onClose={() => setMenuTrip(null)}
        onRename={(trip) => {
          setMenuTrip(null);
          setEditing(trip);
          setFormOpen(true);
        }}
        onDuplicate={duplicate}
        onArchive={toggleArchive}
        onExport={exportOne}
        onDelete={(trip) => {
          setMenuTrip(null);
          setPendingDelete(trip);
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete trip"
        message={`“${pendingDelete?.name}” and everything in it will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}
