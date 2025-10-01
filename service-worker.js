// service-worker.js
const CACHE_NAME = 'campus-cache-v3';
const OFFLINE_URL = '/Map3D/HTML/Prueba9.html';

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  // Skip waiting to activate the new service worker immediately
  self.skipWaiting();
  
  // Cache core assets in the background
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching core assets');
        // Only cache essential local assets
        return cache.addAll([
          OFFLINE_URL,
          '/Map3D/JS/app.js',
          '/Map3D/CSS/styles.css',
          '/Map3D/manifest.json',
          '/Map3D/IMG/icons/icon-192x192.png',
          '/Map3D/IMG/icons/icon-512x512.png'
        ]).catch(error => {
          console.error('Cache addAll error:', error);
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  // Take control of all clients immediately
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      // Ensure the service worker takes control immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests with network-first strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests and unsupported schemes
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  if (url.protocol === 'chrome-extension:' || 
      url.protocol === 'chrome:' || 
      url.protocol === 'data:') {
    return;
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For all other requests, try network first, then cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If the response is good, clone it and cache it
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try to get from cache
        return caches.match(event.request).then(response => {
          // Return cached response or a fallback for HTML requests
          return response || (event.request.headers.get('accept').includes('text/html') 
            ? caches.match(OFFLINE_URL) 
            : new Response('Network error', { status: 408 }));
        });
      })
  );
});

// Listen for messages from the client (like skipWaiting)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Skipping waiting...');
    self.skipWaiting();
  }
});
