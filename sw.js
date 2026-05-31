// ══════════════════════════════════════════════════════════
// Neurobin Service Worker — v5 (Performance Upgrade)
// Strategy:
//   Static assets  → Stale-While-Revalidate (fast + fresh)
//   HTML pages     → Network-First (always fresh shell)
//   Supabase API   → Network-First (5 min TTL cache fallback)
// ══════════════════════════════════════════════════════════
const SW_VERSION   = 'v5';
const STATIC_CACHE = 'neurobin-static-v5';
const API_CACHE    = 'neurobin-api-v2';
const CACHES_KEEP  = new Set([STATIC_CACHE, API_CACHE]);

const STATIC_ASSETS = [
  '/Neurobin/',
  '/Neurobin/index.html',
  '/Neurobin/app.js',
  '/Neurobin/styles.css',           // ← was "style.css" (bug fix)
  '/Neurobin/tailwind.css',
  '/Neurobin/font-override.css',
  '/Neurobin/supabase-db.js',
  '/Neurobin/orders.js',
  '/Neurobin/products.js',
  '/Neurobin/packages.js',
  '/Neurobin/bundles.js',
  '/Neurobin/discounts.js',
  '/Neurobin/skin-type.js',
  '/Neurobin/logo.jpg',
  '/Neurobin/manifest.json',
];

// ── Install: pre-cache all static assets ──────────────────
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(err) {
        console.warn('[SW] Partial cache failure (non-fatal):', err.message);
      });
    })
  );
});

// ── Activate: delete old caches ──────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return !CACHES_KEEP.has(k); })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// ── Helpers ───────────────────────────────────────────────
function isHtmlRequest(req) {
  var accept = req.headers.get('accept') || '';
  return accept.includes('text/html');
}

function isStaticAsset(url) {
  return url.includes('/Neurobin/') &&
    !url.includes('supabase.co') &&
    !isHtmlRequest;
}

// ── Fetch: smart routing ──────────────────────────────────
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Skip non-GET, chrome-extension, analytics
  if (e.request.method !== 'GET') return;
  if (url.startsWith('chrome-extension://')) return;
  if (url.includes('google-analytics') || url.includes('gtag')) return;

  // ── Supabase API → Network-First with TTL cache ─────────
  if (url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request, { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined })
        .then(function(res) {
          if (res.ok) {
            var clone = res.clone();
            caches.open(API_CACHE).then(function(cache) {
              var headers = new Headers(clone.headers);
              headers.set('sw-cached-at', Date.now().toString());
              var cachedRes = new Response(clone.body, { status: clone.status, headers });
              cache.put(e.request, cachedRes);
            });
          }
          return res;
        })
        .catch(function() {
          return caches.match(e.request).then(function(cached) {
            if (cached) {
              var cachedAt = cached.headers.get('sw-cached-at');
              var age = cachedAt ? Date.now() - Number(cachedAt) : Infinity;
              // Use cache if less than 5 minutes old
              if (age < 300000) return cached;
            }
            return new Response(JSON.stringify({ error: 'offline' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // ── HTML pages → Network-First ───────────────────────────
  if (isHtmlRequest(e.request)) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match(e.request) ||
               caches.match('/Neurobin/index.html');
      })
    );
    return;
  }

  // ── Static assets → Stale-While-Revalidate ───────────────
  if (url.includes('/Neurobin/') || url.includes('github.io') || url.includes('cdn.jsdelivr.net') || url.includes('fonts.g')) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          var networkFetch = fetch(e.request).then(function(res) {
            if (res && res.status === 200) {
              cache.put(e.request, res.clone());
            }
            return res;
          }).catch(function() { return null; });

          // Return cached immediately + update in background
          return cached || networkFetch;
        });
      })
    );
    return;
  }
});

// ── Background Sync ────────────────────────────────────────
self.addEventListener('sync', function(e) {
  if (e.tag === 'sync-orders') {
    e.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  console.log('[SW v' + SW_VERSION + '] Background sync: checking pending orders');
}

// ── Push Notifications ─────────────────────────────────────
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; }
  catch(err) { data = { title: 'Neurobin', body: e.data ? e.data.text() : '' }; }

  var options = {
    body:    data.body    || 'لديك إشعار جديد من Neurobin',
    icon:    '/Neurobin/logo.jpg',
    badge:   '/Neurobin/logo.jpg',
    dir:     'rtl',
    lang:    'ar',
    vibrate: [200, 100, 200],
    data:    { url: data.url || '/Neurobin/' },
    actions: [
      { action: 'open',  title: 'عرض'   },
      { action: 'close', title: 'إغلاق' }
    ]
  };
  e.waitUntil(
    self.registration.showNotification(data.title || 'ph.neurobin', options)
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (e.action === 'open' || !e.action) {
    var targetUrl = (e.notification.data && e.notification.data.url) || '/Neurobin/';
    e.waitUntil(clients.openWindow(targetUrl));
  }
});
