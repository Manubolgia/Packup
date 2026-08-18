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
 * Chooses between the 3D room and the flat list, and owns the explanation
 * shown when WebGL is missing. Both paths expose the same actions (C5, C8).
 * Fills whatever height the trip screen gives it — the app never page-scrolls.
 */
export function LuggageView(props: LuggageViewProps) {
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const [force2D, setForce2D] = useState(false);
  const flat = !webgl || force2D;

  if (flat) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        {!webgl ? (
          <p className="u-data shrink-0 border border-[var(--app-border)] p-3 text-[0.6875rem] text-[var(--app-muted)]">
            3D is unavailable on this device, so your luggage is shown as a list. Everything still
            works.
          </p>
        ) : null}
        {webgl ? (
          <button
            onClick={() => setForce2D(false)}
            className="u-label shrink-0 self-start text-[0.5625rem] text-[var(--app-accent)]"
          >
            Show 3D view
          </button>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <LuggagePanel
            containers={props.containers}
            items={props.items}
            selectedContainerId={props.selectedContainerId}
            onSelect={props.onSelect}
            onAdd={props.onAdd}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden border border-[var(--app-border)]">
      <Suspense
        fallback={
          <div className="grid h-full place-items-center">
            <p className="u-data text-[0.6875rem] text-[var(--app-faint)]">Loading 3D…</p>
          </div>
        }
      >
        <Scene {...props} />
      </Suspense>

      {/* Vignette: a touch of depth at the edges, outside the WebGL budget. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 105% at 50% 42%, transparent 62%, rgb(20 23 26 / 0.28) 100%)',
        }}
      />

      <button
        onClick={() => setForce2D(true)}
        className="u-label absolute right-2 bottom-2 border border-[var(--app-border-strong)] bg-[var(--app-bg)] px-2.5 py-1.5 text-[0.5625rem] text-[var(--app-muted)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:text-[var(--app-fg)]"
      >
        Show as list
      </button>
    </div>
  );
}
