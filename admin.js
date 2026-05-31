function saveSettings() {
  var siteName = typeof validateInput === 'function'
    ? validateInput((document.getElementById('siteName') || {}).value || '', 100)
    : ((document.getElementById('siteName') || {}).value || '');
  var instagramUrl = typeof validateURL === 'function'
    ? validateURL((document.getElementById('instagramUrl') || {}).value || '')
    : ((document.getElementById('instagramUrl') || {}).value || '');
  var whatsappNumber = typeof validatePhone === 'function'
    ? validatePhone((document.getElementById('whatsappNumber') || {}).value || '')
    : ((document.getElementById('whatsappNumber') || {}).value || '');

  var telegramBotToken = ((document.getElementById('telegramBotToken') || {}).value || '').trim();
  var telegramChatId = ((document.getElementById('telegramChatId') || {}).value || '').trim();

  var prev = {};
  try { prev = JSON.parse(localStorage.getItem('phSettings') || '{}'); } catch(e) {}
  var settings = Object.assign({}, prev, {
    siteName: siteName,
    instagramUrl: instagramUrl,
    whatsappNumber: whatsappNumber,
    telegramBotToken: telegramBotToken,
    telegramChatId: telegramChatId
  });
  localStorage.setItem('phSettings', JSON.stringify(settings));
  if (typeof showToast === 'function') showToast('تم حفظ الإعدادات بنجاح ✓', 'success');
}

// CSRF Protection helper: Check if user is authenticated
function isAuthenticated() {
  var ssOk = sessionStorage.getItem('adminLoggedIn') === 'true' &&
             sessionStorage.getItem('adminSessionToken') !== null;
  if (ssOk) return true;
  try {
    var rem = JSON.parse(localStorage.getItem('adminRememberToken') || 'null');
    if (rem && rem.sessionToken) return true;
  } catch(e) {}
  return false;
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
  if (document.getElementById('telegramBotToken'))
    document.getElementById('telegramBotToken').value = settings.telegramBotToken || '';
  if (document.getElementById('telegramChatId'))
    document.getElementById('telegramChatId').value = settings.telegramChatId || '';
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



// Debounced search — fires 300ms after user stops typing
const debouncedSearch = debounce(() => {
  const activeFilter = document.querySelector('#section-products .tab-btn.active');
  const filter = activeFilter ? activeFilter.dataset.filter : 'all';
  loadProducts(filter);
}, 300);

















// Testimonials cache for edit/delete by index
var _testimonialsCache = [];

















// Debounced order search
const debouncedOrderSearch = debounce(() => loadOrders(), 300);



















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
  grid.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(html) : html;
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
  container.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(html) : html;
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
  { filter:'perfumes',  label:'عطور',             icon:'fa-spray-can-sparkles',  bg:'#F0FDF4', iconColor:'#16A34A' },
  { filter:'bundles',   label:'عروض التوفير',       icon:'fa-tags',                bg:'#FEF2F2', iconColor:'#EF4444' }
];

