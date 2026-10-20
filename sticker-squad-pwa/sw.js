const CACHE = 'sticker-squad-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/audio.js',
  './js/haptics.js',
  './js/engine.js',
  './js/player.js',
  './js/levels.js',
  './js/enemies.js',
  './js/particles.js',
  './js/squad.js',
  './js/touch.js',
  './js/ui.js',
  './js/game.js',
  './js/main.js',
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => {
      if (r) return r;
      return fetch(e.request).then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      });
    })
  );
});
