const CACHE = "pokemon-go-v2-v12";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "../shared/arcade.js",
  "src/config.js",
  "src/dex-data.js",
  "src/storage.js",
  "src/renderer.js",
  "src/sprites.js",
  "src/main.js",
  "src/logic/rng.js",
  "src/logic/throw.js",
  "src/logic/dex.js",
  "src/logic/progress.js",
  "icons/icon-192.svg",
  "icons/icon-192.png",
  "icons/icon-512.svg",
  "icons/icon-512.png",
  "icons/icon-maskable.svg",
  "icons/icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        ASSETS.map((u) =>
          c.add(new Request(u, { cache: "reload" })).catch((x) => console.warn("skip:", u, x))
        )
      )
    )
  );
});

self.addEventListener("activate", (e) => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

/* PokeAPI sprites are cached on first use, then available offline. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = e.request.url;

  if (url.includes("raw.githubusercontent.com/PokeAPI")) {
    e.respondWith(
      caches.match(e.request).then((r) =>
        r ||
        fetch(e.request).then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        }).catch(() => caches.match("./index.html"))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((r) =>
      r ||
      fetch(e.request).then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
