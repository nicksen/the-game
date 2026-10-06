// Service worker: makes the game work offline once it has been opened online.
// On install it reads index.html to find every file the game uses and caches them all, so there's no file list
// to keep up to date. After that, files come from the network when it answers quickly, else from the cache.
'use strict';

const CACHE = 'smack-the-dummy';
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (e) => e.waitUntil(precache().then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const sameOrigin = new URL(e.request.url).origin === location.origin;
  if (e.request.method === 'GET' && sameOrigin) e.respondWith(networkFirst(e.request));
});

async function precache() {
  const html = await (await fetch('./', { cache: 'no-cache' })).text();
  // Local src/href values only (anything with a ":" is a data: or external URL)
  const refs = [...html.matchAll(/(?:src|href)="([^":]+)"/g)].map((m) => m[1]);
  const manifest = await (await fetch('manifest.webmanifest', { cache: 'no-cache' })).json();
  const urls = new Set(['./', ...refs, ...manifest.icons.map((icon) => icon.src)]);
  const cache = await caches.open(CACHE);
  await cache.addAll([...urls].map((url) => new Request(url, { cache: 'no-cache' })));
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  const cached =
    (await cache.match(request, { ignoreSearch: true })) ??
    (request.mode === 'navigate' ? await cache.match('./') : undefined);
  if (!cached) return network;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
  return Promise.race([network.catch(() => cached), timeout]);
}
