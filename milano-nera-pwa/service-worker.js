const CACHE_NAME = 'milano-nera-77-v3';
const CACHE_PREFIX = 'milano-nera-77-';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  '../shared/arcade.js',
  './src/config.js',
  './src/rng.js',
  './src/collision.js',
  './src/ai.js',
  './src/levels.js',
  './src/content.js',
  './src/storage.js',
  './src/sim.js',
  './src/audio.js',
  './src/input.js',
  './src/render.js',
  './src/ui.js',
  './src/main.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('./index.html').then((response) => response || caches.match('./'))
      )
    );
    return;
  }
  event.respondWith(cacheFirst(event.request).catch(() => caches.match(event.request)));
});
