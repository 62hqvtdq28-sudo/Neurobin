'use strict';

// ═══════════════════════════════════════
// SEC-006 FIX: Clickjacking Prevention
// ═══════════════════════════════════════
(function preventClickjacking() {
  'use strict';
  if (window.self !== window.top) {
    try { window.top.location.href = window.self.location.href; }
    catch(e) {
      document.body.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;';
      document.body.textContent = '⛔ خطأ أمني: لا يمكن تشغيل هذه الصفحة داخل إطار مدمج.';
    }
  }
})();

// ═══════════════════════════════════════
// SEC-002 FIX: Secure session wrapper
// ═══════════════════════════════════════
const SecureSession = {
  set(k,v){ try{sessionStorage.setItem(k,typeof v==='object'?JSON.stringify(v):String(v));}catch(e){} },
  get(k){ try{const v=sessionStorage.getItem(k);try{return JSON.parse(v);}catch{return v;}}catch(e){return null;} },
  remove(k){ try{sessionStorage.removeItem(k);}catch(e){} },
  clearSensitive(){ ['adminSessionToken','adminLastActivity','_csrf_v2'].forEach(k=>sessionStorage.removeItem(k)); }
};

// ═══════════════════════════════════════
// SEC-004 FIX: Crypto-strength CSRF token
// ═══════════════════════════════════════
const CSRFProtection = {
  _key: '_csrf_v2',
  _gen(){ const b=new Uint8Array(32);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,'0')).join(''); },
  get(){ let t=sessionStorage.getItem(this._key);if(!t){t=this._gen();sessionStorage.setItem(this._key,t);}return t; },
  validate(p){ const s=sessionStorage.getItem(this._key);if(!s||!p||s.length!==p.length)return false;let d=0;for(let i=0;i<s.length;i++)d|=s.charCodeAt(i)^p.charCodeAt(i);return d===0; },
  rotate(){ const t=this._gen();sessionStorage.setItem(this._key,t);return t; }
};
CSRFProtection.get();

// ═══════════════════════════════════════════════════════════════
// UTILITY: ErrorHandler — Global Error Management
// ═══════════════════════════════════════════════════════════════
const ErrorHandler = {
  log(context, error, data) {
    if (data === undefined) data = {};
    if (typeof console !== 'undefined') {
      console.error('[' + context + ']', error, data);
    }
  },
  handle(context, error, userMessage) {
    this.log(context, error);
    var msg = userMessage || 'حدث خطأ، يرجى المحاولة مرة أخرى';
    if (typeof showToast === 'function') showToast(msg, 'error');
  },
  tryCatch(operation, fallback) {
    try {
      return operation();
    } catch(e) {
      this.handle('ErrorHandler.tryCatch', e);
      if (typeof fallback === 'function') return fallback(e);
    }
  },
  async retryWithBackoff(fn, retries, delay) {
    if (retries === undefined) retries = 3;
    if (delay === undefined) delay = 1000;
    var lastError;
    for (var attempt = 0; attempt < retries; attempt++) {
      try { return await fn(); }
      catch(e) {
        lastError = e;
        if (attempt < retries - 1)
          await new Promise(function(r) { setTimeout(r, delay * Math.pow(2, attempt)); });
      }
    }
    this.handle('ErrorHandler.retryWithBackoff', lastError);
    throw lastError;
  }
};

window.addEventListener('error', function(e) {
  ErrorHandler.log('GlobalError', e.error || e.message);
});
window.addEventListener('unhandledrejection', function(e) {
  ErrorHandler.log('UnhandledRejection', e.reason);
});

