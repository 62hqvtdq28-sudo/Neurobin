/* ============================================================
   seo.js — ph.neurobin Dynamic SEO
   - Updates meta/OG tags when products are viewed
   - Structured data for products
   - URL hash product sharing
   - Dynamic title management
   ============================================================ */
(function () {
  'use strict';

  var BASE_URL  = 'https://62hqvtdq28-sudo.github.io/Neurobin/';
  var LOGO_URL  = BASE_URL + 'logo.jpg';
  var DEF_TITLE = 'ph.neurobin — صيدليتك الموثوقة | أدوية وعناية بالبشرة ومكياج';
  var DEF_DESC  = 'صيدلية ph.neurobin — أكثر من 1200 منتج دوائي وتجميلي. أدوية، عناية بالبشرة، مكياج، عطور وأجهزة طبية. توصيل سريع 24-48 ساعة لجميع أنحاء العراق.';

  /* ── 1. Meta tag helpers ──────────────────────────────── */
  function getMeta(name, isProperty) {
    return document.querySelector(
      isProperty ? '[property="' + name + '"]' : '[name="' + name + '"]'
    );
  }
  function setMeta(name, value, isProperty) {
    var el = getMeta(name, isProperty);
    if (el) el.setAttribute('content', value);
  }
  function getOrCreate(attr, val) {
    var el = document.querySelector('[' + attr + '="' + val + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, val);
      document.head.appendChild(el);
    }
    return el;
  }

  /* ── 2. Update all meta tags for a given state ────────── */
  function updateMeta(opts) {
    var title = opts.title || DEF_TITLE;
    var desc  = opts.desc  || DEF_DESC;
    var img   = opts.img   || LOGO_URL;
    var url   = opts.url   || BASE_URL;
    var price = opts.price || null;

    document.title = title;

    // Standard meta
    setMeta('description', desc);

    // Canonical
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = url;

    // Open Graph
    setMeta('og:title',            title,  true);
    setMeta('og:description',      desc,   true);
    setMeta('og:image',            img,    true);
    setMeta('og:url',              url,    true);
    setMeta('og:image:alt',        title,  true);
    setMeta('og:updated_time',     Math.floor(Date.now()/1000).toString(), true);

    // Twitter
    setMeta('twitter:title',       title);
    setMeta('twitter:description', desc);
    setMeta('twitter:image',       img);
    setMeta('twitter:image:alt',   title);

    // Product-specific price meta (for shopping aggregators)
    if (price) {
      getOrCreate('property', 'product:price:amount').setAttribute('content', price);
      getOrCreate('property', 'product:price:currency').setAttribute('content', 'IQD');
    } else {
      var priceEl = getMeta('product:price:amount', true);
      if (priceEl) priceEl.remove();
    }
  }

  /* ── 3. Inject or update Product structured data ────────── */
  var _productLdEl = null;
  function setProductLD(product) {
    if (!_productLdEl) {
      _productLdEl = document.createElement('script');
      _productLdEl.type = 'application/ld+json';
      _productLdEl.id   = 'ld-product';
      document.head.appendChild(_productLdEl);
    }
    var schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': product.nameAr || product.name,
      'description': product.description || (product.nameAr + ' — متوفر في صيدلية ph.neurobin'),
      'url': BASE_URL + '?product=' + encodeURIComponent(product.id),
      'image': product.image || LOGO_URL,
      'brand': {
        '@type': 'Brand',
        'name': product.brand || 'ph.neurobin'
      },
      'offers': {
        '@type': 'Offer',
        'url': BASE_URL + '?product=' + encodeURIComponent(product.id),
        'priceCurrency': 'IQD',
        'price': String(product.price || '0'),
        'availability': (product.inStock !== false)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        'seller': {
          '@type': 'Organization',
          'name': 'ph.neurobin'
        },
        'areaServed': {
          '@type': 'Country',
          'name': 'Iraq'
        }
      },
      'isRelatedTo': {
        '@type': 'Pharmacy',
        'name': 'ph.neurobin',
        'url': BASE_URL
      }
    };
    // Add aggregate rating if available
    if (product.rating) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        'ratingValue': String(product.rating),
        'bestRating': '5',
        'reviewCount': String(product.reviewCount || '1')
      };
    }
    _productLdEl.textContent = JSON.stringify(schema);
  }

  function removeProductLD() {
    if (_productLdEl) {
      _productLdEl.remove();
      _productLdEl = null;
    }
  }

  /* ── 4. Format price for display ────────────────────────── */
  function fmtPrice(p) {
    return Number(p).toLocaleString('en-US') + ' د.ع';
  }

  /* ── 5. Build product SEO description ──────────────────── */
  function buildProductDesc(product) {
    var parts = [];
    var name  = product.nameAr || product.name || '';
    var cat   = {
      medicines: 'أدوية', skincare: 'عناية بالبشرة',
      makeup: 'مكياج', devices: 'أجهزة طبية', perfumes: 'عطور'
    }[product.category] || '';
    if (cat) parts.push(cat + ':');
    parts.push(name);
    if (product.price) parts.push('— السعر: ' + fmtPrice(product.price));
    parts.push('| متوفر في صيدلية ph.neurobin العراق.');
    parts.push('توصيل سريع لجميع المحافظات.');
    return parts.join(' ').slice(0, 300);
  }

  /* ── 6. Hook into openQuickView ─────────────────────────── */
  function hookQuickView() {
    var orig = window.openQuickView;
    if (typeof orig !== 'function' || orig.__seoPatched) return;

    window.openQuickView = function (productId) {
      orig.apply(this, arguments);

      // Wait for products array to be available
      setTimeout(function () {
        var products = window.products || [];
        var p = products.find(function (x) { return x.id === productId; });
        if (!p) return;

        var title = 'ph.neurobin — ' + (p.nameAr || p.name);
        var desc  = buildProductDesc(p);
        var img   = p.image || LOGO_URL;
        var url   = BASE_URL + '?product=' + encodeURIComponent(productId);

        updateMeta({ title: title, desc: desc, img: img, url: url, price: String(p.price || '') });
        setProductLD(p);

        // Update URL hash for shareability (without page reload)
        try {
          window.history.replaceState(
            { productId: productId },
            '',
            '/Neurobin/?product=' + encodeURIComponent(productId)
          );
        } catch(e) {}
      }, 120);
    };
    window.openQuickView.__seoPatched = true;
  }

  /* ── 7. Hook into closeQuickView — restore defaults ────── */
  function hookCloseQuickView() {
    var orig = window.closeQuickView;
    if (typeof orig !== 'function' || orig.__seoPatched) return;

    window.closeQuickView = function () {
      orig.apply(this, arguments);
      updateMeta({});
      removeProductLD();
      try {
        window.history.replaceState({}, '', '/Neurobin/');
      } catch(e) {}
    };
    window.closeQuickView.__seoPatched = true;
  }

  /* ── 8. Handle product URL on page load ─────────────────── */
  function handleProductURL() {
    var params = new URLSearchParams(window.location.search);
    var productId = params.get('product');
    if (!productId) return;

    // Wait for products to load then open quick view
    var attempts = 0;
    var interval = setInterval(function () {
      attempts++;
      var products = window.products || [];
      if (products.length > 0 || attempts > 30) {
        clearInterval(interval);
        if (products.length > 0 && typeof window.openQuickView === 'function') {
          setTimeout(function () {
            window.openQuickView(productId);
          }, 800);
        }
      }
    }, 300);
  }

  /* ── 9. Category filter → update title dynamically ─────── */
  function hookFilterProducts() {
    var orig = window.filterProducts;
    if (typeof orig !== 'function' || orig.__seoPatched) return;

    var catNames = {
      all:       'جميع المنتجات',
      medicines: 'أدوية',
      skincare:  'عناية بالبشرة',
      makeup:    'مكياج',
      devices:   'أجهزة طبية',
      perfumes:  'عطور',
      bundles:   'العروض والباقات'
    };

    window.filterProducts = function (e, category) {
      orig.apply(this, arguments);
      var catName = catNames[category] || category;
      if (category === 'all') {
        document.title = DEF_TITLE;
      } else {
        document.title = catName + ' — ph.neurobin | صيدلية العراق';
      }
    };
    window.filterProducts.__seoPatched = true;
  }

  /* ── 10. Apply hooks ──────────────────────────────────────── */
  function applyHooks() {
    hookQuickView();
    hookCloseQuickView();
    hookFilterProducts();
  }

  /* ── 11. Ensure og:image:alt and twitter:image:alt exist ── */
  function ensureImageAltMeta() {
    getOrCreate('property', 'og:image:alt').setAttribute('content', 'صيدلية ph.neurobin — العراق');
    getOrCreate('property', 'og:image:width').setAttribute('content', '1200');
    getOrCreate('property', 'og:image:height').setAttribute('content', '630');
    getOrCreate('property', 'og:image:type').setAttribute('content', 'image/jpeg');
    getOrCreate('property', 'og:updated_time').setAttribute('content', Math.floor(Date.now()/1000).toString());
    getOrCreate('name', 'twitter:image:alt').setAttribute('content', 'صيدلية ph.neurobin — العراق');
    getOrCreate('name', 'twitter:site').setAttribute('content', '@phneurobin');
    getOrCreate('name', 'rating').setAttribute('content', 'safe for all');
    getOrCreate('name', 'revisit-after').setAttribute('content', '7 days');
  }

  /* ── 12. Init ─────────────────────────────────────────────── */
  function init() {
    ensureImageAltMeta();
    setTimeout(applyHooks, 600);
    handleProductURL();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('load', function () {
    setTimeout(applyHooks, 300);
  });

})();
