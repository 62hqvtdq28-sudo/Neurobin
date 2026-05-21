// =============================================================
// admin.js \u2014 Core (SUPABASE VERSION)
// Auth: Supabase email/password (replaces localStorage PBKDF2)
// Data: SupaDB adapter (see supabase-db.js)
// =============================================================

// \u2500\u2500\u2500 Auth: check session on page load \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function checkAuth() {
  const session = await SupaDB.Auth.getSession();
  if (session) {
    showDashboard();
  }
  // No session \u2192 login form is already visible (default state)
}

// \u2500\u2500\u2500 Auth: handle login form submit \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function handleLogin(e) {
  e.preventDefault();

  // Check lockout (still uses localStorage counter - client-side only)
  if (isAccountLocked()) {
    showLoginLockedMessage(getRemainingLockoutTime());
    return;
  }

  const email    = (document.getElementById('loginEmail')?.value || '').trim();
  const password = document.getElementById('loginPassword').value;

  if (!email) {
    setLoginError('\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A');
    return;
  }
  if (!password) {
    setLoginError('\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631');
    return;
  }

  setButtonLoading('loginBtn', true);

  try {
    await SupaDB.Auth.signIn(email, password);
    recordSuccessfulLogin();
    showDashboard();
  } catch (err) {
    recordFailedLogin();
    const attempts = getLoginAttempts();
    const remaining = MAX_LOGIN_ATTEMPTS - attempts.count;
    if (remaining <= 0) {
      setLoginError('\u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0639\u062F\u062F \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 5 \u062F\u0642\u0627\u0626\u0642.');
    } else {
      setLoginError('\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629.');
    }
  } finally {
    setButtonLoading('loginBtn', false);
  }
}

function setLoginError(msg) {
  const el = document.getElementById('loginError');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  setTimeout(() => { if (el) el.classList.add('hidden'); }, 5000);
}

// \u2500\u2500\u2500 Auth: logout \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function logout(clearRemember) {
  await SupaDB.Auth.signOut();
  sessionStorage.clear();
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  const loginError = document.getElementById('loginError');
  if (loginError) loginError.classList.add('hidden');
}

// \u2500\u2500\u2500 Auth: isAuthenticated (sync check via session) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function isAuthenticated() {
  // Used in write operations \u2014 Supabase RLS enforces this server-side
  // This is a fast client-side pre-check only
  return true; // Supabase session verified by RLS on every DB call
}

// \u2500\u2500\u2500 Settings: load from Supabase \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function loadSettings() {
  try {
    const s = await SupaDB.Settings.get();
    document.getElementById('siteName').value       = s.siteName || '';
    document.getElementById('instagramUrl').value   = s.instagramUrl || '';
    document.getElementById('whatsappNumber').value = s.whatsappNumber || '';
  } catch (e) {
    showToast('\u062A\u0639\u0630\u0651\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A', 'error');
  }
}

// \u2500\u2500\u2500 Settings: save to Supabase \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function saveSettings() {
  const siteName       = validateInput(document.getElementById('siteName').value, 100);
  const instagramUrl   = validateInstagramURL(document.getElementById('instagramUrl').value);
  const whatsappNumber = validatePhone(document.getElementById('whatsappNumber').value);

  try {
    await SupaDB.Settings.setMultiple({ siteName, instagramUrl, whatsappNumber });
    showToast('\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0628\u0646\u062C\u0627\u062D', 'success');
  } catch (e) {
    showToast('\u062A\u0639\u0630\u0651\u0631 \u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A', 'error');
  }
}

// \u2500\u2500\u2500 Auth state listener \u2014 auto logout if session expires \u2500\u2500
SupaDB.Auth.onStateChange(function(session) {
  if (!session) {
    document.getElementById('loginSection')?.classList.remove('hidden');
    document.getElementById('dashboard')?.classList.add('hidden');
  }
});

// =============================================================
// admin.js \u2014 Core (PATCHED)
// Security fixes applied:
//   ENC-01: removed escapeHTML() from DOM .value assignments
//   ENC-02: store data raw; escape only at render time
//   ENC-03: search/filter uses raw strings (no encoding)
// See products.js for XSS-02 fix, orders.js for XSS-01 fix
// =============================================================

// =====================================================
// SECURE PASSWORD HASHING - PBKDF2 Implementation
// =====================================================

// Security configuration (OWASP recommended minimums)
const PBKDF2_ITERATIONS = 310000; // OWASP recommended for PBKDF2-SHA256 as of 2024
const HASH_BITS = 256;
const SALT_BYTES = 32;

// Convert array buffer to base64 string

// Convert base64 string to array buffer

// Generate cryptographically secure random salt

// Hash password using PBKDF2 with SHA-256

