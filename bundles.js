// ────────────────────────────────────────────────────────────
// bundles.js — عروض التوفير | Admin Bundle Management
// ────────────────────────────────────────────────────────────
var _allBundles = [];
var _allProductsForBundles = [];

async function loadBundles() {
  var el = document.getElementById('bundlesList');
  if (!el) return;
  // Immediately show loading spinner (confirms function was called)
  el.innerHTML = '<div class="col-span-full flex flex-col items-center justify-center py-12 text-brand-400"><div class="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full mb-3"></div><p class="text-sm">\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u0627\u0642\u0627\u062a...</p></div>';
  // Wait for SupaDB if not ready yet
  var retries = 0;
  while (typeof SupaDB === 'undefined' && retries < 20) {
    await new Promise(function(r){ setTimeout(r, 200); });
    retries++;
  }
  if (typeof SupaDB === 'undefined') {
    el.innerHTML = '<div class="text-center py-8 text-red-400">\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a. \u062c\u0631\u0628 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0635\u0641\u062d\u0629.</div>';
    return;
  }
  try {
    _allBundles = await SupaDB.Bundles.list();
    _allProductsForBundles = await SupaDB.Products.list();
    renderBundlesList(_allBundles);
  } catch(e) {
    if (el) el.innerHTML = '<div class="text-center py-8 text-red-400">\u062e\u0637\u0623: ' + e.message + '</div>';
  }
}

