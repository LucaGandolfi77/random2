/* random2 hub service worker — caches the arcade shell only.
 * Registered with a relative path so it works at repo root and under /random2/.
 * It deliberately does NOT intercept fetches for the sub-games: each game
 * ships its own service worker with its own cache. */

const CACHE = "random2-hub-v10";

const SHELL = [
  "./",
  "./index.html",
  "./shared/arcade.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll fails wholesale if one URL 404s, so add them one by one
      Promise.allSettled(SHELL.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle same-origin GETs for the hub shell.
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const ownShell =
    url.origin === self.location.origin &&
    (url.pathname === self.location.pathname.replace(/[^/]*$/, "") || // hub dir
     url.pathname.endsWith("/index.html") === false && SHELL.some((s) => {
       const p = new URL(s, self.location.origin).pathname;
       return url.pathname === p;
     }));

  if (!ownShell) return; // everything else: plain network, untouched

  // Network-first for navigations so fresh deploys land immediately,
  // falling back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Stale-while-revalidate for the rest of the shell.
  event.respondWith(
    caches.match(req).then((cached) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});
