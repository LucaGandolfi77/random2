const CACHE = 'fidenza-da-giocare-v2.20.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './assets/fonts/fonts.css',
  './assets/fonts/anton-400-latin.woff2',
  './assets/fonts/anton-400-latin-ext.woff2',
  './assets/fonts/oswald-400-latin.woff2',
  './assets/fonts/oswald-400-latin-ext.woff2',
  './assets/fonts/oswald-500-latin.woff2',
  './assets/fonts/oswald-500-latin-ext.woff2',
  './assets/fonts/oswald-600-latin.woff2',
  './assets/fonts/oswald-600-latin-ext.woff2',
  './assets/fonts/oswald-700-latin.woff2',
  './assets/fonts/oswald-700-latin-ext.woff2',
  './assets/fonts/OFL-Anton.txt',
  './assets/fonts/OFL-Oswald.txt',
  './assets/icons/icon.svg',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/img/citta.jpg',
  './assets/img/corso.jpg',
  './assets/img/duomo.jpg',
  './assets/img/og.jpg',
  './vendor/three.module.js',
  './vendor/BufferGeometryUtils.js',
  './js/main.js',
  './js/config.js',
  './js/utils.js',
  './js/save.js',
  './js/input.js',
  './js/audio.js',
  './js/hud.js',
  './js/models.js',
  './js/world.js',
  './js/postfx.js',
  './js/transit.js',
  './js/building-geometry.js',
  './js/poi-signs.js',
  './js/traffic.js',
  './js/npcs.js',
  './js/districts.js',
  './js/diary.js',
  './js/schedules.js',
  './js/landmarks.js',
  './js/player.js',
  './js/vehicles.js',
  './js/missions.js',
  './js/map.js',
  './js/photo-mode.js',
  './js/photo-store.js',
  './js/achievements.js',
  './js/daily.js',
  './js/career.js',
  './js/events.js',
  './js/map-overrides.js',
  './data/city.json',
  './data/terrain.json',
  './data/map.json',
  './data/styles/spring.json',
  './data/styles/summer.json',
  './data/styles/autumn.json',
  './data/styles/winter.json',
  './data/ATTRIBUTION.md'
];

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('Precache parziale', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const dynamicData = url.pathname.endsWith('/data/map.json') || url.pathname.includes('/data/styles/');
  if (dynamicData) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
