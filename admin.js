// =====================================================
// SECURE PASSWORD SYSTEM - PBKDF2 + AES-GCM Encrypted Storage
// الهاش لا يُخزن مكشوفاً في localStorage أبداً
// بدلاً من ذلك يُشفَّر بـ AES-GCM قبل التخزين
// =====================================================

const PBKDF2_ITERATIONS = 310000;
const HASH_BITS = 256;
const SALT_BYTES = 32;

// ---- مساعدات التحويل ----
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

// ---- PBKDF2 hashing ----
async function hashPassword(password, existingSalt = null) {
  const encoder = new TextEncoder();
  const salt = existingSalt ? new Uint8Array(existingSalt) : generateSalt();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial, HASH_BITS
  );
  return {
    hash: arrayBufferToBase64(derivedBits),
    salt: arrayBufferToBase64(salt.buffer),
    iterations: PBKDF2_ITERATIONS
  };
}

async function verifyPassword(password, storedHash, storedSalt) {
  const saltArrayBuffer = base64ToArrayBuffer(storedSalt);
  const result = await hashPassword(password, new Uint8Array(saltArrayBuffer));
  return result.hash === storedHash;
}

function isLegacyHash(storedHash) {
  return storedHash && storedHash.length === 64 && /^[a-f0-9]+$/.test(storedHash);
}

// ---- مفتاح تشفير مشتق من بصمة الجهاز ----
// المفتاح لا يُخزن — يُعاد اشتقاقه في كل زيارة من بيانات المتصفح
async function getDeviceEncryptionKey() {
  const encoder = new TextEncoder();
  // بصمة مستقرة من خصائص المتصفح (لا تتغير بين الزيارات)
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || '',
  ].join('|');

  // نستخدم PBKDF2 لاشتقاق مفتاح AES-GCM من البصمة
  const storedKeySalt = localStorage.getItem('_dks') || (() => {
    const s = arrayBufferToBase64(generateSalt().buffer);
    localStorage.setItem('_dks', s);
    return s;
  })();

  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(fingerprint), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: base64ToArrayBuffer(storedKeySalt), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ---- تشفير وفك تشفير البيانات ----
async function encryptData(plaintext) {
  const key = await getDeviceEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  // نخزن IV + ciphertext معاً
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return arrayBufferToBase64(combined.buffer);
}

async function decryptData(encryptedBase64) {
  try {
    const key = await getDeviceEncryptionKey();
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return null;
  }
}

// ---- واجهة التخزين الآمن (تحل محل localStorage المكشوف) ----
const SecureStore = {
  async savePasswordHash(hash, salt, iterations) {
    const payload = JSON.stringify({ hash, salt, iterations });
    const encrypted = await encryptData(payload);
    localStorage.setItem('_aph', encrypted); // مشفر - لا قيمة له بدون مفتاح الجهاز
    // نحذف أي بيانات قديمة مكشوفة
    localStorage.removeItem('adminPasswordHash');
    localStorage.removeItem('adminPasswordSalt');
    localStorage.removeItem('adminPasswordIterations');
  },

  async loadPasswordData() {
    // دعم الانتقال من النظام القديم
    const legacyHash = localStorage.getItem('adminPasswordHash');
    if (legacyHash) {
      // بيانات قديمة مكشوفة — نعيد تخزينها مشفرة ثم نحذفها
      const legacySalt = localStorage.getItem('adminPasswordSalt') || '';
      const legacyIter = parseInt(localStorage.getItem('adminPasswordIterations') || PBKDF2_ITERATIONS);
      await this.savePasswordHash(legacyHash, legacySalt, legacyIter);
      // savePasswordHash تحذف المفاتيح القديمة تلقائياً
    }

    const encrypted = localStorage.getItem('_aph');
    if (!encrypted) return null;
    const decrypted = await decryptData(encrypted);
    if (!decrypted) return null;
    return JSON.parse(decrypted);
  },

  async clearPasswordData() {
    localStorage.removeItem('_aph');
    localStorage.removeItem('adminPasswordHash');
    localStorage.removeItem('adminPasswordSalt');
    localStorage.removeItem('adminPasswordIterations');
  }
};

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
let currentCommentFilter = 'all';
let currentOrderFilter = 'all';
let selectedCommentId = null;
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
      message: `${lowStock.length} منتج只剩 كمية محدودة`,
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

  list.innerHTML = html;
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
  today: { days: 1, label: 'اليوم', periodLabel: 'يوم واحد' },
  yesterday: { days: 1, label: 'الأمس', periodLabel: 'يوم واحد' },
  week: { days: 7, label: 'آخر 7 أيام', periodLabel: '7 أيام' },
  month: { days: 30, label: 'آخر 30 يوم', periodLabel: '30 يوم' },
  year: { days: 365, label: 'آخر 365 يوم', periodLabel: '365 يوم' }
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
  lucide.createIcons();
  loadDarkModePreference();
  checkAuth();
  setInterval(updateCurrentTime, 60000);
  updateCurrentTime();
});

