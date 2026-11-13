/* LAST CALL service worker.
 * Cache-first, versioned. Bump CACHE_NAME whenever a shipped file changes,
 * otherwise a returning player keeps an old pour forever.
 */
const CACHE_NAME = "last-call-pwa-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./manifest.json",
    "../shared/arcade.js",
    "./src/config.js",
    "./src/util.js",
    "./src/rng.js",
    "./src/cards.js",
    "./src/storage.js",
    "./src/sim.js",
    "./src/ai.js",
    "./src/audio.js",
    "./src/render.js",
    "./src/input.js",
    "./src/ui.js",
    "./src/main.js",
    "./icons/icon-192.svg",
    "./icons/icon-512.svg",
    "./icons/icon-512-maskable.svg",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-512-maskable.png",
    "./icons/og-cover.png"
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(ASSETS.map((url) =>
                cache.add(new Request(url, { cache: "reload" })).catch((err) => {
                    console.warn("SW: skipped", url, err);
                })
            ))
        )
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
                return null;
            }))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type === "opaque") {
                    return response;
                }
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                return response;
            }).catch(() => {
                if (event.request.mode === "navigate") return caches.match("./index.html");
                return new Response("", { status: 504, statusText: "offline" });
            });
        })
    );
});