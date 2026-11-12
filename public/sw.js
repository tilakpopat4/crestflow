const CACHE_NAME = 'crestflow-pwa-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: Cache offline app shell & immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Precache skipped:', err))
  );
});

// Activate: Clean up old cache versions and claim open clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Crucial for PWA installation criteria in Chromium (Brave / Chrome / Edge)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Never cache non-GET requests, API endpoints, or third-party auth/payment origins
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('razorpay.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    return;
  }

  // 2. Navigation requests (HTML pages): Network-first with offline cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match('/index.html');
        return (
          cached ||
          new Response('Offline - please check your connection.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          })
        );
      })
    );
    return;
  }

  // 3. Static assets: Stale-while-revalidate / Cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache for next time
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const toCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        }
        return networkResponse;
      });
    })
  );
});
