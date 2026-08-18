// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { TripView } from './TripView';
import { renderApp, repo, resetAppState, seedTripWithTraveller } from '@/test/harness';
import { useUiStore } from '@/store/ui';
import { resetWebGLDetection } from '@/three/webgl';
import type { Container, Trip } from '@/domain/types';

/**
 * M5: items, the inventory drawer, and the tap-item → locate-container flow.
 * WebGL is forced off so these run against the list fallback: the interaction
 * contract is identical either way (C5/C8), and jsdom cannot render a canvas.
 */

beforeEach(async () => {
  await resetAppState();
  resetWebGLDetection(false);
});

interface Fixture {
  trip: Trip;
  suitcase: Container;
  pouch: Container;
}

/** A trip with a suitcase, a pouch nested inside it, and items in each. */
async function setup(): Promise<Fixture> {
  const { trip, traveller } = await seedTripWithTraveller('Japan, October');
  useUiStore.setState({ selectedTravellerId: traveller.id });

  const suitcaseResult = await repo.addContainer(traveller.id, {
    kind: 'suitcase',
    subtype: 'hardshell-large',
    label: 'Big suitcase',
    colorHex: '#8A8F96',
  });
  if (!suitcaseResult.ok) throw new Error('setup: suitcase');
  const suitcase = suitcaseResult.value;

  const pouchResult = await repo.addContainer(traveller.id, {
    kind: 'pouch',
    subtype: 'packing-cube',
    label: 'Blue pouch',
    colorHex: '#4A6FA5',
    parentContainerId: suitcase.id,
  });
  if (!pouchResult.ok) throw new Error('setup: pouch');

  await repo.addItem(trip.id, {
    name: 'Charger',
    category: 'Tech',
    containerId: pouchResult.value.id,
    essential: true,
  });
  await repo.addItem(trip.id, { name: 'Jeans', category: 'Clothing', containerId: suitcase.id });
  await repo.addItem(trip.id, { name: 'Passport', category: 'Documents' });

  renderApp(
    <Routes>
      <Route path="/trip/:tripId" element={<TripView />} />
    </Routes>,
    { route: `/trip/${trip.id}` },
  );
  await screen.findByRole('heading', { name: /japan, october/i });

  return { trip, suitcase, pouch: pouchResult.value };
}

/**
 * Opens the inventory drawer and returns it. Queries must be scoped to it: the
 * luggage list behind it also renders h3 headings and container buttons.
 */
async function openDrawer(): Promise<HTMLElement> {
  const handle = await screen.findByRole('button', { name: /inventory/i });
  await userEvent.click(handle);
  await screen.findByRole('textbox', { name: /search items/i });
  return handle.parentElement as HTMLElement;
}

/** Group headings currently shown in the drawer, in order. */
function drawerGroups(drawer: HTMLElement): (string | null)[] {
  return within(drawer)
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent);
}

/**
 * Taps a container card to open its sheet. Matched on the card's full
 * aria-label so it is not confused with same-named buttons elsewhere.
 */
async function openContainerSheet(label: string) {
  await userEvent.click(
    await screen.findByRole('button', {
      name: new RegExp(`^${label}, \\d+ items?, \\d+ packed$`, 'i'),
    }),
  );
}

describe('the inventory drawer', () => {
  it('lists every item grouped by container, with the unassigned pile last', async () => {
    await setup();
    const drawer = await openDrawer();

    expect(drawerGroups(drawer)).toEqual(['Big suitcase', 'Blue pouch', 'Unassigned']);
  });

  it('reports packed progress on the handle', async () => {
    const { trip } = await setup();
    await openDrawer();
    expect(screen.getByText('0/3 packed')).toBeInTheDocument();

    const charger = (await repo.listItems(trip.id)).find((i) => i.name === 'Charger')!;
    await repo.setPacked(charger.id, true);

    await waitFor(() => expect(screen.getByText('1/3 packed')).toBeInTheDocument());
  });

  it('filters to unassigned items only', async () => {
    await setup();
    await openDrawer();

    await userEvent.click(screen.getByRole('button', { name: /^unassigned$/i }));

    expect(screen.getByRole('button', { name: /^passport/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^charger/i })).not.toBeInTheDocument();
  });

  it('filters to essentials only', async () => {
    await setup();
    await openDrawer();

    await userEvent.click(screen.getByRole('button', { name: /^essentials$/i }));

    expect(screen.getByRole('button', { name: /^charger.*essential/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^jeans/i })).not.toBeInTheDocument();
  });

  it('searches by name', async () => {
    await setup();
    await openDrawer();

    await userEvent.type(screen.getByRole('textbox', { name: /search items/i }), 'jean');

    expect(screen.getByRole('button', { name: /^jeans/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^charger/i })).not.toBeInTheDocument();
  });

  it('switches to a flat A–Z list showing each item’s full path', async () => {
    await setup();
    const drawer = await openDrawer();

    await userEvent.click(within(drawer).getByRole('button', { name: /^a–z$/i }));

    expect(drawerGroups(drawer)).toEqual(['All items']);
    // Flat mode shows where each item lives, since the group no longer says so.
    expect(
      within(drawer).getByRole('button', { name: /charger.*Me › Big suitcase › Blue pouch/i }),
    ).toBeInTheDocument();
  });
});

