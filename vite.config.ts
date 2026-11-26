import { lingui } from '@lingui/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const base = '/StoneByStone/';

export default defineConfig({
  base,
  plugins: [
    react(),
    lingui({ macroTransform: true }),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'icon-16.png', 'icon-32.png', 'robots.txt'],
      manifest: {
        id: base,
        name: 'StoneByStone',
        short_name: 'StoneByStone',
        description: 'Survey, photograph, and transcribe cemeteries, offline.',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#f7f5f0',
        theme_color: '#3d4a3a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,woff2,webmanifest}'],
        // The map chunk (~1.1 MB) and its worker must be precached so the map works offline.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globIgnores: ['icon.png'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
