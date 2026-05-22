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

tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F6F7F4',
          100: '#E8EAD8',
          200: '#D1D5B1',
          300: '#AABF89',
          400: '#83A962',
          500: '#5C933B',
          600: '#3D6B2D',
          700: '#2D5016',
          800: '#254012',
          900: '#1E350F',
        },
        cream: '#FDFCF8',
        gold: '#F59E0B',
      },
      fontFamily: { heading: ['Cairo', 'sans-serif'] }
    }
  }
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
  const validStatuses = ['new', 'progress', 'delivered', 'cancelled'];
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

// Automation System - Auto-check for new items
function initAutomationSystem() {
  // Check for new orders every 30 seconds
  setInterval(checkNewOrders, 30000);
  // Check for new comments every 60 seconds
  setInterval(checkNewComments, 60000);
  // Check for low stock products every 5 minutes
  setInterval(checkLowStock, 300000);
  // Initial checks
  checkNewOrders();
  checkNewComments();
  checkLowStock();
}

// Check for new orders and create notification
function checkNewOrders() {
  const orders = safeJSONParse(localStorage.getItem('phOrders'), []) || [];
  const lastCheck = localStorage.getItem('lastOrderCheck') || '1970-01-01T00:00:00.000Z';
  const newOrders = orders.filter(o => new Date(o.date) > new Date(lastCheck));

  if (newOrders.length > 0) {
    addNotification({
      type: 'order',
      title: 'طلب جديد!',
      message: `لديك ${newOrders.length} طلب جديد${newOrders.length === 1 ? '' : ''}`,
      icon: 'shopping-bag',
      timestamp: new Date().toISOString(),
      read: false
    });
    updateOrdersBadge();
  }

  localStorage.setItem('lastOrderCheck', new Date().toISOString());
}

// Check for new comments and create notification
function checkNewComments() {
  const comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  const lastCheck = localStorage.getItem('lastCommentCheck') || '1970-01-01T00:00:00.000Z';
  const newComments = comments.filter(c => new Date(c.date) > new Date(lastCheck));

  if (newComments.length > 0) {
    addNotification({
      type: 'comment',
      title: 'رسالة جديدة!',
      message: `لديك ${newComments.length} رسالة جديدة`,
      icon: 'message-square',
      timestamp: new Date().toISOString(),
      read: false
    });
    updateCommentsBadge();
  }

  localStorage.setItem('lastCommentCheck', new Date().toISOString());
}

// Check for low stock products
function checkLowStock() {
  const products = safeJSONParse(localStorage.getItem('phProducts'), []) || [];
  const lowStock = products.filter(p => p.stock !== undefined && p.stock > 0 && p.stock <= 5);

  if (lowStock.length > 0) {
    addNotification({
      type: 'warning',
      title: 'تنبيه المخزون',
      message: `${lowStock.length} منتج - كمية محدودة`,
      icon: 'alert-triangle',
      timestamp: new Date().toISOString(),
      read: false
    });
  }
}

// Notification Management
function addNotification(notification) {
  notifications.unshift(notification);
  if (notifications.length > 50) notifications.pop(); // Keep max 50
  saveNotifications();
  updateNotificationBadge();
  updateNotificationPanel();
  showToast(notification.title, 'warning');
}

function saveNotifications() {
  localStorage.setItem('adminNotifications', JSON.stringify(notifications));
}

function loadNotifications() {
  const stored = localStorage.getItem('adminNotifications');
  notifications = safeJSONParse(stored, []) || [];
  updateNotificationBadge();
}

function updateNotificationBadge() {
  const badge = document.getElementById('notificationBadge');
  const unread = notifications.filter(n => !n.read).length;

  if (unread > 0) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function toggleNotifications() {
  const panel = document.getElementById('notificationPanel');
  panel.classList.toggle('active');

  if (panel.classList.contains('active')) {
    // Mark all as read
    notifications.forEach(n => n.read = true);
    saveNotifications();
    updateNotificationBadge();
  }
}

function updateNotificationPanel() {
  const list = document.getElementById('notificationList');
  const noNotif = document.getElementById('noNotifications');

  if (notifications.length === 0) {
    list.classList.add('hidden');
    noNotif.classList.remove('hidden');
    return;
  }

  list.classList.remove('hidden');
  noNotif.classList.add('hidden');

  const typeIcons = { order: 'shopping-bag', comment: 'message-square', warning: 'alert-triangle' };
  const typeColors = { order: 'bg-green-100 text-green-600', comment: 'bg-blue-100 text-blue-600', warning: 'bg-yellow-100 text-yellow-600' };

  let html = '';
  notifications.slice(0, 20).forEach((n, i) => {
    const timeAgo = getTimeAgo(new Date(n.timestamp));
    html += `<div class="notification-item ${n.read ? 'opacity-60' : ''}">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-lg ${typeColors[n.type] || 'bg-brand-100 text-brand-600'} flex items-center justify-center flex-shrink-0">
          <i data-lucide="${typeIcons[n.type] || 'bell'}" class="w-5 h-5"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-semibold text-sm text-brand-900">${n.title}</p>
            ${!n.read ? '<span class="notification-unread"></span>' : ''}
          </div>
          <p class="text-sm text-brand-600 mt-1">${n.message}</p>
          <p class="text-xs text-brand-400 mt-1">${timeAgo}</p>
        </div>
      </div>
    </div>`;
  });

  list.innerHTML = DOMPurify.sanitize(html);
  lucide.createIcons();
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'الآن';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

// Dark Mode
function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('dark-mode', isDarkMode);
  localStorage.setItem('adminDarkMode', isDarkMode);

  const icon = document.getElementById('darkModeIcon');
  icon.setAttribute('data-lucide', isDarkMode ? 'sun' : 'moon');
  lucide.createIcons();
}

// Success Animation
function showSuccessAnimation(message, showConfetti) {
  const overlay = document.getElementById('successOverlay');
  const msgEl = document.getElementById('successMessage');
  msgEl.textContent = message || 'تم الحفظ بنجاح!';
  overlay.style.display = 'flex';

  if (showConfetti) {
    createConfetti();
  }

  setTimeout(function() {
    overlay.style.display = 'none';
  }, 1500);
}

// Create Confetti Effect
function createConfetti() {
  const container = document.getElementById('confettiContainer');
  const colors = ['#2D5016', '#5C933B', '#10B981', '#F59E0B', '#EC4899', '#3B82F6'];

  for (var i = 0; i < 50; i++) {
    var piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.top = '60%';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
    container.appendChild(piece);
  }

  setTimeout(function() {
    container.innerHTML = DOMPurify.sanitize('');
  }, 2000);
}

// Loading Button State
function setButtonLoading(buttonId, isLoading) {
  var btn = document.getElementById(buttonId);
  if (!btn) return;

  if (isLoading) {
    btn.classList.add('btn-loading-state');
    btn.disabled = true;
  } else {
    btn.classList.remove('btn-loading-state');
    btn.disabled = false;
  }
}

function loadDarkModePreference() {
  const stored = localStorage.getItem('adminDarkMode');
  isDarkMode = stored === 'true';
  document.body.classList.toggle('dark-mode', isDarkMode);

  const icon = document.getElementById('darkModeIcon');
  if (icon) {
    icon.setAttribute('data-lucide', isDarkMode ? 'sun' : 'moon');
  }
}

const dateRanges = {
  today: { days: 1, label: 'اليوم', periodLabel: 'يوم واحد' },
  yesterday: { days: 1, label: 'الأمس', periodLabel: 'يوم واحد' },
  week: { days: 7, label: 'آخر 7 أيام', periodLabel: '7 أيام' },
  month: { days: 30, label: 'آخر 30 يوم', periodLabel: '30 يوم' },
  year: { days: 365, label: 'آخر 365 يوم', periodLabel: '365 يوم' }
};

// Mobile Menu
function toggleMobileMenu() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('menuOverlay');
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('active');
  // ✅ Mobile Fix: sidebar must always be above overlay for clicks to work
  var isOpen = sidebar.classList.contains('mobile-open');
  sidebar.style.zIndex = isOpen ? '9999' : '';
  overlay.style.zIndex  = isOpen ? '9998' : '';
}
function closeMobileMenu() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('menuOverlay').classList.remove('active');
}

// Password visibility toggle
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(inputId + 'Icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons();
}

// Password strength indicator (updated for 12-char minimum)
function updatePasswordStrength(password) {
  const bar = document.getElementById('passwordStrengthBar');
  const text = document.getElementById('passwordStrengthText');

  let strength = 0;
  if (password.length >= 12) strength++;
  if (password.length >= 16) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

  bar.className = 'password-strength';
  if (strength <= 1) {
    bar.classList.add('weak');
    text.textContent = 'قوة كلمة المرور: ضعيفة';
    text.className = 'text-xs text-red-500 mt-1';
  } else if (strength === 2 || strength === 3) {
    bar.classList.add('medium');
    text.textContent = 'قوة كلمة المرور: متوسطة';
    text.className = 'text-xs text-yellow-500 mt-1';
  } else if (strength >= 4) {
    bar.classList.add('strong');
    text.textContent = 'قوة كلمة المرور: قوية';
    text.className = 'text-xs text-green-500 mt-1';
  }
}

// Update current time
function updateCurrentTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('currentTime').textContent = timeStr;
}

document.addEventListener('DOMContentLoaded', function() {
  AdminImprovements.initializeImprovements(); // 👈 أول شيء — تهيئة الأمان
  lucide.createIcons();
  loadDarkModePreference();
  checkAuth();
  setInterval(updateCurrentTime, 60000);
  updateCurrentTime();
});

async function checkAuth() {
  // Security: Check for account lockout
  if (isAccountLocked()) {
    const remainingTime = getRemainingLockoutTime();
    showLoginLockedMessage(remainingTime);
    return;
  }

  const rememberToken = localStorage.getItem('adminRememberToken');
  const storedPasswordHash = localStorage.getItem('adminPasswordHash');
  const storedSalt = localStorage.getItem('adminPasswordSalt');

  // If no password is set, user must set one via login form - just show login
  if (!storedPasswordHash) {
    // First time setup - show login form, user will set password via handleLogin
    // Clear any stale session
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminSessionToken');
    return;
  }

  if (rememberToken) {
    try {
      const tokenData = safeJSONParse(rememberToken, {}) || {};
      const now = new Date().getTime();
      const tokenAge = now - tokenData.timestamp;
      const sevenDays = 7 * 24 * 60 * 60 * 1000; // ✅ Extended: 7 days (was 24h)

      if (tokenAge <= sevenDays) {
        // Verify the stored hash matches
        const currentHash = localStorage.getItem('adminPasswordHash');

        // For new format, verify both hash and salt match
        // For legacy format (no salt), just check hash
        const hashesMatch = tokenData.passwordHash === currentHash;
        const saltsMatch = tokenData.salt === storedSalt || (!tokenData.salt && !storedSalt);

        if (hashesMatch && saltsMatch) {
          // Security: Regenerate session on "remember me" login for session freshness
          sessionStorage.removeItem('adminLoggedIn');
          sessionStorage.removeItem('adminLoginTime');
          sessionStorage.removeItem('adminSessionToken');
          sessionStorage.setItem('adminLoggedIn', 'true');
          sessionStorage.setItem('adminLoginTime', now.toString());
          var newSessionToken = generateSecureId();
          sessionStorage.setItem('adminSessionToken', newSessionToken);
          // Update remember token with new session token
          tokenData.sessionToken = newSessionToken;
          localStorage.setItem('adminRememberToken', JSON.stringify(tokenData));
          showDashboard();
          return;
        }
      }
      localStorage.removeItem('adminRememberToken');
    } catch (e) {
      localStorage.removeItem('adminRememberToken');
    }
  }

  const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
  if (isLoggedIn) {
    // Verify session token exists (additional security check)
    const sessionToken = sessionStorage.getItem('adminSessionToken');
    if (!sessionToken) {
      logout();
      return;
    }

    // Verify session hasn't expired (using configurable timeout from SESSION_CONFIG)
    const loginTime = parseInt(sessionStorage.getItem('adminLoginTime') || '0');
    const lastActivity = parseInt(sessionStorage.getItem('adminLastActivity') || loginTime.toString());
    const now = Date.now();

    // Calculate effective session time considering activity
    const sessionAge = SESSION_CONFIG.ENABLE_SLIDING_EXPIRATION
      ? now - lastActivity  // Sliding: use last activity
      : now - loginTime;   // Fixed: use login time

    if (sessionAge > SESSION_CONFIG.TIMEOUT_MS) {
      logout();
      return;
    }

    // Update login time to current time (sliding expiration)
    if (SESSION_CONFIG.ENABLE_SLIDING_EXPIRATION) {
      sessionStorage.setItem('adminLoginTime', now.toString());
      sessionStorage.setItem('adminLastActivity', now.toString());
    }

    showDashboard();
  }
}

