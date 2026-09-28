const CACHE_NAME = 'omniquery-cache-v1';
const STATIC_ASSETS = [
  '/omniquery',
  '/assets/omniquery/pwa/index.html',
  '/assets/omniquery/pwa/style.css',
  '/assets/omniquery/pwa/app.js',
  '/assets/omniquery/pwa/manifest.json',
  '/assets/omniquery/pwa/vendor/tailwindcss.js',
  '/assets/omniquery/pwa/vendor/vue.global.prod.js',
  '/assets/omniquery/pwa/vendor/dexie.min.js',
  '/assets/omniservey/pwa/index.html',
  '/assets/omniservey/pwa/style.css',
  '/assets/omniservey/pwa/app.js',
  '/assets/omniservey/pwa/manifest.json',
  '/assets/omniservey/pwa/vendor/tailwindcss.js',
  '/assets/omniservey/pwa/vendor/vue.global.prod.js',
  '/assets/omniservey/pwa/vendor/dexie.min.js'
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
          return caches.match('/assets/omniquery/pwa/index.html') || caches.match('/assets/omniservey/pwa/index.html') || caches.match('/omniquery');
        }
      });
    })
  );
});
