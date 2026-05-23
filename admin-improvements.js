'use strict';

// ═══════════════════════════════════════════════════════════════
// SessionSecurity — In-Memory Token Store (XSS-resistant)
// الرموز تُخزَّن في الذاكرة فقط — لا localStorage ولا sessionStorage
// ═══════════════════════════════════════════════════════════════
const SessionSecurity = (() => {
  const _store = new Map();

  return {
    storeToken(key, value) {
      _store.set(key, { value, timestamp: Date.now() });
    },
    getToken(key) {
      const item = _store.get(key);
      return item ? item.value : null;
    },
    hasToken(key) {
      return _store.has(key);
    },
    clearAllTokens() {
      _store.clear();
    }
  };
})();

// ═══════════════════════════════════════════════════════════════
// AdminImprovements — Security & Enhancement Initializer
// تحميل هذا الملف قبل admin.js
// ═══════════════════════════════════════════════════════════════

const AdminImprovements = (() => {

  // ── Private: HTTPS check ──────────────────────────────────────
  function _validateEnvironment() {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.warn('[AdminImprovements] ⚠️ يُنصح بتشغيل لوحة الإدارة عبر HTTPS فقط');
    }
  }

  // ── Private: CSRF token generation ────────────────────────────
  function _initCSRF() {
    if (typeof CSRFProtection !== 'undefined') {
      CSRFProtection.get();
      console.log('[AdminImprovements] ✅ CSRF token جاهز');
    }
  }

  // ── Private: Activity tracking bootstrap ──────────────────────
  function _initActivityTracking() {
    if (typeof updateActivity === 'function') {
      updateActivity();
      console.log('[AdminImprovements] ✅ Activity tracking مُهيَّأ');
    }
  }

  // ── Private: Seal global utilities (prevent tampering) ────────
  function _sealUtilities() {
    const targets = [
      typeof SecureSession    !== 'undefined' && SecureSession,
      typeof CSRFProtection   !== 'undefined' && CSRFProtection,
      typeof ErrorHandler     !== 'undefined' && ErrorHandler,
      typeof StorageManager   !== 'undefined' && StorageManager,
      typeof InputValidator   !== 'undefined' && InputValidator,
      typeof AuditLog         !== 'undefined' && AuditLog,
      typeof SessionSecurity  !== 'undefined' && SessionSecurity,
    ].filter(Boolean);

    targets.forEach(obj => {
      try { Object.seal(obj); } catch(_) {}
    });
    console.log('[AdminImprovements] ✅ Utilities sealed (' + targets.length + ')');
  }

  // ── Private: Console override in production ───────────────────
  function _suppressConsoleInProd() {
    const isDev = location.hostname === 'localhost' ||
                  location.hostname === '127.0.0.1' ||
                  location.hostname.endsWith('.local');
    if (!isDev) {
      const noop = () => {};
      ['debug', 'trace'].forEach(m => {
        try { console[m] = noop; } catch(_) {}
      });
      console.log('[AdminImprovements] ✅ Console debug suppressed (production)');
    }
  }

  // ── Private: Integrity marker ─────────────────────────────────
  function _setIntegrityMarker() {
    try { sessionStorage.setItem('_ai_init', Date.now().toString()); } catch(_) {}
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    /**
     * initializeImprovements()
     * استدعِ هذا أول شيء في DOMContentLoaded
     */
    initializeImprovements() {
      console.group('[AdminImprovements] 🔐 تهيئة الأمان...');
      try {
        _validateEnvironment();
        _initCSRF();
        _initActivityTracking();
        _sealUtilities();
        _suppressConsoleInProd();
        _setIntegrityMarker();
        console.log('[AdminImprovements] ✅ جميع التحسينات جاهزة');
      } catch(e) {
        console.error('[AdminImprovements] ❌ خطأ في التهيئة:', e);
      } finally {
        console.groupEnd();
      }
    },

    /**
     * PerformanceUtils — Debounce & Throttle
     * AdminImprovements.PerformanceUtils.debounce(fn, 500)
     */
    PerformanceUtils: {
      debounce(fn, delay) {
        if (delay === undefined) delay = 300;
        let timeout;
        return (...args) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => fn(...args), delay);
        };
      },
      throttle(fn, limit) {
        if (limit === undefined) limit = 200;
        let lastCall = 0;
        return function(...args) {
          const now = Date.now();
          if (now - lastCall >= limit) {
            lastCall = now;
            return fn(...args);
          }
        };
      }
    },

    /**
     * DataExporter — Safe Export (strips sensitive fields)
     * AdminImprovements.DataExporter.exportDataSafely()
     */
    DataExporter: {
      exportDataSafely() {
        try {
          const raw = {
            products:     JSON.parse(localStorage.getItem('phProducts')    || '[]'),
            orders:       JSON.parse(localStorage.getItem('phOrders')      || '[]'),
            comments:     JSON.parse(localStorage.getItem('phComments')    || '[]'),
            settings:     JSON.parse(localStorage.getItem('phSettings')    || '{}'),
            features:     JSON.parse(localStorage.getItem('phFeatures')    || '[]'),
            testimonials: JSON.parse(localStorage.getItem('phTestimonials')|| '[]'),
          };
          // Strip sensitive keys
          const SENSITIVE = ['adminPasswordHash','adminPasswordSalt','adminPasswordIterations',
                             'adminRememberToken','adminSessionToken','_csrf_v2','csrfToken'];
          SENSITIVE.forEach(k => delete raw[k]);
          // Add export metadata
          raw._exportedAt  = new Date().toISOString();
          raw._exportedBy  = 'AdminImprovements.DataExporter';
          return raw;
        } catch(e) {
          console.error('[DataExporter] exportDataSafely error:', e);
          return null;
        }
      }
    },

    /**
     * isReady() — تحقق من اكتمال التهيئة
     */
    isReady() {
      return sessionStorage.getItem('_ai_init') !== null;
    },

    /**
     * getVersion()
     */
    getVersion() {
      return '2.1.0';
    }
  };
})();


