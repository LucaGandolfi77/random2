import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['@crew-of-one/sim', '@crew-of-one/content', '@crew-of-one/shared'],
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Crew of One',
        short_name: 'Crew of One',
        description: 'A one-screen time-loop heist. Your past runs are your crew.',
        theme_color: '#0B132B',
        background_color: '#0B132B',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['games', 'puzzle'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
