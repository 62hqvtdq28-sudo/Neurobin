// ════════════════════════════════════════════════════════════════
// Fallback implementations — used ONLY if admin-security.js fails
// to load (e.g. Safari/iOS timing or CSP issue).
// These are overridden automatically if admin-security.js runs first.
// ════════════════════════════════════════════════════════════════
(function installFallbacks() {
  // ── Security/ID helpers ──────────────────────────────────────
  if (typeof generateSecureId === 'undefined') {
    window.generateSecureId = function() {
      var arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      return Array.from(arr).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
    };
  }
  // ── JSON helpers ─────────────────────────────────────────────
  if (typeof safeJSONParse === 'undefined') {
    window.safeJSONParse = function(str, fallback) {
      try { return JSON.parse(str) || fallback; }
      catch(e) { return fallback != null ? fallback : null; }
    };
  }
  // ── HTML sanitization (critical for rendering products/orders) ─
  if (typeof escapeHTML === 'undefined') {
    window.escapeHTML = function(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    };
  }
  if (typeof sanitizeHTML === 'undefined') {
    window.sanitizeHTML = function(str) {
      if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(str);
      return window.escapeHTML(str);
    };
  }
  if (typeof safeSanitize === 'undefined') {
    window.safeSanitize = function(str) { return window.escapeHTML(str); };
  }
  // ── Input validation ──────────────────────────────────────────
  if (typeof validateInput === 'undefined') {
    window.validateInput = function(value, maxLength) {
      if (!value) return '';
      return String(value).substring(0, maxLength || 500);
    };
  }
  if (typeof validateNumber === 'undefined') {
    window.validateNumber = function(value, min, max) {
      var n = parseFloat(value);
      if (isNaN(n)) return 0;
      if (min != null && n < min) return min;
      if (max != null && n > max) return max;
      return n;
    };
  }
  // ── Lockout helpers ───────────────────────────────────────────
  if (typeof isAccountLocked === 'undefined') {
    window.isAccountLocked = function() { return false; };
  }
  if (typeof getRemainingLockoutTime === 'undefined') {
    window.getRemainingLockoutTime = function() { return 0; };
  }
  if (typeof recordAttempt === 'undefined') {
    window.recordAttempt = function() {};
  }
  if (typeof recordSuccessfulLogin === 'undefined') {
    window.recordSuccessfulLogin = function() {};
  }
  // ── Password helpers (localStorage fallback path) ─────────────
  if (typeof isLegacyHash === 'undefined') {
    window.isLegacyHash = function(h) { return !!(h && h.length === 64 && !/[^0-9a-f]/i.test(h)); };
  }
  if (typeof hashPassword === 'undefined') {
    window.hashPassword = async function(password) {
      var salt = window.generateSecureId();
      var enc = new TextEncoder().encode(password + salt);
      var buf = await crypto.subtle.digest('SHA-256', enc);
      var hash = Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
      return { hash: hash, salt: salt, iterations: 1 };
    };
  }
  if (typeof verifyPassword === 'undefined') {
    window.verifyPassword = async function(password, hash, salt) {
      var enc = new TextEncoder().encode(password + (salt || ''));
      var buf = await crypto.subtle.digest('SHA-256', enc);
      var h = Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
      return h === hash;
    };
  }
  if (typeof showLoginLockedMessage === 'undefined') {
    window.showLoginLockedMessage = function(ms) {
      var e = document.getElementById('loginError');
      if (e) {
        var mins = Math.max(1, Math.ceil((ms||0)/60000));
        e.textContent = 'الحساب مقفل مؤقتاً. حاول بعد ' + mins + ' دقيقة.';
        e.classList.remove('hidden');
      }
    };
  }
})();

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
  // Security: block hamburger menu when dashboard is hidden (login screen)
  var dashboard = document.getElementById('adminDashboard');
  if (!dashboard || dashboard.classList.contains('hidden')) return;
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

  // ✅ FIX: Check Supabase session FIRST — persists across page refreshes
  // Supabase SDK stores the session in localStorage automatically and renews it
  if (typeof window.SupaDB !== 'undefined' && window.SupaDB.Auth) {
    try {
      const isAuth = await window.SupaDB.Auth.isAuthenticated();
      if (isAuth) {
        // Restore sessionStorage so downstream code works correctly
        if (!sessionStorage.getItem('adminSessionToken')) {
          sessionStorage.setItem('adminLoggedIn', 'true');
          sessionStorage.setItem('adminLoginTime', Date.now().toString());
          sessionStorage.setItem('adminLastActivity', Date.now().toString());
          sessionStorage.setItem('adminSessionToken', generateSecureId());
        }
        showDashboard();
        return;
      }
    } catch(e) {
      console.warn('[checkAuth] Supabase session check failed:', e.message);
      // Fall through to localStorage / sessionStorage check
    }
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
      const sevenDays = 24 * 60 * 60 * 1000; // ✅ Reduced to 24 hours for securityh)

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
  var _errEl = document.getElementById('loginError');
  function _showErr(msg) {
    if (_errEl) { _errEl.textContent = msg; _errEl.classList.remove('hidden'); }
  }
  try {

  // Guard: isAccountLocked قد لا تكون موجودة إذا فشل تحميل admin-security.js
  if (typeof isAccountLocked === 'function' && isAccountLocked()) {
    var remaining = typeof getRemainingLockoutTime === 'function' ? getRemainingLockoutTime() : 0;
    if (typeof showLoginLockedMessage === 'function') showLoginLockedMessage(remaining);
    else _showErr('الحساب مقفل مؤقتاً. حاول لاحقاً.');
    return;
  }

  var password = document.getElementById('loginPassword').value;
  var emailEl  = document.getElementById('loginEmail');
  var email    = emailEl ? emailEl.value.trim().toLowerCase() : '';
  var errEl    = document.getElementById('loginError');

  function showErr(msg) {
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
      setTimeout(function() { errEl.classList.add('hidden'); }, 5000);
    }
  }

  if (!email) { showErr('أدخل البريد الإلكتروني'); return; }
  if (!password) { showErr('أدخل كلمة المرور'); return; }

  // ══════════════════════════════════════════════════
  // المسار الأول: Supabase Auth الحقيقي
  // ══════════════════════════════════════════════════
  if (typeof window.SupaDB !== 'undefined' && window.SupaDB.Auth) {
    try {
      await window.SupaDB.Auth.signIn(email, password);
      if (typeof recordSuccessfulLogin === 'function') recordSuccessfulLogin();
      _commitSession(null, null);
      showDashboard();
      return;
    } catch (authErr) {
      if (typeof recordAttempt === 'function') recordAttempt();
      var authMsg = authErr.message || '';
      if (authMsg.includes('Invalid login credentials') || authMsg.includes('invalid_credentials') || authMsg.includes('Invalid email or password')) {
        showErr('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (authMsg.includes('Email not confirmed')) {
        showErr('يرجى تأكيد البريد الإلكتروني أولاً');
      } else if (authMsg.includes('Too many requests')) {
        showErr('محاولات كثيرة — انتظر قليلاً ثم حاول مجدداً');
      } else {
        showErr('خطأ في تسجيل الدخول: ' + (authMsg || 'تحقق من بياناتك'));
      }
      return;
    }
  }

  // ══════════════════════════════════════════════════
  // المسار الثاني: localStorage (احتياطي عند انقطاع الشبكة)
  // ══════════════════════════════════════════════════
  var storedHash = localStorage.getItem('adminPasswordHash');
  var storedSalt = localStorage.getItem('adminPasswordSalt');

  if (!storedHash) {
    showErr('تعذر الاتصال — تأكد من اتصالك بالإنترنت');
    return;
  }

  // تحقق من legacy hash
  if (typeof isLegacyHash === 'function' && isLegacyHash(storedHash) && !storedSalt) {
    try {
      var buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
      var hex  = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
      if (hex !== storedHash) {
        if (typeof recordAttempt === 'function') recordAttempt();
        showErr('كلمة المرور غير صحيحة');
        return;
      }
      if (typeof hashPassword === 'function') {
        var hr = await hashPassword(password);
        localStorage.setItem('adminPasswordHash', hr.hash);
        localStorage.setItem('adminPasswordSalt', hr.salt);
        localStorage.setItem('adminPasswordIterations', hr.iterations.toString());
      }
      if (typeof recordSuccessfulLogin === 'function') recordSuccessfulLogin();
      _commitSession(storedHash, storedSalt);
      showDashboard();
    } catch(_) { showErr('خطأ في التحقق من كلمة المرور'); }
    return;
  }

  // PBKDF2 عادي
  if (typeof verifyPassword === 'function') {
    var ok = await verifyPassword(password, storedHash, storedSalt);
    if (!ok) {
      if (typeof recordAttempt === 'function') recordAttempt();
      showErr('كلمة المرور غير صحيحة');
      return;
    }
  }
  if (typeof recordSuccessfulLogin === 'function') recordSuccessfulLogin();
  _commitSession(storedHash, storedSalt);
  showDashboard();

  } catch(loginErr) {
    console.error('[handleLogin] Error:', loginErr);
    _showErr('خطأ في تسجيل الدخول: ' + loginErr.message);
  }
}

