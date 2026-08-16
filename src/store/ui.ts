import { create } from 'zustand';
import type { UUID } from '@/domain/types';

/**
 * Session/UI state only. Persisted entities live in Dexie and are read with
 * useLiveQuery — never mirrored here (spec §2).
 */
interface UiState {
  selectedTravellerId: UUID | null;
  selectedContainerId: UUID | null;
  highlightedContainerId: UUID | null;
  drawerOpen: boolean;
  drawerHeight: 'collapsed' | 'half' | 'full';

  selectTraveller: (id: UUID | null) => void;
  selectContainer: (id: UUID | null) => void;
  highlightContainer: (id: UUID | null) => void;
  setDrawerOpen: (open: boolean) => void;
  setDrawerHeight: (height: UiState['drawerHeight']) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedTravellerId: null,
  selectedContainerId: null,
  highlightedContainerId: null,
  drawerOpen: false,
  drawerHeight: 'half',

  selectTraveller: (id) => set({ selectedTravellerId: id, selectedContainerId: null }),
  selectContainer: (id) => set({ selectedContainerId: id }),
  highlightContainer: (id) => set({ highlightedContainerId: id }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setDrawerHeight: (height) => set({ drawerHeight: height }),
}));
