// Mkulima Farm Manager service worker.
// It keeps the app screen available offline. Farm data is never cached here: calls to Supabase,
// /api functions and every other site go straight to the network.
const VERSION = 'v1';
const SHELL = 'mkulima-shell-' + VERSION;
const ASSETS = 'mkulima-assets-' + VERSION;
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/resources/mkulima-logo.png'];
const MAX_ASSETS = 80;
const OFFLINE_HTML = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:system-ui,sans-serif;text-align:center;padding:4rem 1.5rem;color:#0f172a"><h1>You are offline</h1><p>Mkulima Farm Manager has not been saved on this device yet. Connect to the internet once and open the app, then it will open without a connection.</p></body>';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL && k !== ASSETS).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') { event.respondWith(appShell(req)); return; }
  if (url.pathname.startsWith('/assets/')) { event.respondWith(cacheFirst(req)); return; }
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/resources/') || url.pathname === '/manifest.webmanifest') { event.respondWith(staleWhileRevalidate(req)); }
});

// Always try the network so a new deployment shows up straight away; fall back to the saved copy offline.
async function appShell(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res && res.ok) await cache.put('/', res.clone());
    return res;
  } catch (e) {
    return (await cache.match('/')) || new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
async function cacheFirst(req) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) { await cache.put(req, res.clone()); trim(cache); }
  return res;
}
async function staleWhileRevalidate(req) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req);
  const refresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await refresh) || new Response('', { status: 504 });
}
async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_ASSETS; i++) await cache.delete(keys[i]);
}
