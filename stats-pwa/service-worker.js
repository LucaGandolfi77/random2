/* Stats — service worker
   Cache-first for the shell. The page reads live localStorage every time it
   loads, so there is nothing to revalidate: the data is not in the cache,
   it is on the device. */
const CACHE = "stats-pwa-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "../shared/arcade.js",
  "../shared/chart.js",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./icons/icon-maskable-512.svg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {
            /* One missing icon must not fail the whole install. */
            console.warn("stats-pwa: skipped", url);
          })
        )
      )
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