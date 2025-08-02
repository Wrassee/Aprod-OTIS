// OTIS APROD Service Worker - DISABLED FOR STABILITY
// This service worker is temporarily disabled to resolve desktop crash issues

console.log('[SW] Service Worker disabled for stability testing');

// Minimal service worker that does nothing to prevent crashes
self.addEventListener('install', (event) => {
  console.log('[SW] Minimal SW installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Minimal SW activated');
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests without caching
  return;
});