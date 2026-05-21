'use strict';

/**
 * ═══════════════════════════════════════════════════════════════
 * ADMIN.JS IMPROVEMENTS & ENHANCEMENTS
 * تحسينات وإصلاحات للملف الأصلي
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// 1. AUDIT LOGGING & MONITORING
// ═══════════════════════════════════════════════════════════════

/**
 * تسجيل العمليات لأغراض الأمان والمراقبة
 */
const AuditLog = {
  logs: [],
  maxLogs: 100,
  
  /**
   * تسجيل عملية
   */
  record(action, data, status = 'success', severity = 'info') {
    const log = {
      timestamp: new Date().toISOString(),
      action,
      status,
      severity,
      userId: this.getCurrentUserId(),
      userAgent: navigator.userAgent.substring(0, 100),
      ipHint: 'client-side', // IP يتطلب backend
      dataHash: this.hashData(data)
    };
    
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) this.logs.pop();
    
    // محفوظ محلي
    try {
      localStorage.setItem('adminAuditLogs', JSON.stringify(this.logs.slice(0, 20)));
    } catch (e) {
      console.warn('Audit log storage error:', e.message);
    }
    
    // يجب إرسال الأحداث الحرجة للخادم
    if (severity === 'critical' || severity === 'warning') {
      this.sendToServer(log);
    }
  },
  
  getCurrentUserId() {
    // استخرج معرّف المستخدم من الجلسة
    return 'admin-' + (Date.now() % 10000);
  },
  
  hashData(data) {
    // بصمة بسيطة للبيانات (بدلاً من التفاصيل الكاملة)
    const str = JSON.stringify(data).substring(0, 100);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  },
  
  sendToServer(log) {
    // TODO: أرسل للخادم للتدقيق الشامل
    console.log('🔔 Audit event to server:', log.action, log.severity);
  },
  
  getSummary() {
    return {
      total: this.logs.length,
      errors: this.logs.filter(l => l.status === 'failed').length,
      warnings: this.logs.filter(l => l.severity === 'warning').length
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// 2. IMPROVED STORAGE MANAGEMENT
// معالجة أفضل لـ LocalStorage
// ═══════════════════════════════════════════════════════════════

const StorageManager = {
  /**
   * حفظ آمن مع معالجة الأخطاء
   */
  setItem(key, value, maxRetries = 2) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          // امسح البيانات القديمة
          this.clearOldData();
          retries++;
        } else {
          console.error(`Storage error for key "${key}":`, e.message);
          return false;
        }
      }
    }
    return false;
  },
  
  /**
   * إزالة البيانات غير الضرورية
   */
  clearOldData() {
    const keysToClean = [
      'phHistoricalVisitors',
      'adminNotifications',
      'adminAuditLogs'
    ];
    
    for (const key of keysToClean) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(data) && data.length > 50) {
          localStorage.setItem(key, JSON.stringify(data.slice(0, 25)));
        }
      } catch (e) {
        // تجاهل الأخطاء
      }
    }
  },
  
  /**
   * قراءة آمنة
   */
  getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn(`Storage read error for key "${key}":`, e.message);
      return defaultValue;
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 3. INPUT VALIDATION WITH CONSTRAINTS
// تحسين التحقق من البيانات المدخلة
// ═══════════════════════════════════════════════════════════════

const InputValidator = {
  /**
   * التحقق من المخزون
   */
  validateStock(stock, min = 0, max = 99999) {
    const num = parseInt(stock, 10);
    if (isNaN(num)) {
      throw new Error('قيمة المخزون يجب أن تكون رقماً');
    }
    if (num < min || num > max) {
      throw new Error(`المخزون يجب أن يكون بين ${min} و ${max}`);
    }
    return num;
  },
  
  /**
   * التحقق من السعر
   */
  validatePrice(price, min = 0, max = 999999999) {
    const num = parseFloat(price);
    if (isNaN(num)) {
      throw new Error('السعر يجب أن يكون رقماً');
    }
    if (num < min) {
      throw new Error('السعر لا يمكن أن يكون سالباً');
    }
    if (num > max) {
      throw new Error(`السعر يتجاوز الحد الأقصى: ${max}`);
    }
    return num;
  },
  
  /**
   * التحقق من اسم المنتج
   */
  validateProductName(name, minLength = 2, maxLength = 200) {
    name = String(name || '').trim();
    if (name.length < minLength || name.length > maxLength) {
      throw new Error(`الاسم يجب أن يكون بين ${minLength} و ${maxLength} حرف`);
    }
    return name;
  }
};

// ═══════════════════════════════════════════════════════════════
// 4. DEBOUNCE & THROTTLE UTILITIES
// تحسين الأداء بتقليل عدد الاستدعاءات
// ═══════════════════════════════════════════════════════════════

