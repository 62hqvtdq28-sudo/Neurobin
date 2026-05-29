// skin-type.js v3 — نوع البشرة sub-filter
// Multi-select for admin, single-select filter for customer site
// Data model: _skinTypeMap[productId] = string[] e.g. ['combination','oily'] or ['all_types']

(function() {
'use strict';

var _currentSkinType = null; // null=all, 'combination', 'oily', 'dry', 'all_types'
var _skinTypeMap     = {};   // { productId: string[] }
var _settingsLoaded  = false;

var SKIN_TYPES = [
  { value: null,        label: 'الكل',                 icon: '',   bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
  { value: 'combination', label: 'بشرة مختلطة',       icon: '💧', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  { value: 'oily',       label: 'بشرة دهنية',          icon: '✨', bg: '#FEFCE8', color: '#A16207', border: '#FDE68A' },
  { value: 'dry',        label: 'بشرة جافة',            icon: '🌿', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  { value: 'all_types',  label: 'لكل أنواع البشرة',   icon: '🌸', bg: '#FAF5FF', color: '#7C3AED', border: '#DDD6FE' }
];

// ── Parse stored value → string[] ────────────────────────────────────────
function _parseTypes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  // Old string format: "combination" or "combination,oily"
  try {
    var parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch(e) {}
  return String(raw).split(',').map(function(s){return s.trim();}).filter(Boolean);
}

// ── Load skin types from Supabase settings ────────────────────────────────
async function _loadSkinTypes() {
  if (_settingsLoaded) return _skinTypeMap;
  try {
    var settings = await SupaDB.Settings.get();
    var raw = settings && settings.product_skin_types;
    var parsed = raw ? JSON.parse(raw) : {};
    // Normalize all values to arrays
    _skinTypeMap = {};
    Object.keys(parsed).forEach(function(id) {
      var v = _parseTypes(parsed[id]);
      if (v.length) _skinTypeMap[id] = v;
    });
  } catch(e) { _skinTypeMap = {}; }
  _settingsLoaded = true;
  return _skinTypeMap;
}

// ── Save skin types for a product (accepts string[]) ─────────────────────
async function saveSkinType(productId, typesOrString) {
  if (!productId) return;
  await _loadSkinTypes();
  var types = _parseTypes(typesOrString);
  if (types.length) {
    _skinTypeMap[String(productId)] = types;
  } else {
    delete _skinTypeMap[String(productId)];
  }
  try {
    await SupaDB.Settings.setMultiple({ product_skin_types: JSON.stringify(_skinTypeMap) });
  } catch(e) { console.warn('[SkinType] save failed:', e); }
}

// ── Get skin types for a product → string[] ───────────────────────────────
function getSkinType(productId) {
  return _skinTypeMap[String(productId)] || [];
}

// ── Merge skin types into products array ──────────────────────────────────
function mergeSkinTypes(products) {
  return products.map(function(p) {
    return Object.assign({}, p, { skin_types: getSkinType(p.id) });
  });
}

// ── Filter products by current skin type filter ───────────────────────────
// Product matches if:
//   - it has 'all_types' in its types → matches any filter
//   - it has the selected filter type in its types
//   - it has no types set (unassigned) → always shows
function filterBySkinType(products) {
  if (!_currentSkinType) return products;
  return products.filter(function(p) {
    var types = getSkinType(p.id);
    if (!types.length) return true; // unassigned = show always
    if (types.indexOf('all_types') !== -1) return true; // all_types matches everything
    return types.indexOf(_currentSkinType) !== -1;
  });
}

// ── Build ADMIN sub-filter HTML (pills, single-select) ────────────────────
function _buildAdminSubFilterHTML() {
  var inner = SKIN_TYPES.map(function(t) {
    var isActive = _currentSkinType === t.value;
    return '<button ' +
      'onclick="SkinType.setFilter(\'' + (t.value||'') + '\')" ' +
      'class="skin-type-pill-admin" ' +
      'data-skin="' + (t.value||'') + '" ' +
      'style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:999px;' +
        'background:' + t.bg + ';color:' + t.color + ';border:' + (isActive?'2px':'1.5px') + ' solid ' + t.border + ';' +
        'font-size:13px;font-weight:' + (isActive?'700':'600') + ';cursor:pointer;transition:all 0.2s;font-family:Cairo,sans-serif;' +
        (isActive ? 'box-shadow:0 0 0 3px ' + t.border + ';' : '') + '">' +
      (t.icon ? t.icon + ' ' : '') + t.label +
    '</button>';
  }).join('');
  return '<div id="skinTypeSubFilter_admin" style="display:none;padding:10px 0 4px;animation:fadeInDown 0.25s ease">' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' + inner + '</div>' +
    '<p style="text-align:center;font-size:11px;color:#94A3B8;margin-top:8px;font-family:Cairo">تصفية منتجات عناية البشرة حسب نوع البشرة</p>' +
  '</div>';
}

// ── Build CUSTOMER SITE sub-filter HTML (colored squares) ─────────────────
function _buildMainSubFilterHTML() {
  var squareOpts = [
    { value: 'combination', label: 'بشرة مختلطة',     emoji: '💧', bg: '#DBEAFE', activeBg: '#3B82F6', border: '#93C5FD', color: '#1E40AF' },
    { value: 'oily',        label: 'بشرة دهنية',       emoji: '✨', bg: '#FEF9C3', activeBg: '#EAB308', border: '#FDE68A', color: '#854D0E' },
    { value: 'dry',         label: 'بشرة جافة',         emoji: '🌿', bg: '#DCFCE7', activeBg: '#22C55E', border: '#86EFAC', color: '#166534' },
    { value: 'all_types',   label: 'لكل أنواع البشرة', emoji: '🌸', bg: '#F3E8FF', activeBg: '#9333EA', border: '#D8B4FE', color: '#6B21A8' }
  ];

  var allBtn = '<button onclick="SkinType.setFilter(\'\')" class="skin-type-sq-main" data-skin="" style="' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;' +
    'width:75px;height:75px;border-radius:14px;' +
    'background:' + (!_currentSkinType ? '#E2E8F0' : '#F8FAFC') + ';' +
    'color:#475569;border:2px solid ' + (!_currentSkinType ? '#94A3B8' : '#E2E8F0') + ';' +
    'font-size:11px;font-weight:' + (!_currentSkinType ? '700' : '600') + ';' +
    'cursor:pointer;transition:all 0.2s;font-family:Cairo,sans-serif;' +
    'box-shadow:' + (!_currentSkinType ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.06)') + ';' +
    '"><span style="font-size:20px;">🔍</span><span>الكل</span></button>';

  var inner = allBtn + squareOpts.map(function(t) {
    var isActive = _currentSkinType === t.value;
    return '<button onclick="SkinType.setFilter(\'' + t.value + '\')" class="skin-type-sq-main" data-skin="' + t.value + '" style="' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;' +
      'width:75px;height:75px;border-radius:14px;' +
      'background:' + (isActive ? t.activeBg : t.bg) + ';' +
      'color:' + (isActive ? '#fff' : t.color) + ';' +
      'border:2px solid ' + (isActive ? t.activeBg : t.border) + ';' +
      'font-size:11px;font-weight:' + (isActive ? '700' : '600') + ';' +
      'cursor:pointer;transition:all 0.2s;font-family:Cairo,sans-serif;' +
      'box-shadow:' + (isActive ? '0 4px 14px ' + t.activeBg + '66' : '0 2px 6px rgba(0,0,0,0.06)') + ';' +
      (isActive ? 'transform:translateY(-2px);' : '') +
      '"><span style="font-size:20px;">' + t.emoji + '</span><span style="text-align:center;line-height:1.2;">' + t.label + '</span></button>';
  }).join('');

  return '<div id="skinTypeSubFilter_main" style="display:none;padding:12px 16px 8px;animation:fadeInDown 0.25s ease">' +
    '<p style="text-align:center;font-size:12px;color:#94A3B8;margin-bottom:10px;font-family:Cairo;">اختر نوع بشرتك</p>' +
    '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' + inner + '</div>' +
  '</div>';
}

// ── Show / hide sub-filter ────────────────────────────────────────────────
function _showSubFilter(isAdmin) {
  var el = document.getElementById('skinTypeSubFilter_' + (isAdmin ? 'admin' : 'main'));
  if (el) el.style.display = 'block';
}
function _hideSubFilter(isAdmin) {
  var el = document.getElementById('skinTypeSubFilter_' + (isAdmin ? 'admin' : 'main'));
  if (el) el.style.display = 'none';
  _currentSkinType = null;
}

// ── Set customer filter (single-select) ──────────────────────────────────
function setFilter(value) {
  _currentSkinType = value || null;

  // Update admin pills
  document.querySelectorAll('.skin-type-pill-admin').forEach(function(pill) {
    var isActive = (pill.dataset.skin || '') === (_currentSkinType || '');
    var t = SKIN_TYPES.find(function(x){ return (x.value||'') === (pill.dataset.skin||''); }) || SKIN_TYPES[0];
    pill.style.fontWeight = isActive ? '700' : '600';
    pill.style.borderWidth = isActive ? '2px' : '1.5px';
    pill.style.boxShadow = isActive ? '0 0 0 3px ' + t.border : 'none';
  });

  // Update customer squares
  var sqOpts = [
    { value: 'combination', activeBg: '#3B82F6', bg: '#DBEAFE', border: '#93C5FD', color: '#1E40AF' },
    { value: 'oily',        activeBg: '#EAB308', bg: '#FEF9C3', border: '#FDE68A', color: '#854D0E' },
    { value: 'dry',         activeBg: '#22C55E', bg: '#DCFCE7', border: '#86EFAC', color: '#166534' },
    { value: 'all_types',   activeBg: '#9333EA', bg: '#F3E8FF', border: '#D8B4FE', color: '#6B21A8' }
  ];
  document.querySelectorAll('.skin-type-sq-main').forEach(function(btn) {
    var skin = btn.dataset.skin || '';
    var isActive = skin === (_currentSkinType || '');
    if (skin === '') {
      btn.style.background = isActive ? '#E2E8F0' : '#F8FAFC';
      btn.style.borderColor = isActive ? '#94A3B8' : '#E2E8F0';
      btn.style.fontWeight = isActive ? '700' : '600';
      btn.style.boxShadow = isActive ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.06)';
      btn.style.transform = '';
    } else {
      var t = sqOpts.find(function(x){ return x.value === skin; });
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
  if (document.getElementById('section-products')) {
    if (typeof _allProducts !== 'undefined' && typeof renderProductsList === 'function') {
      var af = document.querySelector('#section-products .tab-btn.active');
      renderProductsList(_allProducts, af ? af.dataset.filter : 'skincare');
    }
  } else {
    if (typeof window._triggerSkinFilter === 'function') window._triggerSkinFilter();
  }
}

// ── Inject sub-filters ────────────────────────────────────────────────────
function _injectAdminSubFilter() {
  var t = document.getElementById('skinTypeSubFilterContainer_admin');
  if (t) t.innerHTML = _buildAdminSubFilterHTML();
}
function _injectMainSubFilter() {
  var t = document.getElementById('skinTypeSubFilterContainer_main');
  if (t) t.innerHTML = _buildMainSubFilterHTML();
}

// ── Hooks called by filterProducts / filterProductsAdmin ──────────────────
function hookMainFilter(category) {
  if (category === 'skincare') { _injectMainSubFilter(); _showSubFilter(false); }
  else { _hideSubFilter(false); _currentSkinType = null; }
}
function hookAdminFilter(filter) {
  if (filter === 'skincare') { _injectAdminSubFilter(); _showSubFilter(true); }
  else { _hideSubFilter(true); _currentSkinType = null; }
}

// ── Show/hide modal skin type section ─────────────────────────────────────
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
      b.style.fontWeight = '600';
      b.style.boxShadow = 'none';
    });
  }
}

// ── Global API ────────────────────────────────────────────────────────────
window.SkinType = {
  load:           _loadSkinTypes,
  save:           saveSkinType,
  get:            getSkinType,
  merge:          mergeSkinTypes,
  filterBy:       filterBySkinType,
  setFilter:      setFilter,
  hookMainFilter: hookMainFilter,
  hookAdminFilter:hookAdminFilter,
  handleModal:    handleModalCategory,
  getCurrent:     function() { return _currentSkinType; }
};

// ── CSS ────────────────────────────────────────────────────────────────────
var style = document.createElement('style');
style.textContent = [
  '@keyframes fadeInDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}',
  '.skin-type-sq-main:hover{opacity:0.88;}'
].join('');
document.head.appendChild(style);

// ── Auto-load ─────────────────────────────────────────────────────────────
var _attempts = 0;
function _tryLoad() {
  if (typeof SupaDB !== 'undefined') { _loadSkinTypes().catch(function(){}); }
  else if (_attempts++ < 20) { setTimeout(_tryLoad, 300); }
}
_tryLoad();

})();
