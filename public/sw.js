
// KERNnutrition Service Worker with versioned cache
const KB_VERSION = self.KB_VERSION || '2025-09-11';
const CACHE = `kb-cache-${KB_VERSION}`;
const STATIC_CACHE = `kb-static-${KB_VERSION}`;
const RUNTIME_CACHE = `kb-runtime-${KB_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/masked-icon.svg',
  '/favicon.ico'
]

// Install event - cache static assets
// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) =>
          cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE
        ).map((cacheName) => {
          console.log('[SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
  // Notify clients about update for soft-reload
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'SW_UPDATED' });
    });
  });
});
// Listen for messages (e.g. settings changes)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'KB_SETTINGS_CHANGED') {
    // Optional: Settings berücksichtigen (z.B. Notifications)
    // Placeholder for future settings handling
  }
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Helper: always return a valid Response
  const safeFetch = (promise) =>
    promise.catch((err) => {
      // Offline fallback for HTML pages
      if (request.destination === 'document') {
        return caches.match('/index.html');
      }
      // Return a minimal valid Response for other types
      return new Response('Service unavailable', { status: 503, statusText: 'Service Worker error' });
    });

  try {
    // Handle navigation requests
    if (request.mode === 'navigate') {
      event.respondWith(safeFetch(
        caches.match('/index.html').then((response) => {
          return response || fetch(request);
        })
      ));
      return;
    }

    // Handle Google Fonts
    if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
      event.respondWith(safeFetch(
        caches.open(RUNTIME_CACHE).then((cache) => {
          return cache.match(request).then((response) => {
            if (response) {
              return response;
            }
            return fetch(request).then((networkResponse) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
          });
        })
      ));
      return;
    }

    // Handle images
    if (request.destination === 'image') {
      event.respondWith(safeFetch(
        caches.open(RUNTIME_CACHE).then((cache) => {
          return cache.match(request).then((response) => {
            return response || fetch(request).then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            });
          });
        })
      ));
      return;
    }

    // Handle all other requests - cache first, then network
    event.respondWith(safeFetch(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request).then((networkResponse) => {
            // Don't cache non-successful responses
            if (networkResponse.status !== 200) {
              return networkResponse;
            }
            // Cache successful responses
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
            return networkResponse;
          });
        })
    ));
  } catch (err) {
    event.respondWith(new Response('Service Worker error', { status: 503, statusText: 'Service Worker error' }));
  }
})

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered')
    // Handle any pending operations when back online
  }
})

// Push notifications (if needed in future)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
  tag: 'kernnutrition-notification'
    }
    
    event.waitUntil(
  self.registration.showNotification('KERNnutrition', options)
    )
  }
})
