// Virtual Farm Tycoon Service Worker
const CACHE_NAME = 'farm-tycoon-v1'
const STATIC_CACHE = 'farm-static-v1'

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll([
          '/',
          '/index.html',
          '/game.js',
          '/styles.css',
          '/manifest.json'
        ])
      })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME
            })
            .map((cacheName) => {
              return caches.delete(cacheName)
            })
        )
      })
  )
  self.clients.claim()
})

// Fetch event - serve cached responses when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Clone and cache the response
            const responseToCache = response.clone()
            caches.open(STATIC_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache)
              })

            return response
          })
      })
  )
})