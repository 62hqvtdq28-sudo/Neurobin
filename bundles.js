// bundles.js v5 — clean rewrite with defensive null checks
var _allBundles = [];
var _allProductsForBundles = [];

// ── Load bundles from Supabase ──────────────────────────────
async function loadBundles() {
  var el = document.getElementById('bundlesList');
  if (!el) return;
  el.innerHTML = '<div class="col-span-full flex items-center justify-center gap-2 py-12 text-brand-400">' +
    '<div style="width:24px;height:24px;border:3px solid #d1fae5;border-top-color:#059669;border-radius:50%;animation:spin 0.8s linear infinite"></div>' +
    '<span>جاري تحميل...</span></div>';
  var tries = 0;
  while (typeof SupaDB === 'undefined' && tries < 25) {
    await new Promise(function(r){ setTimeout(r, 200); });
    tries++;
  }
  if (typeof SupaDB === 'undefined') {
    el.innerHTML = '<div class="col-span-full text-center py-8 text-red-400">تعذر الاتصال - جرب تحديث الصفحة</div>';
    return;
  }
  try {
    _allBundles = await SupaDB.Bundles.list();
    _allProductsForBundles = await SupaDB.Products.list();
    renderBundlesList(_allBundles);
  } catch(e) {
    el.innerHTML = '<div class="col-span-full text-center py-8 text-red-400">خطأ: </div>'; // error text set below
    if (el) el.innerHTML = '<div class="col-span-full text-center py-8 text-red-400">خطأ: </div>'.replace('</div>', (e && e.message ? e.message : String(e)) + '</div>');
  }
}

