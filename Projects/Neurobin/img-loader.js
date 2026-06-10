/* ============================================================
   img-loader.js — ph.neurobin Bulletproof Image Loading
   Replaces the broken IntersectionObserver-only approach.

   Strategy (priority order):
   1. img.complete check (catches cached images immediately)
   2. onload / onerror events (primary for network images)
   3. requestAnimationFrame double-tick (Safari cached quirk)
   4. Hard timeout 2500ms fallback (absolute safety net)
   5. setInterval emergency sweep (catches any that slipped through)
   6. renderProducts hook (re-validates after every grid render)
   ============================================================ */
(function () {
  'use strict';

  var MAX_WAIT_MS    = 2500;  // hard timeout before force-resolve
  var SWEEP_INTERVAL = 1200;  // emergency sweep interval (ms)
  var _watching      = new WeakSet(); // prevent double-watching

  /* ── Core resolver — call this once, idempotent ─────────── */
  function resolveImg(img) {
    if (!img || img.__imgResolved) return;
    img.__imgResolved = true;

    // Clear pending timer
    if (img.__imgTimer) {
      clearTimeout(img.__imgTimer);
      img.__imgTimer = null;
    }

    // Remove every possible stuck CSS class
    img.classList.remove(
      'img-loading',
      'img-lazy',
      'lazy-loading',
      'lazy',
      'loading',
      'blur-loading',
      'skeleton-img',
      'is-loading',
      'not-loaded'
    );
    img.classList.add('img-loaded');

    // Force clear any inline opacity/filter (set by old perf.js or safari-ios-fix)
    img.style.removeProperty('opacity');
    img.style.removeProperty('filter');
    img.style.removeProperty('-webkit-filter');
    // Do NOT remove transform — it may be used by hover animations
  }

  /* ── Watch a single image element ───────────────────────── */
  function watchImg(img) {
    if (!img || img.tagName !== 'IMG') return;
    if (_watching.has(img)) return;
    _watching.add(img);

    // ── Step 1: Already loaded? (cached images) ────────────
    if (img.complete && img.naturalWidth > 0) {
      resolveImg(img);
      return;
    }

    // ── Step 2: Mark as loading (only if NOT already loaded) ─
    if (!img.classList.contains('img-loaded')) {
      img.classList.add('img-loading');
    }

    // ── Step 3: onload — primary event ────────────────────
    img.addEventListener('load', function () {
      resolveImg(img);
    }, { once: true, passive: true });

    // ── Step 4: onerror — broken image, resolve anyway ────
    img.addEventListener('error', function () {
      resolveImg(img);
    }, { once: true, passive: true });

    // ── Step 5: rAF double-tick — Safari cached quirk ─────
    // Safari sometimes fires 'load' before addEventListener,
    // or sets complete=true between the check (step 1) and here
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (img.complete) resolveImg(img);
      });
    });

    // ── Step 6: Hard timeout — absolute fallback ──────────
    img.__imgTimer = setTimeout(function () {
      resolveImg(img);
    }, MAX_WAIT_MS);
  }

  /* ── Watch all images in a root element ─────────────────── */
  function watchAll(root) {
    var r = root || document;
    var imgs = r.querySelectorAll
      ? r.querySelectorAll('img')
      : (r.tagName === 'IMG' ? [r] : []);
    Array.prototype.forEach.call(imgs, watchImg);
  }

  /* ── MutationObserver — catches dynamically added images ── */
  var _mo = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (!node || node.nodeType !== 1) return;
        if (node.tagName === 'IMG') {
          watchImg(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll('img').forEach(watchImg);
        }
      });
    });
  });

  /* ── Emergency sweep — catches any stuck img-loading ─────── */
  var _sweep = setInterval(function () {
    document.querySelectorAll('img.img-loading').forEach(function (img) {
      // Already resolved but class wasn't removed?
      if (img.__imgResolved) {
        img.classList.remove('img-loading');
        img.classList.add('img-loaded');
        return;
      }
      // Image loaded but class still stuck
      if (img.complete) {
        resolveImg(img);
      }
    });
  }, SWEEP_INTERVAL);

  /* ── Hook into renderProducts for post-render sweep ─────── */
  function hookRenderProducts() {
    var _orig = window.renderProducts;
    if (typeof _orig !== 'function' || _orig.__imgLoaderPatched) return;
    window.renderProducts = function () {
      var result = _orig.apply(this, arguments);
      // After render: watch all newly added images
      setTimeout(function () {
        watchAll(document.getElementById('productsGrid') || document);
      }, 50);
      setTimeout(function () {
        watchAll(document.getElementById('productsGrid') || document);
      }, 300);
      return result;
    };
    window.renderProducts.__imgLoaderPatched = true;
  }

  /* ── Hook into openQuickView for modal images ─────────────── */
  function hookQuickView() {
    var _orig = window.openQuickView;
    if (typeof _orig !== 'function' || _orig.__imgLoaderPatched) return;
    window.openQuickView = function () {
      var result = _orig.apply(this, arguments);
      setTimeout(function () {
        var modal = document.querySelector('.quick-view-modal, #quickViewModal, .quick-view-content');
        if (modal) watchAll(modal);
        else watchAll(document);
      }, 150);
      return result;
    };
    window.openQuickView.__imgLoaderPatched = true;
  }

  /* ── Clear legacy img-loading classes left by old systems ── */
  function forceCleanLegacy() {
    // Find images that the old IntersectionObserver-only system missed
    document.querySelectorAll('img').forEach(function (img) {
      if (!_watching.has(img)) watchImg(img);
      // Also clean images with inline opacity:0
      if (img.style.opacity === '0') {
        img.style.removeProperty('opacity');
      }
    });
  }

  /* ── Main init ──────────────────────────────────────────── */
  function init() {
    watchAll(document);
    _mo.observe(document.body, {
      childList: true,
      subtree: true  // subtree:true catches nested img inside deep components
    });
    hookRenderProducts();
    hookQuickView();
  }

  /* ── Boot sequence ──────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Run again after full load (catches late-loading JS rendered images)
  window.addEventListener('load', function () {
    forceCleanLegacy();
    setTimeout(forceCleanLegacy, 800);
    setTimeout(function () {
      hookRenderProducts();
      hookQuickView();
    }, 200);
  });

  // Expose globally for safari-ios-fix.js and other scripts
  window.__imgLoader = { watchImg: watchImg, watchAll: watchAll, resolveImg: resolveImg };

/* ============================================================
   SCROLL ANIMATION FORCE-REVEAL (added to img-loader.js)
   Handles the case where IntersectionObserver fails to add
   'visible' class to scroll-animate-scale product cards.
   Uses MutationObserver (not function patching) so it works
   regardless of how many times renderProducts is wrapped.
   ============================================================ */
