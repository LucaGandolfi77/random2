/* Lucky Seven Slot — offline service worker.
 * Network-first for navigations (offline falls back to the cached shell),
 * stale-while-revalidate for static assets. Install once, play forever.
 */
const CACHE = 'slot-pwa-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  '../shared/arcade.js',
  './src/main.js',
  './src/config.js',
  './src/rng.js',
  './src/engine.js',
  './src/state.js',
  './src/meta.js',
  './src/spin.js',
  './src/render.js',
  './src/audio.js',
  './src/input.js',
  './src/ui.js',
  './src/pwa.js',
  './src/features.js',
  './src/effects.js',
  './src/art/symbols.js',
  './src/art/backgrounds.js',
  './src/modes/index.js',
  './src/modes/tournament.js',
  './src/modes/rush.js',
  './src/modes/quest.js',
  './src/machines/index.js',
  './src/machines/build.js',
  './src/machines/lucky-seven.js',
  './src/machines/retro-777.js',
  './src/machines/pharaoh.js',
  './src/machines/nebula.js',
  './src/machines/sugar-rush.js',
  './src/machines/vault.js',
  './src/machines/atlantis.js',
  './src/machines/samurai.js',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './screens/play.png',
  './screens/paytable.png',
  './screens/jackpot.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((url) =>
        cache.add(new Request(url, { cache: 'reload' })).catch((err) =>
          console.warn('slot-pwa: skipped', url, err)
        )
      ))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      const refresh = fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || refresh;
    })
  );
});
