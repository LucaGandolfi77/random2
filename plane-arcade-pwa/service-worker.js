/* ===== Plane Arcade service worker ===== */
const CACHE_NAME = "plane-arcade-pwa-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./game.js",
    "../shared/arcade.js",
    "./manifest.json",
    "./icons/icon-192.svg",
    "./icons/icon-512.svg",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
];

self.addEventListener("install", function (event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener("activate", function (event) {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.filter(function (key) {
                return key !== CACHE_NAME;
            }).map(function (key) {
                return caches.delete(key);
            }));
        })
    );
});

self.addEventListener("fetch", function (event) {
    if (event.request.method !== "GET") return;
    event.respondWith(
        caches.match(event.request).then(function (cached) {
            if (cached) return cached;
            return fetch(event.request).then(function (response) {
                if (!response || response.status !== 200 || response.type === "opaque") return response;
                const copy = response.clone();
                caches.open(CACHE_NAME).then(function (cache) {
                    cache.put(event.request, copy);
                });
                return response;
            }).catch(function () {
                if (event.request.mode === "navigate") {
                    return caches.match("./index.html").then(function (fallback) {
                        return fallback || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
                    });
                }
                return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
            });
        })
    );
});