async function checkAuth() {
  if (isAccountLocked()) {
    showLoginLockedMessage(getRemainingLockoutTime());
    return;
  }

  // هل يوجد بيانات كلمة مرور مخزنة أصلاً؟
  const pwData = await SecureStore.loadPasswordData();
  if (!pwData) {
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminSessionToken');
    return;
  }

  // تحقق من توكن "تذكرني"
  const rememberRaw = localStorage.getItem('adminRememberToken');
  if (rememberRaw) {
    try {
      const tokenData = safeJSONParse(rememberRaw, {}) || {};
      const now = Date.now();
      const tokenAge = now - (tokenData.timestamp || 0);
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (tokenAge <= twentyFourHours && tokenData.token) {
        // توكن صالح — نبدأ جلسة جديدة
        _startSession();
        showDashboard();
        return;
      }
      localStorage.removeItem('adminRememberToken');
    } catch (e) {
      localStorage.removeItem('adminRememberToken');
    }
  }

  // تحقق من الجلسة الحالية
  const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
  if (isLoggedIn) {
    const sessionToken = sessionStorage.getItem('adminSessionToken');
    if (!sessionToken) { logout(); return; }

    const loginTime = parseInt(sessionStorage.getItem('adminLoginTime') || '0');
    const lastActivity = parseInt(sessionStorage.getItem('adminLastActivity') || loginTime.toString());
    const now = Date.now();
    const sessionAge = SESSION_CONFIG.ENABLE_SLIDING_EXPIRATION ? now - lastActivity : now - loginTime;

    if (sessionAge > SESSION_CONFIG.TIMEOUT_MS) { logout(); return; }

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

  if (isAccountLocked()) {
    showLoginLockedMessage(getRemainingLockoutTime());
    return;
  }

  const password = document.getElementById('loginPassword').value;

  // تحميل بيانات كلمة المرور من التخزين المشفر
  const pwData = await SecureStore.loadPasswordData();

  // الإعداد الأول — لا توجد كلمة مرور بعد
  if (!pwData) {
    if (password.length < 12) {
      document.getElementById('loginError').textContent = 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل';
      document.getElementById('loginError').classList.remove('hidden');
      setTimeout(function() { document.getElementById('loginError').classList.add('hidden'); }, 3000);
      return;
    }
    const hashResult = await hashPassword(password);
    await SecureStore.savePasswordHash(hashResult.hash, hashResult.salt, hashResult.iterations);
    recordSuccessfulLogin();
    _startSession();
    showDashboard();
    return;
  }

  // التحقق من كلمة المرور
  try {
    let isValid = false;

    if (isLegacyHash(pwData.hash) && !pwData.salt) {
      // هاش قديم — نتحقق ثم نرقّي
      const inputHash = sha256(password);
      if (inputHash === pwData.hash) {
        const hashResult = await hashPassword(password);
        await SecureStore.savePasswordHash(hashResult.hash, hashResult.salt, hashResult.iterations);
        isValid = true;
      }
    } else {
      isValid = await verifyPassword(password, pwData.hash, pwData.salt);
    }

    if (isValid) {
      recordSuccessfulLogin();
      _startSession();
      showDashboard();
    } else {
      recordFailedLogin();
      document.getElementById('loginError').classList.remove('hidden');
      document.getElementById('loginPassword').value = '';
      const attempts = getLoginAttempts();
      const remaining = MAX_LOGIN_ATTEMPTS - attempts.count;
      document.getElementById('loginError').textContent = remaining > 0
        ? 'كلمة المرور غير صحيحة. المتبقية: ' + remaining + ' محاولات.'
        : 'تم تجاوز عدد المحاولات. يرجى الانتظار 5 دقائق.';
      setTimeout(function() { document.getElementById('loginError').classList.add('hidden'); }, 5000);
    }
  } catch (error) {
    document.getElementById('loginError').textContent = 'خطأ في التحقق من كلمة المرور';
    document.getElementById('loginError').classList.remove('hidden');
    setTimeout(function() { document.getElementById('loginError').classList.add('hidden'); }, 5000);
  }
}

// دالة مساعدة — تبدأ جلسة آمنة بدون تخزين الهاش في التوكن
function _startSession() {
  const now = Date.now();
  const token = generateSecureId();
  sessionStorage.removeItem('adminLoggedIn');
  sessionStorage.removeItem('adminLoginTime');
  sessionStorage.removeItem('adminSessionToken');
  sessionStorage.setItem('adminLoggedIn', 'true');
  sessionStorage.setItem('adminLoginTime', now.toString());
  sessionStorage.setItem('adminSessionToken', token);
  // rememberToken يحتوي فقط على token عشوائي — بلا هاش
  localStorage.setItem('adminRememberToken', JSON.stringify({ timestamp: now, token: token }));
}

function logout(clearRemember) {
  sessionStorage.removeItem('adminLoggedIn');
  sessionStorage.removeItem('adminSessionToken');
  if (clearRemember === true) localStorage.removeItem('adminRememberToken');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('adminDashboard').classList.add('hidden');
  closeMobileMenu();
}

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

  document.getElementById('statsCardsContainer').innerHTML = html;

  var comparisonHtml = '';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="text-2xl sm:text-3xl font-bold text-brand-700 mb-1 sm:mb-2">' + currentData.total + '</div><div class="text-xs sm:text-sm text-brand-600">الزوار الحالي</div><div class="text-xs text-brand-400 mt-1">(' + dateRanges[currentDateRange].label + ')</div></div>';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="text-2xl sm:text-3xl font-bold text-brand-500 mb-1 sm:mb-2">' + previousData.total + '</div><div class="text-xs sm:text-sm text-brand-600">الزوار السابق</div><div class="text-xs text-brand-400 mt-1">(نفس المدة)</div></div>';
  var diff = currentData.total - previousData.total;
  var diffColor = diff >= 0 ? 'text-green-600' : 'text-red-600';
  var diffIcon = diff >= 0 ? 'arrow-up' : 'arrow-down';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="' + diffColor + ' text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 flex items-center justify-center gap-2"><i data-lucide="' + diffIcon + '" class="w-5 h-5 sm:w-6"></i>' + Math.abs(diff) + '</div><div class="text-xs sm:text-sm text-brand-600">الفرق</div><div class="' + diffColor + ' text-xs mt-1">' + (diff >= 0 ? '+' : '') + changePercent + '%</div></div>';

  document.getElementById('comparisonContent').innerHTML = comparisonHtml;
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
  var stats = safeJSONParse(localStorage.getItem('phStats'), {}) || {};
  stats.todayVisitors = 0;
  localStorage.setItem('phStats', JSON.stringify(stats));
  updateStatsForDateRange();
  showToast('تم إعادة تعيين إحصائيات اليوم');
}

