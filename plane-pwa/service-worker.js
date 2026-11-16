/*
 * Plane Shooter service worker.
 *
 * Navigation is network-first so a deploy is picked up immediately and an
 * offline reload still falls back to the cached shell. Static assets are
 * cache-first with a background refresh the next time they are requested.
 *
 * Cache names are prefixed and activation only removes caches with this
 * game's prefix. Cache Storage is origin-wide on GitHub Pages; deleting
 * every cache that is not ours would wipe the other games' offline shells.
 */

const CACHE_PREFIX = "plane-pwa-";
const CACHE_NAME = "plane-pwa-v5";
const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./manifest.json",
    "../shared/arcade.js",
    "./src/config.js",
    "./src/sim.js",
    "./src/render.js",
    "./src/input.js",
    "./src/storage.js",
    "./src/ui.js",
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
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
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
        /* Refresh in the background; the cached response is what the page
           gets this time. */
        fetch(request)
            .then((response) => {
                if (response && response.ok) cache.put(request, response.clone());
            })
            .catch(() => {});
        return cached;
    }

    const response = await fetch(request);
    if (response && response.ok) {
        cache.put(request, response.clone());
    }
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
                        new Response("Offline", {
                            status: 503,
                            headers: { "Content-Type": "text/plain" }
                        });
                })
        );
        return;
    }

    event.respondWith(
        cacheFirst(request).catch(async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(request);
            if (cached) return cached;
            return new Response("Offline", {
                status: 503,
                headers: { "Content-Type": "text/plain" }
            });
        })
    );
});