// ═══════════════════════════════════════════════════════════════
// UTILITY: StorageManager — Safe localStorage Wrapper
// ═══════════════════════════════════════════════════════════════
const StorageManager = {
  get(key, defaultValue) {
    if (defaultValue === undefined) defaultValue = null;
    try {
      var item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      try { return JSON.parse(item); } catch(e) { return item; }
    } catch(e) {
      ErrorHandler.log('StorageManager.get', e, { key: key });
      return defaultValue;
    }
  },
  setItem(key, value) {
    try {
      var serialized = (typeof value === 'object') ? JSON.stringify(value) : String(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch(e) {
      ErrorHandler.log('StorageManager.set', e, { key: key });
      if (e.name === 'QuotaExceededError') {
        if (typeof showToast === 'function')
          showToast('مساحة التخزين ممتلئة، يرجى حذف بعض البيانات', 'error');
      }
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); return true; }
    catch(e) { ErrorHandler.log('StorageManager.remove', e, { key: key }); return false; }
  },
  getItem(key, defaultValue) {
    return this.get(key, defaultValue);
  }
};

// ═══════════════════════════════════════════════════════════════
// UTILITY: InputValidator — Unified Input Validation
// ═══════════════════════════════════════════════════════════════
const InputValidator = {
  text(value, maxLength) {
    if (maxLength === undefined) maxLength = 500;
    if (!value) return '';
    var v = value.toString().trim();
    if (v.length > maxLength) v = v.substring(0, maxLength);
    v = v.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    v = v.replace(/javascript:/gi, '');
    v = v.replace(/on\w+\s*=/gi, '');
    return v;
  },
  validatePrice(value, min, max) {
    if (min === undefined) min = 0;
    if (max === undefined) max = 99999999;
    var num = parseInt(value);
    if (isNaN(num) || num < min || num > max)
      throw new Error('يرجى إدخال سعر صحيح (الحد: ' + min + '-' + max + ')');
    return num;
  },
  validateStock(value, min, max) {
    if (min === undefined) min = 0;
    if (max === undefined) max = 99999;
    if (value === '' || value === null || value === undefined) return undefined;
    var num = parseInt(value);
    if (isNaN(num) || num < min || num > max)
      throw new Error('يرجى إدخال كمية صحيحة (الحد: ' + min + '-' + max + ')');
    return num;
  },
  validateProductName(name, minLength, maxLength) {
    if (minLength === undefined) minLength = 2;
    if (maxLength === undefined) maxLength = 200;
    if (!name || typeof name !== 'string') throw new Error('يرجى إدخال اسم المنتج');
    var trimmed = name.trim();
    if (trimmed.length < minLength) throw new Error('اسم المنتج يجب أن يكون ' + minLength + ' أحرف على الأقل');
    if (trimmed.length > maxLength) throw new Error('اسم المنتج طويل جداً (الحد الأقصى: ' + maxLength + ')');
    return trimmed;
  },
  stock(value) {
    if (value === '' || value === null || value === undefined) return undefined;
    var num = parseInt(value);
    return isNaN(num) ? undefined : Math.max(0, num);
  },
  url(url) {
    if (!url) return '';
    try {
      var parsed = new URL(url);
      if (['http:', 'https:'].includes(parsed.protocol)) return escapeHTML(url);
    } catch(e) { /* invalid URL */ }
    return escapeHTML(url);
  },
  phone(phone) {
    if (!phone) return '';
    return escapeHTML(phone.replace(/[^\d+]/g, '').substring(0, 20));
  },
  rating(value, min, max) {
    if (min === undefined) min = 1;
    if (max === undefined) max = 5;
    var num = parseInt(value);
    if (isNaN(num)) return min;
    return Math.min(max, Math.max(min, num));
  }
};

// ═══════════════════════════════════════════════════════════════
// UTILITY: AuditLog — Comprehensive Operation Logging
// ═══════════════════════════════════════════════════════════════
const AuditLog = {
  _key: 'adminAuditLog',
  _stats: { total: 0, errors: 0, warnings: 0 },
  record(action, data, status, severity) {
    if (data === undefined) data = {};
    if (status === undefined) status = 'info';
    if (severity === undefined) severity = 'info';
    try {
      var entries = StorageManager.get(this._key, []) || [];
      entries.unshift({
        action: action,
        data: data,
        status: status,
        severity: severity,
        timestamp: new Date().toISOString()
      });
      if (entries.length > 200) entries.splice(200);
      StorageManager.setItem(this._key, entries);
      // Update in-memory stats
      this._stats.total++;
      if (status === 'failed' || severity === 'critical') this._stats.errors++;
      if (severity === 'warning') this._stats.warnings++;
      // Auto-forward warning/critical to server
      if ((severity === 'warning' || severity === 'critical') && typeof logAction === 'function') {
        logAction(action, data, status);
      }
    } catch(e) { /* audit log must never break the app */ }
  },
  getSummary() {
    return { total: this._stats.total, errors: this._stats.errors, warnings: this._stats.warnings };
  },
  get(limit) {
    if (limit === undefined) limit = 50;
    return (StorageManager.get(this._key, []) || []).slice(0, limit);
  },
  clear() { StorageManager.remove(this._key); }
};

// ═══════════════════════════════════════════════════════════════
// UTILITY: Debounce / Throttle — Performance Helpers
// ═══════════════════════════════════════════════════════════════
const debounce = (fn, delay = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

function throttle(fn, limit) {
  if (limit === undefined) limit = 200;
  var lastCall = 0;
  return function() {
    var now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn.apply(this, arguments);
    }
  };
}



// =====================================================
// SECURE PASSWORD HASHING - PBKDF2 Implementation
// =====================================================

// Security configuration (OWASP recommended minimums)
const PBKDF2_ITERATIONS = 310000; // OWASP recommended for PBKDF2-SHA256 as of 2024
const HASH_BITS = 256;
const SALT_BYTES = 32;

// Convert array buffer to base64 string
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 string to array buffer
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate cryptographically secure random salt
function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

// Hash password using PBKDF2 with SHA-256
async function hashPassword(password, existingSalt = null) {
  const encoder = new TextEncoder();
  const salt = existingSalt ? new Uint8Array(existingSalt) : generateSalt();

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    HASH_BITS
  );

  return {
    hash: arrayBufferToBase64(derivedBits),
    salt: arrayBufferToBase64(salt.buffer),
    iterations: PBKDF2_ITERATIONS
  };
}

