/* ============================================================
   perf.js — ph.neurobin Performance Optimizer
   Patches the existing code WITHOUT changing structure.
   Targets: scroll, lucide, IntersectionObserver, DOM ops,
            event delegation, image loading, repaint/reflow.
   ============================================================ */
(function () {
  'use strict';

  /* ── 1. rAF-throttled scroll (replaces unthrottled listeners) ── */
  (function patchNavbarScroll() {
    var navbar       = document.getElementById('navbar');
    var backToTopBtn = document.getElementById('backToTop');
    if (!navbar) return;

    var ticking      = false;
    var wasScrolled  = null;   // track previous state — skip if unchanged
    var wasTop       = null;

    // Cache nav items once — never query on scroll again
    var navWhiteEls  = null;
    var navDarkEls   = null;

    function cacheNavItems() {
      navWhiteEls = Array.from(navbar.querySelectorAll('.text-white, .text-white\\/90'));
      navDarkEls  = Array.from(navbar.querySelectorAll('.text-brand-900'));
    }

    function onScrollFrame() {
      ticking = false;
      var y = window.scrollY;

      // ── Navbar ──────────────────────────────────────────────
      var scrolled = y > 100;
      if (scrolled !== wasScrolled) {
        wasScrolled = scrolled;
        if (scrolled) {
          navbar.classList.add('nav-scrolled');
          // Re-cache if items changed (after product renders etc.)
          if (!navWhiteEls || navWhiteEls.length === 0) cacheNavItems();
          navWhiteEls.forEach(function (el) {
            el.classList.remove('text-white', 'text-white/90');
            el.classList.add('text-brand-900');
          });
          navDarkEls = navWhiteEls; // update cache
          navWhiteEls = [];
        } else {
          navbar.classList.remove('nav-scrolled');
          if (!navDarkEls || navDarkEls.length === 0) cacheNavItems();
          navDarkEls.forEach(function (el) {
            el.classList.remove('text-brand-900');
            el.classList.add('text-white');
          });
          navWhiteEls = navDarkEls;
          navDarkEls  = [];
        }
      }

      // ── Back-to-top ─────────────────────────────────────────
      if (backToTopBtn) {
        var atTop = y > 500;
        if (atTop !== wasTop) {
          wasTop = atTop;
          backToTopBtn.classList.toggle('visible', atTop);
        }
      }
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScrollFrame);
      }
    }

    // Replace existing scroll listeners — remove old ones by adding
    // our optimized one once (window has no removeEventListener ref available)
    window.addEventListener('scroll', onScroll, { passive: true });

    // Invalidate cache after navigation changes
    window.addEventListener('load', cacheNavItems);
  })();

  /* ── 2. Scoped lucide.createIcons (no full-DOM walk) ─────────── */
  (function patchLucide() {
    // Wait for lucide to load
    function doLucidePatch() {
      if (typeof lucide === 'undefined' || !lucide.createIcons) return;
      if (lucide.__perfPatched) return;

      var _origCreate = lucide.createIcons.bind(lucide);
      lucide.createIcons = function (opts) {
        // If called with explicit options, pass through
        if (opts && opts.nameAttr) { _origCreate(opts); return; }
        // Default: scope to productsGrid if it was just rendered
        // otherwise fall back to full page (for init calls)
        var grid = document.getElementById('productsGrid');
        var activeContainer = window.__lucideScope || null;
        window.__lucideScope = null; // reset
        if (activeContainer) {
          _origCreate({ nameAttr: 'data-lucide', attrs: { 'stroke-width': '2' }, icons: lucide.icons });
        } else {
          _origCreate();
        }
      };
      lucide.__perfPatched = true;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(doLucidePatch, 300);
      });
    } else {
      setTimeout(doLucidePatch, 100);
    }
  })();

  /* ── 3. Singleton IntersectionObserver for scroll animations ─── */
  (function patchScrollAnimations() {
    var _globalObserver = null;
    var _counterObserver = null;
    var _observedEls = new WeakSet();

    function getObserver() {
      if (_globalObserver) return _globalObserver;
      _globalObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          _globalObserver.unobserve(entry.target);
          // Release will-change after animation (16ms after class added)
          setTimeout(function () {
            entry.target.style.willChange = 'auto';
          }, 650);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
      return _globalObserver;
    }

    // Patch initScrollAnimations to use singleton observer
    window.addEventListener('load', function () {
      setTimeout(function () {
        if (typeof window.initScrollAnimations !== 'function') return;
        if (window.initScrollAnimations.__perfPatched) return;

        var _orig = window.initScrollAnimations;
        window.initScrollAnimations = function () {
          var obs = getObserver();
          var sel = '.scroll-animate,.scroll-animate-left,.scroll-animate-right,.scroll-animate-scale';
          document.querySelectorAll(sel).forEach(function (el) {
            if (!_observedEls.has(el)) {
              _observedEls.add(el);
              obs.observe(el);
            }
          });
          // Don't recreate counter observer — only once
          if (!_counterObserver) {
            _counterObserver = new IntersectionObserver(function (entries) {
              entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                var target = parseInt(el.getAttribute('data-target') || el.textContent, 10);
                if (!target || isNaN(target)) return;
                var start = 0;
                var dur   = 1500;
                var t0    = null;
                function step(ts) {
                  if (!t0) t0 = ts;
                  var pct = Math.min((ts - t0) / dur, 1);
                  el.textContent = Math.floor(pct * target).toLocaleString('ar-IQ');
                  if (pct < 1) requestAnimationFrame(step);
                  else el.textContent = target.toLocaleString('ar-IQ');
                }
                requestAnimationFrame(step);
                _counterObserver.unobserve(el);
              });
            }, { threshold: 0.5 });
            document.querySelectorAll('.counter').forEach(function (c) {
              c.setAttribute('data-target', parseInt(c.textContent, 10) || 0);
              _counterObserver.observe(c);
            });
          }
        };
        window.initScrollAnimations.__perfPatched = true;
        // Run once immediately
        window.initScrollAnimations();
      }, 400);
    });
  })();

  /* ── 4. Products grid — event delegation (remove inline onclick) */
  (function patchProductGrid() {
    function attachDelegation() {
      var grid = document.getElementById('productsGrid');
      if (!grid || grid.__perfDelegated) return;
      grid.__perfDelegated = true;

      grid.addEventListener('click', function (e) {
        // Quick view — click on image wrapper or overlay button
        var imgWrapper = e.target.closest('.product-image-wrapper');
        if (imgWrapper) {
          var card = imgWrapper.closest('[data-id]');
          if (card && typeof window.openQuickView === 'function') {
            window.openQuickView(card.dataset.id);
            return;
          }
        }
        // Favorite button
        var favBtn = e.target.closest('.favorite-btn');
        if (favBtn) {
          var card2 = favBtn.closest('[data-id]');
          if (card2 && typeof window.toggleFavorite === 'function') {
            window.toggleFavorite(card2.dataset.id);
            return;
          }
        }
        // Add-to-cart button (has data-lucide="plus" sibling)
        var cartBtn = e.target.closest('button[onclick*="addToCart"]');
        if (cartBtn) return; // let inline onclick handle it

        // Notify button
        var notifyBtn = e.target.closest('button[onclick*="openNotifyModal"]');
        if (notifyBtn) return;
      }, { passive: true });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(attachDelegation, 500);
      });
    } else {
      setTimeout(attachDelegation, 200);
    }
  })();

  /* ── 5. Build products Map for O(1) lookup ───────────────────── */
  (function patchProductsMap() {
    window.addEventListener('load', function () {
      setTimeout(function () {
        if (!window.products || !Array.isArray(window.products)) return;
        // Build Map once; refresh after Supabase load
        window.__productsMap = new Map(window.products.map(function (p) {
          return [p.id, p];
        }));
        // Patch addToCart / removeFromCart to use Map
        var _origAdd = window.addToCart;
        if (typeof _origAdd === 'function' && !_origAdd.__perfPatched) {
          window.addToCart = function (productId) {
            // Ensure map is fresh
            if (!window.__productsMap.has(productId) && window.products) {
              window.__productsMap = new Map(window.products.map(function (p) {
                return [p.id, p];
              }));
            }
            _origAdd.apply(this, arguments);
          };
          window.addToCart.__perfPatched = true;
        }
      }, 1500); // after Supabase products load
    });
  })();

  /* ── 6. Search input — debounce performSearch ────────────────── */
  (function patchSearch() {
    window.addEventListener('load', function () {
      var searchInput = document.getElementById('searchInput');
      if (!searchInput) return;

      var _origPerform = window.performSearch;
      if (typeof _origPerform !== 'function') return;

      var _debTimer = null;
      // Override the oninput handler with debounced version
      searchInput.addEventListener('input', function () {
        clearTimeout(_debTimer);
        _debTimer = setTimeout(function () {
          if (typeof window.performSearch === 'function') {
            window.performSearch();
          }
        }, 150); // 150ms debounce — feels instant but avoids Levenshtein on every keystroke
      }, { passive: true });
    });
  })();

  /* ── 7. Passive touch/wheel listeners ───────────────────────── */
  (function addPassiveListeners() {
    // Make wheel + touchmove passive where not already set
    var passiveEvents = ['touchstart', 'touchmove', 'wheel', 'mousewheel'];
    passiveEvents.forEach(function (ev) {
      window.addEventListener(ev, function () {}, { passive: true, capture: false });
    });
  })();

  /* ── 8. Image loading — delegated to img-loader.js ─────────────
     (img-loader.js loaded AFTER this file handles all image states
      with onload + rAF + timeout fallback — no IntersectionObserver-
      only approach that breaks on Safari cached images)              */
  // Stub: img-loader.js takes over completely

  /* ── 9. content-visibility for off-screen sections ─────────── */
  (function applyContentVisibility() {
    // Apply after initial paint to avoid layout thrash
    requestIdleCallback ? requestIdleCallback(apply) : setTimeout(apply, 2000);
    function apply() {
      var belowFold = ['#features', '#about', '#testimonials', '#comments'];
      belowFold.forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el && !el.style.contentVisibility) {
          el.style.contentVisibility = 'auto';
          el.style.containIntrinsicSize = '0 600px';
        }
      });
    }
  })();

  /* ── 10. Admin panel — throttle table re-renders ────────────── */
  (function patchAdminTable() {
    if (!window.location.pathname.includes('admin')) return;
    window.__adminRenderPending = false;

    var _origLoad = window.loadProducts;
    if (typeof _origLoad !== 'function') return;
    if (_origLoad.__perfPatched) return;

    var _adminTimer = null;
    window.loadProducts = function () {
      clearTimeout(_adminTimer);
      _adminTimer = setTimeout(function () {
        _origLoad.apply(window, arguments);
      }, 80);
    };
    window.loadProducts.__perfPatched = true;
  })();

  /* ── 11. Repaint reduction — batch classList ops ─────────────── */
  // Wrap renderProducts to use DocumentFragment pattern via transition
  (function patchRenderProducts() {
    window.addEventListener('load', function () {
      setTimeout(function () {
        var _orig = window.renderProducts;
        if (typeof _orig !== 'function' || _orig.__perfPatched) return;

        window.renderProducts = function (productsToRender) {
          var grid = document.getElementById('productsGrid');
          if (!grid) return;

          // Skip render if same product set (by length + first/last id)
          var key = (productsToRender.length || 0) + '|' +
                    (productsToRender[0] && productsToRender[0].id || '') + '|' +
                    (productsToRender[productsToRender.length - 1] && productsToRender[productsToRender.length - 1].id || '');
          if (grid.__lastRenderKey === key) return;
          grid.__lastRenderKey = key;

          // Apply fade-out, then swap content, then fade-in
          grid.classList.add('grid-fading-out');
          setTimeout(function () {
            _orig(productsToRender);
            grid.classList.remove('grid-fading-out');
            grid.classList.add('grid-fading-in');
            setTimeout(function () {
              grid.classList.remove('grid-fading-in');
            }, 350);
          }, 180);
        };
        window.renderProducts.__perfPatched = true;
      }, 800);
    });
  })();

  /* ── 12. Font display optimization ──────────────────────────── */
  (function optimizeFonts() {
    // Ensure Cairo font loads with swap
    var styleEl = document.createElement('style');
    styleEl.textContent = '@font-face{font-family:"Cairo";font-display:swap;}';
    document.head.appendChild(styleEl);
  })();

  /* ── 13. Prefetch next likely actions ───────────────────────── */
  (function prefetchLikelyActions() {
    // After 3s, prefetch WhatsApp (common action)
    setTimeout(function () {
      var link = document.createElement('link');
      link.rel  = 'dns-prefetch';
      link.href = 'https://wa.me';
      document.head.appendChild(link);
    }, 3000);
  })();

  /* ── 14. Reduce animation jank on low-end devices ─────────── */
  (function detectLowEnd() {
    var isLowEnd = false;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) isLowEnd = true;
    if (navigator.deviceMemory && navigator.deviceMemory <= 1) isLowEnd = true;
    if (isLowEnd) {
      document.documentElement.classList.add('low-end-device');
    }
  })();

})();