describe('tapping an item to locate it (§4.3)', () => {
  it('selects the containing container, collapses the drawer and shows the path', async () => {
    const { pouch } = await setup();
    await openDrawer();

    await userEvent.click(screen.getByRole('button', { name: /^charger/i }));

    await waitFor(() => {
      const state = useUiStore.getState();
      expect(state.selectedContainerId).toBe(pouch.id);
      expect(state.highlightedContainerId).toBe(pouch.id);
      expect(state.drawerHeight).toBe('collapsed');
    });

    // The breadcrumb reads innermost-first: "Blue pouch → Big suitcase" (§4.3).
    expect(await screen.findByText('Blue pouch → Big suitcase')).toBeInTheDocument();
  });

  it('offers a container picker instead when the item is not packed anywhere', async () => {
    await setup();
    await openDrawer();

    await userEvent.click(screen.getByRole('button', { name: /^passport/i }));

    const picker = await screen.findByRole('dialog', { name: /move to/i });
    expect(
      within(picker).getByRole('button', { name: /big suitcase.*hardshell/i }),
    ).toBeInTheDocument();
    // Nothing was highlighted, because there is nothing to fly to.
    expect(useUiStore.getState().highlightedContainerId).toBeNull();
  });

  it('clears the highlight after the pulse rather than leaving it lit', async () => {
    await setup();
    await openDrawer();

    await userEvent.click(screen.getByRole('button', { name: /^charger/i }));
    expect(useUiStore.getState().highlightedContainerId).not.toBeNull();

    await waitFor(() => expect(useUiStore.getState().highlightedContainerId).toBeNull(), {
      timeout: 2500,
    });
    // The selection survives the pulse — only the highlight is temporary.
    expect(useUiStore.getState().selectedContainerId).not.toBeNull();
  });
});

describe('multi-select move (§4.3)', () => {
  it('moves several items to another container in one action', async () => {
    const { trip, suitcase } = await setup();
    await openDrawer();

    // Long-press enters selection mode; a tap then adds to the selection.
    const charger = screen.getByRole('button', { name: /^charger/i });
    await userEvent.pointer({ target: charger, keys: '[MouseLeft>]' });
    await new Promise((r) => setTimeout(r, 600));
    await userEvent.pointer({ target: charger, keys: '[/MouseLeft]' });

    await screen.findByText(/1 selected/i);
    await userEvent.click(screen.getByRole('button', { name: /^passport/i }));
    await screen.findByText(/2 selected/i);

    await userEvent.click(screen.getByRole('button', { name: /move 2 to/i }));
    const picker = await screen.findByRole('dialog', { name: /move 2 items to/i });
    await userEvent.click(within(picker).getByRole('button', { name: /big suitcase.*hardshell/i }));

    await waitFor(async () => {
      const items = await repo.listItems(trip.id);
      const moved = items.filter((i) => i.containerId === suitcase.id).map((i) => i.name);
      expect(moved.sort()).toEqual(['Charger', 'Jeans', 'Passport']);
    });
  });
});

describe('the container sheet', () => {
  it('adds an item into the selected container', async () => {
    const { trip, suitcase } = await setup();

    await openContainerSheet('Big suitcase');
    const sheet = await screen.findByRole('dialog', { name: /big suitcase/i });

    await userEvent.type(within(sheet).getByLabelText(/item name/i), 'Sunglasses');
    await userEvent.click(within(sheet).getByRole('button', { name: /^add$/i }));

    await waitFor(async () => {
      const items = await repo.listItems(trip.id);
      const added = items.find((i) => i.name === 'Sunglasses');
      expect(added?.containerId).toBe(suitcase.id);
    });
  });

  it('shows the nested pouch strip', async () => {
    await setup();

    await openContainerSheet('Big suitcase');
    const sheet = await screen.findByRole('dialog', { name: /big suitcase/i });

    expect(within(sheet).getByRole('heading', { name: /pouches inside/i })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: /blue pouch/i })).toBeInTheDocument();
  });

  it('toggles an item as packed from the sheet', async () => {
    const { trip } = await setup();

    await openContainerSheet('Big suitcase');
    const sheet = await screen.findByRole('dialog', { name: /big suitcase/i });
    await userEvent.click(within(sheet).getByRole('button', { name: /mark packed: jeans/i }));

    await waitFor(async () => {
      const jeans = (await repo.listItems(trip.id)).find((i) => i.name === 'Jeans');
      expect(jeans?.packed).toBe(true);
    });
  });
});
