/*
 * New Star Soccer — service worker
 * Static, dependency-free: precaches the app shell, then serves same-origin
 * GET requests cache-first (Vite emits hashed assets, so runtime caching
 * pins each version). Navigations fall back to index.html for offline play.
 */
const CACHE = 'nss-v1';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch((x) => console.warn('skip:', u, x))))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        }).catch(() => (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
    )
  );
});