function showLoginLockedMessage(minutes) {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  if (loginError) {
    loginError.textContent = 'تم قفل الحساب مؤقتاً. يرجى المحاولة بعد ' + minutes + ' دقيقة.';
    loginError.className = 'text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg mb-4';
    loginError.classList.remove('hidden');
  }
  const passwordInput = document.getElementById('loginPassword');
  if (passwordInput) {
    passwordInput.disabled = true;
  }
}

async function handleLogin(e) {
  e.preventDefault();

  // Security: Check for account lockout
  if (isAccountLocked()) {
    const remainingTime = getRemainingLockoutTime();
    showLoginLockedMessage(remainingTime);
    return;
  }

  const password = document.getElementById('loginPassword').value;
  const storedPasswordHash = localStorage.getItem('adminPasswordHash');
  const storedSalt = localStorage.getItem('adminPasswordSalt');

  // First time setup - save password hash for security
  if (!storedPasswordHash) {
    // Minimum password length increased for better security (12 chars instead of 8)
    if (password.length < 12) {
      document.getElementById('loginError').textContent = 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل';
      document.getElementById('loginError').classList.remove('hidden');
      setTimeout(function() { document.getElementById('loginError').classList.add('hidden'); }, 3000);
      return;
    }

    // Store password using secure PBKDF2 with unique salt
    const hashResult = await hashPassword(password);
    localStorage.setItem('adminPasswordHash', hashResult.hash);
    localStorage.setItem('adminPasswordSalt', hashResult.salt);
    localStorage.setItem('adminPasswordIterations', hashResult.iterations.toString());
    recordSuccessfulLogin();

    // Security: Regenerate session ID to prevent session fixation
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminLoginTime');
    sessionStorage.setItem('adminLoggedIn', 'true');
    sessionStorage.setItem('adminLoginTime', Date.now().toString());
    // Security: Generate session token for additional validation
    var sessionToken = generateSecureId();
    sessionStorage.setItem('adminSessionToken', sessionToken);

    // Store remember token with hash only (not actual password)
    const rememberToken = { timestamp: new Date().getTime(), passwordHash: hashResult.hash, salt: hashResult.salt, sessionToken: sessionToken };
    localStorage.setItem('adminRememberToken', JSON.stringify(rememberToken));
    showDashboard();
    return;
  }

  // Check for legacy SHA-256 hash (no salt) and handle migration
  if (isLegacyHash(storedPasswordHash) && !storedSalt) {
    // Legacy password detected - verify using old method first
    // Since we can't reverse SHA-256, we need to ask user to re-login with new secure hash
    // For backward compatibility, verify against legacy hash first
    // Then migrate to new format if successful
    const inputHash = sha256(password);
    if (inputHash === storedPasswordHash) {
      // Successful login with legacy hash - migrate to secure PBKDF2
      recordSuccessfulLogin();

      // Migrate to new secure format
      const hashResult = await hashPassword(password);
      localStorage.setItem('adminPasswordHash', hashResult.hash);
      localStorage.setItem('adminPasswordSalt', hashResult.salt);
      localStorage.setItem('adminPasswordIterations', hashResult.iterations.toString());

      // Security: Regenerate session ID
      sessionStorage.removeItem('adminLoggedIn');
      sessionStorage.removeItem('adminLoginTime');
      sessionStorage.setItem('adminLoggedIn', 'true');
      sessionStorage.setItem('adminLoginTime', Date.now().toString());
      var sessionToken = generateSecureId();
      sessionStorage.setItem('adminSessionToken', sessionToken);

      // Store remember token with new hash format
      const rememberToken = { timestamp: new Date().getTime(), passwordHash: hashResult.hash, salt: hashResult.salt, sessionToken: sessionToken };
      localStorage.setItem('adminRememberToken', JSON.stringify(rememberToken));
      showDashboard();
      return;
    } else {
      // Legacy hash verification failed
      recordFailedLogin();
      document.getElementById('loginError').classList.remove('hidden');
      document.getElementById('loginPassword').value = '';
      const attempts = getLoginAttempts();
      const remaining = MAX_LOGIN_ATTEMPTS - attempts.count;
      if (remaining > 0) {
        document.getElementById('loginError').textContent = 'كلمة المرور غير صحيحة. المتطلبات: ' + remaining + ' محاولات متبقية.';
      } else {
        document.getElementById('loginError').textContent = 'تم تجاوز عدد المحاولات. يرجى الانتظار 5 دقائق.';
      }
      setTimeout(function() { document.getElementById('loginError').classList.add('hidden'); }, 5000);
      return;
    }
  }

  // Verify password against stored PBKDF2 hash
  try {
    const isValid = await verifyPassword(password, storedPasswordHash, storedSalt);
    if (isValid) {
      recordSuccessfulLogin();

      // Security: Regenerate session ID to prevent session fixation
      sessionStorage.removeItem('adminLoggedIn');
      sessionStorage.removeItem('adminLoginTime');
      sessionStorage.setItem('adminLoggedIn', 'true');
      sessionStorage.setItem('adminLoginTime', Date.now().toString());
      // Security: Generate session token for additional validation
      var sessionToken = generateSecureId();
      sessionStorage.setItem('adminSessionToken', sessionToken);

      // Store remember token with hash only (not actual password)
      const rememberToken = { timestamp: new Date().getTime(), passwordHash: storedPasswordHash, salt: storedSalt, sessionToken: sessionToken };
      localStorage.setItem('adminRememberToken', JSON.stringify(rememberToken));
      showDashboard();
    } else {
      recordFailedLogin();
      document.getElementById('loginError').classList.remove('hidden');
      document.getElementById('loginPassword').value = '';

      const attempts = getLoginAttempts();
      const remaining = MAX_LOGIN_ATTEMPTS - attempts.count;

      if (remaining > 0) {
        document.getElementById('loginError').textContent = 'كلمة المرور غير صحيحة. المتطلبات: ' + remaining + ' محاولات متبقية.';
      } else {
        document.getElementById('loginError').textContent = 'تم تجاوز عدد المحاولات. يرجى الانتظار 5 دقائق.';
      }

      setTimeout(function() { document.getElementById('loginError').classList.add('hidden'); }, 5000);
    }
  } catch (error) {
    console.error('Password verification error:', error);
    document.getElementById('loginError').textContent = 'خطأ في التحقق من كلمة المرور';
    document.getElementById('loginError').classList.remove('hidden');
    setTimeout(function() { document.getElementById('loginError').classList.add('hidden'); }, 5000);
  }
}

function logout(clearRemember) {
  sessionStorage.removeItem('adminLoggedIn');
  sessionStorage.removeItem('adminSessionToken');
  sessionStorage.removeItem('adminDeviceToken');
  stopDeviceCheck();
  if (clearRemember === true) localStorage.removeItem('adminRememberToken');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('adminDashboard').classList.add('hidden');
  closeMobileMenu();
}

async function showDashboard() {
  // ── Device Binding Check ──
  var deviceCheck = await checkAndBindDevice();
  if (!deviceCheck.allowed) {
    var errEl = document.getElementById('loginError');
    if (errEl) {
      errEl.textContent = deviceCheck.reason || 'هذا الجهاز غير مصرح له بالدخول';
      errEl.classList.remove('hidden');
    } else {
      alert(deviceCheck.reason || 'هذا الجهاز غير مصرح له بالدخول');
    }
    return; // Block access
  }

  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminDashboard').classList.remove('hidden');
  loadAllData();
  lucide.createIcons();
  // Single-device monitoring (keeps existing session monitor)
  registerDeviceToken().then(function() { startDeviceCheck(); });
}

function showSection(section) {
  // Add exit animation to current section
  var currentSection = document.querySelector('.section-content:not(.hidden)');
  if (currentSection) {
    currentSection.classList.add('page-transition-exit');
  }

  document.querySelectorAll('.section-content').forEach(function(s) { s.classList.add('hidden'); s.classList.remove('page-transition-enter'); });
  var newSection = document.getElementById('section-' + section);
  newSection.classList.remove('hidden');
  newSection.classList.add('page-transition-enter');

  document.querySelectorAll('.sidebar-link').forEach(function(l) { l.classList.remove('active'); });
  var sectionBtn = document.querySelector('[data-section="' + section + '"]');
  if (sectionBtn) sectionBtn.classList.add('active');

  if (section === 'stats' && !chartInitialized) {
    setTimeout(function() {
      initVisitorsChart();
      initCategoryChart();
      initOrdersChart();
      chartInitialized = true;
    }, 100);
  }

  if (section === 'stats') updateStatsForDateRange();
  if (section === 'comments') loadComments();
  if (section === 'orders') loadOrders();
  if (section === 'products') loadProducts();
  if (section === 'features') loadFeatures();
  if (section === 'testimonials') loadTestimonials();
  if (section === 'categories') loadCategoryImages();

  closeMobileMenu();
  lucide.createIcons();
}

function loadAllData() {
  loadSettings();
  loadFeatures();
  loadProducts();
  loadTestimonials();
  updateCommentsBadge();
  updateOrdersBadge();
}

// Stats Functions
function setDateRange(range) {
  currentDateRange = range;
  document.querySelectorAll('.date-btn').forEach(function(btn) {
    btn.classList.remove('active', 'bg-brand-700', 'text-white');
    btn.classList.add('bg-brand-100', 'text-brand-700');
  });
  var activeBtn = document.querySelector('[data-range="' + range + '"]');
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-brand-700', 'text-white');
    activeBtn.classList.remove('bg-brand-100', 'text-brand-700');
  }
  document.getElementById('dateRangeText').textContent = getDateRangeText(range);
  updateStatsForDateRange();
  if (visitorsChart) initVisitorsChart();
  lucide.createIcons();
}

function getDateRangeText(range) {
  var today = new Date();
  var rangeConfig = dateRanges[range];

  if (range === 'today') return 'عرض إحصائيات اليوم: ' + formatDate(today);
  else if (range === 'yesterday') {
    var yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    return 'عرض إحصائيات الأمس: ' + formatDate(yesterday);
  } else {
    var startDate = new Date(today); startDate.setDate(startDate.getDate() - rangeConfig.days + 1);
    return 'عرض إحصائيات ' + rangeConfig.label + ' (من ' + formatDate(startDate) + ' إلى ' + formatDate(today) + ')';
  }
}

function formatDate(date) { return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }); }

function getDateRangeDates() {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var endDate = new Date(today); endDate.setHours(23, 59, 59, 999);
  var startDate = new Date(today);

  switch (currentDateRange) {
    case 'today': break;
    case 'yesterday': startDate.setDate(startDate.getDate() - 1); endDate.setDate(endDate.getDate() - 1); endDate.setHours(23, 59, 59, 999); break;
    case 'week': startDate.setDate(startDate.getDate() - 6); break;
    case 'month': startDate.setDate(startDate.getDate() - 29); break;
    case 'year': startDate.setDate(startDate.getDate() - 364); break;
  }
  return { startDate: startDate, endDate: endDate };
}

