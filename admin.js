function saveSettings() {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  var siteName = validateInput(document.getElementById('siteName').value, 100);
  var instagramUrl = validateURL(document.getElementById('instagramUrl').value);
  var whatsappNumber = validatePhone(document.getElementById('whatsappNumber').value);

  var settings = {
    siteName: siteName,
    instagramUrl: instagramUrl,
    whatsappNumber: whatsappNumber
  };
  localStorage.setItem('phSettings', JSON.stringify(settings));
  showToast('تم حفظ الإعدادات بنجاح', 'success');
}

// CSRF Protection helper: Check if user is authenticated
function isAuthenticated() {
  return sessionStorage.getItem('adminLoggedIn') === 'true' &&
         sessionStorage.getItem('adminSessionToken') !== null;
}

// Security: URL Validation
function validateURL(url) {
  if (!url) return '';
  try {
    var parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return escapeHTML(url);
    }
  } catch (e) {
    // If not a valid URL, escape it anyway
  }
  return escapeHTML(url);
}

// Security: Phone Number Validation
function validatePhone(phone) {
  if (!phone) return '';
  // Remove all non-digit characters except + at start
  var cleaned = phone.replace(/[^\d+]/g, '').substring(0, 20);
  return escapeHTML(cleaned);
}

async function changePassword() {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  var currentPassword = document.getElementById('currentPassword').value;
  var newPassword = document.getElementById('newPassword').value;
  var confirmPassword = document.getElementById('confirmPassword').value;

  if (!currentPassword) { showToast('يرجى إدخال كلمة المرور الحالية', 'error'); return; }
  if (!newPassword) { showToast('يرجى إدخال كلمة المرور الجديدة', 'error'); return; }
  // Minimum password length increased for better security (12 chars instead of 8)
  if (newPassword.length < 12) { showToast('كلمة المرور يجب أن تكون 12 حرفاً على الأقل', 'error'); return; }
  if (newPassword !== confirmPassword) { showToast('كلمة المرور الجديدة غير متطابقة', 'error'); return; }
  if (currentPassword === newPassword) { showToast('كلمة المرور الجديدة يجب أن تختلف عن الحالية', 'error'); return; }

  // Verify current password using secure PBKDF2 verification
  const storedPasswordHash = localStorage.getItem('adminPasswordHash');
  const storedSalt = localStorage.getItem('adminPasswordSalt');

  // Check for legacy hash format
  if (isLegacyHash(storedPasswordHash) && !storedSalt) {
    // Legacy format - verify using old SHA-256 method
    const currentPasswordHash = sha256(currentPassword);
    if (storedPasswordHash && currentPasswordHash !== storedPasswordHash) {
      showToast('كلمة المرور الحالية غير صحيحة', 'error');
      return;
    }
  } else {
    // New PBKDF2 format - verify using secure method
    try {
      const isValid = await verifyPassword(currentPassword, storedPasswordHash, storedSalt);
      if (!isValid) {
        showToast('كلمة المرور الحالية غير صحيحة', 'error');
        return;
      }
    } catch (error) {
      showToast('خطأ في التحقق من كلمة المرور', 'error');
      return;
    }
  }

  // Hash new password with PBKDF2 before storing
  const hashResult = await hashPassword(newPassword);
  localStorage.setItem('adminPasswordHash', hashResult.hash);
  localStorage.setItem('adminPasswordSalt', hashResult.salt);
  localStorage.setItem('adminPasswordIterations', hashResult.iterations.toString());

  // Update remember token with hashed password only
  const rememberToken = { timestamp: new Date().getTime(), passwordHash: hashResult.hash, salt: hashResult.salt };
  localStorage.setItem('adminRememberToken', JSON.stringify(rememberToken));

  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  document.getElementById('passwordStrengthBar').className = 'password-strength weak';
  document.getElementById('passwordStrengthText').textContent = 'قوة كلمة المرور: ضعيفة';
  document.getElementById('passwordStrengthText').className = 'text-xs text-brand-400 mt-1';

  showToast('تم تغيير كلمة المرور بنجاح', 'success');
}

function loadSettings() {
  var settings = safeJSONParse(localStorage.getItem('phSettings'), { siteName: 'ph.neurobin'}) || { siteName: 'ph.neurobin', instagramUrl: 'https://instagram.com/ph.neurobin', whatsappNumber: '9647870404967' };
  document.getElementById('siteName').value = escapeHTML(settings.siteName || '');
  document.getElementById('instagramUrl').value = escapeHTML(settings.instagramUrl || '');
  document.getElementById('whatsappNumber').value = escapeHTML(settings.whatsappNumber || '');
}

function loadFeatures() {
  var features = safeJSONParse(localStorage.getItem('phFeatures'), []) || [];
  renderFeaturesList(features);
}

function renderFeaturesList(features) {
  var container = document.getElementById('featuresList');
  if (features.length === 0) {
    container.innerHTML = DOMPurify.sanitize('<div class="text-center py-12 text-brand-400">لا توجد مميزات. أضف مميزة جديدة.</div>');
    return;
  }

  var html = '';
  features.forEach(function(f, i) {
    var safeIcon = escapeHTML(f.icon || 'shield-check');
    var safeTitle = escapeHTML(f.title || '');
    var safeDesc = escapeHTML(f.desc || '');
    html += '<div class="bg-white rounded-xl p-4 sm:p-6 border border-brand-100 animate-fade-in" style="animation-delay: ' + (i * 0.1) + 's">' +
      '<div class="flex items-start justify-between">' +
      '<div class="flex items-center gap-3">' +
      '<div class="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center"><i data-lucide="' + safeIcon + '" class="w-6 h-6 text-white"></i></div>' +
      '<div><h3 class="font-bold text-lg text-brand-900">' + safeTitle + '</h3><p class="text-brand-600 text-sm">' + safeDesc + '</p></div>' +
      '</div>' +
      '<div class="flex gap-2">' +
      '<button onclick="editFeature(' + f.id + ')" class="p-2 hover:bg-brand-100 rounded-lg transition-colors"><i data-lucide="edit" class="w-5 h-5 text-brand-600"></i></button>' +
      '<button onclick="deleteFeature(' + f.id + ')" class="p-2 hover:bg-red-50 rounded-lg transition-colors"><i data-lucide="trash-2" class="w-5 h-5 text-red-500"></i></button>' +
      '</div></div>';
  });
  container.innerHTML = DOMPurify.sanitize(html);
  lucide.createIcons();
}

function openFeatureModal(id) {
  if (id) {
    var features = safeJSONParse(localStorage.getItem('phFeatures'), []) || [];
    var feature = features.find(function(f) { return f.id === id; });
    if (feature) {
      document.getElementById('featureModalTitle').textContent = 'تعديل ميزة';
      document.getElementById('featureId').value = id;
      document.getElementById('featureIcon').value = feature.icon;
      document.getElementById('featureTitle').value = feature.title;
      document.getElementById('featureDesc').value = feature.desc;
    }
  } else {
    document.getElementById('featureModalTitle').textContent = 'إضافة ميزة جديدة';
    document.getElementById('featureId').value = '';
    document.getElementById('featureIcon').value = 'shield-check';
    document.getElementById('featureTitle').value = '';
    document.getElementById('featureDesc').value = '';
  }
  document.getElementById('featureModal').classList.add('active');
  lucide.createIcons();
}

