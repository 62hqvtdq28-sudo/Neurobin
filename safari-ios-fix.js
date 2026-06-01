/* ============================================================
   safari-ios-fix.js — ph.neurobin
   Fixes blur/overlay stacking bugs on iPad Safari & iOS
   ============================================================ */
(function () {
  'use strict';

  /* ── 1. Device detection ─────────────────────────────────── */
  var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  var isIOS    = /iP(ad|hone|od)/.test(navigator.userAgent) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isIOSSafari = isSafari || isIOS;

  /* ── 2. Body scroll reset ───────────────────────────────── */
  function resetBodyScroll() {
    var savedTop = parseInt(document.body.style.top || '0', 10);
    document.body.style.overflow   = '';
    document.body.style.position   = '';
    document.body.style.top        = '';
    document.body.style.width      = '';
    document.documentElement.style.overflow = '';
    // Restore scroll position if body was fixed
    if (savedTop) window.scrollTo(0, -savedTop);
  }

  /* ── 3. Force Safari GPU layer flush ────────────────────── */
  function forceGPUFlush() {
    var root = document.documentElement;
    root.style.webkitTransform = 'translateZ(0)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.style.webkitTransform = '';
      });
    });
  }

  /* ── 4. Fix stuck image blur — comprehensive (img-loading/opacity/filter) */
  function fixStuckImageBlur(root) {
    var scope = root || document;
    // Fix img-loading class stuck
    scope.querySelectorAll('img.img-loading').forEach(function (img) {
      if (img.complete || img.__imgResolved) {
        img.classList.remove('img-loading','lazy-loading','lazy','loading','blur-loading');
        img.classList.add('img-loaded');
      }
    });
    // Fix ALL imgs with inline opacity/filter stuck
    scope.querySelectorAll('img').forEach(function (img) {
      if (img.style.opacity === '0' || parseFloat(img.style.opacity) < 0.1) {
        img.style.removeProperty('opacity');
      }
      if (img.style.filter && img.style.filter.includes('blur')) {
        img.style.removeProperty('filter');
        img.style.removeProperty('-webkit-filter');
      }
    });
    // Force-resolve via global img-loader if available
    if (window.__imgLoader) {
      scope.querySelectorAll('img').forEach(function (img) {
        if (img.complete && !img.__imgResolved) {
          window.__imgLoader.resolveImg(img);
        }
      });
    }
  }

  /* ── 5. Fix stuck grid opacity ──────────────────────────── */
  function fixStuckGrid() {
    var grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.classList.remove('grid-loading', 'grid-fading-out', 'grid-fading-in');
    grid.style.opacity       = '';
    grid.style.pointerEvents = '';
    grid.style.transform     = '';
  }

  /* ── 6. Disable backdrop-filter on hidden modals ────────── */
  function disableHiddenBackdrops() {
    var selectors = [
      '#searchModal:not(.active)',
      '#checkoutModal:not(.active)',
      '#quickViewModal:not(.active)'
    ];
    selectors.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) {
        el.style.webkitBackdropFilter = 'none';
        el.style.backdropFilter       = 'none';
      }
    });
    // Re-enable for active modals (remove inline override)
    var activeModals = document.querySelectorAll(
      '#searchModal.active, #checkoutModal.active, #quickViewModal.active'
    );
    activeModals.forEach(function (el) {
      el.style.webkitBackdropFilter = '';
      el.style.backdropFilter       = '';
    });
  }

  /* ── 7. Master cleanup after modal close ────────────────── */
  function masterCleanup(delay) {
    setTimeout(function () {
      resetBodyScroll();
      fixStuckImageBlur();
      fixStuckGrid();
      disableHiddenBackdrops();
      if (isIOSSafari) forceGPUFlush();
    }, delay || 60);
  }

  /* ── 8. Emergency full cleanup (global) ─────────────────── */
  window.safariEmergencyCleanup = function () {
    // Close all overlay/modal elements
    [
      'searchModal', 'checkoutModal', 'quickViewModal',
      'notifyModal'
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active', 'open');
    });

    // Inline-display modals (style-based open/close)
    ['orderTrackModal', 'productRequestModal'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.style.display === 'flex') el.style.display = 'none';
    });

    // Remove dynamically added overlays that use inline styles
    document.querySelectorAll('[style*="backdrop-filter"][style*="z-index: 10000"]')
      .forEach(function (el) { el.remove(); });

    // Sidebars & drawers
    ['cartSidebar'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    ['cartOverlay'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    var drawer = document.getElementById('mobileDrawer');
    if (drawer) drawer.classList.remove('open');

    resetBodyScroll();
    fixStuckImageBlur();
    fixStuckGrid();
    disableHiddenBackdrops();
    if (isIOSSafari) forceGPUFlush();
  };

  /* ── 9. Wrap a close function with cleanup ──────────────── */
  function wrapClose(name) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__sfxPatched) return;
    window[name] = function () {
      try { orig.apply(this, arguments); } catch (e) {}
      masterCleanup(80);
    };
    window[name].__sfxPatched = true;
  }

  /* ── 10. Wrap an open function — flush first ────────────── */
  function wrapOpen(name) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__sfxPatched) return;
    window[name] = function () {
      fixStuckImageBlur();
      disableHiddenBackdrops();
      try { orig.apply(this, arguments); } catch (e) {}
    };
    window[name].__sfxPatched = true;
  }

  /* ── 11. Apply all patches ──────────────────────────────── */
  function applyPatches() {
    [
      'closeCart', 'closeSearch', 'closeCheckout', 'closeQuickView',
      'closeNotifyModal', 'closeMobileDrawer'
    ].forEach(wrapClose);

    [
      'openCart', 'openSearch', 'openCheckout', 'openQuickView'
    ].forEach(wrapOpen);
  }

  /* ── 12. Escape key cleanup ─────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') masterCleanup(120);
  }, true);

  /* ── 13. iOS: tap on backdrop → cleanup ─────────────────── */
  if (isIOSSafari) {
    document.addEventListener('touchend', function (e) {
      var t = e.target;
      if (!t) return;
      var isBackdrop =
        t.id === 'searchModal'   ||
        t.id === 'checkoutModal' ||
        t.id === 'quickViewModal'||
        t.id === 'cartOverlay'   ||
        t.classList.contains('cart-overlay');
      if (isBackdrop) masterCleanup(150);
    }, { passive: true });
  }

  /* ── 14. Detect stuck body lock ─────────────────────────── */
  /* Note: scroll events don't fire when body is position:fixed (iOS).
     We use touchstart as the primary detector so it fires even when stuck. */
  function _checkAndUnstickBody() {
    var isStuck = document.body.style.position === 'fixed' ||
                  document.body.style.overflow === 'hidden';
    if (!isStuck) return;
    var anyOpen = document.querySelector(
      '#searchModal.active, #checkoutModal.active, ' +
      '#quickViewModal.active, #cartSidebar.active, #mobileDrawer.open'
    );
    if (!anyOpen) {
      resetBodyScroll();
      fixStuckImageBlur();
    }
  }

  /* touchstart fires even when page is stuck — primary recovery path */
  var _touchUnstickTimer;
  document.addEventListener('touchstart', function () {
    clearTimeout(_touchUnstickTimer);
    _touchUnstickTimer = setTimeout(_checkAndUnstickBody, 300);
  }, { passive: true });

  /* scroll event fallback — still useful when overflow:hidden only */
  var _scrollTimer;
  document.addEventListener('scroll', function () {
    if (document.body.style.overflow !== 'hidden') return;
    clearTimeout(_scrollTimer);
    _scrollTimer = setTimeout(_checkAndUnstickBody, 250);
  }, { passive: true });

  /* ── 15. Visibility change — repaint after resume ───────── */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    setTimeout(function () {
      fixStuckImageBlur();
      fixStuckGrid();
      disableHiddenBackdrops();
      if (isIOSSafari) forceGPUFlush();
    }, 100);
  });

  /* ── 16. Orientation change — reset layout ──────────────── */
  if (isIOS) {
    window.addEventListener('orientationchange', function () {
      setTimeout(function () {
        resetBodyScroll();
        document.documentElement.style.setProperty('--dvh', window.innerHeight + 'px');
        fixStuckGrid();
        if (isIOSSafari) forceGPUFlush();
      }, 350);
    });
  }

  /* ── 17. MutationObserver — watch for orphaned overlays ─── */
  if (isIOSSafari && window.MutationObserver) {
    var _observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.removedNodes.forEach(function (node) {
          if (node.nodeType === 1) {
            // A modal node was removed — ensure cleanup
            var s = node.id || '';
            if (s.indexOf('Modal') > -1 || s.indexOf('modal') > -1) {
              masterCleanup(60);
            }
          }
        });
      });
    });
    document.addEventListener('DOMContentLoaded', function () {
      _observer.observe(document.body, { childList: true, subtree: false });
    });
  }

  /* ── 18. DOMContentLoaded & load ────────────────────────── */
  function init() {
    setTimeout(applyPatches, 400);
    setTimeout(disableHiddenBackdrops, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('load', function () {
    setTimeout(applyPatches, 200);
    setTimeout(disableHiddenBackdrops, 400);
    fixStuckImageBlur();
    setTimeout(fixStuckImageBlur, 1500);
    setTimeout(fixStuckImageBlur, 4000);
  });

})();
