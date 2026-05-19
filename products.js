// products.js \u2014 Migrated to Supabase + Supabase Storage for images
var _allProducts = [];

async function loadFeatures() {
  try { renderFeaturesList(await SupaDB.Features.list()); }
  catch(e) { showToast('\u062E\u0637\u0623: ' + e.message,'error'); renderFeaturesList([]); }
}

function renderFeaturesList(features) {
  var el = document.getElementById('featuresList');
  if (!el) return;
  if (!features.length) { el.innerHTML = '<div class="text-center py-12 text-brand-400">\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0645\u064A\u0632\u0627\u062A</div>'; return; }
  el.innerHTML = features.map(function(f,i) {
    var id = escapeHTML(String(f.id));
    return '<div class="bg-white rounded-xl p-4 sm:p-6 border border-brand-100 animate-fade-in" style="animation-delay:' + (i*0.1) + 's">' +
      '<div class="flex items-start justify-between">' +
      '<div class="flex items-center gap-3">' +
      '<div class="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center"><i data-lucide="' + escapeHTML(f.icon||'shield-check') + '" class="w-6 h-6 text-white"></i></div>' +
      '<div><h3 class="font-bold text-lg text-brand-900">' + escapeHTML(f.title||'') + '</h3><p class="text-brand-600 text-sm">' + escapeHTML(f.desc||f.description||'') + '</p></div></div>' +
      '<div class="flex gap-2"><button data-action="edit-feature" data-id="' + id + '" class="p-2 hover:bg-brand-100 rounded-lg transition-colors"><i data-lucide="edit" class="w-5 h-5 text-brand-600"></i></button>' +
      '<button data-action="delete-feature" data-id="' + id + '" class="p-2 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-5 h-5 text-red-500"></i></button></div></div></div>';
  }).join('');
  lucide.createIcons();
}

function openFeatureModal(id) {
  SupaDB.Features.list().then(function(list) {
    var f = id ? list.find(function(x){ return String(x.id)===String(id); }) : null;
    document.getElementById('featureModalTitle').textContent = f ? '\u062A\u0639\u062F\u064A\u0644 \u0645\u064A\u0632\u0629' : '\u0625\u0636\u0627\u0641\u0629 \u0645\u064A\u0632\u0629 \u062C\u062F\u064A\u062F\u0629';
    document.getElementById('featureId').value    = f ? id : '';
    document.getElementById('featureIcon').value  = f ? (f.icon||'shield-check') : 'shield-check';
    document.getElementById('featureTitle').value = f ? (f.title||'') : '';
    document.getElementById('featureDesc').value  = f ? (f.desc||f.description||'') : '';
    document.getElementById('featureModal').classList.add('active'); lucide.createIcons();
  });
}
function closeFeatureModal() { document.getElementById('featureModal').classList.remove('active'); }
function editFeature(id) { openFeatureModal(id); }
async function saveFeature() {
  var title = document.getElementById('featureTitle').value.trim();
  var desc  = document.getElementById('featureDesc').value.trim();
  if (!title) { showToast('\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u064A\u0632\u0629','error'); return; }
  var id = document.getElementById('featureId').value || null;
  try { await SupaDB.Features.save({ icon: document.getElementById('featureIcon').value, title, desc }, id); closeFeatureModal(); loadFeatures(); showSuccessAnimation('\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0645\u064A\u0632\u0629 \u0628\u0646\u062C\u0627\u062D!'); }
  catch(e) { showToast('\u062E\u0637\u0623: ' + e.message,'error'); }
}
async function deleteFeature(id) {
  if (!confirm('\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u062D\u0630\u0641 \u0647\u0630\u0647 \u0627\u0644\u0645\u064A\u0632\u0629\u061F')) return;
  try { await SupaDB.Features.delete(id); loadFeatures(); showToast('\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u064A\u0632\u0629','warning'); }
  catch(e) { showToast('\u062E\u0637\u0623: ' + e.message,'error'); }
}

async function loadProducts(filter) {
  var el = document.getElementById('productsList');
  try {
    _allProducts = await SupaDB.Products.list();
    renderProductsList(_allProducts, filter);
  } catch(e) {
    el.innerHTML = '<div class="col-span-full text-center py-8 text-red-500">\u062E\u0637\u0623: ' + escapeHTML(e.message) + '</div>';
  }
}