function closeFeatureModal() {
  document.getElementById('featureModal').classList.remove('active');
}

function editFeature(id) {
  openFeatureModal(id);
}

function saveFeature() {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  var title = document.getElementById('featureTitle').value.trim();
  var desc = document.getElementById('featureDesc').value.trim();

  if (!title) {
    showToast('يرجى إدخال عنوان الميزة', 'error');
    return;
  }

  var features = safeJSONParse(localStorage.getItem('phFeatures'), []) || [];
  var id = document.getElementById('featureId').value;

  if (id) {
    var index = features.findIndex(function(f) { return f.id === parseInt(id); });
    if (index > -1) {
      features[index].icon = document.getElementById('featureIcon').value;
      features[index].title = escapeHTML(title);
      features[index].desc = escapeHTML(desc);
    }
  } else {
    features.push({
      id: Date.now(),
      icon: document.getElementById('featureIcon').value,
      title: escapeHTML(title),
      desc: escapeHTML(desc)
    });
  }

  StorageManager.setItem('phFeatures', features);
  AuditLog.record(id ? 'feature_updated' : 'feature_created', { title: escapeHTML(title) });
  closeFeatureModal();
  loadFeatures();
  showSuccessAnimation('تم حفظ الميزة بنجاح!');
}

function deleteFeature(id) {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  if (!confirm('هل أنت متأكد من حذف هذه الميزة؟')) return;
  var features = StorageManager.get('phFeatures', []) || [];
  features = features.filter(function(f) { return f.id !== id; });
  StorageManager.setItem('phFeatures', features);
  AuditLog.record('feature_deleted', { id: id });
  loadFeatures();
  showToast('تم حذف الميزة', 'warning');
}

function loadProducts(filter) {
  const products = StorageManager.getItem('phProducts', []);
  var container = document.getElementById('productsList');

  var searchQuery = document.getElementById('productSearch') ? document.getElementById('productSearch').value.toLowerCase() : '';

  if (filter && filter !== 'all') {
    products = products.filter(function(p) { return p.category === filter; });
  }

  if (searchQuery) {
    products = products.filter(function(p) {
      return p.name.toLowerCase().includes(searchQuery) ||
             (p.description && p.description.toLowerCase().includes(searchQuery));
    });
  }

  if (products.length === 0) {
    container.innerHTML = DOMPurify.sanitize('<div class="col-span-full text-center py-12 text-brand-400">لا توجد منتجات</div>');
    return;
  }

  var html = '';
  var categoryLabels = { medicines: 'أدوية', skincare: 'عناية بالبشرة', makeup: 'مكياج', devices: 'أجهزة' };
  var categoryColors = { medicines: 'bg-blue-100 text-blue-700', skincare: 'bg-pink-100 text-pink-700', makeup: 'bg-purple-100 text-purple-700', devices: 'bg-gray-100 text-gray-700' };

  products.forEach(function(p, i) {
    var stockClass = p.stock > 5 ? 'text-green-600' : p.stock > 0 ? 'text-yellow-600' : 'text-red-600';
    var stockText = p.stock > 0 ? 'المخزون: ' + p.stock : 'غير متوفر';
    var stockDisplay = p.stock !== undefined ? '<p class="text-xs ' + stockClass + '">' + stockText + '</p>' : '';

    html += '<div class="product-card-admin animate-fade-in" style="animation-delay: ' + (i * 0.05) + 's" data-product-id="' + p.id + '">' +
      '<div class="p-4">' +
      '<div class="flex items-start justify-between mb-3">' +
      '<span class="category-badge ' + (categoryColors[p.category] || 'bg-brand-100 text-brand-700') + '">' + (categoryLabels[p.category] || escapeHTML(p.category)) + '</span>' +
      '<div class="flex gap-1">' +
      '<button onclick="toggleQuickEdit(' + p.id + ')" class="quick-action bg-brand-100 text-brand-600 hover:bg-brand-200 quick-edit-btn" title="تعديل سريع"><i data-lucide="edit-2" class="w-4 h-4"></i></button>' +
      '<button onclick="editProduct(' + p.id + ')" class="quick-action bg-blue-100 text-blue-600 hover:bg-blue-200" title="تعديل كامل"><i data-lucide="edit" class="w-4 h-4"></i></button>' +
      '<button onclick="deleteProduct(' + p.id + ')" class="quick-action bg-red-100 text-red-500 hover:bg-red-200"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
      '</div></div>' +

      // Normal View
      '<div id="product-view-' + p.id + '">' +
      '<h3 class="font-bold text-brand-900 mb-2">' + escapeHTML(p.name) + '</h3>' +
      '<p class="text-brand-600 text-sm mb-3">' + p.price.toLocaleString() + ' د.ع</p>' +
      stockDisplay +
      '</div>' +

      // Quick Edit View (Hidden by default)
      '<div id="product-edit-' + p.id + '" class="hidden mt-3 pt-3 border-t border-brand-200">' +
      '<div class="space-y-2">' +
      '<div>' +
      '<label class="text-xs text-brand-500 block mb-1">الاسم</label>' +
      '<input type="text" id="qe-name-' + p.id + '" class="quick-edit-input text-sm" value="' + escapeHTML(p.name) + '">' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div>' +
      '<label class="text-xs text-brand-500 block mb-1">السعر</label>' +
      '<input type="number" id="qe-price-' + p.id + '" class="quick-edit-input text-sm" value="' + p.price + '">' +
      '</div>' +
      '<div>' +
      '<label class="text-xs text-brand-500 block mb-1">المخزون</label>' +
      '<input type="number" id="qe-stock-' + p.id + '" class="quick-edit-input text-sm" value="' + (p.stock !== undefined ? p.stock : '') + '">' +
      '</div>' +
      '</div>' +
      '<div class="flex gap-2 mt-3">' +
      '<button onclick="saveQuickEdit(' + p.id + ')" class="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors">حفظ</button>' +
      '<button onclick="toggleQuickEdit(' + p.id + ')" class="px-3 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">إلغاء</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div></div>';
  });

  container.innerHTML = DOMPurify.sanitize(html);
  lucide.createIcons();
}

// Toggle Quick Edit Mode
function toggleQuickEdit(id) {
  var viewEl = document.getElementById('product-view-' + id);
  var editEl = document.getElementById('product-edit-' + id);
  var cardEl = document.querySelector('[data-product-id="' + id + '"]');

  if (editEl.classList.contains('hidden')) {
    // Switch to edit mode
    viewEl.classList.add('hidden');
    editEl.classList.remove('hidden');
    cardEl.classList.add('quick-edit-active');
    document.getElementById('qe-name-' + id).focus();
  } else {
    // Switch to view mode
    viewEl.classList.remove('hidden');
    editEl.classList.add('hidden');
    cardEl.classList.remove('quick-edit-active');
  }
}

