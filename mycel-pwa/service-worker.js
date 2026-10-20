/* ===== MYCEL service worker ===== */
const CACHE_NAME = "mycel-pwa-v2";
const ASSETS = [
    "./", "./index.html", "./styles.css", "./game.js",
    "../shared/arcade.js", "./manifest.json",
    "./icons/icon-192.svg", "./icons/icon-512.svg",
];
self.addEventListener("install", (e) => {
    self.skipWaiting();
    // per-asset catch: un 404 non deve uccidere l'intera installazione
    e.waitUntil(caches.open(CACHE_NAME).then((c) =>
        Promise.all(ASSETS.map((u) => c.add(new Request(u, { cache: "reload" }))
            .catch((x) => console.warn("skip:", u, x))))));
});
self.addEventListener("activate", (e) => {
    self.clients.claim();
    e.waitUntil(caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
});
self.addEventListener("fetch", (e) => {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