(function forceRevealSystem() {
  'use strict';

  var SEL = '.scroll-animate-scale,.scroll-animate,.scroll-animate-left,.scroll-animate-right';

  /* ── Reveal all cards currently in (or near) the viewport ── */
  function forceRevealVisible(root) {
    var scope  = root || document;
    var vh     = window.innerHeight || document.documentElement.clientHeight;
    var vw     = window.innerWidth  || document.documentElement.clientWidth;
    var margin = 300; // generous — cards 300px outside viewport also revealed

    scope.querySelectorAll(SEL).forEach(function (el) {
      if (el.classList.contains('visible')) return;
      var r = el.getBoundingClientRect();
      if (r.top < (vh + margin) && r.bottom > -margin) {
        el.classList.add('visible');
      }
    });
  }

  /* ── Better IntersectionObserver (replaces app.js & perf.js ones) */
  var _revObs   = null;
  var _revSeen  = new WeakSet();

  function getRevealObserver() {
    if (_revObs) return _revObs;
    _revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          _revObs.unobserve(entry.target);
        }
      });
    }, {
      threshold:   0,
      rootMargin: '200px 0px 200px 0px' // large margin — early trigger
    });
    return _revObs;
  }

  function observeCards(root) {
    var obs = getRevealObserver();
    (root || document).querySelectorAll(SEL).forEach(function (el) {
      if (!_revSeen.has(el)) {
        _revSeen.add(el);
        obs.observe(el);
      }
    });
  }

  /* ── MutationObserver on productsGrid ─────────────────────── */
  // Fires after EVERY renderProducts() call, regardless of patching.
  // This is the core — no function wrapping needed.
  function watchGrid() {
    var grid = document.getElementById('productsGrid');
    if (!grid || grid.__revealMOAttached) return;
    grid.__revealMOAttached = true;

    var _mo = new MutationObserver(function (mutations) {
      var hadAdds = mutations.some(function (m) { return m.addedNodes.length > 0; });
      if (!hadAdds) return;
      // Immediately after DOM insert: observe new cards
      observeCards(grid);
      // Short delay: force-reveal cards in viewport (IO may fire too late)
      setTimeout(function () { forceRevealVisible(grid); }, 80);
      // Longer delay: catch slow Safari IO
      setTimeout(function () { forceRevealVisible(grid); }, 600);
      // Extra pass for modal-close/scroll edge cases
      setTimeout(function () { forceRevealVisible(grid); }, 1500);
    });

    _mo.observe(grid, { childList: true });
  }

  /* ── Interval sweep ────────────────────────────────────────── */
  // Emergency: every 2s check for stuck scroll-animate elements
  setInterval(function () {
    var grid = document.getElementById('productsGrid');
    if (grid) forceRevealVisible(grid);
  }, 2000);

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    forceRevealVisible(document);
    observeCards(document);
    watchGrid();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', function () {
    init(); // re-run after Supabase products load
    setTimeout(function () { forceRevealVisible(document); }, 500);
    setTimeout(function () { forceRevealVisible(document); }, 2000);
  });

  // Expose globally for other scripts
  window.__revealFix = { forceReveal: forceRevealVisible, observe: observeCards };

})();

})();