function getPreviousPeriodDates() {
  var currentRange = getDateRangeDates();
  var days = dateRanges[currentDateRange].days;
  var prevEndDate = new Date(currentRange.startDate); prevEndDate.setDate(prevEndDate.getDate() - 1); prevEndDate.setHours(23, 59, 59, 999);
  var prevStartDate = new Date(prevEndDate); prevStartDate.setDate(prevStartDate.getDate() - days + 1); prevStartDate.setHours(0, 0, 0, 0);
  return { startDate: prevStartDate, endDate: prevEndDate };
}

function getVisitorsForDateRange(startDate, endDate) {
  var historicalData = safeJSONParse(localStorage.getItem('phHistoricalVisitors'), {}) || {};
  var stats = safeJSONParse(localStorage.getItem('phStats'), {}) || {};
  var total = 0;
  var dailyData = [];
  var currentDate = new Date(startDate);
  var today = new Date(); today.setHours(0, 0, 0, 0);

  while (currentDate <= endDate) {
    var dateKey = currentDate.toISOString().split('T')[0];
    var dayVisitors = 0;
    if (currentDate.getTime() === today.getTime()) dayVisitors = stats.todayVisitors || 0;
    else if (historicalData[dateKey]) dayVisitors = historicalData[dateKey].visitors || 0;

    dailyData.push({ date: new Date(currentDate), dateKey: dateKey, visitors: dayVisitors });
    total += dayVisitors;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return { total: total, dailyData: dailyData };
}

function updateStatsForDateRange() {
  var dateRange = getDateRangeDates();
  var prevDateRange = getPreviousPeriodDates();
  var currentData = getVisitorsForDateRange(dateRange.startDate, dateRange.endDate);
  var previousData = getVisitorsForDateRange(prevDateRange.startDate, prevDateRange.endDate);

  var avgVisitors = currentData.total > 0 ? Math.round(currentData.total / dateRanges[currentDateRange].days) : 0;
  var maxVisitors = Math.max.apply(Math, currentData.dailyData.map(function(d) { return d.visitors; })) || 0;
  var changePercent = previousData.total > 0 ? Math.round(((currentData.total - previousData.total) / previousData.total) * 100) : 0;
  var changeIcon = changePercent >= 0 ? 'trending-up' : 'trending-down';
  var changeColor = changePercent >= 0 ? 'text-green-600' : 'text-red-600';

  var orders = safeJSONParse(localStorage.getItem('phOrders'), []) || [];
  var periodOrders = orders.filter(function(o) {
    var orderDate = new Date(o.date);
    return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
  });

  var html = '';

  html += '<div class="stat-card bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 border-r-4 border-brand-500 animate-fade-in">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg"><i data-lucide="users" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl text-brand-900 mb-1">' + currentData.total + '</h3>' +
    '<p class="text-brand-600 text-xs sm:text-sm">إجمالي الزوار</p>' +
    '<p class="text-brand-400 text-xs mt-1">(' + dateRanges[currentDateRange].periodLabel + ')</p></div>';

  html += '<div class="stat-card bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 border-r-4 border-brand-600 animate-fade-in" style="animation-delay: 0.1s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-400 to-brand-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg"><i data-lucide="bar-chart-2" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl text-brand-900 mb-1">' + avgVisitors + '</h3>' +
    '<p class="text-brand-600 text-xs sm:text-sm">متوسط الزوار يومياً</p></div>';

  var newOrders = periodOrders.filter(function(o) { return o.status !== 'delivered' && o.status !== 'cancelled'; }).length;
  html += '<div class="stat-card bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 border-r-4 border-gold animate-fade-in" style="animation-delay: 0.2s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-gold to-yellow-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg"><i data-lucide="shopping-bag" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl text-brand-900 mb-1">' + periodOrders.length + '</h3>' +
    '<p class="text-brand-600 text-xs sm:text-sm">إجمالي الطلبات</p>' +
    '<p class="text-gold text-xs font-semibold mt-1">' + newOrders + ' جديدة</p></div>';

  html += '<div class="stat-card bg-gradient-to-br from-brand-700 to-brand-800 rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 animate-fade-in" style="animation-delay: 0.3s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center"><i data-lucide="' + changeIcon + '" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl mb-1">' + (changePercent >= 0 ? '+' : '') + changePercent + '%</h3>' +
    '<p class="text-white/80 text-xs sm:text-sm">مقارنة بالفترة السابقة</p></div>';

  document.getElementById('statsCardsContainer').innerHTML = DOMPurify.sanitize(html);

  var comparisonHtml = '';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="text-2xl sm:text-3xl font-bold text-brand-700 mb-1 sm:mb-2">' + currentData.total + '</div><div class="text-xs sm:text-sm text-brand-600">الزوار الحالي</div><div class="text-xs text-brand-400 mt-1">(' + dateRanges[currentDateRange].label + ')</div></div>';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="text-2xl sm:text-3xl font-bold text-brand-500 mb-1 sm:mb-2">' + previousData.total + '</div><div class="text-xs sm:text-sm text-brand-600">الزوار السابق</div><div class="text-xs text-brand-400 mt-1">(نفس المدة)</div></div>';
  var diff = currentData.total - previousData.total;
  var diffColor = diff >= 0 ? 'text-green-600' : 'text-red-600';
  var diffIcon = diff >= 0 ? 'arrow-up' : 'arrow-down';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="' + diffColor + ' text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 flex items-center justify-center gap-2"><i data-lucide="' + diffIcon + '" class="w-5 h-5 sm:w-6"></i>' + Math.abs(diff) + '</div><div class="text-xs sm:text-sm text-brand-600">الفرق</div><div class="' + diffColor + ' text-xs mt-1">' + (diff >= 0 ? '+' : '') + changePercent + '%</div></div>';

  document.getElementById('comparisonContent').innerHTML = DOMPurify.sanitize(comparisonHtml);
  document.getElementById('chartChangeValue').textContent = (changePercent >= 0 ? '+' : '') + changePercent + '%';
  document.getElementById('chartTotalChange').className = 'flex items-center gap-2 text-xs sm:text-sm font-semibold ' + changeColor;

  renderDetailedStatsTable(currentData.dailyData);
  lucide.createIcons();
}

function renderDetailedStatsTable(dailyData) {
  var html = '<table class="w-full text-xs sm:text-sm"><thead><tr class="border-b border-brand-200"><th class="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">التاريخ</th><th class="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">الزوار</th><th class="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">النسبة</th></tr></thead><tbody>';
  var total = dailyData.reduce(function(sum, d) { return sum + d.visitors; }, 0);

  dailyData.forEach(function(day) {
    var percentage = total > 0 ? Math.round((day.visitors / total) * 100) : 0;
    var barWidth = percentage;
    html += '<tr class="border-b border-brand-100 hover:bg-brand-50"><td class="py-2 sm:py-3 px-2 sm:px-4 text-brand-700">' + formatDate(day.date) + '</td><td class="py-2 sm:py-3 px-2 sm:px-4 text-center font-semibold text-brand-900">' + day.visitors + '</td><td class="py-2 sm:py-3 px-2 sm:px-4"><div class="flex items-center gap-2"><div class="flex-1 bg-brand-100 rounded-full h-1.5 sm:h-2 overflow-hidden"><div class="progress-bar" style="width: ' + barWidth + '%"></div></div><span class="text-xs text-brand-600 w-10">' + percentage + '%</span></div></td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('detailedStatsTable').innerHTML = DOMPurify.sanitize(html);
}

function initVisitorsChart() {
  var ctx = document.getElementById('visitorsChart');
  if (!ctx) return;

  var dateRange = getDateRangeDates();
  var prevDateRange = getPreviousPeriodDates();
  var currentData = getVisitorsForDateRange(dateRange.startDate, dateRange.endDate);
  var previousData = getVisitorsForDateRange(prevDateRange.startDate, prevDateRange.endDate);

  var labels = currentData.dailyData.map(function(d) { return d.date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }); });
  var currentValues = currentData.dailyData.map(function(d) { return d.visitors; });
  var previousValues = previousData.dailyData.map(function(d) { return d.visitors; });

  if (visitorsChart) visitorsChart.destroy();

  visitorsChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'الفترة المحددة', data: currentValues, borderColor: '#5C933B', backgroundColor: 'rgba(92, 147, 59, 0.15)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: currentDateRange === 'today' || currentDateRange === 'yesterday' ? 6 : 3, pointBackgroundColor: '#5C933B', pointBorderColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 8 },
        { label: 'الفترة السابقة', data: previousValues, borderColor: '#D1D5B1', backgroundColor: 'rgba(209, 213, 177, 0.15)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#D1D5B1', pointBorderColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#2D5016', titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' }, padding: 12, cornerRadius: 8 } },
      scales: { x: { grid: { display: false }, ticks: { font: { family: 'Cairo' } }, y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Cairo' } }, beginAtZero: true } } }
    }
  });
}

function initCategoryChart() {
  var ctx = document.getElementById('categoryChart');
  if (!ctx) return;

  var products = safeJSONParse(localStorage.getItem('phProducts'), []) || [];
  var categories = { medicines: 0, skincare: 0, makeup: 0, devices: 0 };
  products.forEach(function(p) { if (categories.hasOwnProperty(p.category)) categories[p.category]++; });

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['أدوية', 'عناية بالبشرة', 'مكياج', 'أجهزة'],
      datasets: [{
        data: [categories.medicines, categories.skincare, categories.makeup, categories.devices],
        backgroundColor: ['#3B82F6', '#EC4899', '#8B5CF6', '#6B7280'],
        borderWidth: 0, hoverOffset: 10
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 12 }, padding: 15 } }, tooltip: { backgroundColor: '#2D5016', titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } } },
      cutout: '60%'
    }
  });
}

function initOrdersChart() {
  var ctx = document.getElementById('ordersChart');
  if (!ctx) return;

  var orders = safeJSONParse(localStorage.getItem('phOrders'), []) || [];
  var statusCounts = { new: 0, progress: 0, delivered: 0, cancelled: 0 };
  orders.forEach(function(o) { if (statusCounts.hasOwnProperty(o.status)) statusCounts[o.status]++; });

  if (ordersChart) ordersChart.destroy();

  ordersChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['جديدة', 'قيد التوصيل', 'تم التوصيل', 'ملغاة'],
      datasets: [{
        data: [statusCounts.new, statusCounts.progress, statusCounts.delivered, statusCounts.cancelled],
        backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#EF4444'],
        borderWidth: 0, hoverOffset: 10
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 12 }, padding: 15 } }, tooltip: { backgroundColor: '#2D5016', titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } } },
      cutout: '60%'
    }
  });
}

function resetTodayStats() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  var stats = safeJSONParse(localStorage.getItem('phStats'), {}) || {};
  stats.todayVisitors = 0;
  localStorage.setItem('phStats', JSON.stringify(stats));
  updateStatsForDateRange();
  showToast('تم إعادة تعيين إحصائيات اليوم');
}

function resetAllStats() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  if (!confirm('هل أنت متأكد؟ سيتم إعادة تعيين جميع الإحصائيات.')) return;
  localStorage.removeItem('phStats');
  localStorage.removeItem('phHistoricalVisitors');
  updateStatsForDateRange();
  showToast('تم إعادة تعيين جميع الإحصائيات');
}