function loadCategoryImages() {
  var grid = document.getElementById('categoryImagesGrid');
  if (!grid) return;

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
        result.data.forEach(function(row) { images[row.key] = row.value || ''; });
      }

      var html = '';
      CATEGORY_DEFS_ADMIN.forEach(function(cat) {
        var key = 'cat_img_' + cat.filter;
        var url = images[key] || '';

        var previewHtml = url
          ? '<div class="mb-3 rounded-xl overflow-hidden h-28 bg-gray-50">' +
            '<img src="' + url + '" alt="' + cat.label + '" class="w-full h-full object-cover"' +
            ' onerror="this.parentElement.style.display='none'">' +
            '</div>'
          : '<div class="mb-3 rounded-xl h-28 bg-gray-50 flex items-center justify-center text-brand-300">' +
            '<i class="fa-solid ' + cat.icon + ' text-3xl"></i>' +
            '</div>';

        var clearBtn = url
          ? '<button data-cat="' + cat.filter + '" class="clear-cat-btn w-full text-red-400 hover:text-red-600 hover:bg-red-50 text-xs py-1.5 rounded-lg transition-colors font-medium mt-1">إزالة الصورة الحالية</button>'
          : '';

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
            '<label data-cat="' + cat.filter + '" class="upload-cat-btn flex items-center justify-center gap-2 w-full bg-brand-700 hover:bg-brand-800 text-white px-3 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-colors select-none">' +
              '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
              ' ارفع صورة' +
              '<input type="file" accept="image/*" class="hidden cat-file-input">' +
            '</label>' +
            '<div id="cat_progress_' + cat.filter + '" class="hidden flex items-center justify-center gap-1.5 text-xs text-teal-600 py-1.5">' +
              '<div class="spinner" style="width:14px;height:14px;border-width:2px;border-color:#0d9488;border-top-color:transparent"></div>' +
              '<span>جاري الرفع...</span>' +
            '</div>' +
            clearBtn +
          '</div>';
      });

      grid.innerHTML = html;

      // ── Delegated event: file input change ───────────────────────────
      grid.addEventListener('change', function(e) {
        if (e.target.classList.contains('cat-file-input')) {
          var label = e.target.closest('.upload-cat-btn');
          if (label) uploadCatImage(label.dataset.cat, e.target);
        }
      });

      // ── Delegated event: clear button click ──────────────────────────
      grid.addEventListener('click', function(e) {
        var btn = e.target.closest('.clear-cat-btn');
        if (btn) clearCategoryImage(btn.dataset.cat);
      });
    })
    .catch(function(err) {
      grid.innerHTML =
        '<div class="col-span-full text-center py-8 text-red-400">' +
        '<p class="font-semibold">حدث خطأ أثناء التحميل</p>' +
        '</div>';
      ErrorHandler.log('loadCategoryImages', err);
    });
}

