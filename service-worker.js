// service-worker.js
const CACHE_NAME = "campus-cache-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./HTML/Prueba9.html",
  "./JS/app.js",
  "./CSS/styles.css",
  "./manifest.json",
  "./service-worker.js",
  // Librerías externas (Leaflet, MapLibre, etc.)
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css",
  "https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js",
  "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css",
  "https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js",
  "https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js",
  "https://unpkg.com/leaflet.locatecontrol/dist/L.Control.Locate.min.js",
  "https://unpkg.com/leaflet.locatecontrol/dist/L.Control.Locate.min.css",
  "https://unpkg.com/leaflet-minimap/dist/Control.MiniMap.min.js",
  "https://unpkg.com/leaflet-minimap/dist/Control.MiniMap.min.css",
  "https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js",
  "https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css",
  "https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css",
  "https://unpkg.com/leaflet-measure/dist/leaflet-measure.js",
  "https://unpkg.com/leaflet-measure/dist/leaflet-measure.css"
];

// Instalar y cachear estáticos
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activar y limpiar cachés viejas
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategias de fetch
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Archivos estáticos → cache-first
  if (STATIC_ASSETS.some(asset => url.href.includes(asset))) {
    event.respondWith(
      caches.match(event.request).then(res => res || fetch(event.request))
    );
    return;
  }

  // Datos dinámicos (ej. OSRM rutas, tiles externos) → network-first con fallback
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
