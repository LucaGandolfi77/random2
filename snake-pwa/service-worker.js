/* ===== Snake PWA Service Worker ===== */
const CACHE_NAME = "snake-pwa-v2";
const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./game.js",
    "./manifest.json",
    "./icons/icon-192.svg",
    "./icons/icon-512.svg",
];

// Install: cache all assets
self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// Activate: clean old caches
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

// Fetch: serve from cache first, fallback to network
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