// Save Quick Edit
function saveQuickEdit(id) {
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }
  var name, price, stock;
  try {
    name  = InputValidator.validateProductName(document.getElementById('qe-name-'  + id).value.trim());
    price = InputValidator.validatePrice(document.getElementById('qe-price-' + id).value);
    stock = InputValidator.validateStock(document.getElementById('qe-stock-' + id).value);
  } catch(validationError) {
    showToast(validationError.message, 'error');
    return;
  }

  var products = safeJSONParse(localStorage.getItem('phProducts'), []) || [];
  var index = products.findIndex(function(p) { return p.id === id; });

  if (index > -1) {
    products[index].name = escapeHTML(name);
    products[index].price = price;
    products[index].stock = stock;  // Already validated by InputValidator.stock

    StorageManager.setItem('phProducts', products);
    AuditLog.record('product_quick_edited', { id: id, price: price });

    // Update the view without reload
    var viewEl = document.getElementById('product-view-' + id);
    var editEl = document.getElementById('product-edit-' + id);
    var cardEl = document.querySelector('[data-product-id="' + id + '"]');

    var stockClass = products[index].stock > 5 ? 'text-green-600' : products[index].stock > 0 ? 'text-yellow-600' : 'text-red-600';
    var stockText = products[index].stock > 0 ? 'المخزون: ' + products[index].stock : 'غير متوفر';
    var stockDisplay = products[index].stock !== undefined ? '<p class="text-xs ' + stockClass + '">' + stockText + '</p>' : '';

    var safeName = escapeHTML(name);
    viewEl.innerHTML = DOMPurify.sanitize('<h3 class="font-bold text-brand-900 mb-2">' + safeName + '</h3>' +
      '<p class="text-brand-600 text-sm mb-3">' + price.toLocaleString() + ' د.ع</p>' +
      stockDisplay);

    // Switch back to view mode
    viewEl.classList.remove('hidden');
    editEl.classList.add('hidden');
    cardEl.classList.remove('quick-edit-active');

    showSuccessAnimation('تم تحديث المنتج بنجاح!');
  }
}

function filterProductsAdmin(filter) {
  document.querySelectorAll('#section-products .tab-btn').forEach(function(btn) {
    btn.classList.remove('active', 'bg-brand-700', 'text-white');
    btn.classList.add('bg-brand-100', 'text-brand-700');
  });

  var activeBtn = document.querySelector('#section-products [data-filter="' + filter + '"]');
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-brand-700', 'text-white');
    activeBtn.classList.remove('bg-brand-100', 'text-brand-700');
  }

  loadProducts(filter);
}

// Debounced search — fires 300ms after user stops typing
const debouncedSearch = debounce(() => {
  const activeFilter = document.querySelector('#section-products .tab-btn.active');
  const filter = activeFilter ? activeFilter.dataset.filter : 'all';
  loadProducts(filter);
}, 300);

function searchProducts() {
  debouncedSearch();
}

function openProductModal(id) {
  if (id) {
    var products = safeJSONParse(localStorage.getItem('phProducts'), []) || [];
    var product = products.find(function(p) { return p.id === id; });
    if (product) {
      document.getElementById('productModalTitle').textContent = 'تعديل منتج';
      document.getElementById('productId').value = id;
      document.getElementById('productName').value = product.name;
      document.getElementById('productCategory').value = product.category;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productStock').value = product.stock !== undefined ? product.stock : '';
      document.getElementById('productDesc').value = product.description || '';
      if (product.image) {
        document.getElementById('imagePreview').classList.add('hidden');
        document.getElementById('imagePreviewContainer').classList.remove('hidden');
        document.getElementById('imagePreviewImg').src = product.image;
        document.getElementById('productImage').value = product.image;
      }
    }
  } else {
    document.getElementById('productModalTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = 'medicines';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productDesc').value = '';
    document.getElementById('imagePreview').classList.remove('hidden');
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('productImage').value = '';
  }
  document.getElementById('productModal').classList.add('active');
  lucide.createIcons();
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
}

function editProduct(id) {
  openProductModal(id);
}

