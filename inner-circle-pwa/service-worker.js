/* ===== Inner Circle PWA Service Worker =====
   Every file in this game is static. Uploaded photos never reach the cache:
   they are decoded, cropped and stored in localStorage by the page. */

const CACHE_NAME = "inner-circle-pwa-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./src/main.js",
  "./src/engine.js",
  "./src/roster.js",
  "./src/faces.js",
  "./src/portrait.js",
  "./src/render.js",
  "./src/postcard.js",
  "./src/chat.js",
  "./src/dare.js",
  "./src/wrapped.js",
  "../shared/arcade.js",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((network) => {
        if (network && network.status === 200) {
          const copy = network.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return network;
      });
    })
  );
});