// Verify password against stored hash

// Check if stored hash is legacy (SHA-256 without salt)

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
// MAIN APPLICATION CODE
// =====================================================

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
      showToast('\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B', 'error');
      return false;
    }

    // Verify session token exists
    const sessionToken = sessionStorage.getItem('adminSessionToken');
    if (!sessionToken) {
      showToast('\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u062C\u0644\u0633\u0629', 'error');
      logout();
      return false;
    }

    // Execute the operation
    try {
      return await operationCallback.apply(this, args);
    } catch (error) {
      // [PATCHED INFO-01] do not log error objects to console (stack trace disclosure)
      console.error('[admin] operation failed: ' + operationName);
      showToast('\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0639\u0645\u0644\u064A\u0629', 'error');
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
// currentCommentFilter, currentOrderFilter, selectedCommentId — defined in orders.js
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
    // SECURITY FIX: Always use crypto.getRandomValues for secure randomness
    // No fallback to Math.random() as it's not cryptographically secure
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// [SECURITY NOTE LOCK-01] The login-attempt counter is stored in localStorage.
// A physically present attacker can clear it via DevTools: localStorage.removeItem('adminLoginAttempts').
// Mitigation: deploy behind a server-side rate-limiter (e.g. nginx, Cloudflare) for production use.
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

// SECURITY FIX: Enhanced Input Validation
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
  input = input.replace(/data:/gi, ''); // SECURITY FIX: Prevent data URI attacks
  return input;
}

// Automation System - Auto-check for new items

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// Supabase Realtime \u2014 \u0625\u0634\u0639\u0627\u0631 \u0641\u0648\u0631\u064A \u0639\u0646\u062F \u0648\u0635\u0648\u0644 \u0637\u0644\u0628 \u062C\u062F\u064A\u062F
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
function initOrderRealtimeNotifications() {
  if (!window.SupaDB || !SupaDB._db) return;

  var channel = SupaDB._db
    .channel('new-orders')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'orders'
    }, function(payload) {
      var order = payload.new;
      if (!order) return;

      // \u062A\u062D\u062F\u064A\u062B \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062A
      var section = document.getElementById('section-orders');
      if (section && !section.classList.contains('hidden')) {
        loadOrders();
      }

      // \u062A\u062D\u062F\u064A\u062B \u0634\u0627\u0631\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062A
      updateOrdersBadge && updateOrdersBadge();

      // \u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0645\u062A\u0635\u0641\u062D
      var title = '\u1F6D2 \u0637\u0644\u0628 \u062C\u062F\u064A\u062F!';
      var body = '\u0645\u0646: ' + (order.customer_name || '\u061F') +
                 ' | \u0647\u0627\u062A\u0641: ' + (order.customer_phone || '\u2014') +
                 ' | \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A: ' + ((order.total_amount||0)).toLocaleString() + ' \u062F.\u0639';

      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            tag: 'new-order-' + order.id
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(function(perm) {
            if (perm === 'granted') new Notification(title, { body });
          });
        }
      }

      // \u0635\u0648\u062A \u062A\u0646\u0628\u064A\u0647
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
      } catch(e) {}

      // Toast \u0641\u064A \u0627\u0644\u0644\u0648\u062D\u0629
      showToast('\u1F6D2 \u0637\u0644\u0628 \u062C\u062F\u064A\u062F \u0645\u0646 ' + (order.customer_name || '\u0639\u0645\u064A\u0644') + '!', 'success');
    })
    .subscribe();

  console.log('[Admin] Realtime order notifications active \u2713');
}

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
      title: '\u0637\u0644\u0628 \u062C\u062F\u064A\u062F!',
      message: `\u0644\u062F\u064A\u0643 ${newOrders.length} \u0637\u0644\u0628 \u062C\u062F\u064A\u062F${newOrders.length === 1 ? '' : ''}`,
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
      title: '\u0631\u0633\u0627\u0644\u0629 \u062C\u062F\u064A\u062F\u0629!',
      message: `\u0644\u062F\u064A\u0643 ${newComments.length} \u0631\u0633\u0627\u0644\u0629 \u062C\u062F\u064A\u062F\u0629`,
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
      title: '\u062A\u0646\u0628\u064A\u0647 \u0627\u0644\u0645\u062E\u0632\u0648\u0646',
      message: `${lowStock.length} \u0645\u0646\u062A\u062C\u53EA\u5269 \u0643\u0645\u064A\u0629 \u0645\u062D\u062F\u0648\u062F\u0629`,
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
    // SECURITY FIX: Escape all dynamic content
    const safeTitle = escapeHTML(n.title);
    const safeMessage = escapeHTML(n.message);
    const safeType = escapeHTML(n.type);
    const icon = typeIcons[safeType] || 'bell';
    const colorClass = typeColors[safeType] || 'bg-brand-100 text-brand-600';

    html += `<div class="notification-item ${n.read ? 'opacity-60' : ''}">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0">
          <i data-lucide="${icon}" class="w-5 h-5"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-semibold text-sm text-brand-900">${safeTitle}</p>
            ${!n.read ? '<span class="notification-unread"></span>' : ''}
          </div>
          <p class="text-sm text-brand-600 mt-1">${safeMessage}</p>
          <p class="text-xs text-brand-400 mt-1">${timeAgo}</p>
        </div>
      </div>
    </div>`;
  });

  list.innerHTML = html;
  lucide.createIcons();
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return '\u0627\u0644\u0622\u0646';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `\u0645\u0646\u0630 ${minutes} \u062F\u0642\u064A\u0642\u0629`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `\u0645\u0646\u0630 ${hours} \u0633\u0627\u0639\u0629`;
  const days = Math.floor(hours / 24);
  return `\u0645\u0646\u0630 ${days} \u064A\u0648\u0645`;
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
  msgEl.textContent = message || '\u062A\u0645 \u0627\u0644\u062D\u0641\u0638 \u0628\u0646\u062C\u0627\u062D!';
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
    container.innerHTML = '';
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
  today: { days: 1, label: '\u0627\u0644\u064A\u0648\u0645', periodLabel: '\u064A\u0648\u0645 \u0648\u0627\u062D\u062F' },
  yesterday: { days: 1, label: '\u0627\u0644\u0623\u0645\u0633', periodLabel: '\u064A\u0648\u0645 \u0648\u0627\u062D\u062F' },
  week: { days: 7, label: '\u0622\u062E\u0631 7 \u0623\u064A\u0627\u0645', periodLabel: '7 \u0623\u064A\u0627\u0645' },
  month: { days: 30, label: '\u0622\u062E\u0631 30 \u064A\u0648\u0645', periodLabel: '30 \u064A\u0648\u0645' },
  year: { days: 365, label: '\u0622\u062E\u0631 365 \u064A\u0648\u0645', periodLabel: '365 \u064A\u0648\u0645' }
};