function renderProductsList(products, filter) {
  var el = document.getElementById('productsList');
  var q  = document.getElementById('productSearch') ? document.getElementById('productSearch').value.toLowerCase() : '';
  if (filter && filter !== 'all') products = products.filter(function(p){ return p.category === filter; });
  if (q) products = products.filter(function(p){ return (p.name||'').toLowerCase().includes(q) || (p.name_ar||'').toLowerCase().includes(q); });
  if (!products.length) {
    el.innerHTML = '<div class="col-span-full text-center py-12 text-brand-400">\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0646\u062A\u062C\u0627\u062A</div>'; return;
  }
  var catLabels = { medicines:'\u0623\u062F\u0648\u064A\u0629', skincare:'\u0639\u0646\u0627\u064A\u0629 \u0628\u0627\u0644\u0628\u0634\u0631\u0629', makeup:'\u0645\u0643\u064A\u0627\u062C', devices:'\u0623\u062C\u0647\u0632\u0629' };
  var catColors = { medicines:'bg-blue-100 text-blue-700', skincare:'bg-pink-100 text-pink-700', makeup:'bg-purple-100 text-purple-700', devices:'bg-gray-100 text-gray-700' };
  el.innerHTML = products.map(function(p,i) {
    var pid = escapeHTML(String(p.id));
    var imgSrc = p.image_url || p.image || '';
    var img = imgSrc ? '<img src="' + escapeHTML(imgSrc) + '" class="w-full h-28 object-cover rounded-lg mb-3" onerror="this.style.display=\'none\'">' : '';
    return '<div class="product-card-admin animate-fade-in" style="animation-delay:' + (i*0.05) + 's" data-product-id="' + pid + '">' +
      '<div class="p-4">' +
      '<div class="flex items-start justify-between mb-3">' +
      '<span class="category-badge ' + (catColors[p.category]||'bg-brand-100 text-brand-700') + '">' + (catLabels[p.category]||escapeHTML(p.category||'')) + '</span>' +
      '<div class="flex gap-1"><button data-action="edit-product" data-id="' + pid + '" class="quick-action bg-blue-100 text-blue-600 hover:bg-blue-200"><i data-lucide="edit" class="w-4 h-4"></i></button>' +
      '<button data-action="delete-product" data-id="' + pid + '" class="quick-action bg-red-100 text-red-500 hover:bg-red-200"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>' +
      img +
      '<h3 class="font-bold text-brand-900 mb-1">' + escapeHTML(p.name_ar||p.name||'') + '</h3>' +
      '<p class="text-brand-600 text-sm">' + (p.price||0).toLocaleString() + ' \u062F.\u0639</p>' +
      '</div></div>';
  }).join('');
  lucide.createIcons();
}

function filterProductsAdmin(filter) {
  document.querySelectorAll('#section-products .tab-btn').forEach(function(b){ b.classList.remove('active','bg-brand-700','text-white'); b.classList.add('bg-brand-100','text-brand-700'); });
  var ab = document.querySelector('#section-products [data-filter="' + filter + '"]');
  if (ab) { ab.classList.add('active','bg-brand-700','text-white'); ab.classList.remove('bg-brand-100','text-brand-700'); }
  renderProductsList(_allProducts, filter);
}
function searchProducts() { var af = document.querySelector('#section-products .tab-btn.active'); renderProductsList(_allProducts, af ? af.dataset.filter : 'all'); }

async function openProductModal(id) {
  var product = null;
  if (id) { try { var list = await SupaDB.Products.list(); product = list.find(function(p){ return String(p.id)===String(id); }); } catch(e) { showToast('\u062E\u0637\u0623: '+e.message,'error'); return; } }
  document.getElementById('productModalTitle').textContent = product ? '\u062A\u0639\u062F\u064A\u0644 \u0645\u0646\u062A\u062C' : '\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F';
  document.getElementById('productId').value       = product ? id : '';
  document.getElementById('productName').value     = product ? (product.name_ar||product.name||'') : '';
  document.getElementById('productCategory').value = product ? (product.category||'medicines') : 'medicines';
  document.getElementById('productPrice').value    = product ? (product.price||'') : '';
  document.getElementById('productStock').value    = product ? (product.stock!==undefined ? product.stock : '') : '';
  document.getElementById('productDesc').value     = product ? (product.description||'') : '';
  var imgUrl = product ? (product.image_url||product.image||'') : '';
  if (imgUrl) {
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('imagePreviewContainer').classList.remove('hidden');
    document.getElementById('imagePreviewImg').src = imgUrl;
    document.getElementById('productImage').value = imgUrl;
  } else {
    document.getElementById('imagePreview').classList.remove('hidden');
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('productImage').value = '';
  }
  document.getElementById('productModal').classList.add('active'); lucide.createIcons();
}
function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }
function editProduct(id) { openProductModal(id); }