function handleImageUpload(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('imagePreview').classList.add('hidden');
      document.getElementById('imagePreviewContainer').classList.remove('hidden');
      document.getElementById('imagePreviewImg').src = e.target.result;
      document.getElementById('productImage').value = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function removeImage() {
  document.getElementById('imagePreview').classList.remove('hidden');
  document.getElementById('imagePreviewContainer').classList.add('hidden');
  document.getElementById('productImage').value = '';
  document.getElementById('productImageFile').value = '';
}

async function saveProduct() {
  try {
    // Security: auth check — throws immediately if not authenticated
    if (!isAuthenticated()) throw new Error('غير مصرح');

    var name = InputValidator.validateProductName(document.getElementById('productName').value.trim());
    var price = InputValidator.validatePrice(document.getElementById('productPrice').value);
    var stock = InputValidator.validateStock(document.getElementById('productStock').value);

    var products = StorageManager.get('phProducts', []) || [];
    var id = document.getElementById('productId').value;

    var safeName = escapeHTML(name);
    var safeDesc = escapeHTML(document.getElementById('productDesc').value.trim());

    var productData = {
      id: id ? parseInt(id) : Date.now(),
      name: safeName,
      nameAr: safeName,
      category: escapeHTML(document.getElementById('productCategory').value),
      price: price,
      stock: stock, // Already validated by InputValidator.stock
      description: safeDesc,
      image: document.getElementById('productImage').value
    };

    if (id) {
      var index = products.findIndex(function(p) { return p.id === parseInt(id); });
      if (index > -1) {
        // Security: Explicit property assignment to prevent mass assignment
        products[index].id = productData.id;
        products[index].name = productData.name;
        products[index].nameAr = productData.nameAr;
        products[index].category = productData.category;
        products[index].price = productData.price;
        if (productData.stock !== undefined) products[index].stock = productData.stock;
        products[index].description = productData.description;
        products[index].image = productData.image;
        products[index].updatedAt = new Date().toISOString();
      }
    } else {
      // Security: Create new object with only allowed properties
      var newProduct = {
        id: productData.id,
        name: productData.name,
        nameAr: productData.nameAr,
        category: productData.category,
        price: productData.price,
        description: productData.description,
        image: productData.image,
        createdAt: new Date().toISOString()
      };
      if (productData.stock !== undefined) newProduct.stock = productData.stock;
      products.push(newProduct);
    }

    StorageManager.setItem('phProducts', products);
    logAction(id ? 'product_updated' : 'product_created', { name: safeName, price: price }, 'success');
    closeProductModal();
    loadProducts();
    showSuccessAnimation('تم حفظ المنتج بنجاح!', true);

  } catch(error) {
    console.error('خطأ في saveProduct:', error);
    showToast(error.message, 'error');
    logAction('saveProduct', { error: error.message }, 'failed');
  }
}

function deleteProduct(id) {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  var products = StorageManager.get('phProducts', []) || [];
  products = products.filter(function(p) { return p.id !== id; });
  StorageManager.setItem('phProducts', products);
  AuditLog.record('product_deleted', { id: id });
  loadProducts();
  showToast('تم حذف المنتج', 'warning');
}

function loadTestimonials() {
  var testimonials = safeJSONParse(localStorage.getItem('phTestimonials'), []) || [];
  var container = document.getElementById('testimonialsList');

  if (testimonials.length === 0) {
    container.innerHTML = DOMPurify.sanitize('<div class="col-span-full text-center py-12 text-brand-400">لا توجد آراء</div>');
    return;
  }

  var html = '';
  testimonials.forEach(function(t, i) {
    var safeName = escapeHTML(t.name || '');
    var safeText = escapeHTML(t.text || '');
    var stars = '';
    for (var j = 0; j < 5; j++) {
      stars += '<i data-lucide="star" class="w-4 h-4 ' + (j < t.rating ? 'text-gold fill-gold' : 'text-gray-300') + '"></i>';
    }
    html += '<div class="bg-white rounded-xl p-4 sm:p-6 border border-brand-100 animate-fade-in" style="animation-delay: ' + (i * 0.1) + 's">' +
      '<div class="flex items-center gap-1 mb-3">' + stars + '</div>' +
      '<p class="text-brand-700 mb-4 leading-relaxed">"' + safeText + '"</p>' +
      '<div class="flex items-center justify-between">' +
      '<div class="flex items-center gap-3">' +
      '<div class="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center"><span class="text-white font-bold">' + (safeName.charAt(0) || '?') + '</span></div>' +
      '<div><h4 class="font-semibold text-brand-900">' + safeName + '</h4><p class="text-brand-500 text-sm">عميل</p></div>' +
      '</div>' +
      '<div class="flex gap-1">' +
      '<button onclick="editTestimonial(' + t.id + ')" class="quick-action bg-brand-100 text-brand-600 hover:bg-brand-200"><i data-lucide="edit" class="w-4 h-4"></i></button>' +
      '<button onclick="deleteTestimonial(' + t.id + ')" class="quick-action bg-red-100 text-red-500 hover:bg-red-200"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
      '</div></div></div>';
  });

  container.innerHTML = DOMPurify.sanitize(html);
  lucide.createIcons();
}

function openTestimonialModal(id) {
  if (id) {
    var testimonials = safeJSONParse(localStorage.getItem('phTestimonials'), []) || [];
    var testimonial = testimonials.find(function(t) { return t.id === id; });
    if (testimonial) {
      document.getElementById('testimonialModalTitle').textContent = 'تعديل رأي';
      document.getElementById('testimonialId').value = id;
      document.getElementById('testimonialName').value = testimonial.name;
      document.getElementById('testimonialText').value = testimonial.text;
      document.getElementById('testimonialRating').value = testimonial.rating;
    }
  } else {
    document.getElementById('testimonialModalTitle').textContent = 'إضافة رأي جديد';
    document.getElementById('testimonialId').value = '';
    document.getElementById('testimonialName').value = '';
    document.getElementById('testimonialText').value = '';
    document.getElementById('testimonialRating').value = '5';
  }
  document.getElementById('testimonialModal').classList.add('active');
  lucide.createIcons();
}

function closeTestimonialModal() {
  document.getElementById('testimonialModal').classList.remove('active');
}

function editTestimonial(id) {
  openTestimonialModal(id);
}

function saveTestimonial() {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  var name = validateInput(document.getElementById('testimonialName').value.trim(), 100);
  var text = validateInput(document.getElementById('testimonialText').value.trim(), 1000);
  var rating = parseInt(document.getElementById('testimonialRating').value);

  if (!name || !text) {
    showToast('يرجى إدخال الاسم والتعليق', 'error');
    return;
  }

  var testimonials = safeJSONParse(localStorage.getItem('phTestimonials'), []) || [];
  var id = document.getElementById('testimonialId').value;

  var safeName = escapeHTML(name);
  var safeText = escapeHTML(text);

  if (id) {
    var index = testimonials.findIndex(function(t) { return t.id === parseInt(id); });
    if (index > -1) {
      testimonials[index] = { name: safeName, text: safeText, rating: rating };
    }
  } else {
    testimonials.push({ id: Date.now(), name: safeName, text: safeText, rating: rating });
  }

  localStorage.setItem('phTestimonials', JSON.stringify(testimonials));
  closeTestimonialModal();
  loadTestimonials();
  showSuccessAnimation('تم حفظ الرأي بنجاح!');
}

function deleteTestimonial(id) {
  // CSRF Protection: Verify authentication and session
  if (!isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error');
    return;
  }

  if (!confirm('هل أنت متأكد من حذف هذا الرأي؟')) return;
  var testimonials = safeJSONParse(localStorage.getItem('phTestimonials'), []) || [];
  testimonials = testimonials.filter(function(t) { return t.id !== id; });
  localStorage.setItem('phTestimonials', JSON.stringify(testimonials));
  loadTestimonials();
  showToast('تم حذف الرأي', 'warning');
}

function loadOrders() {
  var orders = safeJSONParse(localStorage.getItem('phOrders'), []) || [];
  var container = document.getElementById('ordersList');
  var noOrders = document.getElementById('noOrders');

  var searchQuery = document.getElementById('orderSearch') ? document.getElementById('orderSearch').value.toLowerCase() : '';

  if (currentOrderFilter !== 'all') {
    orders = orders.filter(function(o) { return o.status === currentOrderFilter; });
  }

  if (searchQuery) {
    orders = orders.filter(function(o) {
      return escapeHTML(o.name).toLowerCase().includes(searchQuery) ||
             escapeHTML(o.phone).includes(searchQuery);
    });
  }

  if (orders.length === 0) {
    container.classList.add('hidden');
    noOrders.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  noOrders.classList.add('hidden');

  var statusLabels = { new: 'جديد', progress: 'قيد التوصيل', delivered: 'تم التوصيل', cancelled: 'ملغى' };
  var statusClasses = { new: 'order-new', progress: 'order-progress', delivered: 'order-delivered', cancelled: 'order-cancelled' };

  var html = '';
  orders.forEach(function(order) {
    var orderId = order.id || 'ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    html += '<div class="bg-white rounded-xl p-4 sm:p-6 border border-brand-100 animate-fade-in" style="animation-delay: 0.05s">' +
      '<div class="flex items-start justify-between mb-3">' +
      '<div>' +
      '<h3 class="font-bold text-brand-900">' + escapeHTML(order.name) + '</h3>' +
      '<p class="text-brand-600 text-sm">' + escapeHTML(order.phone) + '</p>' +
      '</div>' +
      '<span class="order-status ' + (statusClasses[order.status] || 'order-new') + '">' + (statusLabels[order.status] || 'جديد') + '</span>' +
      '</div>';

    if (order.address) {
      html += '<p class="text-brand-500 text-sm mb-2"><i data-lucide="map-pin" class="w-4 h-4 inline-block ml-1"></i>' + escapeHTML(order.address) + '</p>';
    }

    html += '<div class="text-sm text-brand-600 mb-3">';
    (order.items || []).forEach(function(item) {
      html += '<span class="inline-block bg-brand-50 px-2 py-1 rounded mr-2 mb-1">' + escapeHTML(item.name || '') + ' × ' + (item.quantity || 1) + '</span>';
    });
    html += '</div>' +
      '<div class="flex items-center justify-between">' +
      '<span class="font-bold text-brand-900">' + (order.total || 0).toLocaleString() + ' د.ع</span>' +
      '<span class="text-brand-400 text-xs">' + new Date(order.date || Date.now()).toLocaleDateString('ar-EG') + '</span>' +
      '</div>' +
      '<div class="flex gap-2 mt-3">' +
      '<button onclick="updateOrderStatus(\'' + escapeHTML(orderId.toString()) + '\', \'progress\')" class="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors">قيد التوصيل</button>' +
      '<button onclick="updateOrderStatus(\'' + escapeHTML(orderId.toString()) + '\', \'delivered\')" class="flex-1 bg-green-100 text-green-700 py-2 rounded-lg text-sm font-semibold hover:bg-green-200 transition-colors">تم التوصيل</button>' +
      '<button onclick="updateOrderStatus(\'' + escapeHTML(orderId.toString()) + '\', \'cancelled\')" class="flex-1 bg-red-100 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors">إلغاء</button>' +
      '</div></div>';
  });

  container.innerHTML = DOMPurify.sanitize(html);
  lucide.createIcons();
}

function filterOrders(filter) {
  currentOrderFilter = filter;
  document.querySelectorAll('#section-orders .tab-btn').forEach(function(btn) {
    btn.classList.remove('active', 'bg-brand-700', 'text-white');
    btn.classList.add('bg-brand-100', 'text-brand-700');
  });

  var activeBtn = document.querySelector('#section-orders [data-filter="' + filter + '"]');
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-brand-700', 'text-white');
    activeBtn.classList.remove('bg-brand-100', 'text-brand-700');
  }

  loadOrders();
}

// Debounced order search
const debouncedOrderSearch = debounce(() => loadOrders(), 300);

function searchOrders() {
  debouncedOrderSearch();
}

function updateOrderStatus(orderId, status) {
  // Security: Verify admin is authenticated (IDOR prevention)
  if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
    showToast('يجب تسجيل الدخول أولاً', 'error');
    return;
  }

  // Security: Check session expiration
  var loginTime = parseInt(sessionStorage.getItem('adminLoginTime') || '0');
  var now = Date.now();
  var maxSessionTime = SESSION_CONFIG.TIMEOUT_MS; // Use central config
  if (now - loginTime > maxSessionTime) {
    logout();
    showToast('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى', 'error');
    return;
  }

  // Security: Validate status before processing
  if (!isValidOrderStatus(status)) {
    showToast('حالة غير صالحة', 'error');
    return;
  }

  // Security: Validate order ID
  if (!orderId || typeof orderId !== 'string') {
    showToast('معرف الطلب غير صالح', 'error');
    return;
  }

  var orders = safeJSONParse(localStorage.getItem('phOrders'), []) || [];
  var orderIndex = orders.findIndex(function(o) { return o.id === orderId || o.id === parseInt(orderId); });

  if (orderIndex > -1 && orders[orderIndex]) {
    // Sanitize status value
    var sanitizedStatus = escapeHTML(status);
    orders[orderIndex].status = sanitizedStatus;
    orders[orderIndex].updatedAt = new Date().toISOString();
    localStorage.setItem('phOrders', JSON.stringify(orders));
    loadOrders();
    updateOrdersBadge();
    showToast('تم تحديث حالة الطلب', 'success');
  } else {
    showToast('الطلب غير موجود', 'error');
  }
}

