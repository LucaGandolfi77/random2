/* SETA E SILICIO — offline service worker.
   Precaches the shell and the hashed Vite assets discovered from index.html,
   then caches same-origin assets on first use. */
const CACHE = "seta-e-silicio-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  try {
    const response = await fetch("./index.html", { cache: "reload" });
    const html = await response.text();
    await cache.put("./index.html", new Response(html, { headers: response.headers }));
    const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
    await Promise.allSettled([...new Set(assets)].map((asset) => cache.add(asset)));
  } catch {
    /* the shell still works; assets will be cached on first controlled fetch */
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request, { ignoreVary: true })
            .then((cached) => cached || caches.match("./index.html", { ignoreVary: true }))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      if (cached) return withCors(cached);
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") return response;
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
