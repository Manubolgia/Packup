// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { Trips } from './Trips';
import { TripView } from './TripView';
import { renderApp, repo, resetAppState } from '@/test/harness';
import { resetWebGLDetection } from '@/three/webgl';

/**
 * M6: the states a user actually hits — empty, populated, and a route pointing
 * at a trip that no longer exists — plus the accessibility contract the 3D
 * scene depends on (§5).
 */

beforeEach(async () => {
  await resetAppState();
  resetWebGLDetection(false);
});

function renderTrips() {
  return renderApp(
    <Routes>
      <Route path="/" element={<Trips />} />
      <Route path="/trip/:tripId" element={<TripView />} />
    </Routes>,
    { route: '/' },
  );
}

describe('empty state', () => {
  it('offers a one-tap sample trip and seeds something realistic', async () => {
    renderTrips();

    const seed = await screen.findByRole('button', { name: /sample trip/i });
    await userEvent.click(seed);

    // §4.1: this is what a store reviewer sees first, so it must be substantial.
    // The trip row appears while seeding is still inserting items, so wait for
    // the count to stop growing rather than for the first row to exist.
    await waitFor(
      async () => {
        const [trip] = await repo.listTrips();
        expect(trip).toBeDefined();
        expect((await repo.listItems(trip!.id)).length).toBeGreaterThanOrEqual(20);
      },
      { timeout: 5000 },
    );

    const [trip] = await repo.listTrips();
    const travellers = await repo.listTravellers(trip!.id);
    const containers = await repo.listContainers(trip!.id);
    const items = await repo.listItems(trip!.id);

    expect(travellers.length).toBeGreaterThanOrEqual(2);
    expect(containers.length).toBeGreaterThanOrEqual(4);
    expect(items.length).toBeGreaterThanOrEqual(20);
    // Partly packed, so the progress ring is not 0% or 100% on first look.
    const packed = items.filter((i) => i.packed).length;
    expect(packed).toBeGreaterThan(0);
    expect(packed).toBeLessThan(items.length);
    // And it nests, so the headline feature is visible immediately.
    expect(containers.some((c) => c.parentContainerId)).toBe(true);
  });

  it('shows the empty state rather than an empty list', async () => {
    renderTrips();
    expect(await screen.findByRole('button', { name: /sample trip/i })).toBeInTheDocument();
  });
});

describe('missing trip', () => {
  it('explains instead of rendering a broken screen', async () => {
    renderApp(
      <Routes>
        <Route path="/trip/:tripId" element={<TripView />} />
      </Routes>,
      { route: '/trip/does-not-exist' },
    );

    expect(await screen.findByRole('heading', { name: /trip not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to trips/i })).toBeInTheDocument();
  });
});

describe('accessibility contract', () => {
  it('gives every container a spoken label with its fill state (§5)', async () => {
    const trip = await repo.createTrip({ name: 'A11y trip' });
    const traveller = await repo.addTraveller(trip.id, {
      name: 'Me',
      accentColor: '#E8A317',
      isSelf: true,
    });
    await repo.addContainer(traveller.id, {
      kind: 'suitcase',
      subtype: 'hardshell-cabin',
      label: 'Cabin case',
      colorHex: '#8A8F96',
    });

    renderApp(
      <Routes>
        <Route path="/trip/:tripId" element={<TripView />} />
      </Routes>,
      { route: `/trip/${trip.id}` },
    );

    // "Cabin case, 0 items, 0 percent full" — readable without seeing the mesh.
    expect(
      await screen.findByRole('button', { name: /^cabin case, 0 items, 0 percent full$/i }),
    ).toBeInTheDocument();
  });

  it('announces the selected container in a live region', async () => {
    const trip = await repo.createTrip({ name: 'A11y trip' });
    const traveller = await repo.addTraveller(trip.id, {
      name: 'Me',
      accentColor: '#E8A317',
      isSelf: true,
    });
    await repo.addContainer(traveller.id, {
      kind: 'bag',
      subtype: 'backpack',
      label: 'Day pack',
      colorHex: '#8A8F96',
    });

    const { container } = renderApp(
      <Routes>
        <Route path="/trip/:tripId" element={<TripView />} />
      </Routes>,
      { route: `/trip/${trip.id}` },
    );

    await userEvent.click(
      await screen.findByRole('button', { name: /^day pack, 0 items, 0 percent full$/i }),
    );

    await waitFor(() => {
      const live = container.querySelector('[aria-live="polite"]');
      expect(live?.textContent).toMatch(/day pack selected/i);
    });
  });

  it('labels the traveller tabs as a tablist', async () => {
    const trip = await repo.createTrip({ name: 'Tabs trip' });
    await repo.addTraveller(trip.id, { name: 'Me', accentColor: '#E8A317', isSelf: true });
    await repo.addTraveller(trip.id, { name: 'Marta', accentColor: '#F2F2F0' });

    renderApp(
      <Routes>
        <Route path="/trip/:tripId" element={<TripView />} />
      </Routes>,
      { route: `/trip/${trip.id}` },
    );

    const tablist = await screen.findByRole('tablist', { name: /travellers/i });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Me', 'Marta']);
    // Exactly one tab is selected at a time.
    expect(tabs.filter((t) => t.getAttribute('aria-selected') === 'true')).toHaveLength(1);
  });
});