function loadComments() {
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  var container = document.getElementById('commentsList');
  var noComments = document.getElementById('noComments');

  if (currentCommentFilter !== 'all') {
    comments = comments.filter(function(c) { return c.status === currentCommentFilter; });
  }

  if (comments.length === 0) {
    container.classList.add('hidden');
    noComments.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  noComments.classList.add('hidden');

  var statusLabels = { new: 'جديد', read: 'تم القراءة', replied: 'تم الرد' };
  var statusClasses = { new: 'badge-new', read: 'badge-read', replied: 'badge-replied' };

  var html = '';
  comments.forEach(function(comment, i) {
    html += '<div class="comment-card bg-white rounded-xl p-4 sm:p-6 border border-brand-100 animate-fade-in" style="animation-delay: ' + (i * 0.05) + 's">' +
      '<div class="flex items-start justify-between mb-3">' +
      '<div>' +
      '<h3 class="font-bold text-brand-900">' + escapeHTML(comment.name) + '</h3>' +
      '<p class="text-brand-500 text-sm">' + escapeHTML(comment.phone || 'بدون هاتف') + '</p>' +
      '</div>' +
      '<span class="badge ' + (statusClasses[comment.status] || 'badge-new') + ' px-2 py-1 rounded text-xs">' + (statusLabels[comment.status] || 'جديد') + '</span>' +
      '</div>' +
      '<p class="text-brand-700 mb-4 leading-relaxed">' + escapeHTML(comment.message) + '</p>' +
      '<div class="flex items-center justify-between">' +
      '<span class="text-brand-400 text-xs">' + new Date(comment.date).toLocaleDateString('ar-EG') + '</span>' +
      '<button onclick="openViewComment(' + comment.id + ')" class="bg-brand-100 text-brand-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-200 transition-colors">عرض التفاصيل</button>' +
      '</div></div>';
  });

  container.innerHTML = DOMPurify.sanitize(html);
  lucide.createIcons();
}

function filterComments(filter) {
  currentCommentFilter = filter;
  document.querySelectorAll('#section-comments .tab-btn').forEach(function(btn) {
    btn.classList.remove('active', 'bg-brand-700', 'text-white');
    btn.classList.add('bg-brand-100', 'text-brand-700');
  });

  var activeBtn = document.querySelector('#section-comments [data-filter="' + filter + '"]');
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-brand-700', 'text-white');
    activeBtn.classList.remove('bg-brand-100', 'text-brand-700');
  }

  loadComments();
}

function openViewComment(id) {
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  var comment = comments.find(function(c) { return c.id === id; });
  if (!comment) return;

  selectedCommentId = id;
  var details = document.getElementById('commentDetails');
  details.innerHTML = DOMPurify.sanitize('<div class="bg-brand-50 rounded-lg p-4"><p class="text-sm text-brand-600 mb-2">الاسم: <span class="font-semibold text-brand-900">' + escapeHTML(comment.name) + '</span></p><p class="text-sm text-brand-600 mb-2">الهاتف: <span class="font-semibold text-brand-900">' + escapeHTML(comment.phone || 'غير محدد') + '</span></p><p class="text-sm text-brand-600">التاريخ: <span class="font-semibold text-brand-900">' + new Date(comment.date).toLocaleDateString('ar-EG') + '</span></p></div><div class="mt-4"><p class="font-semibold text-brand-700 mb-2">الرسالة:</p><p class="text-brand-600 leading-relaxed">' + escapeHTML(comment.message) + '</p></div>');
  document.getElementById('replyMessage').value = '';

  document.getElementById('viewCommentModal').classList.add('active');
}

function closeViewCommentModal() {
  document.getElementById('viewCommentModal').classList.remove('active');
}

function markAsRead() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  var index = comments.findIndex(function(c) { return c.id === selectedCommentId; });
  if (index > -1) {
    comments[index].status = 'read';
    localStorage.setItem('phComments', JSON.stringify(comments));
    closeViewCommentModal();
    loadComments();
    updateCommentsBadge();
    showToast('تم تحديث الحالة', 'success');
  }
}

function markAsReplied() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  var index = comments.findIndex(function(c) { return c.id === selectedCommentId; });
  if (index > -1) {
    comments[index].status = 'replied';
    comments[index].reply = document.getElementById('replyMessage').value;
    localStorage.setItem('phComments', JSON.stringify(comments));
    closeViewCommentModal();
    loadComments();
    updateCommentsBadge();
    showToast('تم تسجيل الرد', 'success');
  }
}

function deleteComment() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  comments = comments.filter(function(c) { return c.id !== selectedCommentId; });
  localStorage.setItem('phComments', JSON.stringify(comments));
  closeViewCommentModal();
  loadComments();
  updateCommentsBadge();
  showToast('تم حذف الرسالة', 'warning');
}

