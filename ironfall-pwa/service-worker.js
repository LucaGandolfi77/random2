/*
 * IRONFALL service worker.
 *
 * Cache-first with a navigate fallback. Precaching is done one asset at a
 * time with a per-asset catch, because cache.addAll() rejects the entire
 * batch if a single file 404s - and then the game does not work offline at
 * all, which is the one promise this file exists to keep.
 */
const CACHE_NAME = "ironfall-pwa-v1";

const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./manifest.json",
    "../shared/arcade.js",
    "./src/config.js",
    "./src/rng.js",
    "./src/mapdata.js",
    "./src/storage.js",
    "./src/champions.js",
    "./src/runes.js",
    "./src/items.js",
    "./src/combat.js",
    "./src/abilities.js",
    "./src/world.js",
    "./src/ai.js",
    "./src/audio.js",
    "./src/render.js",
    "./src/minimap.js",
    "./src/input.js",
    "./src/ui.js",
    "./src/main.js",
    "./icons/icon-192.svg",
    "./icons/icon-192.png",
    "./icons/icon-512.svg",
    "./icons/icon-512.png",
    "./icons/icon-512-maskable.png",
    "./og-cover.png"
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(ASSETS.map((url) =>
                cache.add(new Request(url, { cache: "reload" })).catch((err) => {
                    console.warn("IRONFALL SW: skipped", url, err);
                })
            ))
        )
    );
});

self.addEventListener("activate", (event) => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    /* A navigation that misses the cache must not resolve to the network's
     * 404 page. Falling back to the shell is what makes a deep link to any
     * screen work offline. */
    if (event.request.mode === "navigate") {
        event.respondWith(
            caches.match("./index.html").then((cached) =>
                cached || fetch(event.request)
            )
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) return response;
            return fetch(event.request).then((res) => {
                if (res && res.ok && res.type === "basic") {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
                }
                return res;
            }).catch(() => caches.match("./index.html"));
        })
    );
});
