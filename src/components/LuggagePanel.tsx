import type { Container, ContainerKind, Item } from '@/domain/types';
import { KIND_LABEL } from '@/domain/catalog';
import { CONTAINER_CAPS } from '@/domain/rules';
import { ContainerCard } from './ContainerCard';

const KINDS: readonly ContainerKind[] = ['suitcase', 'bag', 'pouch', 'person'];

export interface LuggagePanelProps {
  containers: readonly Container[];
  items: readonly Item[];
  selectedContainerId: string | null;
  onSelect: (id: string) => void;
  onAdd: (kind: ContainerKind) => void;
}

/**
 * Flat luggage list, grouped by kind. This is M3's main view and stays on as
 * the no-WebGL fallback (C8) — so every action available in 3D is available
 * here too, by tap alone (C5).
 */
export function LuggagePanel({
  containers,
  items,
  selectedContainerId,
  onSelect,
  onAdd,
}: LuggagePanelProps) {
  return (
    <div className="flex flex-col gap-5">
      {KINDS.map((kind) => {
        const ofKind = containers
          .filter((c) => c.kind === kind && !c.parentContainerId)
          .sort((a, b) => a.slotIndex - b.slotIndex);
        const total = containers.filter((c) => c.kind === kind).length;
        const full = total >= CONTAINER_CAPS[kind];

        return (
          <section key={kind} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="u-label text-[0.625rem] text-[var(--app-muted)]">
                {KIND_LABEL[kind]}
              </h3>
              <span className="u-data text-[0.625rem] text-[var(--app-faint)]">
                {total}/{CONTAINER_CAPS[kind]}
              </span>
            </div>

            <div className="grid gap-2">
              {ofKind.map((container) => (
                <ContainerCard
                  key={container.id}
                  container={container}
                  containers={containers}
                  items={items}
                  children={containers.filter((c) => c.parentContainerId === container.id)}
                  selected={container.id === selectedContainerId}
                  onSelect={onSelect}
                />
              ))}

              {/* The empty slot is itself the add button — the flat twin of the
                  dashed placeholder slots in the 3D scene (§5). */}
              {full ? (
                total === 0 ? null : (
                  <p className="u-data px-1 text-[0.625rem] text-[var(--app-faint)]">
                    {CONTAINER_CAPS[kind]} of {CONTAINER_CAPS[kind]} — remove one to add another.
                  </p>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => onAdd(kind)}
                  className={[
                    'u-label flex min-h-11 items-center justify-center border border-dashed px-3 text-[0.5625rem]',
                    'border-[var(--app-border-strong)] text-[var(--app-muted)]',
                    'transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:text-[var(--app-fg)]',
                  ].join(' ')}
                >
                  + Add {KIND_LABEL[kind].toLowerCase()}
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
