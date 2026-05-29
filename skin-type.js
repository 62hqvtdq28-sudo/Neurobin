// skin-type.js v2 — نوع البشرة sub-filter for skincare products
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
  if (!_currentSkinType) return products;
  return products.filter(function(p) {
    var st = p.skin_type || getSkinType(p.id);
    return !st || st === _currentSkinType;
  });
}

// ── Build skin type sub-filter HTML (ADMIN — pills) ───────────────────────
function _buildAdminSubFilterHTML() {
  var inner = SKIN_TYPES.map(function(t) {
    var isActive = _currentSkinType === t.value;
    var borderW = isActive ? '2px' : '1.5px';
    var fontW = isActive ? '700' : '600';
    return '<button ' +
      'onclick="SkinType.setFilter(\'' + (t.value||'') + '\')" ' +
      'class="skin-type-pill-admin" ' +
      'data-skin="' + (t.value||'') + '" ' +
      'style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:999px;' +
        'background:' + t.bg + ';color:' + t.color + ';border:' + borderW + ' solid ' + t.border + ';' +
        'font-size:13px;font-weight:' + fontW + ';cursor:pointer;transition:all 0.2s;font-family:Cairo,sans-serif;' +
        (isActive ? 'box-shadow:0 0 0 3px ' + t.border + ';' : '') + '">' +
      (t.icon ? t.icon + ' ' : '') + t.label +
    '</button>';
  }).join('');

  return '<div id="skinTypeSubFilter_admin" ' +
    'style="display:none;padding:10px 0 4px;animation:fadeInDown 0.25s ease">' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;">' +
    inner + '</div>' +
    '<p style="text-align:center;font-size:11px;color:#94A3B8;margin-top:8px;font-family:Cairo">' +
      'تصفية منتجات عناية البشرة حسب نوع البشرة' +
    '</p></div>';
}

// ── Build skin type sub-filter HTML (MAIN SITE — colored squares) ─────────
function _buildMainSubFilterHTML() {
  // Only show the 3 skin type options (no "الكل" here — user sees all by default)
  var skinOptions = [
    { value: 'combination', label: 'بشرة مختلطة', emoji: '💧', bg: '#DBEAFE', activeBg: '#3B82F6', border: '#93C5FD', color: '#1E40AF' },
    { value: 'oily',        label: 'بشرة دهنية',  emoji: '✨', bg: '#FEF9C3', activeBg: '#EAB308', border: '#FDE68A', color: '#854D0E' },
    { value: 'dry',         label: 'بشرة جافة',   emoji: '🌿', bg: '#DCFCE7', activeBg: '#22C55E', border: '#86EFAC', color: '#166534' }
  ];

  var allBtn = '<button ' +
    'onclick="SkinType.setFilter(\'\')" ' +
    'class="skin-type-sq-main" ' +
    'data-skin="" ' +
    'style="' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;' +
      'width:80px;height:80px;border-radius:14px;' +
      'background:' + (!_currentSkinType ? '#E2E8F0' : '#F8FAFC') + ';' +
      'color:#475569;' +
      'border:2px solid ' + (!_currentSkinType ? '#94A3B8' : '#E2E8F0') + ';' +
      'font-size:12px;font-weight:' + (!_currentSkinType ? '700' : '600') + ';' +
      'cursor:pointer;transition:all 0.2s;font-family:Cairo,sans-serif;' +
      'box-shadow:' + (!_currentSkinType ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.06)') + ';' +
    '">' +
    '<span style="font-size:22px;">🔍</span>' +
    '<span>الكل</span>' +
  '</button>';

  var inner = allBtn + skinOptions.map(function(t) {
    var isActive = _currentSkinType === t.value;
    return '<button ' +
      'onclick="SkinType.setFilter(\'' + t.value + '\')" ' +
      'class="skin-type-sq-main" ' +
      'data-skin="' + t.value + '" ' +
      'style="' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;' +
        'width:80px;height:80px;border-radius:14px;' +
        'background:' + (isActive ? t.activeBg : t.bg) + ';' +
        'color:' + (isActive ? '#fff' : t.color) + ';' +
        'border:2px solid ' + (isActive ? t.activeBg : t.border) + ';' +
        'font-size:12px;font-weight:' + (isActive ? '700' : '600') + ';' +
        'cursor:pointer;transition:all 0.2s;font-family:Cairo,sans-serif;' +
        'box-shadow:' + (isActive ? '0 4px 14px ' + t.activeBg + '66' : '0 2px 6px rgba(0,0,0,0.06)') + ';' +
        (isActive ? 'transform:translateY(-2px);' : '') +
      '">' +
      '<span style="font-size:22px;">' + t.emoji + '</span>' +
      '<span>' + t.label + '</span>' +
    '</button>';
  }).join('');

  return '<div id="skinTypeSubFilter_main" ' +
    'style="display:none;padding:12px 16px 8px;animation:fadeInDown 0.25s ease">' +
    '<p style="text-align:center;font-size:12px;color:#94A3B8;margin-bottom:10px;font-family:Cairo;">اختر نوع بشرتك</p>' +
    '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;">' +
    inner +
    '</div>' +
  '</div>';
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
  _currentSkinType = null;
}