// \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631 \u2014 Supabase Storage
async function handleImageUpload(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) { showToast('\u0627\u0633\u062A\u062E\u062F\u0645 JPG \u0623\u0648 PNG \u0623\u0648 WebP \u0641\u0642\u0637','error'); input.value=''; return; }
  if (file.size > 5*1024*1024) { showToast('\u062D\u062C\u0645 \u0627\u0644\u0635\u0648\u0631\u0629 \u064A\u062A\u062C\u0627\u0648\u0632 5MB','error'); input.value=''; return; }
  // \u0645\u0639\u0627\u064A\u0646\u0629 \u0641\u0648\u0631\u064A\u0629
  var fr = new FileReader();
  fr.onload = function(e) {
    document.getElementById('imagePreviewImg').src = e.target.result;
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('imagePreviewContainer').classList.remove('hidden');
  };
  fr.readAsDataURL(file);
  // \u0631\u0641\u0639 \u0625\u0644\u0649 Supabase Storage
  try {
    showToast('\u062C\u0627\u0631\u064A \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629...','info');
    var url = await SupaDB.ImageStorage.upload(file);
    document.getElementById('productImage').value = url;
    showToast('\u062A\u0645 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u0646\u062C\u0627\u062D \u2713','success');
  } catch(e) { showToast('\u062A\u062D\u0630\u064A\u0631 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629: ' + e.message,'warning'); }
}
function removeImage() {
  document.getElementById('imagePreview').classList.remove('hidden');
  document.getElementById('imagePreviewContainer').classList.add('hidden');
  document.getElementById('productImage').value = '';
  document.getElementById('productImageFile').value = '';
}

async function saveProduct() {
  var name  = validateInput(document.getElementById('productName').value.trim(), 200);
  var price = parseInt(document.getElementById('productPrice').value);
  var stock = document.getElementById('productStock').value;
  if (!name)            { showToast('\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062A\u062C','error'); return; }
  if (!price || price <= 0){ showToast('\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0633\u0639\u0631 \u0635\u062D\u064A\u062D','error'); return; }
  // FIX: \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0645\u0636\u0627\u0639\u0641\u0627\u064B \u0644\u0644\u0640 250
  if (price % 250 !== 0) {
    var rounded = Math.round(price / 250) * 250;
    price = Math.max(250, rounded);
    document.getElementById('productPrice').value = price;
    showToast('\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0633\u0639\u0631 \u0625\u0644\u0649 ' + price.toLocaleString() + ' \u062F.\u0639 (\u0645\u0636\u0627\u0639\u0641 250)', 'info');
  }
  var id  = document.getElementById('productId').value || null;
  var row = {
    name: name, name_ar: name,
    category: document.getElementById('productCategory').value,
    price: price,
    description: document.getElementById('productDesc').value.trim() || null,
    image_url: document.getElementById('productImage').value || null,
    in_stock: true, stock_level: 'in',
    updated_at: new Date().toISOString()
  };
  if (stock) row.stock = parseInt(stock);
  try {
    if (id) { await SupaDB.Products.update(id, row); } else { row.created_at = new Date().toISOString(); await SupaDB.Products.create(row); }
    closeProductModal(); loadProducts(); showSuccessAnimation('\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0645\u0646\u062A\u062C \u0628\u0646\u062C\u0627\u062D!');
  } catch(e) { showToast('\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062D\u0641\u0638: ' + e.message,'error'); }
}

async function deleteProduct(id) {
  if (!confirm('\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u062A\u062C\u061F')) return;
  try { await SupaDB.Products.delete(id); loadProducts(); showToast('\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0646\u062A\u062C','warning'); }
  catch(e) { showToast('\u062E\u0637\u0623: ' + e.message,'error'); }
}

