const CACHE_NAME = 'omniquery-cache-v30';
const STATIC_ASSETS = [
  '/omniquery',
  '/assets/omniquery/dist/omniquery.bundle.js',
  '/assets/omniquery/dist/omniquery.bundle.css',
  '/assets/omniquery/pwa/manifest.json',
  '/assets/omniquery/pwa/icon-192.png',
  '/assets/omniquery/icons/desktop_icons/solid/omniquery.svg'
];


self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[SW] Pre-caching static offline assets');
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('[SW] Pre-cache warning:', asset, e);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Network-first with instant offline cache fallback for PWA assets & API
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('/assets/omniquery/pwa/index.html') || caches.match('/omniquery');
        }
      });
    })
  );
});
