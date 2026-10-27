/* ===== CORE 9 — service worker ===== */
const CACHE = "core9-pwa-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "../shared/arcade.js",
  "./src/main.js",
  "./src/audio.js",
  "./src/input.js",
  "./src/data/zones.js",
  "./src/data/sites.js",
  "./src/data/crew.js",
  "./src/data/events.js",
  "./src/data/achievements.js",
  "./src/data/copy.js",
  "./src/data/progression.js",
  "./src/sim/state.js",
  "./src/sim/economy.js",
  "./src/sim/save.js",
  "./src/sim/crew.js",
  "./src/sim/events.js",
  "./src/render/primitives.js",
  "./src/render/models.js",
  "./src/render/particles.js",
  "./src/render/scene.js",
  "./src/ui/ui.js",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => {
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 503, statusText: "Offline" });
      });
    })
  );
});
