import type { ReactNode } from 'react';
import type { Trip } from '@/domain/types';
import { IconArchive, IconCopy, IconEdit, IconExport, IconTrash } from './icons/Icon';
import { Sheet } from './ui/Sheet';

export interface TripMenuProps {
  trip: Trip | null;
  onClose: () => void;
  onRename: (trip: Trip) => void;
  onDuplicate: (trip: Trip) => void;
  onArchive: (trip: Trip) => void;
  onExport: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
}

function MenuRow({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex min-h-12 w-full items-center gap-3 border-b border-[var(--app-border)] px-1 text-left',
        'transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--app-sunken)]',
        destructive ? 'text-[var(--app-danger)]' : 'text-[var(--app-fg)]',
      ].join(' ')}
    >
      <span className={destructive ? '' : 'text-[var(--app-muted)]'}>{icon}</span>
      <span className="u-label text-xs">{label}</span>
    </button>
  );
}

export function TripMenu({
  trip,
  onClose,
  onRename,
  onDuplicate,
  onArchive,
  onExport,
  onDelete,
}: TripMenuProps) {
  if (!trip) return null;

  return (
    <Sheet open={trip !== null} title={trip.name} onClose={onClose}>
      <div className="flex flex-col">
        <MenuRow icon={<IconEdit size={20} />} label="Rename" onClick={() => onRename(trip)} />
        <MenuRow
          icon={<IconCopy size={20} />}
          label="Duplicate"
          onClick={() => onDuplicate(trip)}
        />
        <MenuRow
          icon={<IconArchive size={20} />}
          label={trip.archivedAt ? 'Unarchive' : 'Archive'}
          onClick={() => onArchive(trip)}
        />
        <MenuRow
          icon={<IconExport size={20} />}
          label="Export JSON"
          onClick={() => onExport(trip)}
        />
        <MenuRow
          icon={<IconTrash size={20} />}
          label="Delete"
          destructive
          onClick={() => onDelete(trip)}
        />
      </div>
    </Sheet>
  );
}
