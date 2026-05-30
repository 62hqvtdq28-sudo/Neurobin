// skin-type.js v4 — نوع البشرة sub-filter
// Multi-select admin | Single-select customer | Direct click hook (no wrapper needed)

(function() {
'use strict';

var _currentSkinType = null;
var _skinTypeMap     = {};
var _settingsLoaded  = false;

var SKIN_TYPES = [
  { value: null,        label: 'الكل',               icon: '',   bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
  { value: 'combination', label: 'بشرة مختلطة',     icon: '💧', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  { value: 'oily',       label: 'بشرة دهنية',        icon: '✨', bg: '#FEFCE8', color: '#A16207', border: '#FDE68A' },
  { value: 'dry',        label: 'بشرة جافة',          icon: '🌿', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  { value: 'all_types',  label: 'لكل أنواع البشرة', icon: '🌸', bg: '#FAF5FF', color: '#7C3AED', border: '#DDD6FE' }
];

function _parseTypes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try { var p = JSON.parse(raw); if (Array.isArray(p)) return p.filter(Boolean); } catch(e) {}
  return String(raw).split(',').map(function(s){return s.trim();}).filter(Boolean);
}

async function _loadSkinTypes() {
  if (_settingsLoaded) return _skinTypeMap;
  try {
    var settings = await SupaDB.Settings.get();
    var raw = settings && settings.product_skin_types;
    var parsed = raw ? JSON.parse(raw) : {};
    _skinTypeMap = {};
    Object.keys(parsed).forEach(function(id) {
      var v = _parseTypes(parsed[id]);
      if (v.length) _skinTypeMap[id] = v;
    });
  } catch(e) { _skinTypeMap = {}; }
  _settingsLoaded = true;
  return _skinTypeMap;
}

async function saveSkinType(productId, typesOrString) {
  if (!productId) return;
  await _loadSkinTypes();
  var types = _parseTypes(typesOrString);
  if (types.length) { _skinTypeMap[String(productId)] = types; }
  else { delete _skinTypeMap[String(productId)]; }
  try {
    await SupaDB.Settings.setMultiple({ product_skin_types: JSON.stringify(_skinTypeMap) });
  } catch(e) { console.warn('[SkinType] save failed:', e); }
}

function getSkinType(productId) {
  return _skinTypeMap[String(productId)] || [];
}

function mergeSkinTypes(products) {
  return products.map(function(p) {
    return Object.assign({}, p, { skin_types: getSkinType(p.id) });
  });
}

function filterBySkinType(products) {
  if (!_currentSkinType) return products;
  return products.filter(function(p) {
    var types = getSkinType(p.id);
    if (!types.length) return true;
    if (types.indexOf('all_types') !== -1) return true;
    return types.indexOf(_currentSkinType) !== -1;
  });
}

// ── ADMIN sub-filter (pills) ──────────────────────────────────────────────
function _buildAdminSubFilterHTML() {
  var inner = SKIN_TYPES.map(function(t) {
    var isActive = _currentSkinType === t.value;
    return '<button onclick="SkinType.setFilter(\'' + (t.value||'') + '\')" class="skin-type-pill-admin" data-skin="' + (t.value||'') + '" style="display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:999px;background:' + t.bg + ';color:' + t.color + ';border:' + (isActive?'2px':'1.5px') + ' solid ' + t.border + ';font-size:13px;font-weight:' + (isActive?'700':'600') + ';cursor:pointer;transition:all 0.2s;font-family:Cairo,sans-serif;' + (isActive?'box-shadow:0 0 0 3px '+t.border+';':'') + '">' + (t.icon?t.icon+' ':'') + t.label + '</button>';
  }).join('');
  return '<div id="skinTypeSubFilter_admin" style="display:none;padding:10px 0 4px;animation:fadeInDown 0.25s ease"><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' + inner + '</div><p style="text-align:center;font-size:11px;color:#94A3B8;margin-top:8px;font-family:Cairo">تصفية منتجات عناية البشرة حسب نوع البشرة</p></div>';
}

// ── CUSTOMER SITE sub-filter (colored squares) ────────────────────────────
function _buildMainSubFilterHTML() {
  var sqOpts = [
    { value: 'combination', label: 'بشرة مختلطة',     emoji: '💧', bg: '#DBEAFE', activeBg: '#3B82F6', border: '#93C5FD', color: '#1E40AF' },
    { value: 'oily',        label: 'بشرة دهنية',       emoji: '✨', bg: '#FEF9C3', activeBg: '#EAB308', border: '#FDE68A', color: '#854D0E' },
    { value: 'dry',         label: 'بشرة جافة',         emoji: '🌿', bg: '#DCFCE7', activeBg: '#22C55E', border: '#86EFAC', color: '#166534' },
    { value: 'all_types',   label: 'لكل أنواع البشرة', emoji: '🌸', bg: '#F3E8FF', activeBg: '#9333EA', border: '#D8B4FE', color: '#6B21A8' }
  ];
  var isNone = !_currentSkinType;
  var allBtn = '<button onclick="SkinType.setFilter(\'\')" class="skin-type-sq-main" data-skin="" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:75px;height:75px;border-radius:14px;background:' + (isNone?'#CBD5E1':'#F8FAFC') + ';color:#475569;border:2px solid ' + (isNone?'#94A3B8':'#E2E8F0') + ';font-size:11px;font-weight:' + (isNone?'700':'600') + ';cursor:pointer;transition:all 0.2s;font-family:Cairo,sans-serif;box-shadow:' + (isNone?'0 4px 12px rgba(0,0,0,0.12)':'0 1px 4px rgba(0,0,0,0.06)') + ';"><span style="font-size:20px;">🔍</span><span>الكل</span></button>';

  var inner = allBtn + sqOpts.map(function(t) {
    var isActive = _currentSkinType === t.value;
    return '<button onclick="SkinType.setFilter(\'' + t.value + '\')" class="skin-type-sq-main" data-skin="' + t.value + '" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:75px;height:75px;border-radius:14px;background:' + (isActive?t.activeBg:t.bg) + ';color:' + (isActive?'#fff':t.color) + ';border:2px solid ' + (isActive?t.activeBg:t.border) + ';font-size:11px;font-weight:' + (isActive?'700':'600') + ';cursor:pointer;transition:all 0.2s;font-family:Cairo,sans-serif;box-shadow:' + (isActive?'0 4px 14px '+t.activeBg+'55':'0 1px 4px rgba(0,0,0,0.06)') + ';transform:' + (isActive?'translateY(-2px)':'none') + ';"><span style="font-size:20px;">' + t.emoji + '</span><span style="text-align:center;line-height:1.2;">' + t.label + '</span></button>';
  }).join('');

  return '<div id="skinTypeSubFilter_main" style="padding:14px 16px 8px;animation:fadeInDown 0.3s ease"><p style="text-align:center;font-size:12px;color:#94A3B8;margin-bottom:10px;font-family:Cairo;">اختر نوع بشرتك</p><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' + inner + '</div></div>';
}

function _showContainer(show) {
  var c = document.getElementById('skinTypeSubFilterContainer_main');
  if (!c) return;
  c.style.display = show ? 'block' : 'none';
}

// ── Set customer filter ───────────────────────────────────────────────────
function setFilter(value) {
  _currentSkinType = value || null;

  // Refresh squares by re-injecting (simplest & most reliable)
  var isAdmin = !!document.getElementById('section-products');
  if (!isAdmin) {
    _injectMainSubFilter();
  } else {
    // Update admin pills
    document.querySelectorAll('.skin-type-pill-admin').forEach(function(pill) {
      var isActive = (pill.dataset.skin||'') === (_currentSkinType||'');
      var t = SKIN_TYPES.find(function(x){return (x.value||'')===(pill.dataset.skin||'');}) || SKIN_TYPES[0];
      pill.style.fontWeight = isActive?'700':'600';
      pill.style.borderWidth = isActive?'2px':'1.5px';
      pill.style.boxShadow = isActive?'0 0 0 3px '+t.border:'none';
    });
    if (typeof _allProducts!=='undefined' && typeof renderProductsList==='function') {
      var af = document.querySelector('#section-products .tab-btn.active');
      renderProductsList(_allProducts, af?af.dataset.filter:'skincare');
    }
    return;
  }

  // Re-render filtered products on customer site
  var productGrid = document.getElementById('productsGrid') || document.getElementById('products-grid') || document.querySelector('[id*="product"]');
  // Try multiple approaches to re-render
  if (typeof window._triggerSkinFilter === 'function') {
    window._triggerSkinFilter();
  } else if (typeof window.renderProducts === 'function') {
    var activeBtn = document.querySelector('.cat-icon-btn.active');
    var cat = activeBtn ? activeBtn.dataset.filter : 'all';
    // Access products array — try window.products first, then _allProducts
    var allProds = window.products || window._allProducts || [];
    var filtered = cat === 'all' ? allProds.slice() : allProds.filter(function(p){return p.category===cat;});
    filtered = filterBySkinType(filtered);
    window.renderProducts(filtered);
  }
}

// ── Inject sub-filters ────────────────────────────────────────────────────
function _injectAdminSubFilter() {
  var t = document.getElementById('skinTypeSubFilterContainer_admin');
  if (t) t.innerHTML = _buildAdminSubFilterHTML();
}
function _injectMainSubFilter() {
  var t = document.getElementById('skinTypeSubFilterContainer_main');
  if (!t) return;
  t.innerHTML = _buildMainSubFilterHTML();
  t.style.display = 'block';
}

// ── hookMainFilter: called when category changes ──────────────────────────
function hookMainFilter(category) {
  if (category === 'skincare') {
    _currentSkinType = null; // reset filter on category change
    _injectMainSubFilter();
  } else {
    _currentSkinType = null;
    var c = document.getElementById('skinTypeSubFilterContainer_main');
    if (c) { c.innerHTML = ''; c.style.display = 'none'; }
  }
}

function hookAdminFilter(filter) {
  if (filter === 'skincare') { _injectAdminSubFilter(); var el=document.getElementById('skinTypeSubFilter_admin'); if(el) el.style.display='block'; }
  else { var el2=document.getElementById('skinTypeSubFilter_admin'); if(el2) el2.style.display='none'; _currentSkinType=null; }
}

function handleModalCategory(category) {
  var sec = document.getElementById('skinTypeSection');
  if (!sec) return;
  if (category === 'skincare') {
    sec.style.display = 'block';
  } else {
    sec.style.display = 'none';
    var hi = document.getElementById('productSkinType');
    if (hi) hi.value = '';
    document.querySelectorAll('.chip-skin').forEach(function(b){b.style.fontWeight='600';b.style.boxShadow='none';});
  }
}

// ── DIRECT HOOK for customer site: watches category button clicks ──────────
function _installDirectHook() {
  if (document.getElementById('section-products')) return; // admin — skip
  document.addEventListener('click', function(e) {
    var catBtn = e.target.closest('.cat-icon-btn');
    if (!catBtn) return;
    var category = catBtn.dataset.filter || '';
    // Small delay so filterProducts runs first
    setTimeout(function() { hookMainFilter(category); }, 50);
  });
}

window.SkinType = {
  load:            _loadSkinTypes,
  save:            saveSkinType,
  get:             getSkinType,
  merge:           mergeSkinTypes,
  filterBy:        filterBySkinType,
  setFilter:       setFilter,
  hookMainFilter:  hookMainFilter,
  hookAdminFilter: hookAdminFilter,
  handleModal:     handleModalCategory,
  getCurrent:      function() { return _currentSkinType; }
};

var style = document.createElement('style');
style.textContent = '@keyframes fadeInDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}.skin-type-sq-main:active{transform:scale(0.95)!important;}';
document.head.appendChild(style);

// Install direct hook as soon as DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _installDirectHook);
} else {
  _installDirectHook();
}

// Auto-load skin types
var _attempts = 0;
function _tryLoad() {
  if (typeof SupaDB !== 'undefined') { _loadSkinTypes().catch(function(){}); }
  else if (_attempts++ < 20) { setTimeout(_tryLoad, 300); }
}
_tryLoad();

})();
