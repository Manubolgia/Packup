import 'fake-indexeddb/auto';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import { db } from '@/data/db';
import { repo } from '@/data/repo';
import { useUiStore } from '@/store/ui';
import { Toaster } from '@/components/ui/Toaster';

/**
 * Component suites drive the real `repo`/`db` singletons — the same objects the
 * screens import — backed by fake-indexeddb. That keeps the tests honest about
 * the Dexie → useLiveQuery → component path, which is where the bugs live.
 * `resetAppState` must run before every test to stop state bleeding across them.
 */
export async function resetAppState(): Promise<void> {
  await repo.wipe();
  useUiStore.setState({
    selectedTravellerId: null,
    selectedContainerId: null,
    highlightedContainerId: null,
    drawerOpen: false,
    drawerHeight: 'half',
    toasts: [],
  });
}

export { db, repo };

export interface RenderAppOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial URL, so a route with params like /trip/:tripId resolves. */
  route?: string;
}

/**
 * Mirrors main.tsx: the router plus the Toaster, which lives outside the route
 * tree there. Without it, undo actions would be untestable.
 */
export function renderApp(ui: ReactElement, options: RenderAppOptions = {}): RenderResult {
  const { route = '/', ...rest } = options;
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        {children}
        <Toaster />
      </MemoryRouter>
    );
  }
  return render(ui, { wrapper: Wrapper, ...rest });
}

/** Advances past useLiveQuery's async resolution without an arbitrary sleep. */
export const user = userEvent;

/** A trip with one traveller — the starting point for most container tests. */
export async function seedTripWithTraveller(name = 'Test trip') {
  const trip = await repo.createTrip({ name });
  const traveller = await repo.addTraveller(trip.id, {
    name: 'Me',
    accentColor: '#E8A317',
    isSelf: true,
  });
  return { trip, traveller };
}
