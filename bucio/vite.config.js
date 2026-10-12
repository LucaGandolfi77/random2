import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        id: '/bucio/',
        name: 'BUCIO — Divora Tutto',
        short_name: 'BUCIO',
        description:
          'Sei un buco nero low-poly caduto dal cielo su una cittadina italiana. Mangia gelati, vespette, ombrelloni e rivali. 120 secondi.',
        lang: 'it',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        display_override: ['standalone', 'fullscreen'],
        orientation: 'any',
        background_color: '#0d1b2a',
        theme_color: '#0d1b2a',
        categories: ['games', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          { src: 'screens/shot-wide.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
          { src: 'screens/shot-tall.png', sizes: '750x1334', type: 'image/png', form_factor: 'narrow' },
        ],
      },
    }),
  ],
});
