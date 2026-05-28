// discounts.js — نظام كودات الخصم مع تحكم كامل بعدد

function generateSecureCode(len) {
  len = len || 12;
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, function(n){ return chars[n % chars.length]; }).join('');
}

// ── تحميل وعرض الكودات ───────────────────────────────────────
async function loadDiscountCodes() {
  var el = document.getElementById('discountCodesList');
  if (!el) return;
  el.innerHTML = '<div class="text-center py-8 text-brand-400"><div class="loading-spinner mx-auto mb-3"></div><p>جاري التحميل...</p></div>';
  try {
    var codes = await SupaDB.DiscountCodes.list();
    renderDiscountCodes(codes);
  } catch(e) {
    el.innerHTML = '<div class="text-center py-8 text-red-500">خطأ في التحميل: ' + escapeHTML(e.message) + '</div>';
  }
}

function renderDiscountCodes(codes) {
  var el = document.getElementById('discountCodesList');
  if (!el) return;
  var now = new Date();

  if (!codes || !codes.length) {
    el.innerHTML = '<div class="text-center py-16 text-brand-400">' +
      '<div class="w-20 h-20 mx-auto mb-4 bg-brand-50 rounded-full flex items-center justify-center">' +
      '<i data-lucide="tag" class="w-10 h-10 text-brand-300"></i></div>' +
      '<p class="font-semibold text-lg">لا توجد كودات خصم</p>' +
      '<p class="text-sm mt-1">أنشئ كودا جديدا بالضغط على الزر</p>' +
      '</div>';
    lucide.createIcons(); return;
  }

  var html = '<div class="space-y-4">';
  codes.forEach(function(code, i) {
    var expiry  = new Date(code.expires_at);
    var expired = expiry < now;
    var msLeft  = expiry - now;
    var hrs     = Math.max(0, Math.floor(msLeft / 3600000));
    var days    = Math.floor(hrs / 24);
    var used    = code.used_count || 0;
    var maxU    = code.max_uses;
    var active  = code.is_active;

    // حساب نسبة الاستخدام
    var usagePct = (maxU && maxU > 0) ? Math.min(100, Math.round(used / maxU * 100)) : 0;
    var usageExhausted = (maxU !== null && maxU !== undefined && used >= maxU);

    // شارة الحالة
    var statusColor, statusText;
    if (!active)          { statusColor = 'bg-gray-100 text-gray-600';   statusText = 'معطّل'; }
    else if (expired)     { statusColor = 'bg-red-100 text-red-600';     statusText = 'منتهي'; }
    else if (usageExhausted) { statusColor = 'bg-orange-100 text-orange-600'; statusText = 'استُنفد'; }
    else                  { statusColor = 'bg-green-100 text-green-700'; statusText = 'نشط ✓'; }

    // المدة المتبقية
    var timeLeft = expired ? '<span class="text-red-500 font-medium">انتهت الصلاحية</span>'
      : days >= 1 ? '<span class="text-green-700 font-medium">ينتهي بعد ' + days + (days===1?' يوم':' أيام') + '</span>'
      : hrs > 0  ? '<span class="text-yellow-700 font-medium">ينتهي بعد ' + hrs + ' ساعة</span>'
      : '<span class="text-red-600 font-medium">ينتهي قريبا</span>';

    // قيمة الخصم
    var disc = code.discount_type === 'percent'
      ? code.discount_value + '%'
      : code.discount_value.toLocaleString() + ' د.ع';

    // شريط التقدم للاستخدام
    var progressBar = '';
    if (maxU !== null && maxU !== undefined) {
      var barColor = usagePct >= 90 ? 'bg-red-500' : usagePct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
      progressBar = '<div class="mt-2">' +
        '<div class="flex justify-between text-xs text-brand-500 mb-1">' +
        '<span>تم الاستخدام: <b>' + used + '</b> / <b>' + maxU + '</b></span>' +
        '<span>' + usagePct + '%</span></div>' +
        '<div class="w-full bg-brand-100 rounded-full h-2.5 overflow-hidden">' +
        '<div class="h-2.5 rounded-full transition-all duration-500 ' + barColor + '" style="width:' + usagePct + '%"></div>' +
        '</div></div>';
    } else {
      progressBar = '<div class="mt-2 text-xs text-brand-500">تم الاستخدام: <b>' + used + '</b> مرة / بلا حد</div>';
    }

    var cid     = escapeHTML(String(code.id));
    var codeStr = escapeHTML(code.code);
    var opacity = (!active || expired || usageExhausted) ? 'opacity-70' : '';
    var border  = (!active || expired || usageExhausted) ? 'border-gray-200' : 'border-brand-200';

    html += '<div class="bg-white rounded-2xl border-2 ' + border + ' ' + opacity + ' overflow-hidden animate-fade-in" style="animation-delay:' + (i*0.05) + 's" id="code-card-' + cid + '">' +
      // Header
      '<div class="bg-gradient-to-r from-brand-50 to-white px-3 sm:px-4 py-3 flex flex-wrap items-start sm:items-center justify-between gap-2 border-b border-brand-100">' +
      '<div class="flex items-center gap-3">' +
      '<code class="font-mono text-base sm:text-xl font-black text-brand-900 tracking-wide sm:tracking-widest bg-white px-2 sm:px-3 py-1 rounded-lg border-2 border-brand-200 select-all max-w-full overflow-auto">' + codeStr + '</code>' +
      '<span class="px-2.5 py-1 ' + statusColor + ' rounded-full text-xs font-bold">' + statusText + '</span>' +
      '</div>' +
      '<div class="flex items-center gap-1 flex-shrink-0">' +
      '<button data-action="copy-discount" data-code="' + codeStr + '" class="p-2 bg-brand-100 text-brand-700 hover:bg-brand-200 rounded-lg transition-colors" title="نسخ الكود"><i data-lucide="copy" class="w-4 h-4"></i></button>' +
      '<button data-action="toggle-discount" data-id="' + cid + '" data-newstate="' + (!active) + '" class="p-2 ' + (active ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200') + ' rounded-lg transition-colors" title="' + (active ? 'تعطيل' : 'تفعيل') + '">' +
      '<i data-lucide="' + (active ? 'pause-circle' : 'play-circle') + '" class="w-4 h-4"></i></button>' +
      '<button data-action="delete-discount" data-id="' + cid + '" class="p-2 bg-red-100 text-red-500 hover:bg-red-200 rounded-lg transition-colors" title="حذف"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
      '</div></div>' +

      // Body
      '<div class="p-4">' +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">' +
      // الخصم
      '<div class="bg-brand-50 rounded-xl p-3 text-center">' +
      '<p class="text-xs text-brand-400 mb-1">قيمة الخصم</p>' +
      '<p class="text-xl font-black text-brand-900">' + disc + '</p>' +
      '<p class="text-xs text-brand-500">' + (code.discount_type === 'percent' ? 'نسبة' : 'مبلغ ثابت') + '</p>' +
      '</div>' +
      // المدة
      '<div class="bg-brand-50 rounded-xl p-3 text-center">' +
      '<p class="text-xs text-brand-400 mb-1">المدة المتبقية</p>' +
      timeLeft +
      '<p class="text-xs text-brand-400 mt-1">' + expiry.toLocaleDateString('ar-EG') + '</p>' +
      '</div>' +
      // الاستخدام — مع زر التحكم
      '<div class="bg-brand-50 rounded-xl p-3 col-span-2 sm:col-span-1">' +
      '<div class="flex items-center justify-between mb-1">' +
      '<p class="text-xs text-brand-400">عدد المستخدمين</p>' +
      '<button data-action="open-usage-editor" data-id="' + cid + '" data-maxu="' + (maxU !== null && maxU !== undefined ? maxU : '') + '" ' +
      'class="text-xs text-brand-600 hover:text-brand-900 underline">تعديل الحد</button>' +
      '</div>' +
      progressBar +
      '<button data-action="reset-usage" data-id="' + cid + '" ' +
      'class="mt-2 w-full text-xs text-brand-500 hover:text-red-600 border border-brand-200 hover:border-red-300 rounded-lg py-1 px-2 transition-colors flex items-center justify-center gap-1">' +
      '<i data-lucide="rotate-ccw" class="w-3 h-3"></i> إعادة تعيين العداد' +
      '</button>' +
      '</div>' +
      '</div>' +

      // Inline Usage Editor (hidden by default)
      '<div id="usage-editor-' + cid + '" class="hidden mt-3 p-3 sm:p-4 bg-amber-50 rounded-xl border-2 border-amber-200">' +
      '<p class="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">' +
      '<i data-lucide="settings" class="w-4 h-4"></i> تحديد الحد الأ��صى للاستخدام' +
      '</p>' +
      '<div class="flex gap-2">' +
      '<input type="number" id="new-max-uses-' + cid + '" ' +
      'class="flex-1 px-3 py-2 border-2 border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" ' +
      'placeholder="أدخل العدد الأقصى (أو 0 = بلا حد)" min="0" value="' + (maxU !== null && maxU !== undefined ? maxU : '') + '">' +
      '<button data-action="save-max-uses" data-id="' + cid + '" class="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">حفظ</button>' +
      '<button onclick="closeUsageEditor(\'' + cid + '\')" class="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors">إلغاء</button>' +
      '</div>' +
      '<p class="text-xs text-amber-700 mt-1">اكتب 0 أو اتركه فارغا = بلا حد للاستخدام</p>' +
      '</div>' +

      '</div></div>'; // end body + card
  });
  html += '</div>';
  el.innerHTML = html;
  lucide.createIcons();
}

// ── محرر الحد الأقصى ─────────────────────────────────────────
function openUsageEditor(id, currentMax) {
  var editor = document.getElementById('usage-editor-' + id);
  var inp    = document.getElementById('new-max-uses-' + id);
  if (!editor) return;
  editor.classList.remove('hidden');
  if (inp) { inp.value = (currentMax !== null && currentMax !== undefined) ? currentMax : ''; inp.focus(); }
  lucide.createIcons();
}

function closeUsageEditor(id) {
  var editor = document.getElementById('usage-editor-' + id);
  if (editor) editor.classList.add('hidden');
}

async function saveMaxUses(id) {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  var inp = document.getElementById('new-max-uses-' + id);
  if (!inp) return;
  var val = inp.value.trim();
  var newMax = (val === '' || val === '0') ? null : parseInt(val);
  if (newMax !== null && (isNaN(newMax) || newMax < 1)) {
    showToast('يرجى إدخال عدد صحيح أكبر من 0', 'error'); return;
  }
  try {
    await SupaDB.DiscountCodes.updateMaxUses(id, newMax);
    closeUsageEditor(id);
    loadDiscountCodes();
    showToast(newMax ? 'تم تحديد الحد الأ��صى: ' + newMax + ' مستخدم' : 'تم إزالة الحد الأقصى', 'success');
  } catch(e) { showToast('خطأ: ' + (e && e.message || 'حدث خطأ غير معروف'), 'error'); }
}

// ── إعادة تعيين العداد ───────────────────────────────────────
async function resetUsageCount(id) {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  if (!confirm('هل أنت متأكد من إعادة تعيين عداد الاستخدام؟')) return;
  try {
    await SupaDB.DiscountCodes.resetUsage(id);
    loadDiscountCodes();
    showToast('تم إعادة تعيين العداد ✓', 'success');
  } catch(e) { showToast('خطأ: ' + (e && e.message || 'حدث خطأ غير معروف'), 'error'); }
}

// ── تفعيل/تعطيل الكود ──────────────────────────────────────────
async function toggleCodeActive(id, newState) {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  try {
    await SupaDB.DiscountCodes.toggleActive(id, newState);
    loadDiscountCodes();
    showToast(newState ? 'تم تفعيل الكود ✓' : 'تم تعطيل الكود', newState ? 'success' : 'info');
  } catch(e) { showToast('خطأ: ' + (e && e.message || 'حدث خطأ غير معروف'), 'error'); }
}

// ── معاينة وقت الانتهاء ───────────────────────────────────────
function updateExpiryPreview() {
  var days  = parseInt(document.getElementById('discountDays')?.value)  || 0;
  var hours = parseInt(document.getElementById('discountHours')?.value) || 0;
  var preview = document.getElementById('expiryPreview');
  if (!preview) return;
  if (days <= 0 && hours <= 0) { preview.textContent = 'يرجى إدخال مدة صالحة'; preview.className = 'text-xs text-red-600 mt-1'; return; }
  var ms = (days * 86400000) + (hours * 3600000);
  var expiry = new Date(Date.now() + ms);
  var parts = [];
  if (days > 0)  parts.push(days  + (days  === 1 ? ' يوم'   : ' أيام'));
  if (hours > 0) parts.push(hours + (hours === 1 ? ' ساعة'  : ' ساعات'));
  preview.innerHTML = '<span class="flex flex-wrap gap-x-1 items-center">⏱️ ينتهي بعد <b>' + parts.join(' و ') + '</b><span class="hidden sm:inline"> (' +
    expiry.toLocaleDateString('ar-EG') + ' الساعة ' +
    expiry.toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) + ')</span></span>';
  preview.className = 'text-xs text-green-700 mt-1';
}

