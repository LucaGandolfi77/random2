import { defineConfig, loadEnv } from 'vite';

function normalizeBase(value: string | undefined): string {
  const raw = (value ?? '/').trim();
  if (!raw || raw === '/') return '/';
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: normalizeBase(env.BASE_PATH || process.env.BASE_PATH),
    build: {
      target: 'es2020',
      outDir: 'dist',
      assetsInlineLimit: 4096,
      cssCodeSplit: true,
      sourcemap: false,
      manifest: true
    },
    server: {
      host: '127.0.0.1',
      port: 5173
    },
    preview: {
      host: '127.0.0.1',
      port: 4173
    }
  };
});
