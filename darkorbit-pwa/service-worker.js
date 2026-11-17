/*
 * Deep Orbit service worker — network-first navigation, cache-first assets.
 * Cache names are prefixed so activation never wipes the other games' shells
 * on this shared origin (GitHub Pages).
 */

const CACHE_PREFIX = "darkorbit-pwa-";
const CACHE_NAME = "darkorbit-pwa-v8";
const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./manifest.json",
    "../shared/arcade.js",
    "./src/config.js",
    "./src/mesh.js",
    "./src/quality.js",
    "./src/audio.js",
    "./src/run-save.js",
    "./src/dispatch.js",
    "./src/daily.js",
    "./src/achievements.js",
    "./src/refinery.js",
    "./src/missions.js",
    "./src/challenge.js",
    "./src/ghost.js",
    "./src/sim.js",
    "./src/render.js",
    "./src/input.js",
    "./src/ui.js",
    "./src/storage.js",
    "./src/main.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
    "./icons/apple-touch-icon.png",
    "./icons/icon-192.svg",
    "./icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("message", (event) => {
    if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
        fetch(request).then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
        }).catch(() => {});
        return cached;
    }
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => cache.put("./index.html", copy))
                            .catch(() => {});
                    }
                    return response;
                })
                .catch(async () => {
                    const cache = await caches.open(CACHE_NAME);
                    return (await cache.match("./index.html")) ||
                        (await cache.match("./")) ||
                        new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
                })
        );
        return;
    }

    event.respondWith(
        cacheFirst(request).catch(async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(request);
            if (cached) return cached;
            return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        })
    );
});
