const CACHE='tidefall-v4';
const ASSETS=['./','./index.html','./styles.css','./manifest.json','./icons/icon.svg','./src/config.js','./src/math.js','./src/rng.js','./src/storage.js','./src/ai.js','./src/world.js','./src/render.js','./src/input.js','./src/ui.js','./src/main.js','./tests/world.test.js','./tests/features.test.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('tidefall-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok&&new URL(event.request.url).origin===location.origin)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));return response}))));