function exportStats() {
  var historicalData = safeJSONParse(localStorage.getItem('phHistoricalVisitors'), {}) || {};
  var stats = safeJSONParse(localStorage.getItem('phStats'), {});
  var today = new Date().toISOString().split('T')[0];

  var data = [['التاريخ', 'الزوار']];
  for (var date in historicalData) {
    if (historicalData.hasOwnProperty(date)) {
      data.push([date, historicalData[date].visitors]);
    }
  }
  data.push(['اليوم (' + today + ')', stats.todayVisitors || 0]);

  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'الإحصائيات');
  XLSX.writeFile(wb, 'neurobin_stats_' + today + '.xlsx');
  showToast('تم تصدير الإحصائيات بنجاح');
}

function saveSettings() {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  var siteName = validateInput(document.getElementById('siteName').value, 100);
  var instagramUrl = validateURL(document.getElementById('instagramUrl').value);
  var whatsappNumber = validatePhone(document.getElementById('whatsappNumber').value);

  var settings = {
    siteName: siteName,
    instagramUrl: instagramUrl,
    whatsappNumber: whatsappNumber
  };
  localStorage.setItem('phSettings', JSON.stringify(settings));
  showToast('تم حفظ الإعدادات بنجاح', 'success');
}

// CSRF Protection helper: Check if user is authenticated
function isAuthenticated() {
  return sessionStorage.getItem('adminLoggedIn') === 'true' &&
         sessionStorage.getItem('adminSessionToken') !== null;
}

// Security: URL Validation
function validateURL(url) {
  if (!url) return '';
  try {
    var parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return escapeHTML(url);
    }
  } catch (e) {
    // If not a valid URL, escape it anyway
  }
  return escapeHTML(url);
}

// Security: Phone Number Validation
function validatePhone(phone) {
  if (!phone) return '';
  // Remove all non-digit characters except + at start
  var cleaned = phone.replace(/[^\d+]/g, '').substring(0, 20);
  return escapeHTML(cleaned);
}

async function changePassword() {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  var currentPassword = document.getElementById('currentPassword').value;
  var newPassword = document.getElementById('newPassword').value;
  var confirmPassword = document.getElementById('confirmPassword').value;

  if (!currentPassword) { showToast('يرجى إدخال كلمة المرور الحالية', 'error'); return; }
  if (!newPassword) { showToast('يرجى إدخال كلمة المرور الجديدة', 'error'); return; }
  // Minimum password length increased for better security (12 chars instead of 8)
  if (newPassword.length < 12) { showToast('كلمة المرور يجب أن تكون 12 حرفاً على الأقل', 'error'); return; }
  if (newPassword !== confirmPassword) { showToast('كلمة المرور الجديدة غير متطابقة', 'error'); return; }
  if (currentPassword === newPassword) { showToast('كلمة المرور الجديدة يجب أن تختلف عن الحالية', 'error'); return; }

  // Verify current password using secure PBKDF2 verification
  const storedPasswordHash = localStorage.getItem('adminPasswordHash');
  const storedSalt = localStorage.getItem('adminPasswordSalt');

  // Check for legacy hash format
  if (isLegacyHash(storedPasswordHash) && !storedSalt) {
    // Legacy format - verify using old SHA-256 method
    const currentPasswordHash = sha256(currentPassword);
    if (storedPasswordHash && currentPasswordHash !== storedPasswordHash) {
      showToast('كلمة المرور الحالية غير صحيحة', 'error');
      return;
    }
  } else {
    // New PBKDF2 format - verify using secure method
    try {
      const isValid = await verifyPassword(currentPassword, storedPasswordHash, storedSalt);
      if (!isValid) {
        showToast('كلمة المرور الحالية غير صحيحة', 'error');
        return;
      }
    } catch (error) {
      showToast('خطأ في التحقق من كلمة المرور', 'error');
      return;
    }
  }

  // Hash new password with PBKDF2 before storing
  const hashResult = await hashPassword(newPassword);
  localStorage.setItem('adminPasswordHash', hashResult.hash);
  localStorage.setItem('adminPasswordSalt', hashResult.salt);
  localStorage.setItem('adminPasswordIterations', hashResult.iterations.toString());

  // Update remember token with hashed password only
  const rememberToken = { timestamp: new Date().getTime(), passwordHash: hashResult.hash, salt: hashResult.salt };
  localStorage.setItem('adminRememberToken', JSON.stringify(rememberToken));

  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  document.getElementById('passwordStrengthBar').className = 'password-strength weak';
  document.getElementById('passwordStrengthText').textContent = 'قوة كلمة المرور: ضعيفة';
  document.getElementById('passwordStrengthText').className = 'text-xs text-brand-400 mt-1';

  showToast('تم تغيير كلمة المرور بنجاح', 'success');
}

function loadSettings() {
  var settings = safeJSONParse(localStorage.getItem('phSettings'), { siteName: 'ph.neurobin'}) || { siteName: 'ph.neurobin', instagramUrl: 'https://instagram.com/ph.neurobin', whatsappNumber: '9647870404967' };
  document.getElementById('siteName').value = escapeHTML(settings.siteName || '');
  document.getElementById('instagramUrl').value = escapeHTML(settings.instagramUrl || '');
  document.getElementById('whatsappNumber').value = escapeHTML(settings.whatsappNumber || '');
}

function loadFeatures() {
  var features = safeJSONParse(localStorage.getItem('phFeatures'), []) || [];
  renderFeaturesList(features);
}

function renderFeaturesList(features) {
  var container = document.getElementById('featuresList');
  if (features.length === 0) {
    container.innerHTML = DOMPurify.sanitize('<div class="text-center py-12 text-brand-400">لا توجد مميزات. أضف مميزة جديدة.</div>');
    return;
  }

  var html = '';
  features.forEach(function(f, i) {
    var safeIcon = escapeHTML(f.icon || 'shield-check');
    var safeTitle = escapeHTML(f.title || '');
    var safeDesc = escapeHTML(f.desc || '');
    html += '<div class="bg-white rounded-xl p-4 sm:p-6 border border-brand-100 animate-fade-in" style="animation-delay: ' + (i * 0.1) + 's">' +
      '<div class="flex items-start justify-between">' +
      '<div class="flex items-center gap-3">' +
      '<div class="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center"><i data-lucide="' + safeIcon + '" class="w-6 h-6 text-white"></i></div>' +
      '<div><h3 class="font-bold text-lg text-brand-900">' + safeTitle + '</h3><p class="text-brand-600 text-sm">' + safeDesc + '</p></div>' +
      '</div>' +
      '<div class="flex gap-2">' +
      '<button onclick="editFeature(' + f.id + ')" class="p-2 hover:bg-brand-100 rounded-lg transition-colors"><i data-lucide="edit" class="w-5 h-5 text-brand-600"></i></button>' +
      '<button onclick="deleteFeature(' + f.id + ')" class="p-2 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-5 h-5 text-red-500"></i></button>' +
      '</div></div>';
  });
  container.innerHTML = DOMPurify.sanitize(html);
  lucide.createIcons();
}

function openFeatureModal(id) {
  if (id) {
    var features = safeJSONParse(localStorage.getItem('phFeatures'), []) || [];
    var feature = features.find(function(f) { return f.id === id; });
    if (feature) {
      document.getElementById('featureModalTitle').textContent = 'تعديل ميزة';
      document.getElementById('featureId').value = id;
      document.getElementById('featureIcon').value = feature.icon;
      document.getElementById('featureTitle').value = feature.title;
      document.getElementById('featureDesc').value = feature.desc;
    }
  } else {
    document.getElementById('featureModalTitle').textContent = 'إضافة ميزة جديدة';
    document.getElementById('featureId').value = '';
    document.getElementById('featureIcon').value = 'shield-check';
    document.getElementById('featureTitle').value = '';
    document.getElementById('featureDesc').value = '';
  }
  document.getElementById('featureModal').classList.add('active');
  lucide.createIcons();
}

function closeFeatureModal() {
  document.getElementById('featureModal').classList.remove('active');
}

function editFeature(id) {
  openFeatureModal(id);
}

function saveFeature() {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  var title = document.getElementById('featureTitle').value.trim();
  var desc = document.getElementById('featureDesc').value.trim();

  if (!title) {
    showToast('يرجى إدخال عنوان الميزة', 'error');
    return;
  }

  var features = safeJSONParse(localStorage.getItem('phFeatures'), []) || [];
  var id = document.getElementById('featureId').value;

  if (id) {
    var index = features.findIndex(function(f) { return f.id === parseInt(id); });
    if (index > -1) {
      features[index].icon = document.getElementById('featureIcon').value;
      features[index].title = escapeHTML(title);
      features[index].desc = escapeHTML(desc);
    }
  } else {
    features.push({
      id: Date.now(),
      icon: document.getElementById('featureIcon').value,
      title: escapeHTML(title),
      desc: escapeHTML(desc)
    });
  }

  StorageManager.setItem('phFeatures', features);
  AuditLog.record(id ? 'feature_updated' : 'feature_created', { title: escapeHTML(title) });
  closeFeatureModal();
  loadFeatures();
  showSuccessAnimation('تم حفظ الميزة بنجاح!');
}

function deleteFeature(id) {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  if (!confirm('هل أنت متأكد من حذف هذه الميزة؟')) return;
  var features = StorageManager.get('phFeatures', []) || [];
  features = features.filter(function(f) { return f.id !== id; });
  StorageManager.setItem('phFeatures', features);
  AuditLog.record('feature_deleted', { id: id });
  loadFeatures();
  showToast('تم حذف الميزة', 'warning');
}

function loadProducts(filter) {
  const products = StorageManager.getItem('phProducts', []);
  var container = document.getElementById('productsList');

  var searchQuery = document.getElementById('productSearch') ? document.getElementById('productSearch').value.toLowerCase() : '';

  if (filter && filter !== 'all') {
    products = products.filter(function(p) { return p.category === filter; });
  }

  if (searchQuery) {
    products = products.filter(function(p) {
      return p.name.toLowerCase().includes(searchQuery) ||
             (p.description && p.description.toLowerCase().includes(searchQuery));
    });
  }

  if (products.length === 0) {
    container.innerHTML = DOMPurify.sanitize('<div class="col-span-full text-center py-12 text-brand-400">لا توجد منتجات</div>');
    return;
  }

  var html = '';
  var categoryLabels = { medicines: 'أدوية', skincare: 'عناية بالبشرة', makeup: 'مكياج', devices: 'أجهزة' };
  var categoryColors = { medicines: 'bg-blue-100 text-blue-700', skincare: 'bg-pink-100 text-pink-700', makeup: 'bg-purple-100 text-purple-700', devices: 'bg-gray-100 text-gray-700' };

  products.forEach(function(p, i) {
    var stockClass = p.stock > 5 ? 'text-green-600' : p.stock > 0 ? 'text-yellow-600' : 'text-red-600';
    var stockText = p.stock > 0 ? 'المخزون: ' + p.stock : 'غير متوفر';
    var stockDisplay = p.stock !== undefined ? '<p class="text-xs ' + stockClass + '">' + stockText + '</p>' : '';

    html += '<div class="product-card-admin animate-fade-in" style="animation-delay: ' + (i * 0.05) + 's" data-product-id="' + p.id + '">' +
      '<div class="p-4">' +
      '<div class="flex items-start justify-between mb-3">' +
      '<span class="category-badge ' + (categoryColors[p.category] || 'bg-brand-100 text-brand-700') + '">' + (categoryLabels[p.category] || escapeHTML(p.category)) + '</span>' +
      '<div class="flex gap-1">' +
      '<button onclick="toggleQuickEdit(' + p.id + ')" class="quick-action bg-brand-100 text-brand-600 hover:bg-brand-200 quick-edit-btn" title="تعديل سريع"><i data-lucide="edit-2" class="w-4 h-4"></i></button>' +
      '<button onclick="editProduct(' + p.id + ')" class="quick-action bg-blue-100 text-blue-600 hover:bg-blue-200" title="تعديل كامل"><i data-lucide="edit" class="w-4 h-4"></i></button>' +
      '<button onclick="deleteProduct(' + p.id + ')" class="quick-action bg-red-100 text-red-500 hover:bg-red-200"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
      '</div></div>' +

      // Normal View
      '<div id="product-view-' + p.id + '">' +
      '<h3 class="font-bold text-brand-900 mb-2">' + escapeHTML(p.name) + '</h3>' +
      '<p class="text-brand-600 text-sm mb-3">' + p.price.toLocaleString() + ' د.ع</p>' +
      stockDisplay +
      '</div>' +

      // Quick Edit View (Hidden by default)
      '<div id="product-edit-' + p.id + '" class="hidden mt-3 pt-3 border-t border-brand-200">' +
      '<div class="space-y-2">' +
      '<div>' +
      '<label class="text-xs text-brand-500 block mb-1">الاسم</label>' +
      '<input type="text" id="qe-name-' + p.id + '" class="quick-edit-input text-sm" value="' + escapeHTML(p.name) + '">' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div>' +
      '<label class="text-xs text-brand-500 block mb-1">السعر</label>' +
      '<input type="number" id="qe-price-' + p.id + '" class="quick-edit-input text-sm" value="' + p.price + '">' +
      '</div>' +
      '<div>' +
      '<label class="text-xs text-brand-500 block mb-1">المخزون</label>' +
      '<input type="number" id="qe-stock-' + p.id + '" class="quick-edit-input text-sm" value="' + (p.stock !== undefined ? p.stock : '') + '">' +
      '</div>' +
      '</div>' +
      '<div class="flex gap-2 mt-3">' +
      '<button onclick="saveQuickEdit(' + p.id + ')" class="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors">حفظ</button>' +
      '<button onclick="toggleQuickEdit(' + p.id + ')" class="px-3 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">إلغاء</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div></div>';
  });

  container.innerHTML = DOMPurify.sanitize(html);
  lucide.createIcons();
}

