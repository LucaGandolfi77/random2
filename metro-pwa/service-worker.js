/* ===== LINEA ROSSA service worker ===== */
const CACHE_NAME = "metro-pwa-v1";
const ASSETS = [
    "./", "./index.html", "./styles.css", "./game.js",
    "../shared/arcade.js", "./manifest.json",
    "./icons/icon-192.svg", "./icons/icon-512.svg",
];
self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});
self.addEventListener("activate", (e) => {
    self.clients.claim();
    e.waitUntil(caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
});
self.addEventListener("fetch", (e) => {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