// ── إنشاء كود جديد ──────────────────────────────────────────────
function openCreateDiscountModal() {
  var errDiv = document.getElementById('discountModalError');
  if (errDiv) { errDiv.textContent = ''; errDiv.classList.add('hidden'); }
  document.getElementById('discountCode').value = generateSecureCode(12);
  document.getElementById('discountType').value = 'percent';
  document.getElementById('discountValue').value = '10';
  document.getElementById('discountDays').value = '1';
  document.getElementById('discountHours').value = '0';
  document.getElementById('discountMaxUses').value = '';
  updateExpiryPreview();
  document.getElementById('createDiscountModal').classList.add('active');
  lucide.createIcons();
}
function closeCreateDiscountModal() { document.getElementById('createDiscountModal').classList.remove('active'); }
function regenerateCode() { document.getElementById('discountCode').value = generateSecureCode(12); }

async function saveDiscountCode() {
  // ���─ Immediate modal feedback ──────────────────────────────────
  var _errDiv = document.getElementById('discountModalError');
  function _showModalMsg(msg, isErr) {
    if (_errDiv) {
      _errDiv.textContent = msg;
      _errDiv.className = 'mb-3 p-3 rounded-xl text-sm font-medium ' +
        (isErr ? 'bg-red-50 border border-red-300 text-red-700'
                : 'bg-blue-50 border border-blue-300 text-blue-700');
      _errDiv.classList.remove('hidden');
      _errDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (isErr) showToast(msg, 'error');
  }
  _showModalMsg('⏳ جاري المعالجة...', false);

  // ── Auth check ────────────────────────────────────────────────
  if (!isAuthenticated()) {
    _showModalMsg('❌ يرجى تسجيل الدخول أولاً', true);
    return;
  }
  var code = document.getElementById('discountCode').value.trim().toUpperCase();
  var dType = document.getElementById('discountType').value;
  var dVal  = parseInt(document.getElementById('discountValue').value);
  var durDays  = parseInt(document.getElementById('discountDays').value)  || 0;
  var durHours = parseInt(document.getElementById('discountHours').value) || 0;
  var maxU  = document.getElementById('discountMaxUses').value;
  if (!code || code.length < 2 || !/^[A-Z0-9]+$/.test(code)) { _showModalMsg('❌ كود غير صالح (2 أحرف على الأقل من A-Z, 0-9)', true); return; }
  if (!dVal || dVal <= 0) { _showModalMsg('❌ قيمة الخصم غير صحيحة — أدخل رقماً أكبر من صفر', true); return; }
  if (dType === 'percent' && dVal > 100) { _showModalMsg('❌ نسبة الخصم لا يمكن أن تتجاوز 100%', true); return; }
  if (dType === 'fixed' && dVal % 250 !== 0) {
    dVal = Math.max(250, Math.round(dVal / 250) * 250);
    document.getElementById('discountValue').value = dVal;
    showToast('تم تعديل قيمة الخصم إلى ' + dVal.toLocaleString() + ' د.ع', 'info');
  }
  if (durDays <= 0 && durHours <= 0) { _showModalMsg('❌ يرجى إدخال مدة صالحة (أيام أو ساعات)', true); return; }
  var ms = (durDays * 86400000) + (durHours * 3600000);
  var expiresAt = new Date(Date.now() + ms).toISOString();
  var btn = document.querySelector('#createDiscountModal .save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'جاري الحفظ...'; }
  try {
    var maxUVal = (maxU && parseInt(maxU) > 0) ? parseInt(maxU) : null;
    await SupaDB.DiscountCodes.create({ code, discount_type: dType, discount_value: dVal, expires_at: expiresAt, max_uses: maxUVal, used_count: 0, is_active: true });
    closeCreateDiscountModal();
    loadDiscountCodes();
    showSuccessAnimation('تم إنشاء كود الخصم بنجاح!');
  } catch(e) {
    var errMsg = '';
    try {
      var eMsg = e && e.message ? String(e.message) : String(e);
      errMsg = eMsg.includes('duplicate') ? 'هذا الكود موجود مسبقاً — جرّب كوداً مختلفاً' : eMsg;
    } catch(_) {
      errMsg = 'خطأ غير معروف';
    }
    _showModalMsg('❌ ' + errMsg, true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'إنشاء الكود'; }
  }
}

// ── حذف الكود ──────────────────────────────────────────────────
async function deleteDiscountCode(id) {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً','error'); return; }
  if (!confirm('هل أنت متأكد من حذف هذا الكود؟')) return;
  try { await SupaDB.DiscountCodes.delete(id); loadDiscountCodes(); showToast('تم حذف الكود','warning'); }
  catch(e) { showToast('خطأ: ' + (e && e.message || 'حدث خطأ غير معروف'),'error'); }
}

// ── نسخ الكود ────────────────────────────────────────────────
function copyDiscountCode(code) {
  navigator.clipboard.writeText(code)
    .then(() => showToast('تم نسخ الكود: ' + code, 'success'))
    .catch(() => {
      var e = document.createElement('input'); e.value = code;
      document.body.appendChild(e); e.select(); document.execCommand('copy'); document.body.removeChild(e);
      showToast('تم نسخ الكود: ' + code, 'success');
    });
}

// ── Event delegation ─────────────────────────────────────────
// ── Event Delegation — ALL button actions ─────────────────────────────────
document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action]');
  if (!btn) return;

  var action = btn.dataset.action;
  var id = btn.dataset.id;

  if (action === 'delete-discount') {
    deleteDiscountCode(id);
  } else if (action === 'copy-discount') {
    copyDiscountCode(btn.dataset.code);
  } else if (action === 'toggle-discount') {
    var newState = btn.dataset.newstate === 'true';
    toggleCodeActive(id, newState);
  } else if (action === 'open-usage-editor') {
    var maxU = (btn.dataset.maxu !== '' && btn.dataset.maxu !== undefined) ? parseInt(btn.dataset.maxu) : null;
    openUsageEditor(id, maxU);
  } else if (action === 'reset-usage') {
    resetUsageCount(id);
  } else if (action === 'save-max-uses') {
    saveMaxUses(id);
  }
});

