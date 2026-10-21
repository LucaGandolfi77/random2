/* ===== PIXEL CUP '96 service worker ===== */
const CACHE_NAME = "pixel-cup-pwa-v1";
const ASSETS = [
    "./", "./index.html", "./styles.css", "./manifest.json",
    "./src/core.js", "./src/raster.js", "./src/font.js", "./src/render.js",
    "./src/input.js", "./src/audio.js", "./src/storage.js", "./src/ui.js",
    "./src/main.js",
    "./icons/icon-192.svg", "./icons/icon-512.svg", "./icons/icon-maskable-512.svg",
    "../shared/arcade.js",
];

self.addEventListener("install", (e) => {
    self.skipWaiting();
    /* Assets are cached one by one: one missing file must not stop the
       game from being installed. */
    e.waitUntil(
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

self.addEventListener("activate", (e) => {
    self.clients.claim();
    e.waitUntil(caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
});

self.addEventListener("fetch", (e) => {
    if (e.request.method !== "GET") return;
    e.respondWith(
        caches.match(e.request).then((r) => {
            if (r) return r;
            return fetch(e.request).catch(() => {
                if (e.request.mode === "navigate") return caches.match("./index.html");
                return Response.error();
            });
        })
    );
});
