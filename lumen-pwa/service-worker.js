/* ===== LUMEN PWA Service Worker =====
 * Cache-first so the game is fully playable offline once installed.
 */
const CACHE_NAME = "lumen-pwa-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./manifest.json",
    "../shared/arcade.js",
    "./src/config.js",
    "./src/storage.js",
    "./src/world.js",
    "./src/render.js",
    "./src/player.js",
    "./src/bots.js",
    "./src/audio.js",
    "./src/ui.js",
    "./src/main.js",
    "./icons/icon-192.svg",
    "./icons/icon-512.svg",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    // addAll rejects the whole batch if any single file 404s, so add
    // them individually and let the cache fill in as far as it can.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(
                ASSETS.map((url) =>
                    cache.add(new Request(url, { cache: "reload" })).catch((err) => {
                        console.warn("SW: skipped", url, err);
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
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) return response;
            return fetch(event.request)
                .then((res) => {
                    // Cache same-origin successes so the next load is offline.
                    if (res && res.ok && res.type === "basic") {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return res;
                })
                .catch(() => caches.match("./index.html"));
        })
    );
});
