const CACHE = 'fidenza-da-giocare-v3.3.0';
const TILE_CACHE = 'fidenza-ground-tiles-v1';
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
  './js/block-palette.js',
  './js/block-textures.js',
  './js/ground-textures.js',
  './js/ground-cache.js',
  './js/ground-tiles.js',
  './js/mc-blocks.js',
  './js/voxel-details.js',
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
  './data/arnis/arnis.json',
  './data/ground/ground.json',
  './data/ground/ortho-z0.jpg',
  './data/ground/ortho-z1.jpg',
  './data/ground/ortho-z2.jpg',
  './data/ground/ortho-center-z0.jpg',
  './data/ground/ortho-center-z1.jpg',
  './data/ground/tiles/manifest.json',
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
      .then(keys => {
        const keep = new Set([CACHE, TILE_CACHE]);
        return Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k)));
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Le tessere del suolo vivono in una cache dedicata, senza limite: il
  // prefetch completo del gioco le scarica tutte per l'uso offline.
  if (url.pathname.includes('/data/ground/tiles/')) {
    event.respondWith((async () => {
      const cache = await caches.open(TILE_CACHE);
      let hit = await cache.match(req);
      if (!hit && url.pathname.endsWith('/data/ground/tiles/manifest.json')) {
        // Il manifest è già nel precache shell: rendilo disponibile anche
        // prima che il prefetch completo delle tessere sia partito.
        hit = await caches.match(req);
        if (hit) cache.put(req, hit.clone()).catch(() => {});
      }
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      } catch {
        return new Response('', { status: 504 });
      }
    })());
    return;
  }

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
