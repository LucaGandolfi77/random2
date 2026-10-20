/* ===== Snap PWA Service Worker =====
 * Shell offline + cache dei modelli MediaPipe al primo utilizzo.
 * I file in vendor/ (~15 MB) NON sono nel SHELL: vengono cachati alla prima
 * richiesta, così l'installazione resta immediata ma dalla seconda apertura
 * le lenti funzionano anche offline.
 */
const CACHE_NAME = 'snap-pwa-v2';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './filters.js',
  './manifest.json',
  './apple-touch-icon.png',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

function isVendor(url) {
  return url.pathname.includes('/vendor/');
}

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

  const url = new URL(req.url);

  // Modelli locali (vendor/): cache-first con aggiornamento in background —
  // una volta scaricati, i filtri volto funzionano offline.
  if (isVendor(url)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const rete = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => hit);
        return hit ?? rete;
      })
    );
    return;
  }

  // stessa origine: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((hit) => {
      const rete = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => hit ?? caches.match('./index.html'));
      return hit ?? rete;
    })
  );
});
