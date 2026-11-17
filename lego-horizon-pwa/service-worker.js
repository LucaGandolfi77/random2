/* LEGO Horizon fan store — offline service worker.
 * The whole page ships as static files, so installing it once makes every
 * section and every piece of original concept art available offline.
 */
const CACHE = "lego-horizon-store-v12";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./src/main.js",
  "./src/store.js",
  "./src/gallery.js",
  "./src/pwa.js",
  "./../shared/arcade.js",
  "./game/main.js",
  "./game/sim.js",
  "./game/data.js",
  "./game/render.js",
  "./game/input.js",
  "./game/audio.js",
  "./game/combat.js",
  "./game/bosses.js",
  "./game/effects.js",
  "./game/i18n.js",
  "./game/replay.js",
  "./game/quality.js",
  "./game/game.css",
  "./icons/icon.svg",
  "./icons/icon-maskable.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./screens/cover.svg",
  "./screens/scene-1.svg",
  "./screens/scene-2.svg",
  "./screens/scene-3.svg",
  "./screens/scene-4.svg",
  "./screens/scene-5.svg",
  "./screens/scene-6.svg",
  "./screens/scene-7.svg",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch((err) => {
            console.warn("lego-horizon-store: skipped", url, err);
          })
        )
      )
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
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