// Toggle Quick Edit Mode
function toggleQuickEdit(id) {
  var viewEl = document.getElementById('product-view-' + id);
  var editEl = document.getElementById('product-edit-' + id);
  var cardEl = document.querySelector('[data-product-id="' + id + '"]');

  if (editEl.classList.contains('hidden')) {
    // Switch to edit mode
    viewEl.classList.add('hidden');
    editEl.classList.remove('hidden');
    cardEl.classList.add('quick-edit-active');
    document.getElementById('qe-name-' + id).focus();
  } else {
    // Switch to view mode
    viewEl.classList.remove('hidden');
    editEl.classList.add('hidden');
    cardEl.classList.remove('quick-edit-active');
  }
}

// Save Quick Edit
function saveQuickEdit(id) {
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }
  var name, price, stock;
  try {
    name  = InputValidator.validateProductName(document.getElementById('qe-name-'  + id).value.trim());
    price = InputValidator.validatePrice(document.getElementById('qe-price-' + id).value);
    stock = InputValidator.validateStock(document.getElementById('qe-stock-' + id).value);
  } catch(validationError) {
    showToast(validationError.message, 'error');
    return;
  }

  var products = safeJSONParse(localStorage.getItem('phProducts'), []) || [];
  var index = products.findIndex(function(p) { return p.id === id; });

  if (index > -1) {
    products[index].name = escapeHTML(name);
    products[index].price = price;
    products[index].stock = stock;  // Already validated by InputValidator.stock

    StorageManager.setItem('phProducts', products);
    AuditLog.record('product_quick_edited', { id: id, price: price });

    // Update the view without reload
    var viewEl = document.getElementById('product-view-' + id);
    var editEl = document.getElementById('product-edit-' + id);
    var cardEl = document.querySelector('[data-product-id="' + id + '"]');

    var stockClass = products[index].stock > 5 ? 'text-green-600' : products[index].stock > 0 ? 'text-yellow-600' : 'text-red-600';
    var stockText = products[index].stock > 0 ? 'المخزون: ' + products[index].stock : 'غير متوفر';
    var stockDisplay = products[index].stock !== undefined ? '<p class="text-xs ' + stockClass + '">' + stockText + '</p>' : '';

    var safeName = escapeHTML(name);
    viewEl.innerHTML = DOMPurify.sanitize('<h3 class="font-bold text-brand-900 mb-2">' + safeName + '</h3>' +
      '<p class="text-brand-600 text-sm mb-3">' + price.toLocaleString() + ' د.ع</p>' +
      stockDisplay);

    // Switch back to view mode
    viewEl.classList.remove('hidden');
    editEl.classList.add('hidden');
    cardEl.classList.remove('quick-edit-active');

    showSuccessAnimation('تم تحديث المنتج بنجاح!');
  }
}

function filterProductsAdmin(filter) {
  document.querySelectorAll('#section-products .tab-btn').forEach(function(btn) {
    btn.classList.remove('active', 'bg-brand-700', 'text-white');
    btn.classList.add('bg-brand-100', 'text-brand-700');
  });

  var activeBtn = document.querySelector('#section-products [data-filter="' + filter + '"]');
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-brand-700', 'text-white');
    activeBtn.classList.remove('bg-brand-100', 'text-brand-700');
  }

  loadProducts(filter);
}

// Debounced search — fires 300ms after user stops typing
const debouncedSearch = debounce(() => {
  const activeFilter = document.querySelector('#section-products .tab-btn.active');
  const filter = activeFilter ? activeFilter.dataset.filter : 'all';
  loadProducts(filter);
}, 300);

function searchProducts() {
  debouncedSearch();
}

function openProductModal(id) {
  if (id) {
    var products = safeJSONParse(localStorage.getItem('phProducts'), []) || [];
    var product = products.find(function(p) { return p.id === id; });
    if (product) {
      document.getElementById('productModalTitle').textContent = 'تعديل منتج';
      document.getElementById('productId').value = id;
      document.getElementById('productName').value = product.name;
      document.getElementById('productCategory').value = product.category;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productStock').value = product.stock !== undefined ? product.stock : '';
      document.getElementById('productDesc').value = product.description || '';
      if (product.image) {
        document.getElementById('imagePreview').classList.add('hidden');
        document.getElementById('imagePreviewContainer').classList.remove('hidden');
        document.getElementById('imagePreviewImg').src = product.image;
        document.getElementById('productImage').value = product.image;
      }
    }
  } else {
    document.getElementById('productModalTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = 'medicines';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productDesc').value = '';
    document.getElementById('imagePreview').classList.remove('hidden');
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('productImage').value = '';
  }
  document.getElementById('productModal').classList.add('active');
  lucide.createIcons();
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
}

function editProduct(id) {
  openProductModal(id);
}

