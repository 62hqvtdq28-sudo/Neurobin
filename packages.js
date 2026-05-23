// ── FRONTEND: دمج البكجات في شبكة المنتجات ──────────────────────────────
(function() {
  // CSS لأيقونة البكجات
  var _s = document.createElement('style');
  _s.textContent = '.ci-pkg{background:#ffffff!important;}';
  document.head.appendChild(_s);

  // بناء كرت البكج بنفس شكل كرت المنتج
  function _pkgCard(pkg) {
    var price = pkg.price ? Number(pkg.price).toLocaleString('ar-IQ') + ' \u062f.\u0639' : '';
    var inStock = pkg.in_stock !== false;
    var imgHtml = pkg.image
      ? '<img src="' + pkg.image + '" alt="" class="w-full h-full object-contain bg-white" loading="lazy">'
      : '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100"><i class="fa-solid fa-gift" style="font-size:2.2rem;color:#D97706"></i></div>';
    return '<div class="product-card-main scroll-animate-scale" role="listitem" data-category="packages" data-type="package" data-id="pkg_' + pkg.id + '">' +
      (!inStock ? '<span class="stock-badge out-of-stock z-10">\u0646\u0641\u0630\u062a \u0627\u0644\u0643\u0645\u064a\u0629</span>' : '') +
      '<div class="product-image-wrapper">' + imgHtml + '</div>' +
      '<div class="p-2.5 product-card-body">' +
        '<span class="inline-block bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full mb-1">\uD83C\uDF81 \u0628\u0643\u062c</span>' +
        '<h3 class="font-heading font-bold text-sm text-brand-900 mb-1 leading-snug">' + (pkg.name || '') + '</h3>' +
        '<div class="flex items-center justify-between">' +
          (price ? '<span class="text-sm font-bold text-brand-700 leading-none">' + price + '</span>' : '<span></span>') +
          '<a href="#contact" class="btn-primary bg-amber-500 hover:bg-amber-400 text-white px-2.5 py-1.5 rounded-full font-medium text-xs flex items-center gap-1 flex-shrink-0 transition-all">\u0627\u0637\u0644\u0628</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // حقن كروت البكجات في شبكة المنتجات
  function _injectPkgs(list) {
    var grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.querySelectorAll('[data-type="package"]').forEach(function(el) { el.remove(); });
    if (!list || !list.length) return;
    grid.insertAdjacentHTML('beforeend', list.map(_pkgCard).join(''));
    if (window.lucide) lucide.createIcons();
    if (typeof initScrollAnimations === 'function') initScrollAnimations();
  }

  // إضافة زر فلتر البكجات (مع صورة القسم)
  function _addFilterBtn() {
    var tabList = document.querySelector('.cat-icon-grid');
    if (!tabList || tabList.querySelector('[data-filter="packages"]')) return;
    var btn = document.createElement('button');
    btn.className = 'cat-icon-btn';
    btn.setAttribute('data-filter', 'packages');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.innerHTML =
      '<div class="cat-icon-circle ci-pkg" id="cat_circle_packages">' +
        '<img alt="\u0628\u0643\u062c\u0627\u062a" id="cat_img_packages" style="display:none;width:100%;height:100%;object-fit:contain;border-radius:50%" onerror="this.style.display=\'none\'">' +
        '<i class="fa-solid fa-gift"></i>' +
      '</div>' +
      '<span class="cat-icon-label">\u0628\u0643\u062c\u0627\u062a</span>';
    btn.addEventListener('click', function(e) {
      document.querySelectorAll('.cat-icon-btn').forEach(function(b) {
        b.classList.remove('active'); b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
      var g = document.getElementById('productsGrid');
      if (!g) return;
      g.querySelectorAll('.product-card-main').forEach(function(c) {
        c.style.display = c.getAttribute('data-type') === 'package' ? '' : 'none';
      });
    });
    tabList.appendChild(btn);
    // تحميل صورة القسم من Supabase إن وجدت
    if (typeof supabaseClient !== 'undefined') {
      supabaseClient.from('site_settings').select('value').eq('key', 'cat_img_packages').maybeSingle()
        .then(function(r) {
          if (!r || !r.data || !r.data.value) return;
          var imgEl = document.getElementById('cat_img_packages');
          if (imgEl) { imgEl.src = r.data.value; imgEl.style.display = ''; }
          var icon = document.querySelector('#cat_circle_packages i');
          if (icon) icon.style.display = 'none';
        }).catch(function(){});
    }
  }

  // تعديل filterProducts لإعادة عرض البكجات عند "الكل"
  function _patchFilter() {
    if (typeof window.filterProducts === 'undefined' || window._pkgPatch) return;
    window._pkgPatch = true;
    var _orig = window.filterProducts;
    window.filterProducts = function(e, cat) {
      _orig(e, cat);
      var g = document.getElementById('productsGrid');
      if (!g) return;
      if (cat === 'all') {
        g.querySelectorAll('[data-type="package"]').forEach(function(c) { c.style.display = ''; });
      } else {
        g.querySelectorAll('[data-type="package"]').forEach(function(c) { c.style.display = 'none'; });
      }
    };
  }

  // تهيئة بعد تحميل الصفحة
  window.addEventListener('load', function() {
    var attempts = 0;
    var iv = setInterval(function() {
      attempts++;
      var grid = document.getElementById('productsGrid');
      if ((grid && grid.children.length > 0) || attempts > 20) {
        clearInterval(iv);
        _addFilterBtn();
        _patchFilter();
        var pkgSec = document.getElementById('packages');
        if (pkgSec) pkgSec.style.display = 'none';
        if (typeof SupaDB !== 'undefined' && SupaDB.Packages) {
          SupaDB.Packages.list().then(function(pkgs) {
            _allPackages = pkgs || [];
            _injectPkgs(_allPackages);
          }).catch(function() {});
        }
      }
    }, 500);
  });
})();

// packages.js — Packages management (mirrors products.js)
var _allPackages = [];

async function loadPackages() {
  var grid = document.getElementById('packagesList');
  if (!grid) return;
  grid.innerHTML = '<div class="col-span-full text-center py-12"><div class="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full mx-auto"></div></div>';
  try {
    _allPackages = await SupaDB.Packages.list();
    renderPackagesList(_allPackages);
  } catch(e) {
    if (typeof showToast === 'function') showToast('خطأ: ' + e.message, 'error');
    grid.innerHTML = '';
  }
}

function renderPackagesList(list) {
  var grid = document.getElementById('packagesList');
  if (!grid) return;
  if (!list || !list.length) {
    grid.innerHTML = '<div class="col-span-full text-center py-12 text-brand-400"><i data-lucide="package-open" class="w-12 h-12 mx-auto mb-3 opacity-30"></i><p>لا توجد بكجات — أضف أول بكج</p></div>';
    if (window.lucide) lucide.createIcons();
    return;
  }
  grid.innerHTML = list.map(function(pkg) {
    var id = escapeHTML(String(pkg.id));
    var img = pkg.image || '';
    var price = pkg.price ? Number(pkg.price).toLocaleString('ar-IQ') + ' د.ع' : '—';
    var inStock = pkg.in_stock !== false;
    return '<div class="bg-white rounded-2xl shadow-sm border border-brand-100 overflow-hidden animate-fade-in">' +
      '<div class="relative">' +
        (img ? '<img src="' + escapeHTML(img) + '" alt="" class="w-full h-44 object-contain bg-white">' :
               '<div class="w-full h-44 bg-brand-50 flex items-center justify-center"><i data-lucide="gift" class="w-12 h-12 text-brand-300"></i></div>') +
        '<div class="absolute top-2 left-2"><span class="px-2 py-1 rounded-full text-xs font-bold ' + (inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') + '">' + (inStock ? 'متوفر' : 'نفد المخزون') + '</span></div>' +
      '</div>' +
      '<div class="p-4">' +
        '<h3 class="font-bold text-brand-900 mb-1 text-sm sm:text-base">' + escapeHTML(pkg.name || '') + '</h3>' +
        (pkg.description ? '<p class="text-brand-500 text-xs sm:text-sm mb-2 line-clamp-2">' + escapeHTML(pkg.description) + '</p>' : '') +
        '<p class="font-bold text-brand-700 mb-3 text-sm">' + price + '</p>' +
        '<div class="flex gap-2">' +
          '<button onclick="openPackageModal(\''+id+'\')" class="flex-1 bg-brand-100 hover:bg-brand-200 text-brand-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1"><i data-lucide="edit-2" class="w-4 h-4"></i> تعديل</button>' +
          '<button onclick="deletePackage(\''+id+'\')" class="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  if (window.lucide) lucide.createIcons();
}

function searchPackages() {
  var q = (document.getElementById('packageSearch') ? document.getElementById('packageSearch').value : '').toLowerCase().trim();
  renderPackagesList(q ? _allPackages.filter(function(p) { return (p.name||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q); }) : _allPackages);
}

function openPackageModal(id) {
  var pkg = id ? _allPackages.find(function(p) { return String(p.id) === String(id); }) : null;
  document.getElementById('pkgModalTitle').textContent = pkg ? 'تعديل بكج' : 'إضافة بكج جديد';
  document.getElementById('pkgId').value = pkg ? id : '';
  document.getElementById('pkgName').value = pkg ? (pkg.name || '') : '';
  document.getElementById('pkgPrice').value = pkg ? (pkg.price || '') : '';
  document.getElementById('pkgDesc').value = pkg ? (pkg.description || '') : '';
  document.getElementById('pkgImage').value = pkg ? (pkg.image || '') : '';
  var prev = document.getElementById('pkgImagePreviewContainer');
  var area = document.getElementById('pkgImagePreview');
  if (pkg && pkg.image) {
    document.getElementById('pkgImagePreviewImg').src = pkg.image;
    if (prev) prev.classList.remove('hidden');
    if (area) area.classList.add('hidden');
  } else {
    if (prev) prev.classList.add('hidden');
    if (area) area.classList.remove('hidden');
  }
  document.getElementById('pkgModal').classList.add('active');
  if (window.lucide) lucide.createIcons();
}

function closePackageModal() { document.getElementById('pkgModal').classList.remove('active'); }

function removePkgImage() {
  document.getElementById('pkgImage').value = '';
  document.getElementById('pkgImagePreviewContainer').classList.add('hidden');
  document.getElementById('pkgImagePreview').classList.remove('hidden');
}

async function savePackage() {
  var name  = document.getElementById('pkgName').value.trim();
  var price = parseFloat(String(document.getElementById('pkgPrice').value).replace(/[^0-9.]/g,'')) || 0;
  var desc  = document.getElementById('pkgDesc').value.trim();
  var image = document.getElementById('pkgImage').value.trim();
  var id    = document.getElementById('pkgId').value || null;
  if (!name) { if (typeof showToast === 'function') showToast('يرجى إدخال اسم البكج', 'error'); return; }
  var payload = { name: name, price: price, description: desc, image: image, in_stock: true };
  // حذف الصورة القديمة من السحابة عند تغييرها
  if (id && image) {
    var _oldPkg = _allPackages.find(function(p){ return String(p.id)===String(id); });
    var _oldImg = _oldPkg && (_oldPkg.image || '');
    if (_oldImg && _oldImg !== image && _oldImg.startsWith('http') && _oldImg.includes('/product-images/')) {
      try { await SupaDB.ImageStorage.remove(_oldImg); } catch(_e) { /* silent */ }
    }
  }
  try {
    if (id) { await SupaDB.Packages.update(id, payload); }
    else    { await SupaDB.Packages.create(payload); }
    closePackageModal();
    loadPackages();
    if (typeof showToast === 'function') showToast(id ? '✅ تم تعديل البكج' : '✅ تم إضافة البكج', 'success');
  } catch(e) { if (typeof showToast === 'function') showToast('❌ خطأ: ' + e.message, 'error'); }
}

async function deletePackage(id) {
  if (!confirm('هل أنت متأكد من حذف هذا البكج؟')) return;
  try {
    // حذف صورة البكج من السحابة أولاً
    var _dp = _allPackages.find(function(p){ return String(p.id)===String(id); });
    var _di = _dp && (_dp.image || '');
    if (_di && _di.startsWith('http') && _di.includes('/product-images/')) {
      try { await SupaDB.ImageStorage.remove(_di); } catch(_e) { /* silent */ }
    }
    await SupaDB.Packages.delete(id);
    loadPackages();
    if (typeof showToast === 'function') showToast('✅ تم حذف البكج', 'success');
  } catch(e) { if (typeof showToast === 'function') showToast('❌ خطأ: ' + e.message, 'error'); }
}

// ── Package Image Upload (iOS-compatible, mirrors product upload) ──────────
window.handlePkgImageUpload = async function(input) {
  var file = input && input.files && input.files[0];
  if (!file) { await new Promise(function(r){setTimeout(r,1500);}); file = input && input.files && input.files[0]; }
  if (!file) { if(typeof showToast==='function') showToast('⚠️ لم يتم اختيار صورة','error'); return; }
  if (!file.type.startsWith('image/') && file.type !== '') { if(typeof showToast==='function') showToast('❌ الملف ليس صورة','error'); input.value=''; return; }
  if (file.size > 10*1024*1024) { if(typeof showToast==='function') showToast('❌ الصورة أكبر من 10MB','error'); input.value=''; return; }
  var fr = new FileReader();
  fr.onload = function(e) {
    document.getElementById('pkgImagePreviewImg').src = e.target.result;
    document.getElementById('pkgImagePreviewContainer').classList.remove('hidden');
    document.getElementById('pkgImagePreview').classList.add('hidden');
    document.getElementById('pkgImage').value = e.target.result;
  };
  fr.readAsDataURL(file);
  if (typeof SupaDB==='undefined'||!SupaDB.ImageStorage||typeof SupaDB.ImageStorage.upload!=='function') {
    if(typeof showToast==='function') showToast('❌ دالة رفع الصور غير موجودة','error'); return;
  }
  var uploadFile = file;
  try {
    var _o=URL.createObjectURL(file);
    var _b=await new Promise(function(res,rej){var _i=new Image();_i.onerror=function(){URL.revokeObjectURL(_o);rej(new Error('fail'));};_i.onload=function(){var _c=document.createElement('canvas'),MAX=1200,w=_i.width,h=_i.height;if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}_c.width=w;_c.height=h;_c.getContext('2d').drawImage(_i,0,0,w,h);_c.toBlob(function(b){URL.revokeObjectURL(_o);b?res(b):rej(new Error('null'));},'image/jpeg',0.88);};_i.src=_o;});
    uploadFile=new File([_b],'pkg-'+Date.now()+'.jpg',{type:'image/jpeg'});
  } catch(ce){uploadFile=file;}
  try {
    if(typeof showToast==='function') showToast('⏳ جاري رفع الصورة...','info');
    var url=await SupaDB.ImageStorage.upload(uploadFile);
    if(!url||!url.startsWith('http')) throw new Error('رابط غير صالح');
    document.getElementById('pkgImage').value=url;
    document.getElementById('pkgImagePreviewImg').src=url;
    if(typeof showToast==='function') showToast('✅ تم رفع الصورة','success');
  } catch(e){if(typeof showToast==='function') showToast('❌ فشل الرفع: '+(e.message||e),'error');}
};

// ── إدارة فيديو الهيرو: إظهار إن وُجد، إخفاء إن لم يُحمَّل ──────────────
(function() {
  window.addEventListener('DOMContentLoaded', function() {
    var video = document.querySelector('.hero-video');
    if (!video) return;
    // إخفاء إن فشل التحميل
    function hideVideo() { video.style.display = 'none'; }
    video.addEventListener('error', hideVideo);
    var src = video.querySelector('source');
    if (src) src.addEventListener('error', hideVideo);
    // تحقق بعد ثانية واحدة إن كان الفيديو يُحمَّل
    setTimeout(function() {
      if (video.readyState === 0 && video.networkState === 3) {
        hideVideo();
      }
    }, 1500);
  });
})();