async function loadTestimonials() {
  try { renderTestimonialsList(await SupaDB.Testimonials.list()); }
  catch(e) { showToast('\u062E\u0637\u0623: ' + e.message,'error'); renderTestimonialsList([]); }
}
function renderTestimonialsList(list) {
  var el = document.getElementById('testimonialsList');
  if (!list.length) { el.innerHTML = '<div class="col-span-full text-center py-12 text-brand-400">\u0644\u0627 \u062A\u0648\u062C\u062F \u0622\u0631\u0627\u0621</div>'; return; }
  el.innerHTML = list.map(function(t,i) {
    var tid = escapeHTML(String(t.id));
    var stars = Array.from({length:5}, function(_,j){ return '<i data-lucide="star" class="w-4 h-4 ' + (j<(t.rating||5) ? 'text-gold fill-gold' : 'text-gray-300') + '"></i>'; }).join('');
    return '<div class="bg-white rounded-xl p-4 sm:p-6 border border-brand-100 animate-fade-in" style="animation-delay:' + (i*0.1) + 's">' +
      '<div class="flex items-center gap-1 mb-3">' + stars + '</div>' +
      '<p class="text-brand-700 mb-4">"' + escapeHTML(t.text||t.message||'') + '"</p>' +
      '<div class="flex items-center justify-between"><div class="flex items-center gap-3"><div class="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center"><span class="text-white font-bold">' + escapeHTML((t.name||'?').charAt(0)) + '</span></div><h4 class="font-semibold text-brand-900">' + escapeHTML(t.name||'') + '</h4></div>' +
      '<div class="flex gap-1"><button data-action="edit-testimonial" data-id="' + tid + '" class="quick-action bg-brand-100 text-brand-600 hover:bg-brand-200"><i data-lucide="edit" class="w-4 h-4"></i></button><button data-action="delete-testimonial" data-id="' + tid + '" class="quick-action bg-red-100 text-red-500 hover:bg-red-200"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div></div>';
  }).join('');
  lucide.createIcons();
}
function openTestimonialModal(id) {
  SupaDB.Testimonials.list().then(function(list) {
    var t = id ? list.find(function(x){ return String(x.id)===String(id); }) : null;
    document.getElementById('testimonialModalTitle').textContent = t ? '\u062A\u0639\u062F\u064A\u0644 \u0631\u0623\u064A' : '\u0625\u0636\u0627\u0641\u0629 \u0631\u0623\u064A \u062C\u062F\u064A\u062F';
    document.getElementById('testimonialId').value    = t ? id : '';
    document.getElementById('testimonialName').value  = t ? (t.name||'') : '';
    document.getElementById('testimonialText').value  = t ? (t.text||t.message||'') : '';
    document.getElementById('testimonialRating').value= t ? (t.rating||5) : 5;
    document.getElementById('testimonialModal').classList.add('active'); lucide.createIcons();
  });
}
function closeTestimonialModal() { document.getElementById('testimonialModal').classList.remove('active'); }
function editTestimonial(id) { openTestimonialModal(id); }
async function saveTestimonial() {
  var name = validateInput(document.getElementById('testimonialName').value.trim(),100);
  var text = validateInput(document.getElementById('testimonialText').value.trim(),1000);
  var rat  = parseInt(document.getElementById('testimonialRating').value)||5;
  if (!name||!text) { showToast('\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u062A\u0639\u0644\u064A\u0642','error'); return; }
  var id = document.getElementById('testimonialId').value || null;
  try { await SupaDB.Testimonials.save({name,text,rating:rat},id); closeTestimonialModal(); loadTestimonials(); showSuccessAnimation('\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0631\u0623\u064A \u0628\u0646\u062C\u0627\u062D!'); }
  catch(e) { showToast('\u062E\u0637\u0623: ' + e.message,'error'); }
}
async function deleteTestimonial(id) {
  if (!confirm('\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0631\u0623\u064A\u061F')) return;
  try { await SupaDB.Testimonials.delete(id); loadTestimonials(); showToast('\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0631\u0623\u064A','warning'); }
  catch(e) { showToast('\u062E\u0637\u0623: ' + e.message,'error'); }
}

document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action]');
  if (!btn) return;
  var a = btn.dataset.action, id = btn.dataset.id;
  switch(a) {
    case 'edit-feature':       editFeature(id);       break;
    case 'delete-feature':     deleteFeature(id);     break;
    case 'edit-product':       editProduct(id);       break;
    case 'delete-product':     deleteProduct(id);     break;
    case 'edit-testimonial':   editTestimonial(id);   break;
    case 'delete-testimonial': deleteTestimonial(id); break;
  }
});
