import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base:'./' keeps every asset URL relative so one build works both at
// user.github.io/<repo>/ and at capacitor://localhost. Paired with HashRouter.
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/apple-touch-icon-180.png', 'favicon.ico'],
      workbox: {
        // woff2 included: fonts are self-hosted, so offline must precache them
        // or the app renders in a fallback face in airplane mode.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        // three.js pushes the precache past the 2 MiB default.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        id: '/packup/',
        name: 'Packup!',
        short_name: 'Packup',
        description: 'Model your luggage in 3D and know which item is in which bag.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#14171A',
        background_color: '#14171A',
        categories: ['travel', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // three is the bulk of the bundle once M4 lands; splitting it keeps
        // app-code updates from invalidating it in the service-worker precache.
        // Keyed off the module id so no empty chunk is emitted before then.
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          return undefined;
        },
      },
    },
  },
});
