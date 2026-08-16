import { lazy, Suspense, useMemo, useState } from 'react';
import type { Container, ContainerKind, Item } from '@/domain/types';
import { isWebGLAvailable } from '@/three/webgl';
import { LuggagePanel } from './LuggagePanel';

// three + drei are the bulk of the bundle: loading them only when the scene is
// actually rendered keeps the no-WebGL path (C8) from paying for them at all.
const Scene = lazy(() => import('@/three/Scene').then((m) => ({ default: m.Scene })));

export interface LuggageViewProps {
  containers: readonly Container[];
  items: readonly Item[];
  accentColor: string;
  selectedContainerId: string | null;
  highlightedContainerId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (kind: ContainerKind) => void;
}

/**
 * Chooses between the 3D scene and the flat list, and owns the explanation
 * shown when WebGL is missing. Both paths expose the same actions (C5, C8).
 */
export function LuggageView(props: LuggageViewProps) {
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const [force2D, setForce2D] = useState(false);
  const flat = !webgl || force2D;

  if (flat) {
    return (
      <div className="flex flex-col gap-3">
        {!webgl ? (
          <p className="u-data border border-[var(--app-border)] p-3 text-[0.6875rem] text-[var(--app-muted)]">
            3D is unavailable on this device, so your luggage is shown as a list. Everything still
            works.
          </p>
        ) : null}
        {webgl ? (
          <button
            onClick={() => setForce2D(false)}
            className="u-label self-start text-[0.5625rem] text-[var(--app-accent)]"
          >
            Show 3D view
          </button>
        ) : null}
        <LuggagePanel
          containers={props.containers}
          items={props.items}
          selectedContainerId={props.selectedContainerId}
          onSelect={props.onSelect}
          onAdd={props.onAdd}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Landscape: the scene is laid out along X (three slots wide plus the
          person), so a portrait canvas crops the rows and wastes floor. */}
      <div className="relative aspect-[4/3] max-h-[42dvh] min-h-[15rem] w-full border border-[var(--app-border)]">
        <Suspense
          fallback={
            <div className="grid h-full place-items-center">
              <p className="u-data text-[0.6875rem] text-[var(--app-faint)]">Loading 3D…</p>
            </div>
          }
        >
          <Scene {...props} />
        </Suspense>

        <button
          onClick={() => props.onSelect(null)}
          className="u-label absolute top-2 right-2 border border-[var(--app-border-strong)] bg-[var(--app-bg)] px-2 py-1.5 text-[0.5rem] text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:text-[var(--app-fg)]"
        >
          Reset view
        </button>
      </div>

      <button
        onClick={() => setForce2D(true)}
        className="u-label self-start text-[0.5625rem] text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:text-[var(--app-fg)]"
      >
        Show as list
      </button>
    </div>
  );
}