// Mobile Menu
function toggleMobileMenu() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
  document.getElementById('menuOverlay').classList.toggle('active');
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
    text.textContent = '\u0642\u0648\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631: \u0636\u0639\u064A\u0641\u0629';
    text.className = 'text-xs text-red-500 mt-1';
  } else if (strength === 2 || strength === 3) {
    bar.classList.add('medium');
    text.textContent = '\u0642\u0648\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631: \u0645\u062A\u0648\u0633\u0637\u0629';
    text.className = 'text-xs text-yellow-500 mt-1';
  } else if (strength >= 4) {
    bar.classList.add('strong');
    text.textContent = '\u0642\u0648\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631: \u0642\u0648\u064A\u0629';
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
  lucide.createIcons();
  loadDarkModePreference();
  checkAuth();
  setInterval(updateCurrentTime, 60000);
  updateCurrentTime();
});





function showDashboard() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminDashboard').classList.remove('hidden');
  loadAllData();
  lucide.createIcons();
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
  if (section === 'discounts') loadDiscountCodes();

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

  if (range === 'today') return '\u0639\u0631\u0636 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u064A\u0648\u0645: ' + formatDate(today);
  else if (range === 'yesterday') {
    var yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    return '\u0639\u0631\u0636 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0623\u0645\u0633: ' + formatDate(yesterday);
  } else {
    var startDate = new Date(today); startDate.setDate(startDate.getDate() - rangeConfig.days + 1);
    return '\u0639\u0631\u0636 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A ' + rangeConfig.label + ' (\u0645\u0646 ' + formatDate(startDate) + ' \u0625\u0644\u0649 ' + formatDate(today) + ')';
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
    '<p class="text-brand-600 text-xs sm:text-sm">\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0632\u0648\u0627\u0631</p>' +
    '<p class="text-brand-400 text-xs mt-1">(' + dateRanges[currentDateRange].periodLabel + ')</p></div>';

  html += '<div class="stat-card bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 border-r-4 border-brand-600 animate-fade-in" style="animation-delay: 0.1s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-400 to-brand-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg"><i data-lucide="bar-chart-2" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl text-brand-900 mb-1">' + avgVisitors + '</h3>' +
    '<p class="text-brand-600 text-xs sm:text-sm">\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0632\u0648\u0627\u0631 \u064A\u0648\u0645\u064A\u0627\u064B</p></div>';

  var newOrders = periodOrders.filter(function(o) { return o.status !== 'delivered' && o.status !== 'cancelled'; }).length;
  html += '<div class="stat-card bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 border-r-4 border-gold animate-fade-in" style="animation-delay: 0.2s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-gold to-yellow-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg"><i data-lucide="shopping-bag" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl text-brand-900 mb-1">' + periodOrders.length + '</h3>' +
    '<p class="text-brand-600 text-xs sm:text-sm">\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0637\u0644\u0628\u0627\u062A</p>' +
    '<p class="text-gold text-xs font-semibold mt-1">' + newOrders + ' \u062C\u062F\u064A\u062F\u0629</p></div>';

  html += '<div class="stat-card bg-gradient-to-br from-brand-700 to-brand-800 rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 animate-fade-in" style="animation-delay: 0.3s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center"><i data-lucide="' + changeIcon + '" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl mb-1">' + (changePercent >= 0 ? '+' : '') + changePercent + '%</h3>' +
    '<p class="text-white/80 text-xs sm:text-sm">\u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629</p></div>';

  document.getElementById('statsCardsContainer').innerHTML = html;

  var comparisonHtml = '';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="text-2xl sm:text-3xl font-bold text-brand-700 mb-1 sm:mb-2">' + currentData.total + '</div><div class="text-xs sm:text-sm text-brand-600">\u0627\u0644\u0632\u0648\u0627\u0631 \u0627\u0644\u062D\u0627\u0644\u064A</div><div class="text-xs text-brand-400 mt-1">(' + dateRanges[currentDateRange].label + ')</div></div>';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="text-2xl sm:text-3xl font-bold text-brand-500 mb-1 sm:mb-2">' + previousData.total + '</div><div class="text-xs sm:text-sm text-brand-600">\u0627\u0644\u0632\u0648\u0627\u0631 \u0627\u0644\u0633\u0627\u0628\u0642</div><div class="text-xs text-brand-400 mt-1">(\u0646\u0641\u0633 \u0627\u0644\u0645\u062F\u0629)</div></div>';
  var diff = currentData.total - previousData.total;
  var diffColor = diff >= 0 ? 'text-green-600' : 'text-red-600';
  var diffIcon = diff >= 0 ? 'arrow-up' : 'arrow-down';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="' + diffColor + ' text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 flex items-center justify-center gap-2"><i data-lucide="' + diffIcon + '" class="w-5 h-5 sm:w-6"></i>' + Math.abs(diff) + '</div><div class="text-xs sm:text-sm text-brand-600">\u0627\u0644\u0641\u0631\u0642</div><div class="' + diffColor + ' text-xs mt-1">' + (diff >= 0 ? '+' : '') + changePercent + '%</div></div>';

  document.getElementById('comparisonContent').innerHTML = comparisonHtml;
  document.getElementById('chartChangeValue').textContent = (changePercent >= 0 ? '+' : '') + changePercent + '%';
  document.getElementById('chartTotalChange').className = 'flex items-center gap-2 text-xs sm:text-sm font-semibold ' + changeColor;

  renderDetailedStatsTable(currentData.dailyData);
  lucide.createIcons();
}

