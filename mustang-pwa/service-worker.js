/* ===== Mustang PWA Service Worker ===== */
const CACHE_NAME = "mustang-pwa-v3";
const ASSETS = [
    "./", "./index.html", "./styles.css", "./manifest.json",
    "./src/data.js", "./src/audio.js", "./src/art.js", "./src/game.js",
    "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png",
    "./icons/icon-maskable-192.png", "./icons/icon-maskable-512.png",
    "./icons/icon-192.svg", "./icons/icon-512.svg",
];

// Install: cache all assets
self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
});

// Fetch: serve from cache first, fallback to network
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});