function handleImageUpload(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('imagePreview').classList.add('hidden');
      document.getElementById('imagePreviewContainer').classList.remove('hidden');
      document.getElementById('imagePreviewImg').src = e.target.result;
      document.getElementById('productImage').value = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function removeImage() {
  document.getElementById('imagePreview').classList.remove('hidden');
  document.getElementById('imagePreviewContainer').classList.add('hidden');
  document.getElementById('productImage').value = '';
  document.getElementById('productImageFile').value = '';
}

async function saveProduct() {
  try {
    // Security: auth check — throws immediately if not authenticated
    if (!isAuthenticated()) throw new Error('غير مصرح');

    var name = InputValidator.validateProductName(document.getElementById('productName').value.trim());
    var price = InputValidator.validatePrice(document.getElementById('productPrice').value);
    var stock = InputValidator.validateStock(document.getElementById('productStock').value);

    var products = StorageManager.get('phProducts', []) || [];
    var id = document.getElementById('productId').value;

    var safeName = escapeHTML(name);
    var safeDesc = escapeHTML(document.getElementById('productDesc').value.trim());

    var productData = {
      id: id ? parseInt(id) : Date.now(),
      name: safeName,
      nameAr: safeName,
      category: escapeHTML(document.getElementById('productCategory').value),
      price: price,
      stock: stock, // Already validated by InputValidator.stock
      description: safeDesc,
      image: document.getElementById('productImage').value
    };

    if (id) {
      var index = products.findIndex(function(p) { return p.id === parseInt(id); });
      if (index > -1) {
        // Security: Explicit property assignment to prevent mass assignment
        products[index].id = productData.id;
        products[index].name = productData.name;
        products[index].nameAr = productData.nameAr;
        products[index].category = productData.category;
        products[index].price = productData.price;
        if (productData.stock !== undefined) products[index].stock = productData.stock;
        products[index].description = productData.description;
        products[index].image = productData.image;
        products[index].updatedAt = new Date().toISOString();
      }
    } else {
      // Security: Create new object with only allowed properties
      var newProduct = {
        id: productData.id,
        name: productData.name,
        nameAr: productData.nameAr,
        category: productData.category,
        price: productData.price,
        description: productData.description,
        image: productData.image,
        createdAt: new Date().toISOString()
      };
      if (productData.stock !== undefined) newProduct.stock = productData.stock;
      products.push(newProduct);
    }

    StorageManager.setItem('phProducts', products);
    logAction(id ? 'product_updated' : 'product_created', { name: safeName, price: price }, 'success');
    closeProductModal();
    loadProducts();
    showSuccessAnimation('تم حفظ المنتج بنجاح!', true);

  } catch(error) {
    console.error('خطأ في saveProduct:', error);
    showToast(error.message, 'error');
    logAction('saveProduct', { error: error.message }, 'failed');
  }
}

function deleteProduct(id) {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  var products = StorageManager.get('phProducts', []) || [];
  products = products.filter(function(p) { return p.id !== id; });
  StorageManager.setItem('phProducts', products);
  AuditLog.record('product_deleted', { id: id });
  loadProducts();
  showToast('تم حذف المنتج', 'warning');
}

function loadTestimonials() {
  var testimonials = safeJSONParse(localStorage.getItem('phTestimonials'), []) || [];
  var container = document.getElementById('testimonialsList');

  if (testimonials.length === 0) {
    container.innerHTML = DOMPurify.sanitize('<div class="col-span-full text-center py-12 text-brand-400">لا توجد آراء</div>');
    return;
  }

  var html = '';
  testimonials.forEach(function(t, i) {
    var safeName = escapeHTML(t.name || '');
    var safeText = escapeHTML(t.text || '');
    var stars = '';
    for (var j = 0; j < 5; j++) {
      stars += '<i data-lucide="star" class="w-4 h-4 ' + (j < t.rating ? 'text-gold fill-gold' : 'text-gray-300') + '"></i>';
    }
    html += '<div class="bg-white rounded-xl p-4 sm:p-6 border border-brand-100 animate-fade-in" style="animation-delay: ' + (i * 0.1) + 's">' +
      '<div class="flex items-center gap-1 mb-3">' + stars + '</div>' +
      '<p class="text-brand-700 mb-4 leading-relaxed">"' + safeText + '"</p>' +
      '<div class="flex items-center justify-between">' +
      '<div class="flex items-center gap-3">' +
      '<div class="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center"><span class="text-white font-bold">' + (safeName.charAt(0) || '?') + '</span></div>' +
      '<div><h4 class="font-semibold text-brand-900">' + safeName + '</h4><p class="text-brand-500 text-sm">عميل</p></div>' +
      '</div>' +
      '<div class="flex gap-1">' +
      '<button onclick="editTestimonial(' + t.id + ')" class="quick-action bg-brand-100 text-brand-600 hover:bg-brand-200"><i data-lucide="edit" class="w-4 h-4"></i></button>' +
      '<button onclick="deleteTestimonial(' + t.id + ')" class="quick-action bg-red-100 text-red-500 hover:bg-red-200"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
      '</div></div></div>';
  });

  container.innerHTML = DOMPurify.sanitize(html);
  lucide.createIcons();
}

function openTestimonialModal(id) {
  if (id) {
    var testimonials = safeJSONParse(localStorage.getItem('phTestimonials'), []) || [];
    var testimonial = testimonials.find(function(t) { return t.id === id; });
    if (testimonial) {
      document.getElementById('testimonialModalTitle').textContent = 'تعديل رأي';
      document.getElementById('testimonialId').value = id;
      document.getElementById('testimonialName').value = testimonial.name;
      document.getElementById('testimonialText').value = testimonial.text;
      document.getElementById('testimonialRating').value = testimonial.rating;
    }
  } else {
    document.getElementById('testimonialModalTitle').textContent = 'إضافة رأي جديد';
    document.getElementById('testimonialId').value = '';
    document.getElementById('testimonialName').value = '';
    document.getElementById('testimonialText').value = '';
    document.getElementById('testimonialRating').value = '5';
  }
  document.getElementById('testimonialModal').classList.add('active');
  lucide.createIcons();
}

function closeTestimonialModal() {
  document.getElementById('testimonialModal').classList.remove('active');
}

function editTestimonial(id) {
  openTestimonialModal(id);
}

function saveTestimonial() {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  var name = validateInput(document.getElementById('testimonialName').value.trim(), 100);
  var text = validateInput(document.getElementById('testimonialText').value.trim(), 1000);
  var rating = parseInt(document.getElementById('testimonialRating').value);

  if (!name || !text) {
    showToast('يرجى إدخال الاسم والتعليق', 'error');
    return;
  }

  var testimonials = safeJSONParse(localStorage.getItem('phTestimonials'), []) || [];
  var id = document.getElementById('testimonialId').value;

  var safeName = escapeHTML(name);
  var safeText = escapeHTML(text);

  if (id) {
    var index = testimonials.findIndex(function(t) { return t.id === parseInt(id); });
    if (index > -1) {
      testimonials[index] = { name: safeName, text: safeText, rating: rating };
    }
  } else {
    testimonials.push({ id: Date.now(), name: safeName, text: safeText, rating: rating });
  }

  localStorage.setItem('phTestimonials', JSON.stringify(testimonials));
  closeTestimonialModal();
  loadTestimonials();
  showSuccessAnimation('تم حفظ الرأي بنجاح!');
}

function deleteTestimonial(id) {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  if (!confirm('هل أنت متأكد من حذف هذا الرأي؟')) return;
  var testimonials = safeJSONParse(localStorage.getItem('phTestimonials'), []) || [];
  testimonials = testimonials.filter(function(t) { return t.id !== id; });
  localStorage.setItem('phTestimonials', JSON.stringify(testimonials));
  loadTestimonials();
  showToast('تم حذف الرأي', 'warning');
}

function loadOrders() {
  var orders = safeJSONParse(localStorage.getItem('phOrders'), []) || [];
  var container = document.getElementById('ordersList');
  var noOrders = document.getElementById('noOrders');

  var searchQuery = document.getElementById('orderSearch') ? document.getElementById('orderSearch').value.toLowerCase() : '';

  if (currentOrderFilter !== 'all') {
    orders = orders.filter(function(o) { return o.status === currentOrderFilter; });
  }

  if (searchQuery) {
    orders = orders.filter(function(o) {
      return escapeHTML(o.name).toLowerCase().includes(searchQuery) ||
             escapeHTML(o.phone).includes(searchQuery);
    });
  }

  if (orders.length === 0) {
    container.classList.add('hidden');
    noOrders.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  noOrders.classList.add('hidden');

  var statusLabels = { new: 'جديد', progress: 'قيد التوصيل', delivered: 'تم التوصيل', cancelled: 'ملغى' };
  var statusClasses = { new: 'order-new', progress: 'order-progress', delivered: 'order-delivered', cancelled: 'order-cancelled' };

  var html = '';
  orders.forEach(function(order) {
    var orderId = order.id || 'ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    html += '<div class="bg-white rounded-xl p-4 sm:p-6 border border-brand-100 animate-fade-in" style="animation-delay: 0.05s">' +
      '<div class="flex items-start justify-between mb-3">' +
      '<div>' +
      '<h3 class="font-bold text-brand-900">' + escapeHTML(order.name) + '</h3>' +
      '<p class="text-brand-600 text-sm">' + escapeHTML(order.phone) + '</p>' +
      '</div>' +
      '<span class="order-status ' + (statusClasses[order.status] || 'order-new') + '">' + (statusLabels[order.status] || 'جديد') + '</span>' +
      '</div>';

    if (order.address) {
      html += '<p class="text-brand-500 text-sm mb-2"><i data-lucide="map-pin" class="w-4 h-4 inline-block ml-1"></i>' + escapeHTML(order.address) + '</p>';
    }

    html += '<div class="text-sm text-brand-600 mb-3">';
    (order.items || []).forEach(function(item) {
      html += '<span class="inline-block bg-brand-50 px-2 py-1 rounded mr-2 mb-1">' + escapeHTML(item.name || '') + ' × ' + (item.quantity || 1) + '</span>';
    });
    html += '</div>' +
      '<div class="flex items-center justify-between">' +
      '<span class="font-bold text-brand-900">' + (order.total || 0).toLocaleString() + ' د.ع</span>' +
      '<span class="text-brand-400 text-xs">' + new Date(order.date || Date.now()).toLocaleDateString('ar-EG') + '</span>' +
      '</div>' +
      '<div class="flex gap-2 mt-3">' +
      '<button onclick="updateOrderStatus(\'' + escapeHTML(orderId.toString()) + '\', \'progress\')" class="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors">قيد التوصيل</button>' +
      '<button onclick="updateOrderStatus(\'' + escapeHTML(orderId.toString()) + '\', \'delivered\')" class="flex-1 bg-green-100 text-green-700 py-2 rounded-lg text-sm font-semibold hover:bg-green-200 transition-colors">تم التوصيل</button>' +
      '<button onclick="updateOrderStatus(\'' + escapeHTML(orderId.toString()) + '\', \'cancelled\')" class="flex-1 bg-red-100 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors">إلغاء</button>' +
      '</div></div>';
  });

  container.innerHTML = DOMPurify.sanitize(html);
  lucide.createIcons();
}

function filterOrders(filter) {
  currentOrderFilter = filter;
  document.querySelectorAll('#section-orders .tab-btn').forEach(function(btn) {
    btn.classList.remove('active', 'bg-brand-700', 'text-white');
    btn.classList.add('bg-brand-100', 'text-brand-700');
  });

  var activeBtn = document.querySelector('#section-orders [data-filter="' + filter + '"]');
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-brand-700', 'text-white');
    activeBtn.classList.remove('bg-brand-100', 'text-brand-700');
  }

  loadOrders();
}

// Debounced order search
const debouncedOrderSearch = debounce(() => loadOrders(), 300);

function searchOrders() {
  debouncedOrderSearch();
}

function updateOrderStatus(orderId, status) {
  // Security: Verify admin is authenticated (IDOR prevention)
  if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
    showToast('يجب تسجيل الدخول أولاً', 'error');
    return;
  }

  // Security: Check session expiration
  var loginTime = parseInt(sessionStorage.getItem('adminLoginTime') || '0');
  var now = Date.now();
  var maxSessionTime = SESSION_CONFIG.TIMEOUT_MS; // Use central config
  if (now - loginTime > maxSessionTime) {
    logout();
    showToast('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى', 'error');
    return;
  }

  // Security: Validate status before processing
  if (!isValidOrderStatus(status)) {
    showToast('حالة غير صالحة', 'error');
    return;
  }

  // Security: Validate order ID
  if (!orderId || typeof orderId !== 'string') {
    showToast('معرف الطلب غير صالح', 'error');
    return;
  }

  var orders = safeJSONParse(localStorage.getItem('phOrders'), []) || [];
  var orderIndex = orders.findIndex(function(o) { return o.id === orderId || o.id === parseInt(orderId); });

  if (orderIndex > -1 && orders[orderIndex]) {
    // Sanitize status value
    var sanitizedStatus = escapeHTML(status);
    orders[orderIndex].status = sanitizedStatus;
    orders[orderIndex].updatedAt = new Date().toISOString();
    localStorage.setItem('phOrders', JSON.stringify(orders));
    loadOrders();
    updateOrdersBadge();
    showToast('تم تحديث حالة الطلب', 'success');
  } else {
    showToast('الطلب غير موجود', 'error');
  }
}

function loadComments() {
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  var container = document.getElementById('commentsList');
  var noComments = document.getElementById('noComments');

  if (currentCommentFilter !== 'all') {
    comments = comments.filter(function(c) { return c.status === currentCommentFilter; });
  }

  if (comments.length === 0) {
    container.classList.add('hidden');
    noComments.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  noComments.classList.add('hidden');

  var statusLabels = { new: 'جديد', read: 'تم القراءة', replied: 'تم الرد' };
  var statusClasses = { new: 'badge-new', read: 'badge-read', replied: 'badge-replied' };

  var html = '';
  comments.forEach(function(comment, i) {
    html += '<div class="comment-card bg-white rounded-xl p-4 sm:p-6 border border-brand-100 animate-fade-in" style="animation-delay: ' + (i * 0.05) + 's">' +
      '<div class="flex items-start justify-between mb-3">' +
      '<div>' +
      '<h3 class="font-bold text-brand-900">' + escapeHTML(comment.name) + '</h3>' +
      '<p class="text-brand-500 text-sm">' + escapeHTML(comment.phone || 'بدون هاتف') + '</p>' +
      '</div>' +
      '<span class="badge ' + (statusClasses[comment.status] || 'badge-new') + ' px-2 py-1 rounded text-xs">' + (statusLabels[comment.status] || 'جديد') + '</span>' +
      '</div>' +
      '<p class="text-brand-700 mb-4 leading-relaxed">' + escapeHTML(comment.message) + '</p>' +
      '<div class="flex items-center justify-between">' +
      '<span class="text-brand-400 text-xs">' + new Date(comment.date).toLocaleDateString('ar-EG') + '</span>' +
      '<button onclick="openViewComment(' + comment.id + ')" class="bg-brand-100 text-brand-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-200 transition-colors">عرض التفاصيل</button>' +
      '</div></div>';
  });

  container.innerHTML = DOMPurify.sanitize(html);
  lucide.createIcons();
}

function filterComments(filter) {
  currentCommentFilter = filter;
  document.querySelectorAll('#section-comments .tab-btn').forEach(function(btn) {
    btn.classList.remove('active', 'bg-brand-700', 'text-white');
    btn.classList.add('bg-brand-100', 'text-brand-700');
  });

  var activeBtn = document.querySelector('#section-comments [data-filter="' + filter + '"]');
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-brand-700', 'text-white');
    activeBtn.classList.remove('bg-brand-100', 'text-brand-700');
  }

  loadComments();
}

function openViewComment(id) {
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  var comment = comments.find(function(c) { return c.id === id; });
  if (!comment) return;

  selectedCommentId = id;
  var details = document.getElementById('commentDetails');
  details.innerHTML = DOMPurify.sanitize('<div class="bg-brand-50 rounded-lg p-4"><p class="text-sm text-brand-600 mb-2">الاسم: <span class="font-semibold text-brand-900">' + escapeHTML(comment.name) + '</span></p><p class="text-sm text-brand-600 mb-2">الهاتف: <span class="font-semibold text-brand-900">' + escapeHTML(comment.phone || 'غير محدد') + '</span></p><p class="text-sm text-brand-600">التاريخ: <span class="font-semibold text-brand-900">' + new Date(comment.date).toLocaleDateString('ar-EG') + '</span></p></div><div class="mt-4"><p class="font-semibold text-brand-700 mb-2">الرسالة:</p><p class="text-brand-600 leading-relaxed">' + escapeHTML(comment.message) + '</p></div>');
  document.getElementById('replyMessage').value = '';

  document.getElementById('viewCommentModal').classList.add('active');
}

