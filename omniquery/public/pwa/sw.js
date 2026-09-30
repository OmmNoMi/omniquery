const CACHE_NAME = 'omniquery-cache-v32';
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

  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
      }
      return response;
    }).catch(async () => {
      // 1. Try exact or search-ignored match
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) return cached;

      // 2. If navigating to any survey or sub-page, return cached /omniquery app shell
      if (event.request.mode === 'navigate' || event.request.destination === 'document') {
        return (await caches.match('/omniquery')) || (await caches.match('/assets/omniquery/pwa/index.html'));
      }
    })
  );
});
