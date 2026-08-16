import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// domain/ must run under plain Node with no browser globals (spec §8), so the
// default environment stays 'node'. Suites needing IndexedDB opt in per-file.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
