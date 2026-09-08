const CACHE_NAME = 'piggy-app-cache-v4.8';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests; let POST/PUT/DELETE pass directly through native fetch
  if (event.request.method !== 'GET') {
    return;
  }

  // Only handle same-origin requests; never intercept Supabase, Wompi, Google OAuth or other external APIs
  try {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) {
      return;
    }
  } catch {
    return;
  }

  // Network-first strategy for same-origin static assets and pages
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache valid same-origin basic responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          }).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          const indexCached = await caches.match('/index.html') || await caches.match('/');
          if (indexCached) {
            return indexCached;
          }
        }
        // Always return a valid Response, NEVER null or undefined
        return new Response('Sin conexión a internet. Intenta nuevamente cuando tengas señal.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});
