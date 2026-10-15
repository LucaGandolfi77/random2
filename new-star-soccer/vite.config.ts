import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built app works when served under /random2/new-star-soccer/
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 3000,
    host: true,
  },
});
