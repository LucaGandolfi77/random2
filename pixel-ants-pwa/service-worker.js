/* ===== Pixel Ants PWA Service Worker =====
   Cache-first for the whole shell, including the ES modules. Uploaded photos
   never touch the cache: they are read locally and kept only in memory (and a
   small thumbnail in localStorage). */

const CACHE_NAME = "pixel-ants-pwa-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./src/main.js",
  "./src/quantize.js",
  "./src/board.js",
  "./src/path.js",
  "./src/engine.js",
  "./src/artworks.js",
  "./src/image-import.js",
  "./src/render.js",
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

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
