/* ===== Snap PWA Service Worker =====
 * Shell offline + cache dei modelli CDN (MediaPipe) al primo utilizzo. */
const CACHE_NAME = 'snap-pwa-v1';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './filters.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // CDN e modelli (cross-origin): cache-first con risposta opaca —
  // una volta scaricati, i filtri volto funzionano anche offline.
  if (req.url.startsWith('https://cdn.jsdelivr.net/') || req.url.startsWith('https://storage.googleapis.com/')) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        }).catch(() => hit)
      )
    );
    return;
  }

  // stessa origine: cache-first con fallback di rete
  event.respondWith(
    caches.match(req).then((hit) => hit ?? fetch(req))
  );
});
