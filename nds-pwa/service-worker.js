/* ===== Pocket DS PWA Service Worker =====
 * Cache-first for the app shell so the emulator UI is fully usable offline.
 * User-supplied BIOS/ROM blobs are NOT fetched by the network and are never
 * cached here — they live in IndexedDB (see src/storage.js).
 */
const CACHE_NAME = "pocket-ds-v1";

const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./manifest.json",
    "./icons/icon-192.svg",
    "./icons/icon-512.svg",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-512-maskable.png",
    "./src/config.js",
    "./src/core/core-api.js",
    "./src/core/demo-core.js",
    "./src/core/wasm-core.js",
    "./src/emulator.js",
    "./src/input.js",
    "./src/screens.js",
    "./src/loader.js",
    "./src/storage.js",
    "./src/audio.js",
    "./src/ui.js",
    "./src/main.js",
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    // Add assets individually: addAll() rejects the entire batch if one
    // URL 404s, which would leave the whole app offline-broken.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(
                ASSETS.map((url) =>
                    cache.add(new Request(url, { cache: "reload" })).catch((err) => {
                        console.warn("Pocket DS SW: skipped", url, err);
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
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req)
                .then((res) => {
                    if (res && res.ok && res.type === "basic") {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    }
                    return res;
                })
                .catch(() => caches.match("./index.html"));
        })
    );
});
