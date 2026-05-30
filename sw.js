// Neurobin Service Worker v1 — Cache static assets
const CACHE = 'nb-static-v1';
const STATIC = [
  '/',
  '/index.html',
  '/styles.css',
  '/tailwind.css',
  '/font-override.css',
  '/app.js',
  '/supabase-db.js',
  '/skin-type.js',
  '/visitor-tracker.js'
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(STATIC); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  // Don't cache Supabase API calls
  if (url.includes('supabase.co') || url.includes('googleapis')) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        // Cache same-origin CSS/JS/HTML
        if (res.ok && e.request.url.startsWith(self.location.origin) &&
            (url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.html'))) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() { return cached || new Response('', {status: 503}); });
    })
  );
});
