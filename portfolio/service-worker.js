/* ===== portfolio service worker =====
 * Cache-first for the page shell. The six case-study screenshots are the
 * bulk of the bytes, so they are listed explicitly rather than picked up on
 * demand: a visitor who never scrolls to the third case study should not pay
 * for it.
 */
const CACHE_NAME = "portfolio-v2";
const ASSETS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./assets/portfolio.css",
    "./assets/portfolio.js",
    "./icons/icon-192.svg",
    "./icons/icon-512.svg",
    "./shots/census.png",
    "./shots/stats.png",
    "./shots/bucio.png",
    "./shots/sector7.png",
    "./shots/ironfall.png",
    "./shots/pulse.png"
];

self.addEventListener("install", (e) => {
    self.skipWaiting();
    // addAll rejects the whole batch if any single file 404s, so add them
    // individually and let the cache fill in as far as it can.
    e.waitUntil(caches.open(CACHE_NAME).then((c) =>
        Promise.all(ASSETS.map((url) =>
            c.add(new Request(url, { cache: "reload" })).catch((err) => {
                console.warn("SW: skipped", url, err);
            })))));
});

self.addEventListener("activate", (e) => {
    e.waitUntil(self.clients.claim());
    e.waitUntil(caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
});

self.addEventListener("fetch", (e) => {
    if (e.request.method !== "GET") return;
    e.respondWith(
        caches.match(e.request).then((hit) => {
            if (hit) return hit;
            return fetch(e.request).then((res) => {
                // Only same-origin basics are worth keeping; anything opaque
                // would silently bloat the cache with nothing usable.
                if (res && res.ok && res.type === "basic") {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
                }
                return res;
            });
        }).catch(() => caches.match("./index.html"))
    );
});