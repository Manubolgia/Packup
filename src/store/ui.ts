import { create } from 'zustand';
import type { UUID } from '@/domain/types';

/**
 * Session/UI state only. Persisted entities live in Dexie and are read with
 * useLiveQuery — never mirrored here (spec §2).
 */
export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
  /** Set when the action is reversible; the toast then offers Undo. */
  undo?: () => void;
}

interface UiState {
  selectedTravellerId: UUID | null;
  selectedContainerId: UUID | null;
  highlightedContainerId: UUID | null;
  drawerOpen: boolean;
  drawerHeight: 'collapsed' | 'half' | 'full';
  toasts: Toast[];

  selectTraveller: (id: UUID | null) => void;
  selectContainer: (id: UUID | null) => void;
  highlightContainer: (id: UUID | null) => void;
  setDrawerOpen: (open: boolean) => void;
  setDrawerHeight: (height: UiState['drawerHeight']) => void;
  pushToast: (message: string, options?: { tone?: Toast['tone']; undo?: () => void }) => number;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

export const useUiStore = create<UiState>((set) => ({
  selectedTravellerId: null,
  selectedContainerId: null,
  highlightedContainerId: null,
  drawerOpen: false,
  drawerHeight: 'half',
  toasts: [],

  selectTraveller: (id) => set({ selectedTravellerId: id, selectedContainerId: null }),
  selectContainer: (id) => set({ selectedContainerId: id }),
  highlightContainer: (id) => set({ highlightedContainerId: id }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setDrawerHeight: (height) => set({ drawerHeight: height }),

  pushToast: (message, options) => {
    const id = ++toastSeq;
    set((state) => ({
      // One at a time: a stack of toasts over a thumb-sized UI is noise.
      toasts: [
        ...state.toasts.slice(-1),
        {
          id,
          message,
          tone: options?.tone ?? 'info',
          ...(options?.undo ? { undo: options.undo } : {}),
        },
      ],
    }));
    return id;
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
