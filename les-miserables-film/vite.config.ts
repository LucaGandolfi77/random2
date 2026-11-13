import { defineConfig } from 'vite';

// Relative base keeps the film portable: GitHub Pages sub-path, a custom
// domain, a local preview, or a plain static file server all work.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
  },
});