// ── Render bundles list ─────────────────────────────────────
function renderBundlesList(bundles) {
  var el = document.getElementById('bundlesList');
  if (!el) return;
  if (!bundles || !bundles.length) {
    el.innerHTML = '<div class="col-span-full text-center py-12 text-brand-400">لا توجد باقات حتى الآن. أضف أول باقة!</div>';
    return;
  }
  var productMap = {};
  (_allProductsForBundles || []).forEach(function(p) { if (p && p.id) productMap[String(p.id)] = p; });

  el.innerHTML = bundles.map(function(b, i) {
    if (!b) return '';
    var bid = escapeHTML(String(b.id || ''));
    var productIds = Array.isArray(b.product_ids) ? b.product_ids : (b.product_ids ? JSON.parse(b.product_ids) : []);
    var productNames = productIds.map(function(id) {
      var p = productMap[String(id)];
      return p ? escapeHTML(p.name_ar || p.name || String(id)) : String(id);
    }).join(' + ');
    var saving = b.original_price && b.original_price > b.bundle_price ? b.original_price - b.bundle_price : 0;
    var statusColor = b.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';
    var statusLabel = b.active ? 'مفعّل' : 'موقوف';
    var imgTag = (b.image && typeof b.image === 'string' && b.image.length > 5)
      ? ('<img src="' + escapeHTML(b.image) + '" class="w-12 h-12 rounded-lg object-cover border border-brand-100 mr-3 flex-shrink-0" alt="">')
      : '';
    return '<div class="bg-white rounded-xl border border-brand-100 p-4 sm:p-5 animate-fade-in" style="animation-delay:' + (i * 0.05) + 's">' +
      '<div class="flex items-start justify-between mb-3">' +
        '<div class="flex items-center flex-1 min-w-0">' +
          imgTag +
          '<div class="min-w-0">' +
            '<div class="flex items-center gap-2 mb-1">' +
              '<span class="font-bold text-brand-900">' + escapeHTML(b.title_ar || '') + '</span>' +
              '<span class="text-xs px-2 py-0.5 rounded-full ' + statusColor + '">' + statusLabel + '</span>' +
            '</div>' +
            '<p class="text-sm text-brand-500 truncate">' + productNames + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="flex gap-1 mr-2 flex-shrink-0">' +
          '<button data-action="edit-bundle" data-id="' + bid + '" class="p-2 hover:bg-brand-100 rounded-lg transition-colors"><i data-lucide="edit" class="w-4 h-4 text-brand-600"></i></button>' +
          '<button data-action="delete-bundle" data-id="' + bid + '" class="p-2 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-4 h-4 text-red-500"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="flex items-center gap-4 text-sm">' +
        (b.original_price ? '<span class="text-gray-400 line-through">' + Number(b.original_price).toLocaleString() + ' د.ع</span>' : '') +
        '<span class="font-bold text-red-600 text-base">' + Number(b.bundle_price).toLocaleString() + ' د.ع</span>' +
        (saving > 0 ? '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">توفير </span>'.replace('</span>', saving.toLocaleString() + ' د.ع</span>') : '') +
      '</div>' +
    '</div>';
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── Open bundle modal ───────────────────────────────────────
function openBundleModal(id) {
  var b = id ? (_allBundles.find(function(x){ return String(x.id) === String(id); })) : null;
  var productIds = b && Array.isArray(b.product_ids) ? b.product_ids : (b && b.product_ids ? JSON.parse(b.product_ids) : []);
  productIds = productIds.map(String);

  var titleEl = document.getElementById('bundleModalTitle');
  var idEl = document.getElementById('bundleId');
  var titleArEl = document.getElementById('bundleTitleAr');
  var priceEl = document.getElementById('bundlePrice');
  var origPriceEl = document.getElementById('bundleOriginalPrice');
  var activeEl = document.getElementById('bundleActive');

  if (titleEl) titleEl.textContent = b ? 'تعديل باقة' : 'إضافة باقة جديدة';
  if (idEl) idEl.value = b ? id : '';
  if (titleArEl) titleArEl.value = b ? (b.title_ar || '') : '';
  if (priceEl) priceEl.value = b ? (b.bundle_price || '') : '';
  if (origPriceEl) origPriceEl.value = b ? (b.original_price || '') : '';
  if (activeEl) activeEl.checked = b ? Boolean(b.active) : true;

  // Image fields
  var imgUrl = b ? (b.image || '') : '';
  var imgUrlEl = document.getElementById('bundleImageUrl');
  var imgInputEl = document.getElementById('bundleImageInput');
  var imgPreviewEl = document.getElementById('bundleImagePreview');
  var clearBtnEl = document.getElementById('bundleImageClearBtn');
  var imgLabelEl = document.getElementById('bundleImageLabel');

  if (imgUrlEl) imgUrlEl.value = imgUrl;
  if (imgInputEl) imgInputEl.value = '';
  if (imgPreviewEl) {
    if (imgUrl) {
      imgPreviewEl.src = imgUrl;
      imgPreviewEl.classList.remove('hidden');
    } else {
      imgPreviewEl.src = '';
      imgPreviewEl.classList.add('hidden');
    }
  }
  if (clearBtnEl) clearBtnEl.classList[imgUrl ? 'remove' : 'add']('hidden');
  if (imgLabelEl) imgLabelEl.textContent = imgUrl ? 'تم اختيار صورة' : 'اضغط لرفع صورة';

  // Product grid
  var container = document.getElementById('bundleProductsContainer');
  if (container) {
    var validProds = (_allProductsForBundles || []).filter(function(p) { return p && p.id; });
    container.innerHTML = '<div class="grid grid-cols-3 gap-2 p-2">' +
      validProds.map(function(p) {
        var pid = String(p.id);
        var isSel = productIds.includes(pid);
        var pname = escapeHTML(p.name_ar || p.name || ('ID:' + pid));
        var pimg = (p.image && typeof p.image === 'string' && p.image.length > 5)
          ? ('<img src="' + escapeHTML(p.image) + '" class="w-full h-full object-cover" loading="lazy" alt="">')
          : ('<div class="w-full h-full flex items-center justify-center bg-brand-50"><svg class="w-8 h-8 text-brand-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg></div>');
        var chkDiv = '<div class="bundle-check-icon absolute top-1 right-1 w-5 h-5 bg-brand-700 rounded-full flex items-center justify-center" style="display:' + (isSel ? 'flex' : 'none') + '"><svg class="w-3 h-3" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>';
        return '<div onclick="toggleBundleProduct(this)"' +
          ' class="relative cursor-pointer rounded-xl border-2 transition-all overflow-hidden select-none ' + (isSel ? 'border-brand-700 ring-2 ring-brand-200' : 'border-brand-100') + '"' +
          ' data-pid="' + pid + '" data-selected="' + isSel + '">' +
          '<div class="aspect-square w-full">' + pimg + '</div>' +
          chkDiv +
          '<div class="p-1 text-center">' +
            '<p class="text-xs font-semibold text-brand-900 truncate">' + pname + '</p>' +
            '<p class="text-xs text-brand-400">' + (isNaN(Number(p.price)) ? '0' : Number(p.price).toLocaleString()) + ' د.ع</p>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  var modal = document.getElementById('bundleModal');
  if (modal) modal.classList.add('active');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── Toggle product selection ────────────────────────────────
function toggleBundleProduct(el) {
  if (!el) return;
  var isSel = el.dataset.selected === 'true';
  el.dataset.selected = isSel ? 'false' : 'true';
  var chk = el.querySelector('.bundle-check-icon');
  if (!isSel) {
    el.classList.add('border-brand-700', 'ring-2', 'ring-brand-200');
    el.classList.remove('border-brand-100');
    if (chk) chk.style.display = 'flex';
  } else {
    el.classList.remove('border-brand-700', 'ring-2', 'ring-brand-200');
    el.classList.add('border-brand-100');
    if (chk) chk.style.display = 'none';
  }
}

// ── Image preview / clear ───────────────────────────────────
function previewBundleImage(input) {
  if (!input || !input.files || !input.files[0]) return;
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    var prev = document.getElementById('bundleImagePreview');
    var lbl  = document.getElementById('bundleImageLabel');
    var btn  = document.getElementById('bundleImageClearBtn');
    if (prev) { prev.src = e.target.result; prev.classList.remove('hidden'); }
    if (lbl)  lbl.textContent = file.name;
    if (btn)  btn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function clearBundleImage() {
  var inp  = document.getElementById('bundleImageInput');
  var urlEl= document.getElementById('bundleImageUrl');
  var prev = document.getElementById('bundleImagePreview');
  var btn  = document.getElementById('bundleImageClearBtn');
  var lbl  = document.getElementById('bundleImageLabel');
  if (inp)  inp.value = '';
  if (urlEl) urlEl.value = '';
  if (prev) { prev.src = ''; prev.classList.add('hidden'); }
  if (btn)  btn.classList.add('hidden');
  if (lbl)  lbl.textContent = 'اضغط لرفع صورة';
}

// ── Close modal ─────────────────────────────────────────────
function closeBundleModal() {
  var modal = document.getElementById('bundleModal');
  if (modal) modal.classList.remove('active');
}

function editBundle(id) { openBundleModal(id); }

// ── Save bundle ─────────────────────────────────────────────
async function saveBundle() {
  // Change button to show feedback
  var saveBtn = document.querySelector('#bundleModal [onclick="saveBundle()"]');
  if (saveBtn) { saveBtn.textContent = 'جاري الحفظ...'; saveBtn.disabled = true; }

  try {
    var titleArEl = document.getElementById('bundleTitleAr');
    var priceEl   = document.getElementById('bundlePrice');
    var origEl    = document.getElementById('bundleOriginalPrice');
    var activeEl  = document.getElementById('bundleActive');
    var idEl      = document.getElementById('bundleId');

    var titleAr     = titleArEl ? (titleArEl.value || '').trim() : '';
    var bundlePrice = priceEl ? (parseInt(priceEl.value) || 0) : 0;
    var origPrice   = origEl  ? (parseInt(origEl.value) || null) : null;
    var isActive    = activeEl ? activeEl.checked : true;
    var bundleId    = idEl ? (idEl.value || null) : null;

    if (!titleAr) { showToast('يرجى إدخال اسم الباقة', 'error'); return; }
    if (!bundlePrice || bundlePrice <= 0) { showToast('يرجى إدخال سعر صحيح', 'error'); return; }

    var cards = document.querySelectorAll('#bundleProductsContainer [data-selected="true"]');
    var productIds = Array.from(cards).map(function(c) { return c.dataset.pid; }).filter(Boolean);
    if (productIds.length < 2) { showToast('يرجى اختيار منتجين على الأقل', 'error'); return; }

    // Image: safe null check
    var imgInputEl = document.getElementById('bundleImageInput');
    var imgUrlEl   = document.getElementById('bundleImageUrl');
    var imageFile  = (imgInputEl && imgInputEl.files && imgInputEl.files.length > 0) ? imgInputEl.files[0] : null;
    var imageUrl   = imgUrlEl ? (imgUrlEl.value || null) : null;

    if (imageFile) {
      try {
        imageUrl = await SupaDB.ImageStorage.upload(imageFile, 'bundle_' + Date.now());
      } catch(imgErr) {
        showToast('تحذير: فشل رفع الصورة', 'warning');
      }
    }

    var row = {
      title_ar:       titleAr,
      product_ids:    JSON.stringify(productIds),
      bundle_price:   bundlePrice,
      original_price: (origPrice && origPrice > bundlePrice) ? origPrice : null,
      active:         isActive,
      updated_at:     new Date().toISOString()
    };
    if (imageUrl) row.image = imageUrl;

    if (bundleId) {
      await SupaDB.Bundles.update(bundleId, row);
    } else {
      row.created_at = new Date().toISOString();
      await SupaDB.Bundles.create(row);
    }

    closeBundleModal();
    await loadBundles();
    if (typeof showSuccessAnimation === 'function') showSuccessAnimation('تم حفظ الباقة بنجاح!');
    else showToast('تم الحفظ بنجاح', 'success');

  } catch(e) {
    showToast(('خطأ: ') + (e && e.message ? e.message : String(e)), 'error');
  } finally {
    if (saveBtn) { saveBtn.textContent = 'حفظ'; saveBtn.disabled = false; }
  }
}

// ── Delete bundle ───────────────────────────────────────────
async function deleteBundle(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;
  try {
    await SupaDB.Bundles.delete(id);
    loadBundles();
    showToast('تم حذف الباقة', 'warning');
  } catch(e) {
    showToast(('خطأ: ') + (e && e.message ? e.message : String(e)), 'error');
  }
}

// ── Delegated click handler ─────────────────────────────────
document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action]');
  if (!btn) return;
  var action = btn.dataset.action;
  var id = btn.dataset.id;
  if (action === 'edit-bundle')   editBundle(id);
  else if (action === 'delete-bundle') deleteBundle(id);
});