function closeViewCommentModal() {
  document.getElementById('viewCommentModal').classList.remove('active');
}

function markAsRead() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  var index = comments.findIndex(function(c) { return c.id === selectedCommentId; });
  if (index > -1) {
    comments[index].status = 'read';
    localStorage.setItem('phComments', JSON.stringify(comments));
    closeViewCommentModal();
    loadComments();
    updateCommentsBadge();
    showToast('تم تحديث الحالة', 'success');
  }
}

function markAsReplied() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  var index = comments.findIndex(function(c) { return c.id === selectedCommentId; });
  if (index > -1) {
    comments[index].status = 'replied';
    comments[index].reply = document.getElementById('replyMessage').value;
    localStorage.setItem('phComments', JSON.stringify(comments));
    closeViewCommentModal();
    loadComments();
    updateCommentsBadge();
    showToast('تم تسجيل الرد', 'success');
  }
}

function deleteComment() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  comments = comments.filter(function(c) { return c.id !== selectedCommentId; });
  localStorage.setItem('phComments', JSON.stringify(comments));
  closeViewCommentModal();
  loadComments();
  updateCommentsBadge();
  showToast('تم حذف الرسالة', 'warning');
}

function updateCommentsBadge() {
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  var newComments = comments.filter(function(c) { return c.status === 'new'; }).length;
  var badge = document.getElementById('commentsBadge');
  if (newComments > 0) {
    badge.textContent = newComments;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function updateOrdersBadge() {
  var orders = safeJSONParse(localStorage.getItem('phOrders'), []) || [];
  var newOrders = orders.filter(function(o) { return o.status === 'new' || o.status === 'progress'; }).length;
  var badge = document.getElementById('ordersBadge');
  if (newOrders > 0) {
    badge.textContent = newOrders;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function clearAllProducts() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  localStorage.removeItem('phProducts');
  loadProducts();
  showToast('تم حذف جميع المنتجات', 'warning');
}

function clearAllOrders() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  localStorage.removeItem('phOrders');
  loadOrders();
  updateOrdersBadge();
  showToast('تم حذف جميع الطلبات', 'warning');
}

function exportAllData() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  var data = {
    products: JSON.parse(localStorage.getItem('phProducts')) || [],
    orders: JSON.parse(localStorage.getItem('phOrders')) || [],
    comments: JSON.parse(localStorage.getItem('phComments')) || [],
    settings: JSON.parse(localStorage.getItem('phSettings')) || {},
    hero: JSON.parse(localStorage.getItem('phHeroContent')) || {},
    features: JSON.parse(localStorage.getItem('phFeatures')) || [],
    testimonials: JSON.parse(localStorage.getItem('phTestimonials')) || []
  };

  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'neurobin_backup_' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير البيانات بنجاح', 'success');
}


// ═══════════════════════════════════════════════════════════════
// SEC: Server-Side Audit Logging
// ═══════════════════════════════════════════════════════════════

// Sanitize data before sending to server log
function sanitizeForLog(data) {
  if (!data || typeof data !== 'object') return {};
  var safe = {};
  var allowed = ['id', 'action', 'status', 'name', 'category', 'price'];
  allowed.forEach(function(k) {
    if (data[k] !== undefined) safe[k] = String(data[k]).substring(0, 200);
  });
  return safe;
}

// Fallback: save locally if server is unavailable
function fallbackToLocal(log) {
  AuditLog.record(log.action, Object.assign({}, log.data, { _serverFailed: true }));
}

// logAction: send audit event to server
function logAction(action, data, status) {
  if (!isAuthenticated()) return; // لا تسجّل بدون مصادقة
  var log = {
    timestamp: new Date().toISOString(),
    action: action,
    status: status,
    // userId يُستخرج من التوكن على الخادم — لا نرسله من المتصفح
    data: sanitizeForLog(data)
  };
  fetch('/api/logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionStorage.getItem('adminSessionToken'),
      'X-CSRF-Token': CSRFProtection.get()
    },
    body: JSON.stringify(log)
  })
    .then(function(res) { if (!res.ok) fallbackToLocal(log); })
    .catch(function() { fallbackToLocal(log); });
}

