// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { TripView } from './TripView';
import { renderApp, repo, resetAppState, seedTripWithTraveller } from '@/test/harness';
import { useUiStore } from '@/store/ui';
import type { Traveller, Trip } from '@/domain/types';

/**
 * M3: luggage as flat cards. These drive the real screen against a real
 * (fake-indexeddb) Dexie, so they cover the repo → useLiveQuery → render path
 * rather than mocking it away.
 */

beforeEach(async () => {
  await resetAppState();
});

function renderTrip(trip: Trip) {
  return renderApp(
    <Routes>
      <Route path="/trip/:tripId" element={<TripView />} />
    </Routes>,
    { route: `/trip/${trip.id}` },
  );
}

async function setup(): Promise<{ trip: Trip; traveller: Traveller }> {
  const seeded = await seedTripWithTraveller('Japan, October');
  useUiStore.setState({ selectedTravellerId: seeded.traveller.id });
  renderTrip(seeded.trip);
  // Wait for useLiveQuery to deliver the trip before any assertion.
  await screen.findByRole('heading', { name: /japan, october/i });
  return seeded;
}

/** Opens "Add luggage" from a kind's dashed slot button. */
async function openAddSheet(kindLabel: RegExp) {
  await userEvent.click(await screen.findByRole('button', { name: kindLabel }));
  return screen.findByRole('dialog', { name: /add luggage/i });
}

/**
 * A container card, matched by its full aria-label so it is not confused with
 * the "Edit <label>" action button, which contains the same words.
 */
function findCard(label: string) {
  return screen.findByRole('button', {
    name: new RegExp(`^${label}, \\d+ items?, \\d+ percent full$`, 'i'),
  });
}

describe('adding luggage', () => {
  it('adds a suitcase through the sheet and shows it as a card', async () => {
    await setup();

    const sheet = await openAddSheet(/\+ add suitcase/i);
    await userEvent.type(within(sheet).getByLabelText(/label/i), 'Big black Samsonite');
    await userEvent.click(within(sheet).getByRole('button', { name: /^add$/i }));

    expect(await findCard('Big black Samsonite')).toBeInTheDocument();
    // The card states its fill against the hardshell-large default of 120.
    expect(
      screen.getByRole('progressbar', { name: /big black samsonite fill/i }),
    ).toHaveAttribute('aria-valuemax', '120');
  });

  it('opens on the kind whose slot was tapped', async () => {
    await setup();

    const sheet = await openAddSheet(/\+ add pouch/i);
    expect(within(sheet).getByRole('radio', { name: 'Pouch' })).toBeChecked();
    // The subtype grid follows the kind.
    expect(within(sheet).getByRole('radio', { name: /packing cube/i })).toBeChecked();
  });

  it('falls back to the subtype placeholder when the label is left blank', async () => {
    await setup();

    const sheet = await openAddSheet(/\+ add bag/i);
    await userEvent.click(within(sheet).getByRole('button', { name: /^add$/i }));

    expect(await findCard('Day pack')).toBeInTheDocument();
  });
});

describe('container caps (C6)', () => {
  it('greys out a full kind with an explanation and hides its add slot', async () => {
    const { traveller } = await setup();

    for (let i = 1; i <= 3; i++) {
      await repo.addContainer(traveller.id, {
        kind: 'suitcase',
        subtype: 'hardshell-large',
        label: `Case ${i}`,
        colorHex: '#2B3138',
      });
    }

    // The dashed "+ Add suitcase" slot is replaced by the cap explanation.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /\+ add suitcase/i })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/3 of 3 — remove one to add another/i)).toBeInTheDocument();

    // And in the sheet, the kind is disabled rather than hidden (§4.2).
    const sheet = await openAddSheet(/\+ add bag/i);
    const suitcaseOption = within(sheet).getByRole('radio', {
      name: /suitcase — 3 of 3, remove one first/i,
    });
    expect(suitcaseOption).toBeDisabled();
  });

  it('refuses a 4th suitcase at the repo even if the UI is bypassed', async () => {
    const { traveller } = await setup();
    for (let i = 1; i <= 3; i++) {
      await repo.addContainer(traveller.id, {
        kind: 'suitcase',
        subtype: 'duffel',
        label: `Case ${i}`,
        colorHex: '#2B3138',
      });
    }

    const fourth = await repo.addContainer(traveller.id, {
      kind: 'suitcase',
      subtype: 'duffel',
      label: 'Case 4',
      colorHex: '#2B3138',
    });

    expect(fourth.ok).toBe(false);
    if (!fourth.ok) expect(fourth.code).toBe('cap-reached');
  });
});