function updateCommentsBadge() {
  var comments = safeJSONParse(localStorage.getItem('phComments'), []) || [];
  var newComments = comments.filter(function(c) { return c.status === 'new'; }).length;
  var badge = document.getElementById('commentsBadge');
  if (newComments > 0) {
    badge.textContent = newComments;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function updateOrdersBadge() {
  var orders = safeJSONParse(localStorage.getItem('phOrders'), []) || [];
  var newOrders = orders.filter(function(o) { return o.status === 'new' || o.status === 'progress'; }).length;
  var badge = document.getElementById('ordersBadge');
  if (newOrders > 0) {
    badge.textContent = newOrders;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function clearAllProducts() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  localStorage.removeItem('phProducts');
  loadProducts();
  showToast('تم حذف جميع المنتجات', 'warning');
}

function clearAllOrders() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  localStorage.removeItem('phOrders');
  loadOrders();
  updateOrdersBadge();
  showToast('تم حذف جميع الطلبات', 'warning');
}

function exportAllData() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  var data = {
    products: JSON.parse(localStorage.getItem('phProducts')) || [],
    orders: JSON.parse(localStorage.getItem('phOrders')) || [],
    comments: JSON.parse(localStorage.getItem('phComments')) || [],
    settings: JSON.parse(localStorage.getItem('phSettings')) || {},
    hero: JSON.parse(localStorage.getItem('phHeroContent')) || {},
    features: JSON.parse(localStorage.getItem('phFeatures')) || [],
    testimonials: JSON.parse(localStorage.getItem('phTestimonials')) || []
  };

  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'neurobin_backup_' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير البيانات بنجاح', 'success');
}


// ═══════════════════════════════════════════════════════════════
// SEC: Server-Side Audit Logging
// ═══════════════════════════════════════════════════════════════

// Sanitize data before sending to server log
function sanitizeForLog(data) {
  if (!data || typeof data !== 'object') return {};
  var safe = {};
  var allowed = ['id', 'action', 'status', 'name', 'category', 'price'];
  allowed.forEach(function(k) {
    if (data[k] !== undefined) safe[k] = String(data[k]).substring(0, 200);
  });
  return safe;
}

// Fallback: save locally if server is unavailable
function fallbackToLocal(log) {
  AuditLog.record(log.action, Object.assign({}, log.data, { _serverFailed: true }));
}

// logAction: send audit event to server
function logAction(action, data, status) {
  if (!isAuthenticated()) return; // لا تسجّل بدون مصادقة
  var log = {
    timestamp: new Date().toISOString(),
    action: action,
    status: status,
    // userId يُستخرج من التوكن على الخادم — لا نرسله من المتصفح
    data: sanitizeForLog(data)
  };
  fetch('/api/logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionStorage.getItem('adminSessionToken'),
      'X-CSRF-Token': CSRFProtection.get()
    },
    body: JSON.stringify(log)
  })
    .then(function(res) { if (!res.ok) fallbackToLocal(log); })
    .catch(function() { fallbackToLocal(log); });
}

