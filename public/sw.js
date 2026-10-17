const CACHE_NAME = 'stillpoint-shell-v3';
const CORE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/manus-routes.json',
  '/precache-manifest.json',
  '/assets/branding/stillpoint-logo.svg',
  '/assets/branding/app-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    const response = await fetch('/precache-manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('The offline asset manifest could not be loaded.');
    const manifest = await response.json();
    if (!Array.isArray(manifest.assets) || manifest.assets.some((asset) => typeof asset !== 'string' || !asset.startsWith('/') || asset.startsWith('//'))) {
      throw new Error('The offline asset manifest is invalid.');
    }
    await cache.addAll([...new Set(manifest.assets)]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('stillpoint-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/manus-storage/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(request, { ignoreSearch: true })) || (await caches.match('/')) || Response.error()));
    return;
  }

  const explicitlyCached = url.pathname === '/manus-routes.json' || url.pathname === '/precache-manifest.json';
  const cacheable = explicitlyCached || url.pathname.startsWith('/assets/') || /\.(?:js|css|woff2?|webmanifest)$/.test(url.pathname);
  if (!cacheable) return;
  event.respondWith(caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    });
  }));
});