function resetAllStats() {
  if (!confirm('هل أنت متأكد؟ سيتم إعادة تعيين جميع الإحصائيات.')) return;
  localStorage.removeItem('phStats');
  localStorage.removeItem('phHistoricalVisitors');
  updateStatsForDateRange();
  showToast('تم إعادة تعيين جميع الإحصائيات');
}

function exportStats() {
  var historicalData = safeJSONParse(localStorage.getItem('phHistoricalVisitors'), {}) || {};
  var stats = JSON.parse(localStorage.getItem('phStats')) || '{}';
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
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  var currentPassword = document.getElementById('currentPassword').value;
  var newPassword = document.getElementById('newPassword').value;
  var confirmPassword = document.getElementById('confirmPassword').value;

  if (!currentPassword) { showToast('يرجى إدخال كلمة المرور الحالية', 'error'); return; }
  if (!newPassword) { showToast('يرجى إدخال كلمة المرور الجديدة', 'error'); return; }
  if (newPassword.length < 12) { showToast('كلمة المرور يجب أن تكون 12 حرفاً على الأقل', 'error'); return; }
  if (newPassword !== confirmPassword) { showToast('كلمة المرور الجديدة غير متطابقة', 'error'); return; }
  if (currentPassword === newPassword) { showToast('كلمة المرور الجديدة يجب أن تختلف عن الحالية', 'error'); return; }

  const pwData = await SecureStore.loadPasswordData();
  if (!pwData) { showToast('خطأ: لا توجد بيانات كلمة مرور', 'error'); return; }

  try {
    let isValid = false;
    if (isLegacyHash(pwData.hash) && !pwData.salt) {
      isValid = (sha256(currentPassword) === pwData.hash);
    } else {
      isValid = await verifyPassword(currentPassword, pwData.hash, pwData.salt);
    }

    if (!isValid) {
      showToast('كلمة المرور الحالية غير صحيحة', 'error');
      return;
    }
  } catch (error) {
    showToast('خطأ في التحقق من كلمة المرور', 'error');
    return;
  }

  const hashResult = await hashPassword(newPassword);
  await SecureStore.savePasswordHash(hashResult.hash, hashResult.salt, hashResult.iterations);

  // تحديث توكن "تذكرني" بدون هاش
  localStorage.setItem('adminRememberToken', JSON.stringify({ timestamp: Date.now(), token: generateSecureId() }));

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
    container.innerHTML = '<div class="text-center py-12 text-brand-400">لا توجد مميزات. أضف مميزة جديدة.</div>';
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
      '<button data-action="editFeature" data-id="' + f.id + '" class="p-2 hover:bg-brand-100 rounded-lg transition-colors"><i data-lucide="edit" class="w-5 h-5 text-brand-600"></i></button>' +
      '<button data-action="deleteFeature" data-id="' + f.id + '" class="p-2 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-5 h-5 text-red-500"></i></button>' +
      '</div></div>';
  });
  container.innerHTML = html;
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

  localStorage.setItem('phFeatures', JSON.stringify(features));
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
  var features = safeJSONParse(localStorage.getItem('phFeatures'), []) || [];
  features = features.filter(function(f) { return f.id !== id; });
  localStorage.setItem('phFeatures', JSON.stringify(features));
  loadFeatures();
  showToast('تم حذف الميزة', 'warning');
}

