/* random2 hub service worker — caches the arcade shell and the Reading Room.
 * Registered with a relative path so it works at repo root and under /random2/.
 * It deliberately does NOT intercept fetches for the sub-games: each game
 * ships its own service worker with its own cache. */

const CACHE = "random2-hub-v16";

const SHELL = [
  "./",
  "./index.html",
  "./shared/arcade.js",
  "./shared/book-reader.js",
  "./books/books.json",
  "./books/the-roundabout.md",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./apple-touch-icon.png",
];

const HUB_DIR = new URL("./", self.location.href).pathname;
const BOOKS_DIR = new URL("./books/", self.location.href).pathname;
const SHELL_PATHS = new Set(
  SHELL.map((url) => new URL(url, self.location.href).pathname)
);

function isHubPage(url) {
  return url.origin === self.location.origin &&
    (url.pathname === HUB_DIR || url.pathname === HUB_DIR + "index.html");
}

function isHubRequest(url) {
  return url.origin === self.location.origin &&
    (isHubPage(url) || SHELL_PATHS.has(url.pathname));
}

function isBookRequest(url) {
  return url.origin === self.location.origin &&
    url.pathname.indexOf(BOOKS_DIR) === 0;
}

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

  // Only handle same-origin GETs for the hub shell and the Reading Room.
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const hub = isHubRequest(url);
  const book = isBookRequest(url);

  if (!hub && !book) return; // everything else: plain network, untouched

  // Network-first for navigations so fresh deploys land immediately,
  // falling back to the cached shell when offline. Only the hub page itself
  // is cached under index.html; a navigation to a book must not overwrite it.
  if (req.mode === "navigate" && isHubPage(url)) {
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

  // Network-first for books and the manifest: a new chapter or a corrected
  // typo appears on the next load, while the precached copy keeps the shelf
  // readable offline.
  if (book) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
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
