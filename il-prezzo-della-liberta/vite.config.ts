import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: '127.0.0.1'
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000
  }
});