function loadProducts(filter) {
  var products = safeJSONParse(localStorage.getItem('phProducts'), []) || [];
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
    container.innerHTML = '<div class="col-span-full text-center py-12 text-brand-400">لا توجد منتجات</div>';
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
      '<button data-action="toggleQuickEdit" data-id="' + p.id + '" class="quick-action bg-brand-100 text-brand-600 hover:bg-brand-200 quick-edit-btn" title="تعديل سريع"><i data-lucide="edit-2" class="w-4 h-4"></i></button>' +
      '<button data-action="editProduct" data-id="' + p.id + '" class="quick-action bg-blue-100 text-blue-600 hover:bg-blue-200" title="تعديل كامل"><i data-lucide="edit" class="w-4 h-4"></i></button>' +
      '<button data-action="deleteProduct" data-id="' + p.id + '" class="quick-action bg-red-100 text-red-500 hover:bg-red-200"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
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
      '<button data-action="saveQuickEdit" data-id="' + p.id + '" class="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors">حفظ</button>' +
      '<button data-action="toggleQuickEdit" data-id="' + p.id + '" class="px-3 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">إلغاء</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div></div>';
  });

  container.innerHTML = html;
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
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  var name = validateInput(document.getElementById('qe-name-' + id).value.trim(), 200);
  var price = parseInt(document.getElementById('qe-price-' + id).value);
  var stock = document.getElementById('qe-stock-' + id).value;

  if (!name) {
    showToast('يرجى إدخال اسم المنتج', 'error');
    return;
  }
  if (!price || price < 0) {
    showToast('يرجى إدخال سعر صحيح', 'error');
    return;
  }

  var products = safeJSONParse(localStorage.getItem('phProducts'), []) || [];
  var index = products.findIndex(function(p) { return p.id === id; });

  if (index > -1) {
    products[index].name = escapeHTML(name);
    products[index].price = price;
    products[index].stock = stock ? parseInt(stock) : undefined;

    localStorage.setItem('phProducts', JSON.stringify(products));

    // Update the view without reload
    var viewEl = document.getElementById('product-view-' + id);
    var editEl = document.getElementById('product-edit-' + id);
    var cardEl = document.querySelector('[data-product-id="' + id + '"]');

    var stockClass = products[index].stock > 5 ? 'text-green-600' : products[index].stock > 0 ? 'text-yellow-600' : 'text-red-600';
    var stockText = products[index].stock > 0 ? 'المخزون: ' + products[index].stock : 'غير متوفر';
    var stockDisplay = products[index].stock !== undefined ? '<p class="text-xs ' + stockClass + '">' + stockText + '</p>' : '';

    var safeName = escapeHTML(name);
    viewEl.innerHTML = '<h3 class="font-bold text-brand-900 mb-2">' + safeName + '</h3>' +
      '<p class="text-brand-600 text-sm mb-3">' + price.toLocaleString() + ' د.ع</p>' +
      stockDisplay;

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

function searchProducts() {
  var activeFilter = document.querySelector('#section-products .tab-btn.active');
  var filter = activeFilter ? activeFilter.dataset.filter : 'all';
  loadProducts(filter);
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

function saveProduct() {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  var name = validateInput(document.getElementById('productName').value.trim(), 200);
  var price = parseInt(document.getElementById('productPrice').value);
  var stock = document.getElementById('productStock').value;

  if (!name) {
    showToast('يرجى إدخال اسم المنتج', 'error');
    return;
  }
  if (!price || price < 0) {
    showToast('يرجى إدخال سعر صحيح', 'error');
    return;
  }

  var products = safeJSONParse(localStorage.getItem('phProducts'), []) || [];
  var id = document.getElementById('productId').value;

  var safeName = escapeHTML(name);
  var safeDesc = escapeHTML(document.getElementById('productDesc').value.trim());

  var productData = {
    id: id ? parseInt(id) : Date.now(),
    name: safeName,
    nameAr: safeName,
    category: escapeHTML(document.getElementById('productCategory').value),
    price: price,
    stock: stock ? parseInt(stock) : undefined,
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

  localStorage.setItem('phProducts', JSON.stringify(products));
  closeProductModal();
  loadProducts();
  showSuccessAnimation('تم حفظ المنتج بنجاح!', true);
}

function deleteProduct(id) {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  var products = safeJSONParse(localStorage.getItem('phProducts'), []) || [];
  products = products.filter(function(p) { return p.id !== id; });
  localStorage.setItem('phProducts', JSON.stringify(products));
  loadProducts();
  showToast('تم حذف المنتج', 'warning');
}

function loadTestimonials() {
  var testimonials = safeJSONParse(localStorage.getItem('phTestimonials'), []) || [];
  var container = document.getElementById('testimonialsList');

  if (testimonials.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-12 text-brand-400">لا توجد آراء</div>';
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
      '<button data-action="editTestimonial" data-id="' + t.id + '" class="quick-action bg-brand-100 text-brand-600 hover:bg-brand-200"><i data-lucide="edit" class="w-4 h-4"></i></button>' +
      '<button data-action="deleteTestimonial" data-id="' + t.id + '" class="quick-action bg-red-100 text-red-500 hover:bg-red-200"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
      '</div></div></div>';
  });

  container.innerHTML = html;
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
      '<button data-action="updateOrderStatus" data-order-id="' + escapeHTML(orderId.toString()) + '" data-param="progress" class="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors">قيد التوصيل</button>' +
      '<button data-action="updateOrderStatus" data-order-id="' + escapeHTML(orderId.toString()) + '" data-param="delivered" class="flex-1 bg-green-100 text-green-700 py-2 rounded-lg text-sm font-semibold hover:bg-green-200 transition-colors">تم التوصيل</button>' +
      '<button data-action="updateOrderStatus" data-order-id="' + escapeHTML(orderId.toString()) + '" data-param="cancelled" class="flex-1 bg-red-100 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors">إلغاء</button>' +
      '</div></div>';
  });

  container.innerHTML = html;
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

function searchOrders() {
  loadOrders();
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
  var maxSessionTime = 8 * 60 * 60 * 1000;
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
      '<button data-action="openViewComment" data-id="' + comment.id + '" class="bg-brand-100 text-brand-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-200 transition-colors">عرض التفاصيل</button>' +
      '</div></div>';
  });

  container.innerHTML = html;
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
  details.innerHTML = '<div class="bg-brand-50 rounded-lg p-4"><p class="text-sm text-brand-600 mb-2">الاسم: <span class="font-semibold text-brand-900">' + escapeHTML(comment.name) + '</span></p><p class="text-sm text-brand-600 mb-2">الهاتف: <span class="font-semibold text-brand-900">' + escapeHTML(comment.phone || 'غير محدد') + '</span></p><p class="text-sm text-brand-600">التاريخ: <span class="font-semibold text-brand-900">' + new Date(comment.date).toLocaleDateString('ar-EG') + '</span></p></div><div class="mt-4"><p class="font-semibold text-brand-700 mb-2">الرسالة:</p><p class="text-brand-600 leading-relaxed">' + escapeHTML(comment.message) + '</p></div>';
  document.getElementById('replyMessage').value = '';

  document.getElementById('viewCommentModal').classList.add('active');
}