// Verify password against stored hash
async function verifyPassword(password, storedHash, storedSalt) {
  const saltArrayBuffer = base64ToArrayBuffer(storedSalt);
  const result = await hashPassword(password, new Uint8Array(saltArrayBuffer));
  return result.hash === storedHash;
}

// Check if stored hash is legacy (SHA-256 without salt)
function isLegacyHash(storedHash) {
  // Legacy hashes are 64 characters (SHA-256 hex output)
  return storedHash && storedHash.length === 64 && /^[a-f0-9]+$/.test(storedHash);
}

// =====================================================
// CSRF PROTECTION - Token Based Security
// =====================================================

// Session Configuration - Adjustable timeout
const SESSION_CONFIG = {
  // Session timeout in milliseconds (default: 24 hours)
  // Options: 30min=1800000, 1hour=3600000, 4hours=14400000, 8hours=28800000, 24hours=86400000
  TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours (increased from 8 hours)

  // Sliding expiration - reset timer on activity
  ENABLE_SLIDING_EXPIRATION: true,

  // Activity check interval in milliseconds
  ACTIVITY_CHECK_INTERVAL: 60000, // Check every minute
};

// Track last user activity
let lastActivityTime = Date.now();

// Update activity timestamp on user interaction
function updateActivity() {
  lastActivityTime = Date.now();

  // Reset session timer on activity if sliding expiration is enabled
  if (SESSION_CONFIG.ENABLE_SLIDING_EXPIRATION) {
    sessionStorage.setItem('adminLastActivity', lastActivityTime.toString());
  }
}

// Setup activity listeners
document.addEventListener('click', updateActivity);
document.addEventListener('keypress', updateActivity);
document.addEventListener('scroll', updateActivity);
document.addEventListener('mousemove', updateActivity);

