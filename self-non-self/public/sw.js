/* SELF / NON-SELF
   A tiny precache that discovers the hashed Vite assets from index.html and
   the fonts from the built CSS, so the film is offline after the *first*
   viewing, not after a second online visit. */
const CACHE = 'self-non-self-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

async function discoverAssets() {
  const urls = new Set(SHELL);
  const add = (raw, base) => {
    if (!raw || raw.startsWith('#') || raw.startsWith('data:') || raw.startsWith('blob:')) return null;
    const url = new URL(raw, base);
    if (url.origin !== self.location.origin) return null;
    const path = url.pathname + url.search;
    urls.add(path);
    return url;
  };

  try {
    const htmlUrl = new URL('./index.html', self.location.href);
    const html = await (await fetch(htmlUrl, { cache: 'reload' })).text();
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      add(match[1], htmlUrl);
    }
  } catch {
    // The shell list is still a useful fallback.
  }

  // The fonts live inside the hashed CSS, not in the HTML.
  const cssUrls = [...urls].filter((url) => url.endsWith('.css'));
  for (const cssPath of cssUrls) {
    try {
      const cssUrl = new URL(cssPath, self.location.href);
      const css = await (await fetch(cssUrl, { cache: 'reload' })).text();
      for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
        const raw = match[1]?.trim().replace(/^['"]|['"]$/g, '');
        add(raw, cssUrl);
      }
    } catch {
      // A missing font is not a reason to fail the install.
    }
  }

  return [...urls];
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const urls = await discoverAssets();
      await Promise.allSettled(
        urls.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) await cache.put(url, response);
          } catch {
            // Ignore one missing asset; the rest of the film still installs.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Network-first for the shell, so a new deploy is never hidden by an
    // old index. The film itself is procedural and tiny.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => new Response('', { status: 504, statusText: 'Offline' }));
    }),
  );
});
