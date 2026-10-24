const CACHE = 'debt-of-years-v8';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/game.css',
  './js/vendor/phaser.min.js',
  './js/main.js',
  './js/art.js',
  './js/audio.js',
  './js/data/villagers.js',
  './js/data/chapters.js',
  './js/data/events.js',
  './js/data/finals.js',
  './js/data/village.js',
  './js/data/spells.js',
  './js/data/enemies.js',
  './js/data/story.js',
  './js/data/endings.js',
  './js/systems/state.js',
  './js/systems/store.js',
  './js/systems/ledger.js',
  './js/systems/endings.js',
  './js/systems/save.js',
  './js/systems/meta.js',
  './js/ui/core.js',
  './js/ui/settlement.js',
  './js/ui/joystick.js',
  './js/ui/ngplus.js',
  './js/scenes/boot.js',
  './js/scenes/title.js',
  './js/scenes/hub.js',
  './js/scenes/battle.js',
  './js/scenes/ending.js',
  './js/scenes/gallery.js',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok && new URL(request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