// Check and refresh session on activity
function refreshSessionOnActivity() {
  if (SESSION_CONFIG.ENABLE_SLIDING_EXPIRATION) {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
    if (isLoggedIn) {
      const lastActivity = parseInt(sessionStorage.getItem('adminLastActivity') || '0');
      const now = Date.now();

      // If user was active within the timeout period, extend session
      if (now - lastActivity < SESSION_CONFIG.TIMEOUT_MS) {
        sessionStorage.setItem('adminLoginTime', now.toString());
      }
    }
  }
}

// Start activity monitoring
setInterval(refreshSessionOnActivity, SESSION_CONFIG.ACTIVITY_CHECK_INTERVAL);

// Generate secure CSRF token
function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Get or create CSRF token
function getCSRFToken() {
  let token = sessionStorage.getItem('csrfToken');
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem('csrfToken', token);
  }
  return token;
}

// Validate CSRF token for operations
function validateCSRFToken(token) {
  const storedToken = sessionStorage.getItem('csrfToken');
  return token === storedToken;
}

// Verify request origin (for additional protection)
function verifyOrigin() {
  const origin = window.location.origin;
  const referer = document.referrer;

  // If there's a referer, verify it's from the same origin
  if (referer && !referer.startsWith(origin)) {
    return false;
  }
  return true;
}

// Secure operation wrapper - validates before execution
function secureOperation(operationCallback, operationName = 'operation') {
  return async function(...args) {
    // Check if user is authenticated first
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
    if (!isLoggedIn) {
      showToast('يرجى تسجيل الدخول أولاً', 'error');
      return false;
    }

    // Verify session token exists
    const sessionToken = sessionStorage.getItem('adminSessionToken');
    if (!sessionToken) {
      showToast('انتهت صلاحية الجلسة', 'error');
      logout();
      return false;
    }

    // Execute the operation
    try {
      return await operationCallback.apply(this, args);
    } catch (error) {
      console.error(`${operationName} error:`, error);
      showToast('حدث خطأ أثناء العملية', 'error');
      return false;
    }
  };
}

// Initialize CSRF token on page load
document.addEventListener('DOMContentLoaded', function() {
  // Generate CSRF token for the session
  getCSRFToken();

  // Initialize activity tracking
  updateActivity();
});

// =====================================================
// GLOBAL VARIABLES
// =====================================================
let visitorsChart = null;
let categoryChart = null;
let ordersChart = null;
// currentCommentFilter, currentOrderFilter, selectedCommentId are declared in orders.js (var)
let chartInitialized = false;
let currentDateRange = 'today';
let isDarkMode = false;
let notifications = [];

// Security: Brute Force Protection
let loginAttempts = 0;
let lastLoginAttempt = 0;
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 600000; // 10 minutes
const ATTEMPT_WINDOW = 900000; // 15 minutes

// Rate Limiting helper
function checkRateLimit() {
  const now = Date.now();
  if (now - lastLoginAttempt > 30000) {
    loginAttempts = 0;
  }
  return loginAttempts < MAX_LOGIN_ATTEMPTS;
}

function recordAttempt() {
  loginAttempts++;
  lastLoginAttempt = Date.now();
}

function resetAttempts() {
  loginAttempts = 0;
  lastLoginAttempt = 0;
}

// Security: JSON Parsing with Validation
function safeJSONParse(jsonString, defaultValue = null) {
  try {
    const parsed = JSON.parse(jsonString);
    if (defaultValue !== null && typeof defaultValue === 'object') {
      if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
        return defaultValue;
      }
      if (!Array.isArray(defaultValue) && typeof parsed !== 'object') {
        return defaultValue;
      }
    }
    return parsed;
  } catch (e) {
    // Silently handle invalid JSON - no console output in production
    return defaultValue;
  }
}

