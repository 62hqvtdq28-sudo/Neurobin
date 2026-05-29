// skin-type.js v1 — نوع البشرة sub-filter for skincare products
// Works on both main site (index.html) and admin panel

(function() {
'use strict';

// ── State ─────────────────────────────────────────────────────────────────
var _currentSkinType = null; // null=all, 'combination', 'oily', 'dry'
var _skinTypeMap     = {};   // { productId: skinType }
var _settingsLoaded  = false;

var SKIN_TYPES = [
  { value: null,          label: 'الكل',          icon: '',   bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
  { value: 'combination', label: 'بشرة مختلطة', icon: '💧', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  { value: 'oily',        label: 'بشرة دهنية',  icon: '✨', bg: '#FEFCE8', color: '#A16207', border: '#FDE68A' },
  { value: 'dry',         label: 'بشرة جافة',   icon: '🌿', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' }
];

// ── Load skin types from Supabase settings ────────────────────────────────
async function _loadSkinTypes() {
  if (_settingsLoaded) return _skinTypeMap;
  try {
    var settings = await SupaDB.Settings.get();
    var raw = settings && settings.product_skin_types;
    _skinTypeMap = raw ? JSON.parse(raw) : {};
  } catch(e) {
    _skinTypeMap = {};
  }
  _settingsLoaded = true;
  return _skinTypeMap;
}

// ── Save skin type for a product ─────────────────────────────────────────
async function saveSkinType(productId, skinType) {
  if (!productId) return;
  await _loadSkinTypes();
  if (skinType) {
    _skinTypeMap[String(productId)] = skinType;
  } else {
    delete _skinTypeMap[String(productId)];
  }
  try {
    await SupaDB.Settings.setMultiple({ product_skin_types: JSON.stringify(_skinTypeMap) });
  } catch(e) {
    console.warn('[SkinType] save failed:', e);
  }
}

// ── Get skin type for a product ───────────────────────────────────────────
function getSkinType(productId) {
  return _skinTypeMap[String(productId)] || null;
}

// ── Merge skin types into products array ──────────────────────────────────
function mergeSkinTypes(products) {
  return products.map(function(p) {
    return Object.assign({}, p, { skin_type: getSkinType(p.id) });
  });
}

// ── Filter products by current skin type ─────────────────────────────────
function filterBySkinType(products) {
  if (!_currentSkinType) return products; // null = show all
  return products.filter(function(p) {
    var st = p.skin_type || getSkinType(p.id);
    return !st || st === _currentSkinType; // null skin_type matches any filter
  });
}

// ── Build skin type sub-filter HTML ──────────────────────────────────────
function _buildSubFilterHTML(isAdmin) {
  var prefix = isAdmin ? 'admin' : 'main';
  var inner = SKIN_TYPES.map(function(t) {
    var isActive = _currentSkinType === t.value;
    var borderW = isActive ? '2px' : '1.5px';
    var fontW = isActive ? '700' : '600';
    return '<button ' +
      'onclick="SkinType.setFilter(\'' + (t.value||'') + '\')" ' +
      'class="skin-type-pill-' + prefix + '" ' +
      'data-skin="' + (t.value||'') + '" ' +
      'style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:999px;' +
        'background:' + t.bg + ';color:' + t.color + ';border:' + borderW + ' solid ' + t.border + ';' +
        'font-size:13px;font-weight:' + fontW + ';cursor:pointer;transition:all 0.2s;font-family:Cairo,sans-serif;' +
        (isActive ? 'box-shadow:0 0 0 3px ' + t.border + ';' : '') + '">' +
      (t.icon ? t.icon + ' ' : '') + t.label +
    '</button>';
  }).join('');

  return '<div id="skinTypeSubFilter_' + prefix + '" ' +
    'style="display:none;padding:10px 0 4px;animation:fadeInDown 0.25s ease">' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;">' +
    inner + '</div>' +
    '<p style="text-align:center;font-size:11px;color:#94A3B8;margin-top:8px;font-family:Cairo">' +
      'تصفية منتجات عناية البشرة حسب نوع البشرة' +
    '</p></div>';
}

// ── Show / hide sub-filter ────────────────────────────────────────────────
function _showSubFilter(isAdmin) {
  var prefix = isAdmin ? 'admin' : 'main';
  var el = document.getElementById('skinTypeSubFilter_' + prefix);
  if (el) { el.style.display = 'block'; }
}

function _hideSubFilter(isAdmin) {
  var prefix = isAdmin ? 'admin' : 'main';
  var el = document.getElementById('skinTypeSubFilter_' + prefix);
  if (el) { el.style.display = 'none'; }
  // Reset when hidden
  _currentSkinType = null;
}

// ── Set skin type filter ──────────────────────────────────────────────────
function setFilter(value) {
  _currentSkinType = value || null;

  // Update pill styles — both admin and main
  ['admin', 'main'].forEach(function(prefix) {
    var pills = document.querySelectorAll('.skin-type-pill-' + prefix);
    pills.forEach(function(pill) {
      var isActive = (pill.dataset.skin || '') === (_currentSkinType || '');
      var t = SKIN_TYPES.find(function(x){ return (x.value||'') === (pill.dataset.skin||''); }) || SKIN_TYPES[0];
      pill.style.fontWeight = isActive ? '700' : '600';
      pill.style.borderWidth = isActive ? '2px' : '1.5px';
      pill.style.boxShadow = isActive ? '0 0 0 3px ' + t.border : 'none';
    });
  });

  // Re-render products
  var isAdmin = !!document.getElementById('section-products');
  if (isAdmin) {
    // Admin side
    if (typeof _allProducts !== 'undefined' && typeof renderProductsList === 'function') {
      var af = document.querySelector('#section-products .tab-btn.active');
      renderProductsList(_allProducts, af ? af.dataset.filter : 'skincare');
    }
  } else {
    // Main site side
    if (typeof window._triggerSkinFilter === 'function') window._triggerSkinFilter();
  }
}

// ── Inject sub-filter into admin products section ─────────────────────────
function _injectAdminSubFilter() {
  var target = document.getElementById('skinTypeSubFilterContainer_admin');
  if (!target) return;
  target.innerHTML = _buildSubFilterHTML(true);
}

// ── Inject sub-filter into main site ─────────────────────────────────────
function _injectMainSubFilter() {
  var target = document.getElementById('skinTypeSubFilterContainer_main');
  if (!target) return;
  target.innerHTML = _buildSubFilterHTML(false);
}

// ── Handle main-site filterProducts hook ─────────────────────────────────
function hookMainFilter(category) {
  if (category === 'skincare') {
    _injectMainSubFilter();
    _showSubFilter(false);
  } else {
    _hideSubFilter(false);
    _currentSkinType = null;
  }
}

// ── Handle admin filterProductsAdmin hook ────────────────────────────────
function hookAdminFilter(filter) {
  if (filter === 'skincare') {
    _injectAdminSubFilter();
    _showSubFilter(true);
  } else {
    _hideSubFilter(true);
    _currentSkinType = null;
  }
}

// ── Show/hide skin type section in product modal ──────────────────────────
function handleModalCategory(category) {
  var sec = document.getElementById('skinTypeSection');
  if (!sec) return;
  if (category === 'skincare') {
    sec.style.display = 'block';
  } else {
    sec.style.display = 'none';
    // Clear selection when switching away
    var hiddenInput = document.getElementById('productSkinType');
    if (hiddenInput) hiddenInput.value = '';
    document.querySelectorAll('.chip-skin').forEach(function(b) {
      b.classList.remove('active');
    });
  }
}

// ── Expose global API ─────────────────────────────────────────────────────
window.SkinType = {
  load:             _loadSkinTypes,
  save:             saveSkinType,
  get:              getSkinType,
  merge:            mergeSkinTypes,
  filterBy:         filterBySkinType,
  setFilter:        setFilter,
  hookMainFilter:   hookMainFilter,
  hookAdminFilter:  hookAdminFilter,
  handleModal:      handleModalCategory,
  getCurrent:       function() { return _currentSkinType; }
};

// ── CSS keyframe for animation ────────────────────────────────────────────
var style = document.createElement('style');
style.textContent = '@keyframes fadeInDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}';
document.head.appendChild(style);

// ── Auto-load skin types when SupaDB is ready ─────────────────────────────
var _loadAttempts = 0;
function _tryLoad() {
  if (typeof SupaDB !== 'undefined') {
    _loadSkinTypes().catch(function(){});
  } else if (_loadAttempts++ < 20) {
    setTimeout(_tryLoad, 300);
  }
}
_tryLoad();

})();