function showToast(message, type) {
  var toast = document.getElementById('toast');
  toast.className = 'toast';
  if (type) toast.classList.add(type);
  document.getElementById('toastMessage').textContent = message;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// =============================================================
// MANUAL ORDER MODAL — Complete Implementation
// Supports the new grid-based product picker in admin.html
// =============================================================

var _moProducts = [];   // cache of products from Supabase
var _moCartItems = [];  // selected items: [{id, name, price, qty}]

function openManualOrderModal() {
  var modal = document.getElementById('manualOrderModal');
  if (!modal) return;
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  ['moName','moPhone','moAddress','moNotes'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var delivEl = document.getElementById('moDelivery');
  if (delivEl) delivEl.value = '4000';
  var statusEl = document.getElementById('moStatus');
  if (statusEl) statusEl.value = 'new';
  var totalEl = document.getElementById('moTotal');
  if (totalEl) totalEl.textContent = '4,000 د.ع';
  _moCartItems = [];
  var selEl = document.getElementById('moSelectedProducts');
  if (selEl) selEl.innerHTML = '<p class="text-xs text-brand-400 text-center py-3">لم يتم اختيار منتجات بعد</p>';
  var pickerEl = document.getElementById('moProductPicker');
  if (pickerEl) pickerEl.classList.add('hidden');
  var gridEl = document.getElementById('moProductGrid');
  if (gridEl) gridEl.innerHTML = '';
  SupaDB.Products.list().then(function(list) {
    _moProducts = list;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }).catch(function(e) {
    console.warn('Manual order: products load error:', e.message);
  });
}

function closeManualOrderModal() {
  var modal = document.getElementById('manualOrderModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function toggleMoProductPicker() {
  var picker = document.getElementById('moProductPicker');
  if (!picker) return;
  if (picker.classList.contains('hidden')) {
    picker.classList.remove('hidden');
    var s = document.getElementById('moPickerSearch');
    if (s) s.value = '';
    renderMoProductGrid(_moProducts);
  } else {
    picker.classList.add('hidden');
  }
}

function filterMoProducts() {
  var s = document.getElementById('moPickerSearch');
  var q = s ? s.value.toLowerCase() : '';
  renderMoProductGrid(q ? _moProducts.filter(function(p) {
    return (p.name_ar || p.name || '').toLowerCase().indexOf(q) !== -1;
  }) : _moProducts);
}

function _moEsc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMoProductGrid(products) {
  var grid = document.getElementById('moProductGrid');
  if (!grid) return;
  if (!products || products.length === 0) {
    grid.innerHTML = '<p class="col-span-5 text-xs text-center text-brand-400 py-3">لا توجد منتجات</p>';
    return;
  }
  var html = '';
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var pid   = _moEsc(String(p.id));
    var name  = _moEsc(p.name_ar || p.name || '');
    var price = (p.price || 0).toLocaleString();
    var inCart = _moCartItems.some(function(c) { return String(c.id) === String(p.id); });
    var border = inCart ? 'border-brand-500 bg-brand-50' : 'border-brand-100 bg-white hover:border-brand-400';
    var imgSrc = p.image_url || p.image || '';
    // NOTE: Use double-quoted attribute + no inner quotes to avoid JS string escaping issues
    var imgHtml = imgSrc
      ? '<img src="' + _moEsc(imgSrc) + '" class="w-full h-12 object-contain mb-1" onerror="this.remove()">'
      : '<div class="w-full h-12 flex items-center justify-center text-brand-300"><i data-lucide="package" class="w-6 h-6"></i></div>';
    html += '<div onclick="addMoProduct(' + "'" + pid + "'" + ')" class="cursor-pointer rounded-xl p-2 text-center border-2 transition-all ' + border + '" title="' + name + '">'
      + imgHtml
      + '<p class="text-xs font-semibold text-brand-800 truncate leading-tight">' + name + '</p>'
      + '<p class="text-xs text-brand-500">' + price + ' د.ع</p>'
      + '</div>';
  }
  grid.innerHTML = html;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addMoProduct(productId) {
  var p = null;
  for (var i = 0; i < _moProducts.length; i++) {
    if (String(_moProducts[i].id) === String(productId)) { p = _moProducts[i]; break; }
  }
  if (!p) return;
  var existing = null;
  for (var j = 0; j < _moCartItems.length; j++) {
    if (String(_moCartItems[j].id) === String(productId)) { existing = _moCartItems[j]; break; }
  }
  if (existing) {
    existing.qty += 1;
  } else {
    _moCartItems.push({ id: p.id, name: p.name_ar || p.name || '', price: p.price || 0, qty: 1 });
  }
  renderMoSelectedProducts();
  var s = document.getElementById('moPickerSearch');
  var q = s ? s.value.toLowerCase() : '';
  renderMoProductGrid(q ? _moProducts.filter(function(pr) {
    return (pr.name_ar || pr.name || '').toLowerCase().indexOf(q) !== -1;
  }) : _moProducts);
}

function removeMoProduct(productId) {
  _moCartItems = _moCartItems.filter(function(c) { return String(c.id) !== String(productId); });
  renderMoSelectedProducts();
  var s = document.getElementById('moPickerSearch');
  var q = s ? s.value.toLowerCase() : '';
  renderMoProductGrid(q ? _moProducts.filter(function(pr) {
    return (pr.name_ar || pr.name || '').toLowerCase().indexOf(q) !== -1;
  }) : _moProducts);
}

function renderMoSelectedProducts() {
  var container = document.getElementById('moSelectedProducts');
  if (!container) return;
  if (_moCartItems.length === 0) {
    container.innerHTML = '<p class="text-xs text-brand-400 text-center py-3">لم يتم اختيار منتجات بعد</p>';
    updateManualTotal();
    return;
  }
  var html = '';
  for (var i = 0; i < _moCartItems.length; i++) {
    var item = _moCartItems[i];
    var pid = _moEsc(String(item.id));
    var nm  = _moEsc(item.name);
    html += '<div class="flex items-center gap-1.5 bg-white rounded-xl px-2 py-2 border border-brand-100">'
      + '<span class="flex-1 text-xs font-medium text-brand-800 truncate min-w-0">' + nm + '</span>'
      + '<div class="flex items-center gap-0.5 flex-shrink-0">'
      +   '<button onclick="changeMoQty(' + "'" + pid + "'" + ',-1)" style="width:28px;height:28px;min-width:28px;background:#E8EAD8;color:#2D5016;border-radius:8px;font-size:16px;font-weight:bold;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">-</button>'
      +   '<input type="number" class="mo-item-qty" style="width:36px;height:28px;padding:0 2px;text-align:center;font-size:12px;border:1px solid #D1D5B1;border-radius:6px;background:#fff;color:#1E350F;-moz-appearance:textfield;-webkit-appearance:none" value="' + item.qty + '" min="1" max="99" data-pid="' + pid + '" oninput="updateMoItemQty(this)">'
      +   '<button onclick="changeMoQty(' + "'" + pid + "'" + ',1)" style="width:28px;height:28px;min-width:28px;background:#E8EAD8;color:#2D5016;border-radius:8px;font-size:16px;font-weight:bold;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">+</button>'
      + '</div>'
      + '<input type="number" class="mo-item-price" style="width:62px;height:28px;padding:0 4px;text-align:center;font-size:12px;border:1px solid #D1D5B1;border-radius:6px;background:#fff;color:#1E350F;-moz-appearance:textfield;-webkit-appearance:none" value="' + item.price + '" min="0" step="250" data-pid="' + pid + '" oninput="updateMoItemPrice(this)">'
      + '<button onclick="removeMoProduct(' + "'" + pid + "'" + ')" class="p-1 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0 transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>'
      + '</div>';
  }
  container.innerHTML = html;
  if (typeof lucide !== 'undefined') lucide.createIcons();
  updateManualTotal();
}

function changeMoQty(productId, delta) {
  for (var i = 0; i < _moCartItems.length; i++) {
    if (String(_moCartItems[i].id) === String(productId)) {
      var newQty = (_moCartItems[i].qty || 1) + delta;
      _moCartItems[i].qty = Math.max(1, Math.min(99, newQty));
      break;
    }
  }
  renderMoSelectedProducts();
}

function updateMoItemQty(input) {
  var pid = input.getAttribute('data-pid');
  for (var i = 0; i < _moCartItems.length; i++) {
    if (String(_moCartItems[i].id) === String(pid)) {
      _moCartItems[i].qty = parseInt(input.value) || 1;
      updateManualTotal();
      break;
    }
  }
}

function updateMoItemPrice(input) {
  var pid = input.getAttribute('data-pid');
  for (var i = 0; i < _moCartItems.length; i++) {
    if (String(_moCartItems[i].id) === String(pid)) {
      _moCartItems[i].price = parseFloat(input.value) || 0;
      updateManualTotal();
      break;
    }
  }
}

function updateManualTotal() {
  var subtotal = 0;
  var qtyInputs = document.querySelectorAll('.mo-item-qty');
  if (qtyInputs.length > 0) {
    qtyInputs.forEach(function(qtyEl) {
      var row     = qtyEl.closest('div');
      var priceEl = row ? row.querySelector('.mo-item-price') : null;
      subtotal   += (parseInt(qtyEl.value) || 1) * (parseFloat(priceEl ? priceEl.value : 0) || 0);
    });
  } else {
    for (var i = 0; i < _moCartItems.length; i++) {
      subtotal += (_moCartItems[i].qty || 1) * (_moCartItems[i].price || 0);
    }
  }
  var delivEl = document.getElementById('moDelivery');
  var delivery = parseFloat(delivEl ? delivEl.value : 0) || 0;
  var totalEl  = document.getElementById('moTotal');
  if (totalEl) totalEl.textContent = (subtotal + delivery).toLocaleString('ar-IQ') + ' د.ع';
}

async function saveManualOrder() {
  var nameEl    = document.getElementById('moName');
  var phoneEl   = document.getElementById('moPhone');
  var addrEl    = document.getElementById('moAddress');
  var notesEl   = document.getElementById('moNotes');
  var delivEl   = document.getElementById('moDelivery');
  var statusEl  = document.getElementById('moStatus');

  var name     = nameEl    ? nameEl.value.trim()    : '';
  var phone    = phoneEl   ? phoneEl.value.trim()   : '';
  var address  = addrEl    ? addrEl.value.trim()    : '';
  var notes    = notesEl   ? notesEl.value.trim()   : '';
  var delivery = parseFloat(delivEl ? delivEl.value : 0) || 0;
  var status   = statusEl  ? statusEl.value         : 'new';

  if (!name)  { showToast('يرجى إدخال اسم العميل', 'error'); return; }
  if (!phone) { showToast('يرجى إدخال رقم الهاتف', 'error'); return; }

  // Sync live edits into cart
  document.querySelectorAll('.mo-item-qty').forEach(function(qtyEl) {
    var pid      = qtyEl.getAttribute('data-pid');
    var row      = qtyEl.closest('div');
    var priceEl  = row ? row.querySelector('.mo-item-price') : null;
    for (var i = 0; i < _moCartItems.length; i++) {
      if (String(_moCartItems[i].id) === String(pid)) {
        _moCartItems[i].qty   = parseInt(qtyEl.value) || 1;
        _moCartItems[i].price = parseFloat(priceEl ? priceEl.value : _moCartItems[i].price) || 0;
        break;
      }
    }
  });

  if (_moCartItems.length === 0) {
    showToast('يرجى إضافة منتج واحد على الأقل', 'error');
    return;
  }

  var items    = [];
  var subtotal = 0;
  for (var i = 0; i < _moCartItems.length; i++) {
    var c         = _moCartItems[i];
    var lineTotal = (c.qty || 1) * (c.price || 0);
    subtotal     += lineTotal;
    items.push({ product_id: c.id || null, product_name: c.name || 'منتج', quantity: c.qty || 1, price: c.price || 0, subtotal: lineTotal });
  }

  var saveBtn = document.getElementById('moSaveBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'جاري الحفظ...'; }

  try {
    var res = await SupaDB._db.from('orders').insert({
      customer_name:    name,
      customer_phone:   phone,
      address: address  || null,
      notes:            notes    || null,
      total_amount:     subtotal + delivery,
      status:           status,
      source:           'manual',
      created_at:       new Date().toISOString(),
      updated_at:       new Date().toISOString()
    }).select().single();
    if (res.error) throw res.error;

    if (items.length > 0) {
      var ins = items.map(function(item) { return Object.assign({ order_id: res.data.id }, item); });
      var iRes = await SupaDB._db.from('order_items').insert(ins);
      if (iRes.error) console.warn('Items warning:', iRes.error.message);
    }

    closeManualOrderModal();
    if (typeof loadOrders === 'function') loadOrders();
    if (typeof showSuccessAnimation === 'function') showSuccessAnimation('تم حفظ الطلب بنجاح!');
  } catch(e) {
    showToast('خطأ: ' + e.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i> حفظ الطلب';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// CATEGORY IMAGES MANAGEMENT — صور الأقسام
// ═══════════════════════════════════════════════════════════════

var CATEGORY_DEFS_ADMIN = [
  { filter:'medicines', label:'أدوية',           icon:'fa-syringe',            bg:'#ECFDF5', iconColor:'#059669' },
  { filter:'skincare',  label:'العناية بالبشرة', icon:'fa-face-smile',          bg:'#FDF2F8', iconColor:'#EC4899' },
  { filter:'haircare',  label:'عناية بالشعر',    icon:'fa-scissors',            bg:'#FFFBEB', iconColor:'#F59E0B' },
  { filter:'dental',    label:'عناية بالأسنان',  icon:'fa-tooth',               bg:'#F0F9FF', iconColor:'#0EA5E9' },
  { filter:'makeup',    label:'مكياج',            icon:'fa-wand-magic-sparkles', bg:'#FAF5FF', iconColor:'#8B5CF6' },
  { filter:'devices',   label:'أجهزة طبية',       icon:'fa-heart-pulse',         bg:'#FEF2F2', iconColor:'#EF4444' },
  { filter:'perfumes',  label:'عطور',             icon:'fa-spray-can-sparkles',  bg:'#F0FDF4', iconColor:'#16A34A' }
];

function loadCategoryImages() {
  var grid = document.getElementById('categoryImagesGrid');
  if (!grid) return;

  // Show loading indicator
  grid.innerHTML =
    '<div class="col-span-full text-center py-12 text-brand-400">' +
    '<div class="spinner mx-auto mb-3" style="width:32px;height:32px;border-width:3px"></div>' +
    '<p class="text-sm">جاري التحميل...</p>' +
    '</div>';

  if (!supabaseClient) {
    grid.innerHTML =
      '<div class="col-span-full text-center py-8 text-red-400">' +
      '<p class="font-semibold">خطأ: لم يتم الاتصال بقاعدة البيانات</p>' +
      '</div>';
    return;
  }

  supabaseClient
    .from('site_settings')
    .select('key, value')
    .like('key', 'cat_img_%')
    .then(function(result) {
      var images = {};
      if (!result.error && result.data) {
        result.data.forEach(function(row) {
          images[row.key] = row.value || '';
        });
      }

      var html = '';
      CATEGORY_DEFS_ADMIN.forEach(function(cat) {
        var key = 'cat_img_' + cat.filter;
        var url = images[key] || '';
        var previewHtml = url
          ? '<div class="mb-3 rounded-xl overflow-hidden h-28 bg-gray-50">' +
            '<img src="' + url + '" alt="' + cat.label + '" ' +
            'class="w-full h-full object-cover" ' +
            'onerror="this.parentElement.innerHTML='<div class=\\"flex items-center justify-center h-full text-gray-400 text-xs\\">رابط الصورة غير صالح</div>'">' +
            '</div>'
          : '<div class="mb-3 rounded-xl h-28 bg-gray-50 flex items-center justify-center text-brand-300">' +
            '<i class="fa-solid ' + cat.icon + ' text-3xl"></i>' +
            '</div>';

        html +=
          '<div class="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">' +
            '<div class="flex items-center gap-3 mb-4">' +
              '<div class="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style="background:' + cat.bg + '">' +
                '<i class="fa-solid ' + cat.icon + '" style="color:' + cat.iconColor + ';font-size:1.1rem"></i>' +
              '</div>' +
              '<div>' +
                '<p class="font-bold text-brand-900 text-sm sm:text-base">' + cat.label + '</p>' +
                '<p class="text-brand-400 text-xs mt-0.5">' + key + '</p>' +
              '</div>' +
            '</div>' +
            previewHtml +
            '<div class="flex gap-2">' +
              '<input type="url" id="cat_url_' + cat.filter + '" ' +
              'class="input-field flex-1 text-sm" ' +
              'placeholder="https://example.com/image.jpg" ' +
              'value="' + url.replace(/"/g, '&quot;') + '" dir="ltr">' +
              '<button onclick="saveCategoryImage('' + cat.filter + '')" ' +
              'class="bg-brand-700 hover:bg-brand-800 text-white px-3 sm:px-4 py-2 rounded-lg ' +
              'font-semibold text-sm transition-colors flex-shrink-0">حفظ</button>' +
            '</div>' +
          '</div>';
      });

      grid.innerHTML = html;
    })
    .catch(function(err) {
      grid.innerHTML =
        '<div class="col-span-full text-center py-8 text-red-400">' +
        '<p class="font-semibold">حدث خطأ أثناء التحميل</p>' +
        '</div>';
      ErrorHandler.log('loadCategoryImages', err);
    });
}

async function saveCategoryImage(catFilter) {
  var input = document.getElementById('cat_url_' + catFilter);
  if (!input) return;
  var url = input.value.trim();

  if (url && !url.startsWith('http')) {
    showToast('يرجى إدخال رابط صحيح يبدأ بـ http أو https', 'error');
    return;
  }

  if (!supabaseClient) {
    showToast('خطأ في الاتصال بقاعدة البيانات', 'error');
    return;
  }

  try {
    var key = 'cat_img_' + catFilter;
    var result = await supabaseClient
      .from('site_settings')
      .upsert({ key: key, value: url }, { onConflict: 'key' });

    if (result.error) throw result.error;

    showToast('تم حفظ صورة القسم بنجاح ✓', 'success');
    // Reload panel to refresh preview
    loadCategoryImages();
  } catch(e) {
    showToast('حدث خطأ أثناء الحفظ', 'error');
    ErrorHandler.log('saveCategoryImage', e, { catFilter: catFilter });
  }
}


// ═══════════════════════════════════════════════════════════════
// SINGLE DEVICE SESSION — جهاز واحد فقط في نفس الوقت
// الفكرة: عند الدخول يُخزن توكن فريد في Supabase.
// إذا دخل جهاز آخر، يكتب توكناً جديداً → الجهاز القديم يكتشف
// التغيير ويُسجّل الخروج تلقائياً.
// ═══════════════════════════════════════════════════════════════

var _deviceCheckInterval = null;

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

    console.log('[DeviceToken] Registered:', token.slice(0, 8) + '...');
  } catch(e) {
    console.warn('[DeviceToken] Registration failed:', e.message);
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
      console.warn('[DeviceToken] Session hijacked by another device — logging out.');
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
    console.warn('[DeviceToken] Check failed (network?):', e.message);
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
      // INSERT only (not upsert) — so it can't be overwritten by anon later
      await client.from('site_settings')
        .insert({ key: 'admin_allowed_device', value: localDeviceId });

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