// Security: Generate secure random ID
function generateSecureId() {
  // Use crypto API for better randomness
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for older browsers - less secure
    for (let i = 0; i < 16; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getLoginAttempts() {
  const stored = localStorage.getItem('adminLoginAttempts');
  return safeJSONParse(stored, { count: 0, firstAttempt: 0 }) || { count: 0, firstAttempt: 0 };
}

function saveLoginAttempts(data) {
  localStorage.setItem('adminLoginAttempts', JSON.stringify(data));
}

function isAccountLocked() {
  const attempts = getLoginAttempts();
  const now = Date.now();

  // Check if lockout period has passed
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    return true;
  }

  // Reset attempts if window has passed
  if (attempts.firstAttempt && (now - attempts.firstAttempt) > ATTEMPT_WINDOW) {
    saveLoginAttempts({ count: 0, firstAttempt: 0, lockedUntil: 0 });
    return false;
  }

  return false;
}

function getRemainingLockoutTime() {
  const attempts = getLoginAttempts();
  if (!attempts.lockedUntil) return 0;
  const remaining = attempts.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
}

function recordFailedLogin() {
  let attempts = getLoginAttempts();
  const now = Date.now();

  // Reset if window has passed
  if (attempts.firstAttempt && (now - attempts.firstAttempt) > ATTEMPT_WINDOW) {
    attempts = { count: 0, firstAttempt: 0, lockedUntil: 0 };
  }

  attempts.count++;
  if (!attempts.firstAttempt) {
    attempts.firstAttempt = now;
  }

  // Lock after MAX_LOGIN_ATTEMPTS failed attempts
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = now + LOCKOUT_DURATION;
  }

  saveLoginAttempts(attempts);
}

function recordSuccessfulLogin() {
  saveLoginAttempts({ count: 0, firstAttempt: 0, lockedUntil: 0 });
  loginAttempts = 0;
}

// Security: XSS Protection - HTML Sanitization
function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeHTML(str) {
  if (!str) return '';
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'/]/g, char => entities[char]);
}

// Security: Number validation
function validateNumber(value, min = 0, max = Infinity) {
  const num = parseInt(value);
  if (isNaN(num) || num < min || num > max) return false;
  return true;
}

// Security: Validate order status
function isValidOrderStatus(status) {
  const validStatuses = ['new','pending','preparing','progress','on_the_way','delivered','cancelled'];
  return validStatuses.includes(status);
}

// Security: Input Validation
function validateInput(input, maxLength = 500) {
  if (!input) return '';
  input = input.toString().trim();
  if (input.length > maxLength) {
    input = input.substring(0, maxLength);
  }
  // Remove potentially dangerous patterns
  input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  input = input.replace(/javascript:/gi, '');
  input = input.replace(/on\w+\s*=/gi, '');
  return input;
}


// توليد توكن فريد وتسجيله في Supabase
async function registerDeviceToken() {
  try {
    var token = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : generateSecureId();

    sessionStorage.setItem('adminDeviceToken', token);

    // Write to Supabase site_settings using available client
    var client = window.supabaseClient
      || (typeof supabase !== 'undefined' && typeof supabase.from === 'function' ? supabase : null);

    if (client) {
      await client.from('site_settings')
        .upsert({ key: 'admin_device_token', value: token }, { onConflict: 'key' });
    } else if (window.SupaDB && window.SupaDB.Settings && window.SupaDB.Settings.set) {
      await window.SupaDB.Settings.set('admin_device_token', token);
    }

    /* DeviceToken registered */
  } catch(e) {
    /* DeviceToken registration failed */
  }
}

