// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LuggageView } from './LuggageView';
import { resetWebGLDetection } from '@/three/webgl';
import type { Container, Item } from '@/domain/types';

/**
 * M4 / C8: with WebGL missing the app must stay fully usable as a list, with an
 * explanation. jsdom has no WebGL at all, which makes it the honest environment
 * for this — the fallback is what a locked-down WebView would get.
 */

const suitcase: Container = {
  id: 'c-1',
  travellerId: 't-1',
  kind: 'suitcase',
  subtype: 'hardshell-large',
  label: 'Big black Samsonite',
  colorHex: '#2B3138',
  slotIndex: 0,
  capacityUnits: 120,
  createdAt: 0,
};

const item: Item = {
  id: 'i-1',
  tripId: 'trip-1',
  name: 'Charger',
  category: 'Tech',
  quantity: 1,
  size: 'small',
  containerId: 'c-1',
  packed: false,
  essential: false,
  createdAt: 0,
  updatedAt: 0,
};

function renderView(overrides: Partial<Parameters<typeof LuggageView>[0]> = {}) {
  const onSelect = vi.fn();
  const onAdd = vi.fn();
  render(
    <LuggageView
      containers={[suitcase]}
      items={[item]}
      accentColor="#E8A317"
      selectedContainerId={null}
      highlightedContainerId={null}
      onSelect={onSelect}
      onAdd={onAdd}
      {...overrides}
    />,
  );
  return { onSelect, onAdd };
}

afterEach(() => resetWebGLDetection(undefined));

describe('without WebGL (C8)', () => {
  beforeEach(() => resetWebGLDetection(false));

  it('explains the fallback and still lists the luggage', () => {
    renderView();

    expect(screen.getByText(/3d is unavailable on this device/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /big black samsonite, 1 items, 1 percent full/i }),
    ).toBeInTheDocument();
  });

  it('keeps every action reachable by tap', async () => {
    const { onSelect, onAdd } = renderView();

    await userEvent.click(
      screen.getByRole('button', { name: /big black samsonite, 1 items, 1 percent full/i }),
    );
    expect(onSelect).toHaveBeenCalledWith('c-1');

    await userEvent.click(screen.getByRole('button', { name: /\+ add bag/i }));
    expect(onAdd).toHaveBeenCalledWith('bag');
  });

  it('does not offer a "show 3D" escape hatch that would render nothing', () => {
    renderView();
    expect(screen.queryByRole('button', { name: /show 3d view/i })).not.toBeInTheDocument();
  });
});

describe('with WebGL available', () => {
  beforeEach(() => resetWebGLDetection(true));

  it('offers a list view the user can switch to, and back', async () => {
    renderView();

    await userEvent.click(screen.getByRole('button', { name: /show as list/i }));
    expect(
      screen.getByRole('button', { name: /big black samsonite, 1 items, 1 percent full/i }),
    ).toBeInTheDocument();
    // Opting into the list is a preference, not a failure, so no banner.
    expect(screen.queryByText(/3d is unavailable/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show 3d view/i }));
    expect(screen.getByRole('button', { name: /reset view/i })).toBeInTheDocument();
  });
});

describe('over-capacity warnings (§5)', () => {
  beforeEach(() => resetWebGLDetection(false));

  it('warns without blocking when a container is over-filled', () => {
    // 20 large items = 160 units in a 120-unit case: past the 120% red line.
    const overfilled: Item = { ...item, size: 'large', quantity: 20 };
    renderView({ items: [overfilled] });

    const card = screen.getByRole('button', { name: /big black samsonite/i });
    expect(within(card).getByText(/won’t fit/i)).toBeInTheDocument();
    // The card still renders and stays tappable — a warning, not a rule.
    expect(card).toBeEnabled();
  });

  it('shows the amber "full" chip between 100% and 120%', () => {
    // 14 large = 112 units in a 120-unit case is under; 15 large = 120 hits it.
    const full: Item = { ...item, size: 'large', quantity: 15 };
    renderView({ items: [full] });

    const card = screen.getByRole('button', { name: /big black samsonite/i });
    expect(within(card).getByText(/^full$/i)).toBeInTheDocument();
  });
});
