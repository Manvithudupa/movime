/* Movime service worker
 * Hand-written network-first worker with a simple runtime cache.
 * Replaces the build-generated workbox worker (which precached stale
 * chunk hashes from an old pages-router build).
 */
const CACHE_NAME = 'movime-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

const MAX_CACHE_ENTRIES = 100;

// Keep the runtime cache from growing forever: drop the oldest entries once
// the cap is exceeded.
async function pruneCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_CACHE_ENTRIES) {
    const overflow = keys.length - MAX_CACHE_ENTRIES;
    await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle same-origin GET requests; never touch cross-origin embeds.
  if (url.origin !== self.location.origin) return;

  // SECURITY: never cache API responses — they carry authenticated user data
  // (watchlist, profile email, continue watching) that must not be persisted
  // client-side or replayed across users on shared devices.
  if (url.pathname.startsWith('/api/')) return;

  // Network-first with cache fallback (good for pages and API responses).
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const networkResponse = await fetch(request);
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          cache.put(request, networkResponse.clone());
          // Fire-and-forget pruning so it never blocks responses.
          pruneCache(cache).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;
        throw err;
      }
    })()
  );
});
