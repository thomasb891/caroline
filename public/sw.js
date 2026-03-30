const CACHE = 'hublo-v19';
const ASSETS = ['/', '/css/style.css', '/css/components.css', '/js/api.js', '/js/app.js', '/js/planning.js', '/js/paiements.js', '/js/impots.js', '/js/etablissements.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) {
    // Network-first for API
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  } else {
    // Cache-first for static
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return resp;
    })));
  }
});
