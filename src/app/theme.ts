import { useSyncExternalStore } from 'react';

/**
 * Light/dark theme. index.html applies the stored (or system) theme before
 * first paint; this module owns every change after that. The tokens live in
 * index.css under :root and :root[data-theme='light'].
 */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'packup.theme';

/** Browser chrome colour must follow --app-bg or the status bar mismatches. */
const THEME_COLOR: Record<Theme, string> = { dark: '#14171A', light: '#F2F2F0' };

const listeners = new Set<() => void>();

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private mode); the choice just won't persist.
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current theme as React state; toggling re-renders every subscriber. */
export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, currentTheme);
  return [theme, () => applyTheme(theme === 'dark' ? 'light' : 'dark')];
}