// فحص إذا كان هذا الجهاز لا يزال هو الجهاز النشط
async function checkDeviceToken() {
  var localToken = sessionStorage.getItem('adminDeviceToken');
  // إذا لم يكن مسجلاً دخول، تجاهل
  if (!localToken) return;

  try {
    var client = window.supabaseClient
      || (typeof supabase !== 'undefined' && typeof supabase.from === 'function' ? supabase : null);

    var storedToken = null;

    if (client) {
      var result = await client.from('site_settings')
        .select('value')
        .eq('key', 'admin_device_token')
        .single();
      storedToken = result.data ? result.data.value : null;
    } else if (window.SupaDB && window.SupaDB.Settings && window.SupaDB.Settings.get) {
      storedToken = await window.SupaDB.Settings.get('admin_device_token');
    }

    if (storedToken && storedToken !== localToken) {
      // جهاز آخر سجّل دخولاً — أنهِ هذه الجلسة
      /* Session conflict detected */
      stopDeviceCheck();
      if (typeof showToast === 'function') {
        showToast('⚠️ تم تسجيل الدخول من جهاز آخر. تم إنهاء جلستك.', 'error');
      }
      setTimeout(function() {
        sessionStorage.removeItem('adminDeviceToken');
        logout(false);
      }, 2500);
    }
  } catch(e) {
    // فشل الاتصال — لا نُسجّل الخروج (قد يكون انقطاع مؤقت)
    /* DeviceToken check skipped */
  }
}

function startDeviceCheck() {
  stopDeviceCheck();
  // فحص كل 20 ثانية
  _deviceCheckInterval = setInterval(checkDeviceToken, 20000);
}

function stopDeviceCheck() {
  if (_deviceCheckInterval) {
    clearInterval(_deviceCheckInterval);
    _deviceCheckInterval = null;
  }
}


// ═══════════════════════════════════════════════════════════════
// DEVICE BINDING — ربط الجهاز المصرح به
// عند أول تسجيل دخول: يُسجَّل هذا الجهاز في Supabase.
// أي جهاز آخر يحاول الدخول بنفس الكلمة السرية → يُحظر فوراً.
// ═══════════════════════════════════════════════════════════════

async function checkAndBindDevice() {
  // 1. Get or create local device ID for this browser
  var localDeviceId = localStorage.getItem('adminDeviceId');

  var client = window.supabaseClient
    || (window.SupaDB && window.SupaDB._db ? window.SupaDB._db : null)
    || (typeof supabase !== 'undefined' && typeof supabase.from === 'function' ? supabase : null);

  if (!client) {
    // Cannot verify device — block for security
    return { allowed: false, reason: 'تعذّر التحقق من الجهاز. تأكد من اتصالك بالإنترنت.' };
  }

  try {
    // 2. Read stored allowed device from Supabase
    var result = await client
      .from('site_settings')
      .select('value')
      .eq('key', 'admin_allowed_device')
      .maybeSingle();

    var storedDeviceId = result.data ? result.data.value : null;

    if (!storedDeviceId) {
      // 3a. First time setup — register THIS device
      if (!localDeviceId) {
        localDeviceId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : generateSecureId();
        localStorage.setItem('adminDeviceId', localDeviceId);
      }
      // Use upsert to avoid silent failure if row already exists with empty value.
      // Anon-key RLS should restrict overwrites via Supabase policies.
      await client.from('site_settings')
        .upsert({ key: 'admin_allowed_device', value: localDeviceId }, { onConflict: 'key' });

      console.log('[DeviceBind] This device has been registered as the admin device.');
      return { allowed: true, firstSetup: true };
    }

    // 3b. Device already registered — check if this is the allowed device
    if (!localDeviceId || localDeviceId !== storedDeviceId) {
      console.warn('[DeviceBind] Unauthorized device. Access blocked.');
      return {
        allowed: false,
        reason: '🚫 هذا الجهاز غير مصرح له بالدخول.

لوحة التحكم مرتبطة بجهاز آخر فقط.'
      };
    }

    // 3c. Same device — allow
    return { allowed: true };

  } catch(e) {
    console.error('[DeviceBind] Error:', e.message);
    // On network error, allow (don't lock out the real admin on bad connection)
    return { allowed: true };
  }
}

// ═══════════════════════════════════════════════════════════════
// safeSanitize — DOMPurify wrapper with fallback
// ═══════════════════════════════════════════════════════════════
function safeSanitize(html) {
  if (typeof html !== 'string') return '';
  if (typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function') {
    return DOMPurify.sanitize(html);
  }
  // Fallback: escape all HTML tags (blocks XSS, but loses formatting)
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
