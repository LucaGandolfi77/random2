const CACHE="pokemon-v4";const ASSETS=["./","./index.html","./manifest.json","../shared/arcade.js","src/config.js","src/dex-data.js","src/storage.js","src/renderer.js","src/sprites.js","src/main.js","icons/icon-192.svg"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ASSETS.map(u=>c.add(new Request(u,{cache:"reload"})).catch(x=>console.warn("skip:",u,x))))));});
self.addEventListener("activate",e=>{self.clients.claim();e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));});

/* Gli sprite PokéAPI (raw.githubusercontent.com) vengono cachati al primo
   utilizzo: dalla seconda apertura funzionano anche offline. */
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const url=e.request.url;

  // sprite cross-origin: cache-first con copia opaque/cors
  if(url.includes("raw.githubusercontent.com/PokeAPI")){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      if(res&&(res.ok||res.type==="opaque")){
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy));
      }
      return res;
    }).catch(()=>caches.match("./index.html"))));
    return;
  }

  // stesso origine: cache-first con aggiornamento
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
    if(res&&res.ok&&res.type==="basic"){
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
    }
    return res;
  }).catch(_=>caches.match("./index.html"))));
});