// ── Set skin type filter ──────────────────────────────────────────────────
function setFilter(value) {
  _currentSkinType = value || null;

  // Update admin pills
  var adminPills = document.querySelectorAll('.skin-type-pill-admin');
  adminPills.forEach(function(pill) {
    var isActive = (pill.dataset.skin || '') === (_currentSkinType || '');
    var t = SKIN_TYPES.find(function(x){ return (x.value||'') === (pill.dataset.skin||''); }) || SKIN_TYPES[0];
    pill.style.fontWeight = isActive ? '700' : '600';
    pill.style.borderWidth = isActive ? '2px' : '1.5px';
    pill.style.boxShadow = isActive ? '0 0 0 3px ' + t.border : 'none';
  });

  // Update main site squares
  var skinOptions = [
    { value: 'combination', activeBg: '#3B82F6', bg: '#DBEAFE', border: '#93C5FD', color: '#1E40AF' },
    { value: 'oily',        activeBg: '#EAB308', bg: '#FEF9C3', border: '#FDE68A', color: '#854D0E' },
    { value: 'dry',         activeBg: '#22C55E', bg: '#DCFCE7', border: '#86EFAC', color: '#166534' }
  ];
  var sqBtns = document.querySelectorAll('.skin-type-sq-main');
  sqBtns.forEach(function(btn) {
    var skin = btn.dataset.skin || '';
    var isActive = skin === (_currentSkinType || '');
    if (skin === '') {
      // "الكل" button
      btn.style.background = isActive ? '#E2E8F0' : '#F8FAFC';
      btn.style.borderColor = isActive ? '#94A3B8' : '#E2E8F0';
      btn.style.fontWeight = isActive ? '700' : '600';
      btn.style.boxShadow = isActive ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.06)';
      btn.style.transform = '';
    } else {
      var t = skinOptions.find(function(x){ return x.value === skin; });
      if (!t) return;
      btn.style.background = isActive ? t.activeBg : t.bg;
      btn.style.borderColor = isActive ? t.activeBg : t.border;
      btn.style.color = isActive ? '#fff' : t.color;
      btn.style.fontWeight = isActive ? '700' : '600';
      btn.style.boxShadow = isActive ? '0 4px 14px ' + t.activeBg + '66' : '0 2px 6px rgba(0,0,0,0.06)';
      btn.style.transform = isActive ? 'translateY(-2px)' : '';
    }
  });

  // Re-render products
  var isAdmin = !!document.getElementById('section-products');
  if (isAdmin) {
    if (typeof _allProducts !== 'undefined' && typeof renderProductsList === 'function') {
      var af = document.querySelector('#section-products .tab-btn.active');
      renderProductsList(_allProducts, af ? af.dataset.filter : 'skincare');
    }
  } else {
    if (typeof window._triggerSkinFilter === 'function') window._triggerSkinFilter();
  }
}

// ── Inject sub-filter into admin products section ─────────────────────────
function _injectAdminSubFilter() {
  var target = document.getElementById('skinTypeSubFilterContainer_admin');
  if (!target) return;
  target.innerHTML = _buildAdminSubFilterHTML();
}

// ── Inject sub-filter into main site ─────────────────────────────────────
function _injectMainSubFilter() {
  var target = document.getElementById('skinTypeSubFilterContainer_main');
  if (!target) return;
  target.innerHTML = _buildMainSubFilterHTML();
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

// ── CSS ────────────────────────────────────────────────────────────────────
var style = document.createElement('style');
style.textContent = [
  '@keyframes fadeInDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}',
  '.skin-type-sq-main:hover{opacity:0.88;}'
].join('');
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