function closeViewCommentModal() {
  document.getElementById('viewCommentModal').classList.remove('active');
}

function markAsRead() {
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
  localStorage.removeItem('phProducts');
  loadProducts();
  showToast('تم حذف جميع المنتجات', 'warning');
}

function clearAllOrders() {
  localStorage.removeItem('phOrders');
  loadOrders();
  updateOrdersBadge();
  showToast('تم حذف جميع الطلبات', 'warning');
}

function exportAllData() {
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

function showToast(message, type) {
  var toast = document.getElementById('toast');
  toast.className = 'toast';
  if (type) toast.classList.add(type);
  document.getElementById('toastMessage').textContent = message;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// =====================================================
// CSP-SAFE EVENT DISPATCHER (replaces all inline onclick)
// =====================================================
document.addEventListener('DOMContentLoaded', function() {

  // ── Click delegation ────────────────────────────
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const param  = btn.dataset.param  || null;
    const id     = btn.dataset.id     ? parseInt(btn.dataset.id, 10) : null;
    const orderId = btn.dataset.orderId || null;

    switch (action) {
      case 'showSection':              if (param) showSection(param); break;
      case 'toggleMobileMenu':         toggleMobileMenu(); break;
      case 'closeMobileMenu':          closeMobileMenu(); break;
      case 'toggleNotifications':      toggleNotifications(); break;
      case 'logout':                   logout(true); break;

      case 'setDateRange':             if (param) setDateRange(param); break;
      case 'resetTodayStats':          resetTodayStats(); break;
      case 'resetAllStats':            resetAllStats(); break;
      case 'exportStats':              exportStats(); break;

      case 'filterOrders':             if (param) filterOrders(param); break;
      case 'openOrderModal':           if (id !== null) openOrderModal(id); break;
      case 'updateOrderStatus':
        if (orderId && param) updateOrderStatus(orderId, param); break;

      case 'filterComments':           if (param) filterComments(param); break;
      case 'openViewComment':          if (id !== null) openViewComment(id); break;
      case 'closeViewCommentModal':    closeViewCommentModal(); break;
      case 'markAsRead':               markAsRead(); break;
      case 'markAsReplied':            markAsReplied(); break;
      case 'deleteComment':            deleteComment(); break;

      case 'saveSettings':             saveSettings(); break;
      case 'changePassword':           changePassword(); break;
      case 'exportAllData':            exportAllData(); break;
      case 'clearAllProducts':
        if (confirm('هل أنت متأكد؟ سيتم حذف جميع المنتجات!')) clearAllProducts(); break;
      case 'clearAllOrders':
        if (confirm('هل أنت متأكد؟ سيتم حذف جميع الطلبات!')) clearAllOrders(); break;

      case 'togglePasswordVisibility': if (param) togglePasswordVisibility(param); break;

      case 'openProductModal':         openProductModal(); break;
      case 'filterProductsAdmin':      if (param) filterProductsAdmin(param); break;
      case 'editProduct':              if (id !== null) editProduct(id); break;
      case 'deleteProduct':            if (id !== null) deleteProduct(id); break;
      case 'saveProduct':              saveProduct(); break;
      case 'closeProductModal':        closeProductModal(); break;
      case 'triggerImageUpload':
        document.getElementById('productImageFile').click(); break;
      case 'removeImage':              removeImage(); break;
      case 'toggleQuickEdit':          if (id !== null) toggleQuickEdit(id); break;
      case 'saveQuickEdit':            if (id !== null) saveQuickEdit(id); break;

      case 'openTestimonialModal':     openTestimonialModal(); break;
      case 'editTestimonial':          if (id !== null) editTestimonial(id); break;
      case 'deleteTestimonial':        if (id !== null) deleteTestimonial(id); break;
      case 'saveTestimonial':          saveTestimonial(); break;
      case 'closeTestimonialModal':    closeTestimonialModal(); break;

      case 'editFeature':              if (id !== null) editFeature(id); break;
      case 'deleteFeature':            if (id !== null) deleteFeature(id); break;
      case 'saveFeature':              saveFeature(); break;
      case 'closeFeatureModal':        closeFeatureModal(); break;
    }
  });

  // ── Form submit ────────────────────────────────
  const loginForm = document.querySelector('#loginScreen form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  // ── Input events ───────────────────────────────
  const orderSearch = document.getElementById('orderSearch');
  if (orderSearch) orderSearch.addEventListener('input', searchOrders);

  const productSearch = document.getElementById('productSearch');
  if (productSearch) productSearch.addEventListener('input', searchProducts);

  const newPassword = document.getElementById('newPassword');
  if (newPassword) newPassword.addEventListener('input', function() {
    updatePasswordStrength(this.value);
  });

  const imageFile = document.getElementById('productImageFile');
  if (imageFile) imageFile.addEventListener('change', function() {
    handleImageUpload(this);
  });
});
