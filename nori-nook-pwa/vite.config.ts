import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'icon.svg',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        name: 'Nori Nook - Little Sushi, Big Dreams',
        short_name: 'Nori Nook',
        description:
          'A cozy sushi restaurant game. Roll sushi, meet lovely customers, decorate your nook and grow your little dream.',
        theme_color: '#F7F1E5',
        background_color: '#F7F1E5',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['games', 'food', 'lifestyle'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: 'screenshots/home-mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Nori Nook home screen',
          },
          {
            src: 'screenshots/kitchen-mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Sushi preparation kitchen',
          },
          {
            src: 'screenshots/home-desktop.png',
            sizes: '1280x900',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Nori Nook on desktop',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1400,
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
