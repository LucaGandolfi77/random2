/* Ring Atlas PWA — isolated cache namespace. */
const CACHE_NAME="ring-atlas-v1";
const ASSETS=["./","./index.html","./styles.css","./manifest.json","./src/main.js","./src/config.js","./src/rules.js","./src/levels.js","./src/level-data.js","./src/solver.js","./src/engine.js","./src/render.js","./src/audio.js","./src/storage.js","./icons/icon-192.svg","./icons/icon-512.svg","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("ring-atlas-")&&k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).catch(()=>caches.match("./index.html")));return;}e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});