const PerformanceUtils = {
  /**
   * Debounce: تأخير التنفيذ حتى يتوقف المستخدم
   */
  debounce(func, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  },
  
  /**
   * Throttle: تنفيذ مرة واحدة في فترة زمنية معينة
   */
  throttle(func, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// ═══════════════════════════════════════════════════════════════
// 5. ERROR HANDLER WITH RECOVERY
// معالج أخطاء محسّنة
// ═══════════════════════════════════════════════════════════════

const ErrorHandler = {
  /**
   * معالج آمن للعمليات الحساسة
   */
  async tryCatch(operation, fallback = null) {
    try {
      return await operation();
    } catch (error) {
      AuditLog.record(
        'operation_failed',
        { error: error.message },
        'failed',
        'warning'
      );
      console.error('Operation error:', error);
      return fallback;
    }
  },
  
  /**
   * معالج شامل مع إعادة المحاولة
   */
  async retryWithBackoff(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 6. SESSION SECURITY IMPROVEMENTS
// تحسينات أمان الجلسة
// ═══════════════════════════════════════════════════════════════

const SessionSecurity = {
  // تخزين الرموز في الذاكرة فقط (أكثر أماناً من sessionStorage)
  inMemoryTokens: new Map(),
  
  /**
   * تخزين آمن للرموز الحساسة
   */
  storeToken(key, token) {
    this.inMemoryTokens.set(key, {
      value: token,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 ساعة
    });
  },
  
  /**
   * استرجاع الرمز مع التحقق من الصلاحية
   */
  getToken(key) {
    const entry = this.inMemoryTokens.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.inMemoryTokens.delete(key);
      return null;
    }
    
    return entry.value;
  },
  
  /**
   * إزالة جميع الرموز عند تسجيل الخروج
   */
  clearAllTokens() {
    this.inMemoryTokens.clear();
  }
};

// ═══════════════════════════════════════════════════════════════
// 7. REMOVED DUPLICATE FUNCTIONS
// حذف الدوال المكررة
// ═══════════════════════════════════════════════════════════════

/**
 * ملاحظة: تم حذف الدوال المكررة التالية من الملف الأصلي:
 * 
 * ❌ generateCSRFToken() - السطر 199
 *    ✅ استخدم CSRFProtection._gen() بدلاً منها
 * 
 * ❌ checkRateLimit(), recordAttempt(), resetAttempts()
 *    ✅ استخدم getLoginAttempts(), recordFailedLogin() بدلاً منها
 * 
 * ❌ verifyOrigin() - لا تُستخدم
 *    ✅ يمكن استخدام CORS على الخادم بدلاً منها
 */

// ═══════════════════════════════════════════════════════════════
// 8. LEGACY PASSWORD HASH HANDLING
// معالجة تجزئة كلمات المرور القديمة
// ═══════════════════════════════════════════════════════════════

const LegacyHashHandler = {
  /**
   * التحقق من التجزئة القديمة (SHA-256)
   * ملاحظة: يتطلب مكتبة crypto-js
   */
  async migrateLegacyPassword(currentPassword, legacyHash) {
    try {
      // التحقق أولاً باستخدام الطريقة القديمة
      if (typeof CryptoJS !== 'undefined') {
        const inputHash = CryptoJS.SHA256(currentPassword).toString();
        if (inputHash === legacyHash) {
          AuditLog.record(
            'legacy_password_detected',
            { userId: 'admin' },
            'success',
            'warning'
          );
          return true;
        }
      }
      return false;
    } catch (error) {
      AuditLog.record(
        'legacy_hash_error',
        { error: error.message },
        'failed',
        'critical'
      );
      throw error;
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 9. DATA EXPORT WITH SANITIZATION
// تصدير البيانات بشكل آمن
// ═══════════════════════════════════════════════════════════════

const DataExporter = {
  /**
   * تصدير آمن للبيانات
   */
  exportDataSafely() {
    try {
      const data = {
        products: StorageManager.getItem('phProducts', []),
        orders: StorageManager.getItem('phOrders', []),
        comments: StorageManager.getItem('phComments', []),
        testimonials: StorageManager.getItem('phTestimonials', []),
        settings: StorageManager.getItem('phSettings', {}),
        features: StorageManager.getItem('phFeatures', []),
        exportedAt: new Date().toISOString(),
        auditSummary: AuditLog.getSummary()
      };
      
      // تجنب تصدير البيانات الحساسة
      delete data.settings?.adminPasswordHash;
      delete data.settings?.adminPasswordSalt;
      
      return data;
    } catch (error) {
      AuditLog.record(
        'export_failed',
        { error: error.message },
        'failed',
        'warning'
      );
      return null;
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// 10. INITIALIZATION
// تهيئة جميع الأنظمة
// ═══════════════════════════════════════════════════════════════

/**
 * استدعِ هذا عند بدء التطبيق
 */
function initializeImprovements() {
  console.log('🚀 Initializing Admin Improvements...');
  
  // تسجيل بدء البرنامج
  AuditLog.record('admin_initialized', {}, 'success', 'info');
  
  // تنظيف التخزين
  StorageManager.clearOldData();
  
  console.log('✅ Improvements initialized');
}

// تصدير الكائنات للاستخدام العام
if (typeof window !== 'undefined') {
  window.AdminImprovements = {
    AuditLog,
    StorageManager,
    InputValidator,
    PerformanceUtils,
    ErrorHandler,
    SessionSecurity,
    LegacyHashHandler,
    DataExporter,
    initializeImprovements
  };
}
