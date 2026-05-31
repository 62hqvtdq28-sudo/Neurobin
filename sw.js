// ══════════════════════════════════════════════════════════
// Neurobin Service Worker — PWA (#166 / #194)
// Strategy: Cache-First for static assets, Network-First for API
// ══════════════════════════════════════════════════════════
const CACHE_NAME = 'neurobin-v3';
const STATIC_CACHE = 'neurobin-static-v3';
const API_CACHE    = 'neurobin-api-v1';

const STATIC_ASSETS = [
  '/Neurobin/',
  '/Neurobin/index.html',
  '/Neurobin/logo.jpg',
  '/Neurobin/manifest.json',
  '/Neurobin/app.js',
  '/Neurobin/style.css'
];

// ── Install: cache static assets ──────────────────────────
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(err) {
        console.warn('[SW] Could not cache all assets:', err);
      });
    })
  );
});

// ── Activate: clear old caches ────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== STATIC_CACHE && k !== API_CACHE; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// ── Fetch: smart caching strategy ─────────────────────────
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Skip non-GET and chrome-extension requests
  if (e.request.method !== 'GET') return;
  if (url.startsWith('chrome-extension://')) return;

  // Supabase API → Network-First (fresh data)
  if (url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(API_CACHE).then(function(cache) {
          cache.put(e.request, clone);
        });
        return res;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Static assets → Cache-First
  if (url.includes('/Neurobin/') || url.includes('github.io')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(res) {
          if (res && res.status === 200) {
            var clone = res.clone();
            caches.open(STATIC_CACHE).then(function(cache) { cache.put(e.request, clone); });
          }
          return res;
        }).catch(function() {
          // Offline fallback for HTML pages
          if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
            return caches.match('/Neurobin/index.html');
          }
        });
      })
    );
    return;
  }
});

// ── Background Sync: push pending orders when online ──────
self.addEventListener('sync', function(e) {
  if (e.tag === 'sync-orders') {
    e.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  // placeholder — future: sync orders saved offline
  console.log('[SW] Background sync: checking pending orders');
}

// ── Push Notifications ────────────────────────────────────
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) { data = {title:'Neurobin', body: e.data ? e.data.text() : ''}; }
  var options = {
    body: data.body || 'لديك إشعار جديد من Neurobin',
    icon: '/Neurobin/logo.jpg',
    badge: '/Neurobin/logo.jpg',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/Neurobin/' },
    actions: [
      { action: 'open', title: 'عرض' },
      { action: 'close', title: 'إغلاق' }
    ]
  };
  e.waitUntil(self.registration.showNotification(data.title || 'ph.neurobin', options));
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (e.action === 'open' || !e.action) {
    var targetUrl = (e.notification.data && e.notification.data.url) || '/Neurobin/';
    e.waitUntil(clients.openWindow(targetUrl));
  }
});
