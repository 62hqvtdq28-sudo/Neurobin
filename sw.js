// ══════════════════════════════════════════════════════════
// Neurobin Service Worker — v6 (PWA Upgrade)
// Strategies:
//   HTML        → Network-First (always fresh shell)
//   Static JS/CSS → Stale-While-Revalidate (fast + fresh)
//   Images      → Cache-First (long TTL, bandwidth-saving)
//   Supabase    → Network-First (5-min TTL fallback)
//   Fonts/CDN   → Cache-First (immutable assets)
// ══════════════════════════════════════════════════════════
const SW_VERSION   = 'v6';
const STATIC_CACHE = 'neurobin-static-v6';
const IMG_CACHE    = 'neurobin-img-v2';
const API_CACHE    = 'neurobin-api-v3';
const FONT_CACHE   = 'neurobin-font-v1';
const CACHES_KEEP  = new Set([STATIC_CACHE, IMG_CACHE, API_CACHE, FONT_CACHE]);

// ── Core files to pre-cache on install ───────────────────
const PRECACHE_ASSETS = [
  '/Neurobin/',
  '/Neurobin/index.html',
  '/Neurobin/styles.css',
  '/Neurobin/tailwind.css',
  '/Neurobin/font-override.css',
  '/Neurobin/homepage-premium.css',
  '/Neurobin/app.js',
  '/Neurobin/supabase-db.js',
  '/Neurobin/orders.js',
  '/Neurobin/products.js',
  '/Neurobin/packages.js',
  '/Neurobin/bundles.js',
  '/Neurobin/discounts.js',
  '/Neurobin/skin-type.js',
  '/Neurobin/safari-ios-fix.js',
  '/Neurobin/pwa-install.js',
  '/Neurobin/logo.jpg',
  '/Neurobin/manifest.json',
];

// ── Install ───────────────────────────────────────────────
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      // Cache one-by-one so a single failure doesn't block all
      return Promise.allSettled(
        PRECACHE_ASSETS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW v6] Failed to cache:', url, err.message);
          });
        })
      );
    })
  );
});

// ── Activate: clean old caches ────────────────────────────
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return !CACHES_KEEP.has(k); })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// ── Helpers ───────────────────────────────────────────────
function isHTMLReq(req) {
  return (req.headers.get('accept') || '').includes('text/html');
}
function isImageReq(url) {
  return /\.(jpe?g|png|gif|webp|avif|svg|ico)(\?|$)/i.test(url);
}
function isFontReq(url) {
  return url.includes('fonts.googleapis.com') ||
         url.includes('fonts.gstatic.com') ||
         /\.(woff2?|ttf|eot)(\?|$)/i.test(url);
}
function isCDNReq(url) {
  return url.includes('cdn.jsdelivr.net');
}
function isSupabaseReq(url) {
  return url.includes('supabase.co');
}
function isInScope(url) {
  return url.includes('/Neurobin/') || url.includes('github.io');
}

// ── Fetch ─────────────────────────────────────────────────
self.addEventListener('fetch', function (e) {
  var url   = e.request.url;
  var req   = e.request;

  // Skip non-GET, chrome-extension, analytics
  if (req.method !== 'GET') return;
  if (url.startsWith('chrome-extension://')) return;
  if (url.includes('google-analytics') || url.includes('gtag')) return;

  // ── 1. Supabase API → Network-First + 5-min TTL fallback ─
  if (isSupabaseReq(url)) {
    e.respondWith(networkFirstTTL(req, API_CACHE, 300000));
    return;
  }

  // ── 2. Fonts / CDN → Cache-First (immutable) ─────────────
  if (isFontReq(url) || isCDNReq(url)) {
    e.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }

  // ── 3. Images → Cache-First (bandwidth saving) ───────────
  if (isImageReq(url) && isInScope(url)) {
    e.respondWith(cacheFirst(req, IMG_CACHE));
    return;
  }

  // ── 4. HTML → Network-First (always fresh shell) ─────────
  if (isHTMLReq(req)) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res.ok) {
          caches.open(STATIC_CACHE).then(function (c) { c.put(req, res.clone()); });
        }
        return res;
      }).catch(function () {
        return caches.match(req) || caches.match('/Neurobin/index.html');
      })
    );
    return;
  }

  // ── 5. JS/CSS/other static → Stale-While-Revalidate ─────
  if (isInScope(url)) {
    e.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
    return;
  }
});

// ── Strategy: Cache-First ─────────────────────────────────
function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(function () {
        return new Response('', { status: 503 });
      });
    });
  });
}

// ── Strategy: Stale-While-Revalidate ─────────────────────
function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (cached) {
      var networkFetch = fetch(req).then(function (res) {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(function () { return null; });
      return cached || networkFetch;
    });
  });
}

// ── Strategy: Network-First with TTL fallback ────────────
function networkFirstTTL(req, cacheName, ttlMs) {
  return fetch(req).then(function (res) {
    if (res.ok) {
      var headers = new Headers(res.headers);
      headers.set('sw-cached-at', Date.now().toString());
      var clone = res.clone();
      caches.open(cacheName).then(function (cache) {
        cache.put(req, new Response(clone.body, {
          status: clone.status,
          statusText: clone.statusText,
          headers: headers
        }));
      });
    }
    return res;
  }).catch(function () {
    return caches.open(cacheName).then(function (cache) {
      return cache.match(req).then(function (cached) {
        if (cached) {
          var age = Date.now() - Number(cached.headers.get('sw-cached-at') || 0);
          if (age < ttlMs) return cached;
        }
        return new Response(JSON.stringify({ error: 'offline', cached: false }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    });
  });
}

// ── Background sync ───────────────────────────────────────
self.addEventListener('sync', function (e) {
  if (e.tag === 'sync-orders') e.waitUntil(syncPendingOrders());
});
async function syncPendingOrders() {
  console.log('[SW v6] Background sync: pending orders check');
}

// ── Skip waiting on message ───────────────────────────────
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Push notifications ────────────────────────────────────
self.addEventListener('push', function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {}
  var opts = {
    body:    data.body    || 'لديك إشعار جديد من صيدلية نيروبين',
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
    self.registration.showNotification(data.title || 'ph.neurobin', opts)
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  if (e.action === 'open' || !e.action) {
    var url = (e.notification.data && e.notification.data.url) || '/Neurobin/';
    e.waitUntil(clients.openWindow(url));
  }
});