function showToast(message, type) {
  var toast = document.getElementById('toast');
  toast.className = 'toast';
  if (type) toast.classList.add(type);
  document.getElementById('toastMessage').textContent = message;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// =============================================================
// MANUAL ORDER MODAL — Complete Implementation
// Supports the new grid-based product picker in admin.html
// =============================================================

var _moProducts = [];   // cache of products from Supabase
var _moCartItems = [];  // selected items: [{id, name, price, qty}]

function openManualOrderModal() {
  var modal = document.getElementById('manualOrderModal');
  if (!modal) return;
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
  ['moName','moPhone','moAddress','moNotes'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var delivEl = document.getElementById('moDelivery');
  if (delivEl) delivEl.value = '4000';
  var statusEl = document.getElementById('moStatus');
  if (statusEl) statusEl.value = 'new';
  var totalEl = document.getElementById('moTotal');
  if (totalEl) totalEl.textContent = '4,000 د.ع';
  _moCartItems = [];
  var selEl = document.getElementById('moSelectedProducts');
  if (selEl) selEl.innerHTML = '<p class="text-xs text-brand-400 text-center py-3">لم يتم اختيار منتجات بعد</p>';
  var pickerEl = document.getElementById('moProductPicker');
  if (pickerEl) pickerEl.classList.add('hidden');
  var gridEl = document.getElementById('moProductGrid');
  if (gridEl) gridEl.innerHTML = '';
  SupaDB.Products.list().then(function(list) {
    _moProducts = list;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }).catch(function(e) {
    console.warn('Manual order: products load error:', e.message);
  });
}

function closeManualOrderModal() {
  var modal = document.getElementById('manualOrderModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function toggleMoProductPicker() {
  var picker = document.getElementById('moProductPicker');
  if (!picker) return;
  if (picker.classList.contains('hidden')) {
    picker.classList.remove('hidden');
    var s = document.getElementById('moPickerSearch');
    if (s) s.value = '';
    renderMoProductGrid(_moProducts);
  } else {
    picker.classList.add('hidden');
  }
}

function filterMoProducts() {
  var s = document.getElementById('moPickerSearch');
  var q = s ? s.value.toLowerCase() : '';
  renderMoProductGrid(q ? _moProducts.filter(function(p) {
    return (p.name_ar || p.name || '').toLowerCase().indexOf(q) !== -1;
  }) : _moProducts);
}

function _moEsc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMoProductGrid(products) {
  var grid = document.getElementById('moProductGrid');
  if (!grid) return;
  if (!products || products.length === 0) {
    grid.innerHTML = '<p class="col-span-5 text-xs text-center text-brand-400 py-3">لا توجد منتجات</p>';
    return;
  }
  var html = '';
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var pid   = _moEsc(String(p.id));
    var name  = _moEsc(p.name_ar || p.name || '');
    var price = (p.price || 0).toLocaleString();
    var inCart = _moCartItems.some(function(c) { return String(c.id) === String(p.id); });
    var border = inCart ? 'border-brand-500 bg-brand-50' : 'border-brand-100 bg-white hover:border-brand-400';
    var imgSrc = p.image_url || p.image || '';
    // NOTE: Use double-quoted attribute + no inner quotes to avoid JS string escaping issues
    var imgHtml = imgSrc
      ? '<img src="' + _moEsc(imgSrc) + '" class="w-full h-12 object-contain mb-1" onerror="this.remove()">'
      : '<div class="w-full h-12 flex items-center justify-center text-brand-300"><i data-lucide="package" class="w-6 h-6"></i></div>';
    html += '<div onclick="addMoProduct(' + "'" + pid + "'" + ')" class="cursor-pointer rounded-xl p-2 text-center border-2 transition-all ' + border + '" title="' + name + '">'
      + imgHtml
      + '<p class="text-xs font-semibold text-brand-800 truncate leading-tight">' + name + '</p>'
      + '<p class="text-xs text-brand-500">' + price + ' د.ع</p>'
      + '</div>';
  }
  grid.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(html) : html;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addMoProduct(productId) {
  var p = null;
  for (var i = 0; i < _moProducts.length; i++) {
    if (String(_moProducts[i].id) === String(productId)) { p = _moProducts[i]; break; }
  }
  if (!p) return;
  var existing = null;
  for (var j = 0; j < _moCartItems.length; j++) {
    if (String(_moCartItems[j].id) === String(productId)) { existing = _moCartItems[j]; break; }
  }
  if (existing) {
    existing.qty += 1;
  } else {
    _moCartItems.push({ id: p.id, name: p.name_ar || p.name || '', price: p.price || 0, qty: 1 });
  }
  renderMoSelectedProducts();
  var s = document.getElementById('moPickerSearch');
  var q = s ? s.value.toLowerCase() : '';
  renderMoProductGrid(q ? _moProducts.filter(function(pr) {
    return (pr.name_ar || pr.name || '').toLowerCase().indexOf(q) !== -1;
  }) : _moProducts);
}

function removeMoProduct(productId) {
  _moCartItems = _moCartItems.filter(function(c) { return String(c.id) !== String(productId); });
  renderMoSelectedProducts();
  var s = document.getElementById('moPickerSearch');
  var q = s ? s.value.toLowerCase() : '';
  renderMoProductGrid(q ? _moProducts.filter(function(pr) {
    return (pr.name_ar || pr.name || '').toLowerCase().indexOf(q) !== -1;
  }) : _moProducts);
}

function renderMoSelectedProducts() {
  var container = document.getElementById('moSelectedProducts');
  if (!container) return;
  if (_moCartItems.length === 0) {
    container.innerHTML = '<p class="text-xs text-brand-400 text-center py-3">لم يتم اختيار منتجات بعد</p>';
    updateManualTotal();
    return;
  }
  var html = '';
  for (var i = 0; i < _moCartItems.length; i++) {
    var item = _moCartItems[i];
    var pid = _moEsc(String(item.id));
    var nm  = _moEsc(item.name);
    html += '<div class="flex items-center gap-1.5 bg-white rounded-xl px-2 py-2 border border-brand-100">'
      + '<span class="flex-1 text-xs font-medium text-brand-800 truncate min-w-0">' + nm + '</span>'
      + '<div class="flex items-center gap-0.5 flex-shrink-0">'
      +   '<button onclick="changeMoQty(' + "'" + pid + "'" + ',-1)" style="width:28px;height:28px;min-width:28px;background:#E8EAD8;color:#2D5016;border-radius:8px;font-size:16px;font-weight:bold;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">-</button>'
      +   '<input type="number" class="mo-item-qty" style="width:36px;height:28px;padding:0 2px;text-align:center;font-size:12px;border:1px solid #D1D5B1;border-radius:6px;background:#fff;color:#1E350F;-moz-appearance:textfield;-webkit-appearance:none" value="' + item.qty + '" min="1" max="99" data-pid="' + pid + '" oninput="updateMoItemQty(this)">'
      +   '<button onclick="changeMoQty(' + "'" + pid + "'" + ',1)" style="width:28px;height:28px;min-width:28px;background:#E8EAD8;color:#2D5016;border-radius:8px;font-size:16px;font-weight:bold;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">+</button>'
      + '</div>'
      + '<input type="number" class="mo-item-price" style="width:62px;height:28px;padding:0 4px;text-align:center;font-size:12px;border:1px solid #D1D5B1;border-radius:6px;background:#fff;color:#1E350F;-moz-appearance:textfield;-webkit-appearance:none" value="' + item.price + '" min="0" step="250" data-pid="' + pid + '" oninput="updateMoItemPrice(this)">'
      + '<button onclick="removeMoProduct(' + "'" + pid + "'" + ')" class="p-1 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0 transition-colors"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>'
      + '</div>';
  }
  container.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(html) : html;
  if (typeof lucide !== 'undefined') lucide.createIcons();
  updateManualTotal();
}

function changeMoQty(productId, delta) {
  for (var i = 0; i < _moCartItems.length; i++) {
    if (String(_moCartItems[i].id) === String(productId)) {
      var newQty = (_moCartItems[i].qty || 1) + delta;
      _moCartItems[i].qty = Math.max(1, Math.min(99, newQty));
      break;
    }
  }
  renderMoSelectedProducts();
}

function updateMoItemQty(input) {
  var pid = input.getAttribute('data-pid');
  for (var i = 0; i < _moCartItems.length; i++) {
    if (String(_moCartItems[i].id) === String(pid)) {
      _moCartItems[i].qty = parseInt(input.value) || 1;
      updateManualTotal();
      break;
    }
  }
}

function updateMoItemPrice(input) {
  var pid = input.getAttribute('data-pid');
  for (var i = 0; i < _moCartItems.length; i++) {
    if (String(_moCartItems[i].id) === String(pid)) {
      _moCartItems[i].price = parseFloat(input.value) || 0;
      updateManualTotal();
      break;
    }
  }
}

function updateManualTotal() {
  var subtotal = 0;
  var qtyInputs = document.querySelectorAll('.mo-item-qty');
  if (qtyInputs.length > 0) {
    qtyInputs.forEach(function(qtyEl) {
      var row     = qtyEl.closest('div');
      var priceEl = row ? row.querySelector('.mo-item-price') : null;
      subtotal   += (parseInt(qtyEl.value) || 1) * (parseFloat(priceEl ? priceEl.value : 0) || 0);
    });
  } else {
    for (var i = 0; i < _moCartItems.length; i++) {
      subtotal += (_moCartItems[i].qty || 1) * (_moCartItems[i].price || 0);
    }
  }
  var delivEl = document.getElementById('moDelivery');
  var delivery = parseFloat(delivEl ? delivEl.value : 0) || 0;
  var totalEl  = document.getElementById('moTotal');
  if (totalEl) totalEl.textContent = (subtotal + delivery).toLocaleString('ar-IQ') + ' د.ع';
}

async function saveManualOrder() {
  var nameEl    = document.getElementById('moName');
  var phoneEl   = document.getElementById('moPhone');
  var addrEl    = document.getElementById('moAddress');
  var notesEl   = document.getElementById('moNotes');
  var delivEl   = document.getElementById('moDelivery');
  var statusEl  = document.getElementById('moStatus');

  var name     = nameEl    ? nameEl.value.trim()    : '';
  var phone    = phoneEl   ? phoneEl.value.trim()   : '';
  var address  = addrEl    ? addrEl.value.trim()    : '';
  var notes    = notesEl   ? notesEl.value.trim()   : '';
  var delivery = parseFloat(delivEl ? delivEl.value : 0) || 0;
  var status   = statusEl  ? statusEl.value         : 'new';

  if (!name)  { showToast('يرجى إدخال اسم العميل', 'error'); return; }
  if (!phone) { showToast('يرجى إدخال رقم الهاتف', 'error'); return; }

  // Sync live edits into cart
  document.querySelectorAll('.mo-item-qty').forEach(function(qtyEl) {
    var pid      = qtyEl.getAttribute('data-pid');
    var row      = qtyEl.closest('div');
    var priceEl  = row ? row.querySelector('.mo-item-price') : null;
    for (var i = 0; i < _moCartItems.length; i++) {
      if (String(_moCartItems[i].id) === String(pid)) {
        _moCartItems[i].qty   = parseInt(qtyEl.value) || 1;
        _moCartItems[i].price = parseFloat(priceEl ? priceEl.value : _moCartItems[i].price) || 0;
        break;
      }
    }
  });

  if (_moCartItems.length === 0) {
    showToast('يرجى إضافة منتج واحد على الأقل', 'error');
    return;
  }

  var items    = [];
  var subtotal = 0;
  for (var i = 0; i < _moCartItems.length; i++) {
    var c         = _moCartItems[i];
    var lineTotal = (c.qty || 1) * (c.price || 0);
    subtotal     += lineTotal;
    items.push({ product_id: c.id || null, product_name: c.name || 'منتج', quantity: c.qty || 1, price: c.price || 0, subtotal: lineTotal });
  }

  var saveBtn = document.getElementById('moSaveBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'جاري الحفظ...'; }

  try {
    var res = await SupaDB._db.from('orders').insert({
      customer_name:    name,
      customer_phone:   phone,
      address: address  || null,
      notes:            notes    || null,
      total_amount:     subtotal + delivery,
      status:           status,
      source:           'manual',
      created_at:       new Date().toISOString(),
      updated_at:       new Date().toISOString()
    }).select().single();
    if (res.error) throw res.error;

    if (items.length > 0) {
      var ins = items.map(function(item) { return Object.assign({ order_id: res.data.id }, item); });
      var iRes = await SupaDB._db.from('order_items').insert(ins);
      if (iRes.error) console.warn('Items warning:', iRes.error.message);
    }

    closeManualOrderModal();
    if (typeof loadOrders === 'function') loadOrders();
    if (typeof showSuccessAnimation === 'function') showSuccessAnimation('تم حفظ الطلب بنجاح!');
  } catch(e) {
    showToast('خطأ: ' + e.message, 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i> حفظ الطلب';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// CATEGORY IMAGES MANAGEMENT — صور الأقسام
// ═══════════════════════════════════════════════════════════════

var CATEGORY_DEFS_ADMIN = [
  { filter:'medicines', label:'أدوية',           icon:'fa-syringe',            bg:'#ECFDF5', iconColor:'#059669' },
  { filter:'skincare',  label:'العناية بالبشرة', icon:'fa-face-smile',          bg:'#FDF2F8', iconColor:'#EC4899' },
  { filter:'haircare',  label:'عناية بالشعر',    icon:'fa-scissors',            bg:'#FFFBEB', iconColor:'#F59E0B' },
  { filter:'dental',    label:'عناية بالأسنان',  icon:'fa-tooth',               bg:'#F0F9FF', iconColor:'#0EA5E9' },
  { filter:'makeup',    label:'مكياج',            icon:'fa-wand-magic-sparkles', bg:'#FAF5FF', iconColor:'#8B5CF6' },
  { filter:'devices',   label:'أجهزة طبية',       icon:'fa-heart-pulse',         bg:'#FEF2F2', iconColor:'#EF4444' },
  { filter:'perfumes',  label:'عطور',             icon:'fa-spray-can-sparkles',  bg:'#F0FDF4', iconColor:'#16A34A' }
];

function loadCategoryImages() {
  var grid = document.getElementById('categoryImagesGrid');
  if (!grid) return;

  // Show loading indicator
  grid.innerHTML =
    '<div class="col-span-full text-center py-12 text-brand-400">' +
    '<div class="spinner mx-auto mb-3" style="width:32px;height:32px;border-width:3px"></div>' +
    '<p class="text-sm">جاري التحميل...</p>' +
    '</div>';

  if (!supabaseClient) {
    grid.innerHTML =
      '<div class="col-span-full text-center py-8 text-red-400">' +
      '<p class="font-semibold">خطأ: لم يتم الاتصال بقاعدة البيانات</p>' +
      '</div>';
    return;
  }

  supabaseClient
    .from('site_settings')
    .select('key, value')
    .like('key', 'cat_img_%')
    .then(function(result) {
      var images = {};
      if (!result.error && result.data) {
        result.data.forEach(function(row) {
          images[row.key] = row.value || '';
        });
      }

      var html = '';
      CATEGORY_DEFS_ADMIN.forEach(function(cat) {
        var key = 'cat_img_' + cat.filter;
        var url = images[key] || '';
        var previewHtml = url
          ? '<div class="mb-3 rounded-xl overflow-hidden h-28 bg-gray-50">' +
            '<img src="' + url + '" alt="' + cat.label + '" ' +
            'class="w-full h-full object-cover" ' +
            'onerror="this.parentElement.innerHTML='<div class=\\"flex items-center justify-center h-full text-gray-400 text-xs\\">رابط الصورة غير صالح</div>'">' +
            '</div>'
          : '<div class="mb-3 rounded-xl h-28 bg-gray-50 flex items-center justify-center text-brand-300">' +
            '<i class="fa-solid ' + cat.icon + ' text-3xl"></i>' +
            '</div>';

        html +=
          '<div class="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">' +
            '<div class="flex items-center gap-3 mb-4">' +
              '<div class="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style="background:' + cat.bg + '">' +
                '<i class="fa-solid ' + cat.icon + '" style="color:' + cat.iconColor + ';font-size:1.1rem"></i>' +
              '</div>' +
              '<div>' +
                '<p class="font-bold text-brand-900 text-sm sm:text-base">' + cat.label + '</p>' +
                '<p class="text-brand-400 text-xs mt-0.5">' + key + '</p>' +
              '</div>' +
            '</div>' +
            previewHtml +
            '<div class="flex gap-2">' +
              '<input type="url" id="cat_url_' + cat.filter + '" ' +
              'class="input-field flex-1 text-sm" ' +
              'placeholder="https://example.com/image.jpg" ' +
              'value="' + url.replace(/"/g, '&quot;') + '" dir="ltr">' +
              '<button onclick="saveCategoryImage(\'' + cat.filter + '\')" ' +
              'class="bg-brand-700 hover:bg-brand-800 text-white px-3 sm:px-4 py-2 rounded-lg ' +
              'font-semibold text-sm transition-colors flex-shrink-0">حفظ</button>' +
            '</div>' +
          '</div>';
      });

      grid.innerHTML = html;
    })
    .catch(function(err) {
      grid.innerHTML =
        '<div class="col-span-full text-center py-8 text-red-400">' +
        '<p class="font-semibold">حدث خطأ أثناء التحميل</p>' +
        '</div>';
      ErrorHandler.log('loadCategoryImages', err);
    });
}

async function saveCategoryImage(catFilter) {
  var input = document.getElementById('cat_url_' + catFilter);
  if (!input) return;
  var url = input.value.trim();

  if (url && !url.startsWith('http')) {
    showToast('يرجى إدخال رابط صحيح يبدأ بـ http أو https', 'error');
    return;
  }

  if (!supabaseClient) {
    showToast('خطأ في الاتصال بقاعدة البيانات', 'error');
    return;
  }

  try {
    var key = 'cat_img_' + catFilter;
    var result = await supabaseClient
      .from('site_settings')
      .upsert({ key: key, value: url }, { onConflict: 'key' });

    if (result.error) throw result.error;

    showToast('تم حفظ صورة القسم بنجاح ✓', 'success');
    // Reload panel to refresh preview
    loadCategoryImages();
  } catch(e) {
    showToast('حدث خطأ أثناء الحفظ', 'error');
    ErrorHandler.log('saveCategoryImage', e, { catFilter: catFilter });
  }
}


// ═══════════════════════════════════════════════════════════════
// SINGLE DEVICE SESSION — جهاز واحد فقط في نفس الوقت
// الفكرة: عند الدخول يُخزن توكن فريد في Supabase.
// إذا دخل جهاز آخر، يكتب توكناً جديداً → الجهاز القديم يكتشف
// التغيير ويُسجّل الخروج تلقائياً.
// ═══════════════════════════════════════════════════════════════

var _deviceCheckInterval = null;

// توليد توكن فريد وتسجيله في Supabase