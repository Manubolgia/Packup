import type { Container, Item, Traveller } from '@/domain/types';
import { subtypeSpec } from '@/domain/catalog';
import { formatLocation, resolveLocation } from '@/domain/location';
import { fillRatio, fillStatus, usedUnitsDeep } from '@/domain/volume';
import { AddItemForm, type AddItemValues } from './AddItemForm';
import { ItemRow } from './ItemRow';
import { IconForKind } from './icons/Icon';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { Sheet } from './ui/Sheet';

export interface ContainerSheetProps {
  open: boolean;
  container: Container | undefined;
  containers: readonly Container[];
  travellers: readonly Traveller[];
  items: readonly Item[];
  onClose: () => void;
  onAddItem: (values: AddItemValues) => void;
  onTogglePacked: (item: Item) => void;
  onQuantityChange: (item: Item, quantity: number) => void;
  onMoveItem: (item: Item) => void;
  onEdit: (container: Container) => void;
  onDelete: (container: Container) => void;
  /** Selecting a nested pouch switches this sheet to it. */
  onSelectContainer: (id: string) => void;
}

/**
 * The bottom sheet behind a tap on a container (§4.2): breadcrumb, fill bar,
 * its items, the nested-pouch strip, and an add-item input.
 */
export function ContainerSheet({
  open,
  container,
  containers,
  travellers,
  items,
  onClose,
  onAddItem,
  onTogglePacked,
  onQuantityChange,
  onMoveItem,
  onEdit,
  onDelete,
  onSelectContainer,
}: ContainerSheetProps) {
  if (!container) return null;

  const used = usedUnitsDeep(container.id, containers, items);
  const ratio = fillRatio(used, container.capacityUnits);
  const status = fillStatus(ratio);
  const mine = items.filter((i) => i.containerId === container.id);
  const children = containers.filter((c) => c.parentContainerId === container.id);
  const crumbs = resolveLocation({ containerId: container.id }, { containers, travellers });

  return (
    <Sheet
      open={open}
      title={container.label}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" block onClick={() => onEdit(container)}>
            Edit
          </Button>
          <Button variant="ghost" onClick={() => onDelete(container)}>
            Remove
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center"
            style={{ background: container.colorHex, color: 'var(--color-secondary)' }}
          >
            <IconForKind kind={container.kind} size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="u-data truncate text-[0.625rem] text-[var(--app-muted)]">
              {formatLocation(crumbs)}
            </p>
            <p className="u-data text-[0.5625rem] text-[var(--app-faint)]">
              {subtypeSpec(container.subtype).label}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <ProgressBar
            value={used}
            max={container.capacityUnits}
            status={status}
            label={`${container.label} fill`}
          />
          {status !== 'ok' ? (
            <p
              className="u-label text-[0.5625rem]"
              style={{ color: status === 'red' ? 'var(--app-danger)' : 'var(--app-accent)' }}
            >
              {status === 'red'
                ? 'Won’t fit — well over capacity'
                : 'Full — anything more is a squeeze'}
            </p>
          ) : null}
        </div>

        {children.length > 0 ? (
          <section className="flex flex-col gap-1.5">
            <h3 className="u-label text-[0.5625rem] text-[var(--app-muted)]">Pouches inside</h3>
            <div className="flex flex-wrap gap-1.5">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => onSelectContainer(child.id)}
                  className="u-data flex items-center gap-1.5 border border-[var(--app-border)] px-2 py-1.5 text-[0.5625rem] text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:text-[var(--app-fg)]"
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5"
                    style={{ background: child.colorHex }}
                  />
                  {child.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-1">
          <h3 className="u-label text-[0.5625rem] text-[var(--app-muted)]">
            {mine.length} {mine.length === 1 ? 'item' : 'items'}
          </h3>
          {mine.length === 0 ? (
            <p className="u-data py-2 text-[0.625rem] text-[var(--app-faint)]">
              Nothing in here yet.
            </p>
          ) : (
            mine.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onTap={onMoveItem}
                onTogglePacked={onTogglePacked}
                onQuantityChange={onQuantityChange}
              />
            ))
          )}
        </section>

        <AddItemForm tripItems={items} onAdd={onAddItem} />
      </div>
    </Sheet>
  );
}
