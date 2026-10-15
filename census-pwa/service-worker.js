/* CENSUS — service worker. Cache-first for the shell. */
const CACHE = "census-pwa-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./sim.js",
  "./game.js",
  "./manifest.json",
  "../shared/arcade.js",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./icons/icon-maskable-512.svg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((url) =>
        cache.add(new Request(url, { cache: "reload" })).catch(() => {
          console.warn("census-pwa: skipped", url);
        })
      ))
    )
  );
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
      return fetch(event.request).then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});