// حفظ بيانات الجلسة بعد نجاح الدخول
function _commitSession(hash, salt) {
  sessionStorage.removeItem('adminLoggedIn');
  sessionStorage.removeItem('adminSessionToken');
  sessionStorage.setItem('adminLoggedIn', 'true');
  sessionStorage.setItem('adminLoginTime', Date.now().toString());
  sessionStorage.setItem('adminLastActivity', Date.now().toString());
  var tok = generateSecureId();
  sessionStorage.setItem('adminSessionToken', tok);
  if (hash) localStorage.setItem('adminPasswordHash', hash);
  if (salt) localStorage.setItem('adminPasswordSalt', salt);
  // ✅ FIX: When Supabase auth passes null, use existing stored hash/salt
  // so that rememberToken verification doesn't fail on next refresh
  var effectiveHash = (hash !== null && hash !== undefined) ? hash : localStorage.getItem('adminPasswordHash');
  var effectiveSalt = (salt !== null && salt !== undefined) ? salt : localStorage.getItem('adminPasswordSalt');
  var remem = { timestamp: Date.now(), passwordHash: effectiveHash, salt: effectiveSalt, sessionToken: tok };
  localStorage.setItem('adminRememberToken', JSON.stringify(remem));
}

function logout(clearRemember) {
  sessionStorage.removeItem('adminLoggedIn');
  sessionStorage.removeItem('adminSessionToken');
  sessionStorage.removeItem('adminDeviceToken');
  if (clearRemember === true) localStorage.removeItem('adminRememberToken');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('adminDashboard').classList.add('hidden');
  closeMobileMenu();
}

async function showDashboard() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminDashboard').classList.remove('hidden');
  try { if (typeof loadAllData === 'function') loadAllData(); } catch(e) { console.warn('[Dashboard] loadAllData:', e.message); }
  try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch(e) { console.warn('[Dashboard] lucide:', e.message); }
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
  if (section === 'bundles') loadBundles();

  closeMobileMenu();
  // Close all open modals when switching sections
  document.querySelectorAll('.modal.active').forEach(function(m) { m.classList.remove('active'); });
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
