/* ===== FORMICA PWA Service Worker =====
 * Cache-first così il gioco è completamente giocabile offline una volta
 * installato.
 */
const CACHE_NAME = "formica-pwa-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./manifest.json",
    "../shared/arcade.js",
    "./src/config.js",
    "./src/zones.js",
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
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    // addAll rifiuta tutto il batch se un solo file fa 404, quindi aggiungili
    // uno per uno e lascia che la cache si riempia come può.
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
                    // Cache dei successi same-origin, così il prossimo
                    // caricamento è offline.
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