// ── إضافة البكجات كقسم كامل في الأدمن ─────────────────────────────────────
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {

      // 1. أضف "بكجات" إلى ADMIN_CAT_DEFS (صور الأقسام)
      if (typeof ADMIN_CAT_DEFS !== 'undefined' &&
          !ADMIN_CAT_DEFS.find(function(c) { return c.key === 'packages'; })) {
        ADMIN_CAT_DEFS.push({
          key: 'packages',
          label: '\u0628\u0643\u062c\u0627\u062a',
          icon: 'fa-gift',
          bg: 'bg-amber-50',
          iconColor: 'text-amber-600'
        });
      }

      // 2. أضف تبويب "بكجات" في فلتر المنتجات (الأدمن)
      var dentalBtn = document.querySelector('[onclick*="filterProductsAdmin(\'dental\')"]');
      if (dentalBtn && !document.querySelector('[data-pkg-filter]')) {
        var pkgBtn = document.createElement('button');
        pkgBtn.setAttribute('onclick', "filterProductsAdmin('packages')");
        pkgBtn.className = dentalBtn.className;
        pkgBtn.setAttribute('data-pkg-filter', '1');
        pkgBtn.innerHTML = '\uD83C\uDF81 \u0628\u0643\u062c\u0627\u062a';
        dentalBtn.insertAdjacentElement('afterend', pkgBtn);
      }

      // 3. أضف "بكجات" إلى select التصنيف في نموذج المنتج
      var catSel = document.getElementById('productCategory');
      if (catSel && !catSel.querySelector('option[value="packages"]')) {
        var opt = document.createElement('option');
        opt.value = 'packages';
        opt.textContent = '\uD83C\uDF81 \u0628\u0643\u062c\u0627\u062a';
        catSel.appendChild(opt);
      }

      // 4. إضافة "بكجات" إلى catLabels وcatColors في admin renderProductsList
      if (typeof catLabels !== 'undefined') catLabels['packages'] = '\u0628\u0643\u062c\u0627\u062a';
    }, 400);
  });
})();
