import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const dist = join(root, 'dist');

function normalizeBase(value) {
  const raw = (value || '/').trim();
  if (!raw || raw === '/') return '/';
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

const base = normalizeBase(process.env.BASE_PATH);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

const files = await walk(dist);
const relativeFiles = files
  .map((file) => relative(dist, file).split(sep).join('/'))
  .filter((file) => file !== 'sw.js' && !file.endsWith('.map'))
  .sort();

const version = createHash('sha256')
  .update(relativeFiles.join('|'))
  .update(String(Date.now()))
  .digest('hex')
  .slice(0, 12);

const urls = relativeFiles.map((file) => `${base}${file}`);
if (!urls.includes(`${base}index.html`)) urls.push(`${base}index.html`);
const unique = Array.from(new Set(urls));

const sw = `/* NEVE E FERRO — service worker generato dal build */
const CACHE_NAME = 'neve-ferro-${version}';
const INDEX_URL = ${JSON.stringify(`${base}index.html`)};
const PRECACHE = ${JSON.stringify(unique, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // addAll fallisce se una sola risorsa manca; il film deve essere offline-first.
    await cache.addAll(PRECACHE);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(INDEX_URL, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(INDEX_URL)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
`;

await writeFile(join(dist, 'sw.js'), sw, 'utf8');
await writeFile(
  join(dist, 'precache-manifest.json'),
  JSON.stringify({ version, base, files: relativeFiles, urls: unique }, null, 2),
  'utf8'
);

const swStat = await stat(join(dist, 'sw.js'));
console.log(`sw.js generated: ${relativeFiles.length} assets, version ${version}, ${swStat.size} bytes`);
const manifest = JSON.parse(await readFile(join(dist, 'manifest.webmanifest'), 'utf8'));
console.log(`manifest: ${manifest.name}, icons ${manifest.icons.length}`);
