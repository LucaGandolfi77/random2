/*
 * GULPER service worker.
 *
 * Cache-first with a navigate fallback. Precaching is done one asset at a
 * time with a per-asset catch, because cache.addAll() rejects the entire
 * batch if a single file 404s - and then the game does not work offline at
 * all, which is the one promise this file exists to keep.
 */
const CACHE_NAME = "gulper-pwa-v3";

const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./manifest.json",
    "../shared/arcade.js",
    "./src/config.js",
    "./src/rng.js",
    "./src/raster.js",
    "./src/palette.js",
    "./src/meshes.js",
    "./src/particles.js",
    "./src/storage.js",
    "./src/species.js",
    "./src/weapons.js",
    "./src/body.js",
    "./src/biomes.js",
    "./src/levels.js",
    "./src/modes.js",
    "./src/results.js",
    "./src/alarm.js",
    "./src/combat.js",
    "./src/absorb.js",
    "./src/ai.js",
    "./src/world.js",
    "./src/audio.js",
    "./src/render.js",
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
                    console.warn("GULPER SW: skipped", url, err);
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
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req).then((res) => {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((c) => c.put("./index.html", copy));
                return res;
            }).catch(() =>
                caches.match("./index.html").then((hit) =>
                    hit || new Response("GULPER is offline and the cache is empty.", {
                        status: 503,
                        headers: { "Content-Type": "text/plain" }
                    })
                )
            )
        );
        return;
    }

    /* STALE-WHILE-REVALIDATE for the game's own files.
     *
     * A cache-first service worker never notices that the game
     * changed: the old file is served from the cache forever, and a
     * player who comes back after an update keeps playing the build
     * they left. Serving the cached copy immediately and refreshing it
     * in the background fixes that - the player gets the old file
     * this once and the new one next time - without making the game
     * wait on the network when there is one. */
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) =>
            cache.match(req).then((hit) => {
                const network = fetch(req).then((res) => {
                    if (res && res.status === 200 && res.type === "basic") {
                        cache.put(req, res.clone());
                    }
                    return res;
                }).catch(() => null);

                if (hit) {
                    /* The refresh runs in the background. It must not
                     * keep the page alive on its own. */
                    event.waitUntil(network);
                    return hit;
                }
                return network.then((res) => {
                    if (res) return res;
                    return new Response("GULPER is offline and the file is not cached.", {
                        status: 503,
                        headers: { "Content-Type": "text/plain" }
                    });
                });
            })
        )
    );
});