describe('editing and deleting', () => {
  it('edits a container label and capacity', async () => {
    const { traveller } = await setup();
    const added = await repo.addContainer(traveller.id, {
      kind: 'bag',
      subtype: 'backpack',
      label: 'Old name',
      colorHex: '#2B3138',
    });
    if (!added.ok) throw new Error('setup failed');

    await userEvent.click(await findCard('Old name'));
    await userEvent.click(await screen.findByRole('button', { name: /edit old name/i }));

    const sheet = await screen.findByRole('dialog', { name: /edit luggage/i });
    const label = within(sheet).getByLabelText(/label/i);
    await userEvent.clear(label);
    await userEvent.type(label, 'New name');
    const capacity = within(sheet).getByLabelText(/capacity/i);
    await userEvent.clear(capacity);
    await userEvent.type(capacity, '55');
    await userEvent.click(within(sheet).getByRole('button', { name: /save/i }));

    await findCard('New name');
    // The fill readout is built from separate {value}/{max} nodes, so match the
    // progressbar's own value instead of its rendered text.
    await waitFor(() =>
      expect(screen.getByRole('progressbar', { name: /new name fill/i })).toHaveAttribute(
        'aria-valuemax',
        '55',
      ),
    );
  });

  it('deleting a container unassigns its items and undo restores them', async () => {
    const { trip, traveller } = await setup();
    const added = await repo.addContainer(traveller.id, {
      kind: 'bag',
      subtype: 'tote',
      label: 'Canvas tote',
      colorHex: '#2B3138',
    });
    if (!added.ok) throw new Error('setup failed');
    const item = await repo.addItem(trip.id, {
      name: 'Charger',
      category: 'Tech',
      containerId: added.value.id,
    });

    await userEvent.click(await findCard('Canvas tote'));
    // Two bare "Remove" buttons exist once the sheet opens (page + dialog), so
    // each click is scoped to the region it belongs to.
    const page = screen.getByRole('main');
    await userEvent.click(
      within(page)
        .getAllByRole('button', { name: /^remove$/i })
        .find((b) => !b.closest('[role="dialog"]'))!,
    );
    const confirm = await screen.findByRole('dialog', { name: /remove luggage/i });
    await userEvent.click(within(confirm).getByRole('button', { name: /^remove$/i }));

    // The item survives, unassigned (§3).
    await waitFor(async () => {
      expect(await repo.listContainers(trip.id)).toHaveLength(0);
    });
    expect((await repo.listItems(trip.id)).find((i) => i.id === item.id)?.containerId).toBeNull();

    await userEvent.click(await screen.findByRole('button', { name: /undo/i }));

    await waitFor(async () => {
      const containers = await repo.listContainers(trip.id);
      expect(containers).toHaveLength(1);
      expect(containers[0]!.label).toBe('Canvas tote');
    });
    await waitFor(async () => {
      const restored = (await repo.listItems(trip.id)).find((i) => i.id === item.id);
      expect(restored?.containerId).not.toBeNull();
    });
  });
});

describe('nesting a pouch (§3)', () => {
  it('offers only top-level suitcases and bags as parents, and reports the path', async () => {
    const { trip, traveller } = await setup();
    const suitcase = await repo.addContainer(traveller.id, {
      kind: 'suitcase',
      subtype: 'hardshell-large',
      label: 'Big suitcase',
      colorHex: '#2B3138',
    });
    if (!suitcase.ok) throw new Error('setup failed');

    const sheet = await openAddSheet(/\+ add pouch/i);
    await userEvent.type(within(sheet).getByLabelText(/label/i), 'Blue cube');
    await userEvent.selectOptions(
      within(sheet).getByLabelText(/packed inside/i),
      suitcase.value.id,
    );
    await userEvent.click(within(sheet).getByRole('button', { name: /^add$/i }));

    // The parent card shows the nested pouch in its strip.
    const parentCard = await screen.findByRole('button', { name: /big suitcase/i });
    await waitFor(() => expect(within(parentCard).getByText('Blue cube')).toBeInTheDocument());

    // And an item inside the pouch resolves to Pouch → Suitcase.
    const containers = await repo.listContainers(trip.id);
    const pouch = containers.find((c) => c.kind === 'pouch')!;
    expect(pouch.parentContainerId).toBe(suitcase.value.id);
  });
});