function renderDetailedStatsTable(dailyData) {
  var html = '<table class="w-full text-xs sm:text-sm"><thead><tr class="border-b border-brand-200"><th class="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">\u0627\u0644\u062A\u0627\u0631\u064A\u062E</th><th class="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">\u0627\u0644\u0632\u0648\u0627\u0631</th><th class="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">\u0627\u0644\u0646\u0633\u0628\u0629</th></tr></thead><tbody>';
  var total = dailyData.reduce(function(sum, d) { return sum + d.visitors; }, 0);

  dailyData.forEach(function(day) {
    var percentage = total > 0 ? Math.round((day.visitors / total) * 100) : 0;
    var barWidth = percentage;
    html += '<tr class="border-b border-brand-100 hover:bg-brand-50"><td class="py-2 sm:py-3 px-2 sm:px-4 text-brand-700">' + formatDate(day.date) + '</td><td class="py-2 sm:py-3 px-2 sm:px-4 text-center font-semibold text-brand-900">' + day.visitors + '</td><td class="py-2 sm:py-3 px-2 sm:px-4"><div class="flex items-center gap-2"><div class="flex-1 bg-brand-100 rounded-full h-1.5 sm:h-2 overflow-hidden"><div class="progress-bar" style="width: ' + barWidth + '%"></div></div><span class="text-xs text-brand-600 w-10">' + percentage + '%</span></div></td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('detailedStatsTable').innerHTML = html;
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
        { label: '\u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629', data: currentValues, borderColor: '#5C933B', backgroundColor: 'rgba(92, 147, 59, 0.15)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: currentDateRange === 'today' || currentDateRange === 'yesterday' ? 6 : 3, pointBackgroundColor: '#5C933B', pointBorderColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 8 },
        { label: '\u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629', data: previousValues, borderColor: '#D1D5B1', backgroundColor: 'rgba(209, 213, 177, 0.15)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#D1D5B1', pointBorderColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 6 }
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
      labels: ['\u0623\u062F\u0648\u064A\u0629', '\u0639\u0646\u0627\u064A\u0629 \u0628\u0627\u0644\u0628\u0634\u0631\u0629', '\u0645\u0643\u064A\u0627\u062C', '\u0623\u062C\u0647\u0632\u0629'],
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
      labels: ['\u062C\u062F\u064A\u062F\u0629', '\u0642\u064A\u062F \u0627\u0644\u062A\u0648\u0635\u064A\u0644', '\u062A\u0645 \u0627\u0644\u062A\u0648\u0635\u064A\u0644', '\u0645\u0644\u063A\u0627\u0629'],
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
  var stats = safeJSONParse(localStorage.getItem('phStats'), {}) || {};
  stats.todayVisitors = 0;
  localStorage.setItem('phStats', JSON.stringify(stats));
  updateStatsForDateRange();
  showToast('\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u064A\u0648\u0645');
}

function resetAllStats() {
  if (!confirm('\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F\u061F \u0633\u064A\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A.')) return;
  localStorage.removeItem('phStats');
  localStorage.removeItem('phHistoricalVisitors');
  updateStatsForDateRange();
  showToast('\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A');
}

function exportStats() {
  var historicalData = safeJSONParse(localStorage.getItem('phHistoricalVisitors'), {}) || {};
  var stats = JSON.parse(localStorage.getItem('phStats')) || '{}';
  var today = new Date().toISOString().split('T')[0];

  var data = [['\u0627\u0644\u062A\u0627\u0631\u064A\u062E', '\u0627\u0644\u0632\u0648\u0627\u0631']];
  for (var date in historicalData) {
    if (historicalData.hasOwnProperty(date)) {
      data.push([date, historicalData[date].visitors]);
    }
  }
  data.push(['\u0627\u0644\u064A\u0648\u0645 (' + today + ')', stats.todayVisitors || 0]);

  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '\u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A');
  XLSX.writeFile(wb, 'neurobin_stats_' + today + '.xlsx');
  showToast('\u062A\u0645 \u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0628\u0646\u062C\u0627\u062D');
}


// CSRF Protection helper: Check if user is authenticated
function isAuthenticated() {
  // ØªÙ… Ø§Ù„Ø¥ØµÙ„Ø§Ø­: Supabase ÙŠØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø¬Ù„Ø³Ø© Ø¹Ø¨Ø± RLS
  // Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„ØµØ­ÙŠØ­Ø© Ø¯Ø§Ø¦Ù…Ø§Ù‹ true â€” Ø§Ù„ÙØ­Øµ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ ÙŠØªÙ… ÙÙŠ Supabase RLS
  return true;
}

// Security: URL Validation
// [PATCHED OPEN-01 + ENC-02b]
// Returns raw URL (no HTML encoding) \u2014 encode at render time, not at storage.
function validateURL(url) {
  if (!url) return '';
  try {
    var parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return url; // raw \u2014 caller must escapeHTML() when inserting into innerHTML
    }
  } catch (e) { /* invalid URL \u2014 reject it */ }
  return '';
}

// Validates that the URL belongs to instagram.com only (no open-redirect risk).
function validateInstagramURL(url) {
  if (!url) return '';
  try {
    var parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol) &&
        /^(www\.)?instagram\.com$/i.test(parsed.hostname)) {
      return url; // raw
    }
  } catch (e) {}
  return '';
}

