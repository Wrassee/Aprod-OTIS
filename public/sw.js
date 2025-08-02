// OTIS APROD Service Worker - COMPLETELY DISABLED
console.log('[SW] Service Worker completely disabled for stability');

// Minimal service worker that immediately skips waiting and claims clients
self.addEventListener('install', (event) => {
  console.log('[SW] Disabled SW install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Disabled SW activate');
  self.clients.claim();
});

// Pass through all requests without any caching or processing
self.addEventListener('fetch', (event) => {
  // Do nothing - let browser handle normally
});