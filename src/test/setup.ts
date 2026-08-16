// Must precede any import that constructs a Dexie instance: src/data/db.ts
// creates the `db` singleton at module load, and Dexie captures the global
// indexedDB at construction time.
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

/**
 * Shared across every suite. The DOM-only pieces are guarded because domain
 * tests run in the `node` environment where `document` does not exist.
 */
if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);

  // jsdom implements neither of these, and both are used by real components:
  // Sheet measures nothing but drei/OrbitControls and the drawer do.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}
