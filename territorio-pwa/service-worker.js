/* ===== Territorio PWA Service Worker =====
 * Guscio precachato; tutto il resto stale-while-revalidate.
 * (In fase 2 lo stesso SW servirà lo stato Realtime offline-safe.) */
const CACHE_NAME = "territorio-pwa-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./gioco.js",
  "./render.js",
  "./manifest.json",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const rete = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => cached || caches.match("./index.html"));
      return cached || rete;
    })
  );
});
