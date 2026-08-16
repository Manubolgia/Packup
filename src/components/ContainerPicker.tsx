import type { Container, Traveller } from '@/domain/types';
import { subtypeSpec } from '@/domain/catalog';
import { IconForKind } from './icons/Icon';
import { Sheet } from './ui/Sheet';

export interface ContainerPickerProps {
  open: boolean;
  title?: string;
  containers: readonly Container[];
  travellers: readonly Traveller[];
  /** Hidden from the list — you cannot move something into where it already is. */
  excludeId?: string | undefined;
  onPick: (containerId: string | null) => void;
  onClose: () => void;
}

/**
 * Where should this go? Used by "move to…", multi-select move, and the
 * unassigned-item shortcut in the drawer (§4.3). Always offers "Unassigned" so
 * an item can be taken back out of a bag by the same route it went in.
 */
export function ContainerPicker({
  open,
  title = 'Move to…',
  containers,
  travellers,
  excludeId,
  onPick,
  onClose,
}: ContainerPickerProps) {
  const byTraveller = travellers.map((traveller) => ({
    traveller,
    owned: containers.filter((c) => c.travellerId === traveller.id && c.id !== excludeId),
  }));

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <button
          onClick={() => onPick(null)}
          className="u-label flex min-h-11 items-center border border-dashed border-[var(--app-border-strong)] px-3 text-[0.5625rem] text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:text-[var(--app-fg)]"
        >
          Unassigned — still to pack
        </button>

        {byTraveller.map(({ traveller, owned }) =>
          owned.length === 0 ? null : (
            <section key={traveller.id} className="flex flex-col gap-1.5">
              <h3 className="u-label flex items-center gap-2 text-[0.5625rem] text-[var(--app-muted)]">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5"
                  style={{ background: traveller.accentColor }}
                />
                {traveller.name}
              </h3>
              {owned.map((container) => {
                const parent = container.parentContainerId
                  ? containers.find((c) => c.id === container.parentContainerId)
                  : undefined;
                return (
                  <button
                    key={container.id}
                    onClick={() => onPick(container.id)}
                    className="flex min-h-11 items-center gap-2.5 border border-[var(--app-border)] px-3 text-left transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:border-[var(--app-border-strong)]"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-6 w-6 shrink-0 place-items-center"
                      style={{ background: container.colorHex, color: 'var(--color-secondary)' }}
                    >
                      <IconForKind kind={container.kind} size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="u-label block truncate text-[0.5625rem] text-[var(--app-fg)]">
                        {container.label}
                      </span>
                      <span className="u-data block truncate text-[0.5rem] text-[var(--app-faint)]">
                        {subtypeSpec(container.subtype).label}
                        {parent ? ` · inside ${parent.label}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </section>
          ),
        )}
      </div>
    </Sheet>
  );
}
