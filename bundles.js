// ────────────────────────────────────────────────────────────
// bundles.js — عروض التوفير | Admin Bundle Management
// ────────────────────────────────────────────────────────────
var _allBundles = [];
var _allProductsForBundles = [];

async function loadBundles() {
  var el = document.getElementById('bundlesList');
  if (!el) return;
  try {
    _allBundles = await SupaDB.Bundles.list();
    _allProductsForBundles = await SupaDB.Products.list();
    renderBundlesList(_allBundles);
  } catch(e) {
    if (el) el.innerHTML = '<div class="text-center py-8 text-red-500">\u062e\u0637\u0623: ' + e.message + '</div>';
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
    return '<div class="bg-white rounded-xl border border-brand-100 p-4 sm:p-5 animate-fade-in" style="animation-delay:' + (i*0.05) + 's">' +
      '<div class="flex items-start justify-between mb-3">' +
        '<div class="flex-1 min-w-0">' +
          '<div class="flex items-center gap-2 mb-1">' +
            '<span class="font-bold text-brand-900">' + escapeHTML(b.title_ar || '') + '</span>' +
            '<span class="text-xs px-2 py-0.5 rounded-full ' + statusColor + '">' + statusLabel + '</span>' +
          '</div>' +
          '<p class="text-sm text-brand-500 truncate">' + productNames + '</p>' +
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

  // Render product checkboxes
  var container = document.getElementById('bundleProductsContainer');
  container.innerHTML = (_allProductsForBundles || []).map(function(p) {
    var pid = String(p.id);
    var checked = productIds.includes(pid) || productIds.includes(p.id) ? 'checked' : '';
    return '<label class="flex items-center gap-2 p-2 rounded-lg hover:bg-brand-50 cursor-pointer">' +
      '<input type="checkbox" class="bundle-prod-check w-4 h-4 accent-brand-700" value="' + escapeHTML(pid) + '" ' + checked + '>' +
      '<span class="text-sm text-brand-900">' + escapeHTML(p.name_ar || p.name || '') + '</span>' +
      '<span class="text-xs text-brand-400 mr-auto">' + Number(p.price).toLocaleString() + ' \u062f.\u0639</span>' +
    '</label>';
  }).join('');

  document.getElementById('bundleModal').classList.add('active');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeBundleModal() {
  document.getElementById('bundleModal').classList.remove('active');
}

function editBundle(id) { openBundleModal(id); }

async function saveBundle() {
  var titleAr = (document.getElementById('bundleTitleAr').value || '').trim();
  var bundlePrice = parseInt(document.getElementById('bundlePrice').value) || 0;
  var originalPrice = parseInt(document.getElementById('bundleOriginalPrice').value) || null;
  var active = document.getElementById('bundleActive').checked;

  if (!titleAr) { showToast('\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u0628\u0627\u0642\u0629', 'error'); return; }
  if (!bundlePrice || bundlePrice <= 0) { showToast('\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0633\u0639\u0631 \u0635\u062d\u064a\u062d', 'error'); return; }

  var checks = document.querySelectorAll('#bundleProductsContainer .bundle-prod-check:checked');
  var productIds = Array.from(checks).map(function(c){ return c.value; });
  if (productIds.length < 2) { showToast('\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u0646\u062a\u062c\u064a\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644', 'error'); return; }

  var id = document.getElementById('bundleId').value || null;
  var row = { title_ar: titleAr, product_ids: JSON.stringify(productIds), bundle_price: bundlePrice, original_price: originalPrice && originalPrice > bundlePrice ? originalPrice : null, active, updated_at: new Date().toISOString() };

  try {
    if (id) { await SupaDB.Bundles.update(id, row); } else { row.created_at = new Date().toISOString(); await SupaDB.Bundles.create(row); }
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
  if (a === 'edit-bundle') editBundle(id);
  else if (a === 'delete-bundle') deleteBundle(id);
});
