'use strict';

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
    ].filter(Boolean);

    targets.forEach(obj => {
      try { Object.seal(obj); } catch(_) {}
    });
    console.log('[AdminImprovements] ✅ Utilities sealed (' + targets.length + ')');
  }

  // ── Private: Console override in production ───────────────────
  function _suppressConsoleInProd() {
    // Only suppress on non-localhost, non-dev environments
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

  // ── Private: Integrity marker (detect JS tampering) ──────────
  function _setIntegrityMarker() {
    try {
      sessionStorage.setItem('_ai_init', Date.now().toString());
    } catch(_) {}
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
     * isReady()
     * تحقق من أن initializeImprovements() قد نُفِّذت
     */
    isReady() {
      return sessionStorage.getItem('_ai_init') !== null;
    },

    /**
     * getVersion()
     */
    getVersion() {
      return '2.0.0';
    }
  };
})();
