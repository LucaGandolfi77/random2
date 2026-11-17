/* Dedicated Machine Hunt app shell. Caches the play entry and all shared game
 * modules from the parent folder so the standalone app works offline. */
const CACHE = "machine-hunt-app-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "../index.html",
  "../styles.css",
  "../shared/arcade.js",
  "../game/main.js",
  "../game/sim.js",
  "../game/data.js",
  "../game/combat.js",
  "../game/bosses.js",
  "../game/render.js",
  "../game/input.js",
  "../game/audio.js",
  "../game/effects.js",
  "../game/i18n.js",
  "../game/replay.js",
  "../game/quality.js",
  "../game/game.css",
  "../icons/icon.svg",
  "../icons/icon-192.png",
  "../icons/icon-512.png",
  "../icons/icon-maskable-512.png",
  "../icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((url) =>
        cache.add(new Request(url, { cache: "reload" })).catch(() => {})
      ))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((hit) => {
      const refresh = fetch(req).then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || refresh;
    })
  );
});