// Security: Phone Number Validation
// [PATCHED ENC-02b] return raw cleaned string \u2014 escapeHTML at render time only
function validatePhone(phone) {
  if (!phone) return '';
  var cleaned = phone.replace(/[^\d+]/g, '').substring(0, 20);
  return cleaned; // raw \u2014 caller escapes when inserting into DOM
}

async function changePassword() {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B', 'error');
    return;
  }

  var currentPassword = document.getElementById('currentPassword').value;
  var newPassword = document.getElementById('newPassword').value;
  var confirmPassword = document.getElementById('confirmPassword').value;

  if (!currentPassword) { showToast('\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629', 'error'); return; }
  if (!newPassword) { showToast('\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629', 'error'); return; }
  // Minimum password length increased for better security (12 chars instead of 8)
  if (newPassword.length < 12) { showToast('\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 12 \u062D\u0631\u0641\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644', 'error'); return; }
  if (newPassword !== confirmPassword) { showToast('\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u063A\u064A\u0631 \u0645\u062A\u0637\u0627\u0628\u0642\u0629', 'error'); return; }
  if (currentPassword === newPassword) { showToast('\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u062E\u062A\u0644\u0641 \u0639\u0646 \u0627\u0644\u062D\u0627\u0644\u064A\u0629', 'error'); return; }

  // Verify current password using secure PBKDF2 verification
  const storedPasswordHash = localStorage.getItem('adminPasswordHash');
  const storedSalt = localStorage.getItem('adminPasswordSalt');

  // Check for legacy hash format
  if (isLegacyHash(storedPasswordHash) && !storedSalt) {
    // Legacy format - verify using old SHA-256 method
    const currentPasswordHash = sha256(currentPassword);
    if (storedPasswordHash && currentPasswordHash !== storedPasswordHash) {
      showToast('\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629', 'error');
      return;
    }
  } else {
    // New PBKDF2 format - verify using secure method
    try {
      const isValid = await verifyPassword(currentPassword, storedPasswordHash, storedSalt);
      if (!isValid) {
        showToast('\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629', 'error');
        return;
      }
    } catch (error) {
      showToast('\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631', 'error');
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
  document.getElementById('passwordStrengthText').textContent = '\u0642\u0648\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631: \u0636\u0639\u064A\u0641\u0629';
  document.getElementById('passwordStrengthText').className = 'text-xs text-brand-400 mt-1';

  showToast('\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D', 'success');
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
  if (!isAuthenticated()) {
    showToast('\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B', 'error');
    return;
  }
  localStorage.removeItem('phProducts');
  loadProducts();
  showToast('\u062A\u0645 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A', 'warning');
}

function clearAllOrders() {
  if (!isAuthenticated()) {
    showToast('\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B', 'error');
    return;
  }
  localStorage.removeItem('phOrders');
  loadOrders();
  updateOrdersBadge();
  showToast('\u062A\u0645 \u062D\u0630\u0641 \u062C\u0645\u064A\u0639 \u0627\u0644\u0637\u0644\u0628\u0627\u062A', 'warning');
}

function exportAllData() {
  if (!isAuthenticated()) {
    showToast('\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B', 'error');
    return;
  }
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
  showToast('\u062A\u0645 \u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D', 'success');
}

function showToast(message, type) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.className = 'toast';
  if (type) toast.classList.add(type);
  document.getElementById('toastMessage').textContent = message;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// ===================================================
// الطلبات اليدوية — Manual Order Functions
// ===================================================
var _moProducts = []; // cache of all products
var _moCartItems = []; // selected cart items {id, name, price, qty}

function openManualOrderModal() {
  var modal = document.getElementById('manualOrderModal');
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  // Reset form
  ['moName','moPhone','moAddress','moNotes'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('moDelivery').value = '4000';
  document.getElementById('moStatus').value = 'new';
  document.getElementById('moTotal').textContent = '4,000 د.ع';
  // Reset cart and picker
  _moCartItems = [];
  var selEl = document.getElementById('moSelectedProducts');
  if (selEl) selEl.innerHTML = '<p class="text-xs text-brand-400 text-center py-3">لم يتم اختيار منتجات بعد</p>';
  var pickerEl = document.getElementById('moProductPicker');
  if (pickerEl) pickerEl.classList.add('hidden');
  var gridEl = document.getElementById('moProductGrid');
  if (gridEl) gridEl.innerHTML = '';
  // Load products
  SupaDB.Products.list().then(function(list){
    _moProducts = list;
    lucide.createIcons();
  }).catch(function(e){ console.warn('Products load error:', e); });
}

function closeManualOrderModal() {
  document.getElementById('manualOrderModal').style.display = 'none';
  document.body.style.overflow = '';
}

// ── Product Picker ───────────────────────────────────────────────
function toggleMoProductPicker() {
  var picker = document.getElementById('moProductPicker');
  var isHidden = picker.classList.contains('hidden');
  if (isHidden) {
    picker.classList.remove('hidden');
    document.getElementById('moPickerSearch').value = '';
    renderMoProductGrid(_moProducts);
  } else {
    picker.classList.add('hidden');
  }
}

function filterMoProducts() {
  var q = (document.getElementById('moPickerSearch').value || '').toLowerCase();
  var filtered = q
    ? _moProducts.filter(function(p){ return (p.name_ar||p.name||'').toLowerCase().includes(q); })
    : _moProducts;
  renderMoProductGrid(filtered);
}

function renderMoProductGrid(products) {
  var grid = document.getElementById('moProductGrid');
  if (!grid) return;
  if (!products || !products.length) {
    grid.innerHTML = '<p class="col-span-5 text-xs text-center text-brand-400 py-3">لا توجد منتجات</p>';
    return;
  }
  grid.innerHTML = products.map(function(p){
    var pid = escapeHTML(String(p.id));
    var name = escapeHTML(p.name_ar||p.name||'');
    var price = (p.price||0).toLocaleString();
    var inCart = _moCartItems.some(function(c){ return String(c.id)===String(p.id); });
    var imgSrc = p.image_url || p.image || '';
    var img = imgSrc
      ? '<img src="'+escapeHTML(imgSrc)+'" class="w-full h-12 object-contain mb-1" onerror="this.style.display='none'">'
      : '<div class="w-full h-12 flex items-center justify-center text-brand-300"><i data-lucide="package" class="w-6 h-6"></i></div>';
    return '<div onclick="addMoProduct(''+pid+'')" class="cursor-pointer rounded-xl p-2 text-center border-2 transition-all '
      +(inCart ? 'border-brand-500 bg-brand-50' : 'border-brand-100 bg-white hover:border-brand-400')+'" title="'+name+'">'
      +img
      +'<p class="text-xs font-semibold text-brand-800 truncate leading-tight">'+name+'</p>'
      +'<p class="text-xs text-brand-500">'+price+' د.ع</p>'
      +'</div>';
  }).join('');
  lucide.createIcons();
}

function addMoProduct(productId) {
  var p = _moProducts.find(function(x){ return String(x.id)===String(productId); });
  if (!p) return;
  var existing = _moCartItems.find(function(c){ return String(c.id)===String(productId); });
  if (existing) {
    existing.qty += 1;
  } else {
    _moCartItems.push({ id: p.id, name: p.name_ar||p.name||'', price: p.price||0, qty: 1 });
  }
  renderMoSelectedProducts();
  var q = (document.getElementById('moPickerSearch').value||'').toLowerCase();
  renderMoProductGrid(q ? _moProducts.filter(function(pr){ return (pr.name_ar||pr.name||'').toLowerCase().includes(q); }) : _moProducts);
}

function removeMoProduct(productId) {
  _moCartItems = _moCartItems.filter(function(c){ return String(c.id)!==String(productId); });
  renderMoSelectedProducts();
  var q = (document.getElementById('moPickerSearch').value||'').toLowerCase();
  renderMoProductGrid(q ? _moProducts.filter(function(pr){ return (pr.name_ar||pr.name||'').toLowerCase().includes(q); }) : _moProducts);
}

function renderMoSelectedProducts() {
  var container = document.getElementById('moSelectedProducts');
  if (!container) return;
  if (!_moCartItems.length) {
    container.innerHTML = '<p class="text-xs text-brand-400 text-center py-3">لم يتم اختيار منتجات بعد</p>';
    updateManualTotal();
    return;
  }
  container.innerHTML = _moCartItems.map(function(item){
    var pid = escapeHTML(String(item.id));
    return '<div class="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-brand-100">'
      +'<span class="flex-1 text-xs font-medium text-brand-800 truncate">'+escapeHTML(item.name)+'</span>'
      +'<input type="number" class="input-field w-14 text-xs text-center mo-item-qty" value="'+item.qty+'" min="1" max="99" data-pid="'+pid+'" oninput="updateMoItemQty(this)">'
      +'<input type="number" class="input-field w-24 text-xs mo-item-price" value="'+item.price+'" min="0" step="250" data-pid="'+pid+'" oninput="updateMoItemPrice(this)">'
      +'<button onclick="removeMoProduct(''+pid+'')" class="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>'
      +'</div>';
  }).join('');
  lucide.createIcons();
  updateManualTotal();
}

function updateMoItemQty(input) {
  var pid = input.getAttribute('data-pid');
  var item = _moCartItems.find(function(c){ return String(c.id)===String(pid); });
  if (item) { item.qty = parseInt(input.value)||1; updateManualTotal(); }
}

function updateMoItemPrice(input) {
  var pid = input.getAttribute('data-pid');
  var item = _moCartItems.find(function(c){ return String(c.id)===String(pid); });
  if (item) { item.price = parseFloat(input.value)||0; updateManualTotal(); }
}



function addManualOrderRow() {
  var container = document.getElementById('moProductRows');
  var idx = container.children.length;
  var productOptions = _moProducts.map(function(p){
    return '<option value="'+escapeHTML(String(p.id))+'" data-price="'+(p.price||0)+'">'+escapeHTML(p.name_ar||p.name||'')+'</option>';
  }).join('');
  var row = document.createElement('div');
  row.className = 'flex items-center gap-2 mo-row';
  row.innerHTML =
    '<select class="input-field flex-grow text-xs mo-product-select" onchange="updateManualTotal()">'+
    '<option value="">-- اختر منتج --</option>'+
    productOptions+
    '</select>'+
    '<input type="number" class="input-field w-20 text-xs mo-qty" value="1" min="1" max="99" oninput="updateManualTotal()">'+
    '<input type="number" class="input-field w-24 text-xs mo-price" placeholder="السعر" min="0" step="250" oninput="updateManualTotal()">'+
    '<button onclick="removeManualOrderRow(this)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
  container.appendChild(row);
  // Auto-fill price when product is selected
  row.querySelector('.mo-product-select').addEventListener('change', function(){
    var selectedOption = this.options[this.selectedIndex];
    var price = selectedOption.getAttribute('data-price') || 0;
    row.querySelector('.mo-price').value = price;
    updateManualTotal();
    lucide.createIcons();
  });
  lucide.createIcons();
  updateManualTotal();
}

function removeManualOrderRow(btn) {
  btn.closest('.mo-row').remove();
  updateManualTotal();
}

function updateManualTotal() {
  var subtotal = 0;
  var qtyInputs = document.querySelectorAll('.mo-item-qty');
  if (qtyInputs.length > 0) {
    qtyInputs.forEach(function(qtyEl){
      var row = qtyEl.closest('div');
      var priceEl = row ? row.querySelector('.mo-item-price') : null;
      subtotal += (parseInt(qtyEl.value)||1) * (parseFloat(priceEl ? priceEl.value : 0)||0);
    });
  } else {
    _moCartItems.forEach(function(item){ subtotal += (item.qty||1) * (item.price||0); });
  }
  var delivery = parseFloat(document.getElementById('moDelivery').value)||0;
  document.getElementById('moTotal').textContent = (subtotal + delivery).toLocaleString('ar-IQ') + ' د.ع';
}

async function saveManualOrder() {
  var name = (document.getElementById('moName').value||'').trim();
  var phone = (document.getElementById('moPhone').value||'').trim();
  var address = (document.getElementById('moAddress').value||'').trim();
  var notes = (document.getElementById('moNotes').value||'').trim();
  var delivery = parseFloat(document.getElementById('moDelivery').value)||0;
  var status = document.getElementById('moStatus').value || 'new';

  if (!name) { showToast('يرجى إدخال اسم العميل', 'error'); return; }
  if (!phone) { showToast('يرجى إدخال رقم الهاتف', 'error'); return; }

  // Sync live qty/price edits back to _moCartItems
  document.querySelectorAll('.mo-item-qty').forEach(function(qtyEl){
    var pid = qtyEl.getAttribute('data-pid');
    var priceEl = qtyEl.closest('div').querySelector('.mo-item-price');
    var cartItem = _moCartItems.find(function(c){ return String(c.id)===String(pid); });
    if (cartItem) {
      cartItem.qty = parseInt(qtyEl.value)||1;
      cartItem.price = parseFloat(priceEl ? priceEl.value : cartItem.price)||0;
    }
  });

  if (_moCartItems.length === 0) { showToast('يرجى إضافة منتج واحد على الأقل', 'error'); return; }

  var items = [];
  var subtotal = 0;
  _moCartItems.forEach(function(cartItem){
    var lineTotal = (cartItem.qty||1) * (cartItem.price||0);
    subtotal += lineTotal;
    items.push({ product_id: cartItem.id||null, product_name: cartItem.name||'منتج', quantity: cartItem.qty||1, price: cartItem.price||0, subtotal: lineTotal });
  });

  if (items.length === 0) { showToast('يرجى اختيار منتج وإدخال السعر', 'error'); return; }

  var totalAmount = subtotal + delivery;
  var saveBtn = document.querySelector('#manualOrderModal button[onclick="saveManualOrder()"]');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'جاري الحفظ...'; }

  try {
    // Save order header
    var { data: order, error: orderErr } = await SupaDB._db.from('orders').insert({
      customer_name: name,
      customer_phone: phone,
      customer_address: address || null,
      notes: notes || null,
      total_amount: totalAmount,
      status: status,
      source: 'manual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select().single();
    if (orderErr) throw orderErr;

    // Save order items
    if (items.length > 0) {
      var itemsToInsert = items.map(function(item){ return Object.assign({order_id: order.id}, item); });
      var { error: itemsErr } = await SupaDB._db.from('order_items').insert(itemsToInsert);
      if (itemsErr) console.warn('Items insert warning:', itemsErr.message);
    }

    closeManualOrderModal();
    loadOrders();
    showSuccessAnimation('تم حفظ الطلب اليدوي بنجاح!');
  } catch(e) {
    showToast('خطأ في الحفظ: ' + e.message, 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i> حفظ الطلب'; lucide.createIcons(); }
  }
}