async function uploadCatImage(catFilter, fileInput) {
  if (!fileInput || !fileInput.files[0]) return;

  var progressEl = document.getElementById('cat_progress_' + catFilter);
  var file = fileInput.files[0];

  if (file.size > 32 * 1024 * 1024) {
    showToast('حجم الصورة كبير جدًا (الحد الأقصى 32MB)', 'error');
    fileInput.value = '';
    return;
  }

  if (progressEl) progressEl.classList.remove('hidden');

  try {
    var base64 = await new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload  = function() { resolve(reader.result.split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    var formData = new FormData();
    formData.append('image', base64);

    var response = await fetch('https://api.imgbb.com/1/upload?key=405daedac0e1e717cde2106b81d225b9', {
      method: 'POST',
      body: formData
    });

    var data = await response.json();
    if (!data.success) throw new Error(data.error ? data.error.message : 'فشل رفع الصورة');

    var imageUrl = data.data.url;

    if (!supabaseClient) throw new Error('قاعدة البيانات غير متصلة');
    var key = 'cat_img_' + catFilter;
    var result = await supabaseClient
      .from('site_settings')
      .upsert({ key: key, value: imageUrl }, { onConflict: 'key' });

    if (result.error) throw result.error;

    showToast('تم رفع الصورة وحفظها بنجاح ✓', 'success');
    loadCategoryImages();

  } catch(e) {
    showToast('حدث خطأ أثناء رفع الصورة', 'error');
    ErrorHandler.log('uploadCatImage', e, { catFilter: catFilter });
  } finally {
    if (progressEl) progressEl.classList.add('hidden');
    if (fileInput) fileInput.value = '';
  }
}

async function clearCategoryImage(catFilter) {
  if (!supabaseClient) { showToast('خطأ في الاتصال بقاعدة البيانات', 'error'); return; }
  try {
    var key = 'cat_img_' + catFilter;
    var result = await supabaseClient
      .from('site_settings')
      .upsert({ key: key, value: '' }, { onConflict: 'key' });
    if (result.error) throw result.error;
    showToast('تم إزالة صورة القسم ✓', 'success');
    loadCategoryImages();
  } catch(e) {
    showToast('حدث خطأ أثناء إزالة الصورة', 'error');
    ErrorHandler.log('clearCategoryImage', e, { catFilter: catFilter });
  }
}

// kept for backward compat
async function saveCategoryImage(catFilter, imageUrl) {
  if (!supabaseClient) return;
  try {
    var key = 'cat_img_' + catFilter;
    var result = await supabaseClient
      .from('site_settings')
      .upsert({ key: key, value: imageUrl || '' }, { onConflict: 'key' });
    if (result.error) throw result.error;
    showToast('تم حفظ صورة القسم بنجاح ✓', 'success');
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
// ─── Login Logs ───────────────────────────────────────────────────────────────

function loadLoginLogs() {
  var container = document.getElementById('loginLogsTable');
  if (!container) return;

  function _esc(str) {
    if (str == null) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  var logs = [];
  try {
    var raw = localStorage.getItem('adminLoginLogs');
    logs = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(logs)) logs = [];
  } catch(e) {
    localStorage.removeItem('adminLoginLogs');
    logs = [];
  }

  if (logs.length === 0) {
    container.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-brand-400">لا يوجد سجل دخول بعد</td></tr>';
    return;
  }

  try {
    container.innerHTML = logs.map(function(log) {
      var d = new Date(log.time);
      var dateStr = d.toLocaleDateString('ar-IQ', { timeZone: 'Asia/Baghdad' });
      var timeStr = d.toLocaleTimeString('ar-IQ', { timeZone: 'Asia/Baghdad', hour12: true });
      var statusClass = log.status === 'success' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
      var statusText = log.status === 'success' ? '✅ ناجح' : '❌ فاشل';
      var typeText = log.type === 'fresh-login' ? '🔐 دخول جديد' : '🔄 استعادة جلسة';
      var ipStr = '';
      if (log.ip) {
        ipStr = _esc(log.ip);
        if (log.city || log.country) ipStr += '<br><span class="text-xs text-brand-400">' + _esc((log.city || '') + (log.country ? ' — ' + log.country : '')) + '</span>';
      } else { ipStr = '<span class="text-brand-300 text-xs">—</span>'; }
      return '<tr class="border-b border-brand-50 hover:bg-brand-50/30 transition-colors">' +
        '<td class="px-4 py-3 text-sm text-brand-700">' + _esc(dateStr) + '<br><span class="text-xs text-brand-400">' + _esc(timeStr) + '</span></td>' +
        '<td class="px-4 py-3 text-sm">' + typeText + '</td>' +
        '<td class="px-4 py-3 text-sm text-brand-700">' + _esc(log.device || 'غير معروف') + '</td>' +
        '<td class="px-4 py-3 text-sm text-brand-700">' + _esc(log.browser || 'غير معروف') + '</td>' +
        '<td class="px-4 py-3 text-sm font-mono dir-ltr">' + ipStr + '</td>' +
        '<td class="px-4 py-3"><span class="px-2 py-1 rounded-lg text-xs font-semibold ' + statusClass + '">' + statusText + '</span></td>' +
        '</tr>';
    }).join('');
  } catch(e) {
    container.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-brand-400">لا يوجد سجل دخول بعد</td></tr>';
  }
}

function clearLoginLogs() {
  if (!confirm('هل أنت متأكد من حذف سجل الدخول كاملاً؟')) return;
  localStorage.removeItem('adminLoginLogs');
  loadLoginLogs();
  showToast('تم مسح سجل الدخول', 'success');
}

async function testTelegramAlert() {
  var botToken = document.getElementById('telegramBotToken').value.trim();
  var chatId = document.getElementById('telegramChatId').value.trim();
  if (!botToken || !chatId) { showToast('أدخل رمز البوت و Chat ID أولاً', 'error'); return; }
  try {
    var resp = await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '✅ رسالة تجريبية من لوحة تحكم Neurobin', parse_mode: 'HTML' })
    });
    var data = await resp.json();
    if (data.ok) showToast('تم الإرسال! تحقق من تيليجرام', 'success');
    else showToast('خطأ: ' + (data.description || 'تأكد من البيانات'), 'error');
  } catch(e) { showToast('تعذر الاتصال بتيليجرام', 'error'); }
}