function renderBundlesList(bundles) {
  var el = document.getElementById('bundlesList');
  if (!el) return;
  if (!bundles || !bundles.length) {
    el.innerHTML = '<div class="text-center py-12 text-brand-400">\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u0627\u0642\u0627\u062a \u062d\u062a\u0649 \u0627\u0644\u0622\u0646. \u0623\u0636\u0641 \u0623\u0648\u0644 \u0628\u0627\u0642\u0629!</div>';
    return;
  }
  var productMap = {};
  (_allProductsForBundles || []).forEach(function(p) { productMap[String(p.id)] = p; });

  el.innerHTML = bundles.map(function(b, i) {
    var bid = escapeHTML(String(b.id));
    var productIds = Array.isArray(b.product_ids) ? b.product_ids : (b.product_ids ? JSON.parse(b.product_ids) : []);
    var productNames = productIds.map(function(id) {
      var p = productMap[String(id)];
      return p ? escapeHTML(p.name_ar || p.name || String(id)) : String(id);
    }).join(' + ');
    var saving = b.original_price && b.original_price > b.bundle_price ? b.original_price - b.bundle_price : 0;
    var statusColor = b.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';
    var statusLabel = b.active ? '\u0645\u0641\u0639\u0651\u0644' : '\u0645\u0648\u0642\u0648\u0641';
    var imgHtml = b.image ? '<img src="' + escapeHTML(b.image) + '" class="w-12 h-12 rounded-lg object-cover border border-brand-100 mr-3 flex-shrink-0" onerror="this.remove()">' : '';
    return '<div class="bg-white rounded-xl border border-brand-100 p-4 sm:p-5 animate-fade-in" style="animation-delay:' + (i*0.05) + 's">' +
      '<div class="flex items-start justify-between mb-3">' +
        '<div class="flex items-center flex-1 min-w-0">' +
          imgHtml +
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
        (b.original_price ? '<span class="text-gray-400 line-through">' + Number(b.original_price).toLocaleString() + ' \u062f.\u0639</span>' : '') +
        '<span class="font-bold text-red-600 text-base">' + Number(b.bundle_price).toLocaleString() + ' \u062f.\u0639</span>' +
        (saving > 0 ? '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">\u062a\u0648\u0641\u064a\u0631 ' + saving.toLocaleString() + ' \u062f.\u0639</span>' : '') +
      '</div>' +
    '</div>';
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openBundleModal(id) {
  var b = id ? (_allBundles.find(function(x){ return String(x.id) === String(id); })) : null;
  var productIds = b && Array.isArray(b.product_ids) ? b.product_ids : (b && b.product_ids ? JSON.parse(b.product_ids) : []);

  document.getElementById('bundleModalTitle').textContent = b ? '\u062a\u0639\u062f\u064a\u0644 \u0628\u0627\u0642\u0629' : '\u0625\u0636\u0627\u0641\u0629 \u0628\u0627\u0642\u0629 \u062c\u062f\u064a\u062f\u0629';
  document.getElementById('bundleId').value = b ? id : '';
  document.getElementById('bundleTitleAr').value = b ? (b.title_ar || '') : '';
  document.getElementById('bundlePrice').value = b ? (b.bundle_price || '') : '';
  document.getElementById('bundleOriginalPrice').value = b ? (b.original_price || '') : '';
  document.getElementById('bundleActive').checked = b ? Boolean(b.active) : true;

  // ── Image fields ──
  var imageUrl = b ? (b.image || '') : '';
  document.getElementById('bundleImageUrl').value = imageUrl;
  document.getElementById('bundleImageInput').value = '';
  var imgEl   = document.getElementById('bundleImagePreview');
  var clearBtn= document.getElementById('bundleImageClearBtn');
  var imgLabel= document.getElementById('bundleImageLabel');
  if (imageUrl) {
    imgEl.src = imageUrl; imgEl.classList.remove('hidden');
    clearBtn.classList.remove('hidden');
    imgLabel.textContent = '\u062a\u0645 \u0627\u062e\u062a\u064a\u0627\u0631 \u0635\u0648\u0631\u0629';
  } else {
    imgEl.src = ''; imgEl.classList.add('hidden');
    clearBtn.classList.add('hidden');
    imgLabel.textContent = '\u0627\u0636\u063a\u0637 \u0644\u0631\u0641\u0639 \u0635\u0648\u0631\u0629';
  }

  // ── Product grid (clickable squares) ──
  var container = document.getElementById('bundleProductsContainer');
  container.innerHTML = '<div class="grid grid-cols-3 gap-2 p-2">' +
    (_allProductsForBundles || []).map(function(p) {
      var pid = String(p.id);
      var isSelected = productIds.includes(pid) || productIds.map(String).includes(pid);
      var imgHtml = p.image
        ? '<img src="' + escapeHTML(p.image) + '" class="w-full h-full object-cover" loading="lazy" onerror="this.remove()">'
        : '<div class="w-full h-full flex items-center justify-center bg-brand-50"><i class="fa-solid fa-box" style="font-size:1.2rem;color:#9CA3AF;"></i></div>';
      var checkIcon = isSelected
        ? '<div class="bundle-check-icon absolute top-1 right-1 w-5 h-5 bg-brand-700 rounded-full flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>'
        : '<div class="bundle-check-icon absolute top-1 right-1 w-5 h-5 bg-brand-700 rounded-full flex items-center justify-center" style="display:none"><svg class="w-3 h-3 text-white" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>';
      return '<div onclick="toggleBundleProduct(this)" ' +
          'class="relative cursor-pointer rounded-xl border-2 transition-all overflow-hidden select-none ' + (isSelected ? 'border-brand-700 ring-2 ring-brand-200' : 'border-brand-100 hover:border-brand-300') + '" ' +
          'data-pid="' + escapeHTML(pid) + '" data-selected="' + isSelected + '">' +
          '<div class="aspect-square w-full">' + imgHtml + '</div>' +
          checkIcon +
          '<div class="p-1.5 text-center">' +
            '<p class="text-xs font-semibold text-brand-900 truncate leading-tight">' + escapeHTML(p.name_ar || p.name || '') + '</p>' +
            '<p class="text-xs text-brand-400">' + Number(p.price).toLocaleString() + ' \u062f.\u0639</p>' +
          '</div>' +
        '</div>';
    }).join('') +
  '</div>';

  document.getElementById('bundleModal').classList.add('active');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleBundleProduct(el) {
  var isSelected = el.dataset.selected === 'true';
  el.dataset.selected = isSelected ? 'false' : 'true';
  var chk = el.querySelector('.bundle-check-icon');
  if (!isSelected) {
    el.classList.add('border-brand-700', 'ring-2', 'ring-brand-200');
    el.classList.remove('border-brand-100', 'hover:border-brand-300');
    if (chk) chk.style.display = 'flex';
  } else {
    el.classList.remove('border-brand-700', 'ring-2', 'ring-brand-200');
    el.classList.add('border-brand-100', 'hover:border-brand-300');
    if (chk) chk.style.display = 'none';
  }
}

function previewBundleImage(input) {
  var file = input && input.files && input.files[0];
  if (!file) return;
  var imgEl    = document.getElementById('bundleImagePreview');
  var clearBtn = document.getElementById('bundleImageClearBtn');
  var label    = document.getElementById('bundleImageLabel');
  var reader = new FileReader();
  reader.onload = function(e) {
    imgEl.src = e.target.result;
    imgEl.classList.remove('hidden');
    clearBtn.classList.remove('hidden');
    label.textContent = file.name;
  };
  reader.readAsDataURL(file);
}

function clearBundleImage() {
  document.getElementById('bundleImageInput').value = '';
  document.getElementById('bundleImageUrl').value = '';
  var imgEl = document.getElementById('bundleImagePreview');
  imgEl.src = ''; imgEl.classList.add('hidden');
  document.getElementById('bundleImageClearBtn').classList.add('hidden');
  document.getElementById('bundleImageLabel').textContent = '\u0627\u0636\u063a\u0637 \u0644\u0631\u0641\u0639 \u0635\u0648\u0631\u0629';
}

function closeBundleModal() {
  document.getElementById('bundleModal').classList.remove('active');
}

function editBundle(id) { openBundleModal(id); }

async function saveBundle() {
  var titleAr      = (document.getElementById('bundleTitleAr').value || '').trim();
  var bundlePrice  = parseInt(document.getElementById('bundlePrice').value) || 0;
  var originalPrice= parseInt(document.getElementById('bundleOriginalPrice').value) || null;
  var active       = document.getElementById('bundleActive').checked;

  if (!titleAr)  { showToast('\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u0628\u0627\u0642\u0629', 'error'); return; }
  if (!bundlePrice || bundlePrice <= 0) { showToast('\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0633\u0639\u0631 \u0635\u062d\u064a\u062d', 'error'); return; }

  var cards      = document.querySelectorAll('#bundleProductsContainer [data-selected="true"]');
  var productIds = Array.from(cards).map(function(c) { return c.dataset.pid; });
  if (productIds.length < 2) { showToast('\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u0646\u062a\u062c\u064a\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644', 'error'); return; }

  // ── Upload image if a new file was chosen ──
  var imageFile = document.getElementById('bundleImageInput').files && document.getElementById('bundleImageInput').files[0];
  var imageUrl  = document.getElementById('bundleImageUrl').value || null;
  if (imageFile) {
    try {
      imageUrl = await SupaDB.ImageStorage.upload(imageFile, 'bundle_' + Date.now());
    } catch(e) {
      showToast('\u062a\u062d\u0630\u064a\u0631: \u0644\u0645 \u064a\u062a\u0645 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629 - ' + e.message, 'warning');
    }
  }

  var id  = document.getElementById('bundleId').value || null;
  var row = {
    title_ar:       titleAr,
    product_ids:    JSON.stringify(productIds),
    bundle_price:   bundlePrice,
    original_price: originalPrice && originalPrice > bundlePrice ? originalPrice : null,
    active,
    updated_at:     new Date().toISOString()
  };
  if (imageUrl) row.image = imageUrl;

  try {
    if (id) { await SupaDB.Bundles.update(id, row); }
    else     { row.created_at = new Date().toISOString(); await SupaDB.Bundles.create(row); }
    closeBundleModal();
    loadBundles();
    showSuccessAnimation('\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0628\u0627\u0642\u0629 \u0628\u0646\u062c\u0627\u062d!');
  } catch(e) { showToast('\u062e\u0637\u0623: ' + e.message, 'error'); }
}

async function deleteBundle(id) {
  if (!confirm('\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0647\u0630\u0647 \u0627\u0644\u0628\u0627\u0642\u0629\u061f')) return;
  try {
    await SupaDB.Bundles.delete(id);
    loadBundles();
    showToast('\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0628\u0627\u0642\u0629', 'warning');
  } catch(e) { showToast('\u062e\u0637\u0623: ' + e.message, 'error'); }
}

document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action]');
  if (!btn) return;
  var a = btn.dataset.action, id = btn.dataset.id;
  if (a === 'edit-bundle')   editBundle(id);
  else if (a === 'delete-bundle') deleteBundle(id);
});

// Auto-call loadBundles if section is visible on load or when section tab clicked
(function() {
  function _tryLoad() {
    var sec = document.getElementById('section-bundles');
    if (sec && !sec.classList.contains('hidden')) {
      if (typeof loadBundles === 'function') loadBundles();
    }
  }
  // On page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(_tryLoad, 500); });
  } else {
    setTimeout(_tryLoad, 500);
  }
})();
