// OTIS APROD Service Worker v0.4.8 - Complete PWA Support
const CACHE_NAME = 'otis-aprod-v0.4.8';
const OFFLINE_URL = '/offline.html';

// Essential files to cache for offline functionality
const CACHE_URLS = [
  '/',
  '/offline.html',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.ico'
];

console.log('[SW] OTIS APROD Service Worker v0.4.8 initializing');

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v0.4.8');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching essential files');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Essential files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache essential files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v0.4.8');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker v0.4.8 activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - network first with offline fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If network request succeeds, return response
        if (response && response.status === 200) {
          // Cache successful responses for static assets
          if (event.request.url.includes('/static/') || 
              event.request.url.includes('.js') || 
              event.request.url.includes('.css')) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
        }
        return response;
      })
      .catch(() => {
        // Network failed - try cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', event.request.url);
              return cachedResponse;
            }
            
            // If no cache and it's a navigation request, show offline page
            if (event.request.mode === 'navigate') {
              console.log('[SW] Serving offline page');
              return caches.match(OFFLINE_URL);
            }
            
            // For other requests, let them fail
            throw new Error('Network and cache failed');
          });
      })
  );
});

// Background sync for offline protocol completion
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'protocol-sync') {
    event.waitUntil(syncProtocolData());
  }
});

// Sync protocol data when connection is restored
async function syncProtocolData() {
  try {
    const protocolData = localStorage.getItem('otis-protocol-form-data');
    if (protocolData) {
      console.log('[SW] Syncing protocol data');
      // Protocol data is already in localStorage and will be available when online
    }
  } catch (error) {
    console.error('[SW] Protocol sync failed:', error);
  }
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});