// ── Expose to window (iOS Safari & strict mode safety) ────────────────────
window.loadDiscountCodes       = typeof loadDiscountCodes       === 'function' ? loadDiscountCodes       : window.loadDiscountCodes;
window.renderDiscountCodes     = typeof renderDiscountCodes     === 'function' ? renderDiscountCodes     : window.renderDiscountCodes;
window.openUsageEditor         = typeof openUsageEditor         === 'function' ? openUsageEditor         : window.openUsageEditor;
window.closeUsageEditor        = typeof closeUsageEditor        === 'function' ? closeUsageEditor        : window.closeUsageEditor;
window.openCreateDiscountModal = typeof openCreateDiscountModal === 'function' ? openCreateDiscountModal : window.openCreateDiscountModal;
window.closeCreateDiscountModal= typeof closeCreateDiscountModal=== 'function' ? closeCreateDiscountModal: window.closeCreateDiscountModal;
window.copyDiscountCode        = typeof copyDiscountCode        === 'function' ? copyDiscountCode        : window.copyDiscountCode;
window.deleteDiscountCode      = typeof deleteDiscountCode      === 'function' ? deleteDiscountCode      : window.deleteDiscountCode;
window.toggleCodeActive        = typeof toggleCodeActive        === 'function' ? toggleCodeActive        : window.toggleCodeActive;
window.resetUsageCount         = typeof resetUsageCount         === 'function' ? resetUsageCount         : window.resetUsageCount;
window.saveMaxUses             = typeof saveMaxUses             === 'function' ? saveMaxUses             : window.saveMaxUses;
window.updateExpiryPreview     = typeof updateExpiryPreview     === 'function' ? updateExpiryPreview     : window.updateExpiryPreview;
window.regenerateCode          = typeof regenerateCode          === 'function' ? regenerateCode          : window.regenerateCode;
