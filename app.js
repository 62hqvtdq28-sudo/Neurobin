// ========== أمان الموقع ==========
// نظام التحقق من المدخلات
const SecurityValidator = {
  // التحقق من رقم الهاتف العراقي
  validatePhone: function(phone) {
    // رقم الهاتف العراقي: 07XX XXX XXXX أو 07XXXXXXXX
    const phoneRegex = /^07[0-9]{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, '').replace(/^\+964/, '0'))) {
      return { valid: false, message: 'يرجى إدخال رقم هاتف عراقي صحيح (07XX XXX XXXX)' };
    }
    return { valid: true, message: 'صالح' };
  },

  // التحقق من الاسم
  validateName: function(name) {
    if (!name || name.trim().length < 3) {
      return { valid: false, message: 'الاسم يجب أن يكون 3 أحرف على الأقل' };
    }
    if (name.trim().length > 50) {
      return { valid: false, message: 'الاسم يجب ألا يتجاوز 50 حرفاً' };
    }
    // منع الأحرف الخاصة والأرقام
    const nameRegex = /^[\u0600-\u06FF\s]+$/;
    if (!nameRegex.test(name.trim()) && !/^[a-zA-Z\s]+$/.test(name.trim())) {
      return { valid: false, message: 'الاسم يجب أن يحتوي على أحرف فقط' };
    }
    return { valid: true, message: 'صالح' };
  },

  // التحقق من العنوان
  validateAddress: function(address) {
    if (address && address.trim().length > 200) {
      return { valid: false, message: 'العنوان يجب ألا يتجاوز 200 حرف' };
    }
    return { valid: true, message: 'صالح' };
  },

  // التحقق من الملاحظات
  validateNotes: function(notes) {
    if (notes && notes.trim().length > 500) {
      return { valid: false, message: 'الملاحظات يجب ألا تتجاوز 500 حرف' };
    }
    return { valid: true, message: 'صالح' };
  },

  // التحقق من رسالة التواصل
  validateMessage: function(message) {
    if (!message || message.trim().length < 10) {
      return { valid: false, message: 'الرسالة يجب أن تكون 10 أحرف على الأقل' };
    }
    if (message.trim().length > 1000) {
      return { valid: false, message: 'الرسالة يجب ألا تتجاوز 1000 حرف' };
    }
    return { valid: true, message: 'صالح' };
  },

  // تنظيف المدخلات من الأكواد الخبيثة
  sanitizeInput: function(input) {
    if (typeof input !== 'string') return input;
    return input
      .replace(/[<>'"&]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  },

  // تحويل النص إلى آمن للعرض في HTML
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Product Data
const products = [
  { id: '1', name: 'بانيول فيتامين سي', nameAr: 'بانيول فيتامين سي', category: 'skincare', price: 45000, image: '', inStock: true, stockLevel: 'in' },
  { id: '2', name: 'لوريال مرطب', nameAr: 'لوريال مرطب', category: 'skincare', price: 32000, image: '', inStock: true, stockLevel: 'in' },
  { id: '3', name: 'ماك فيتامين E', nameAr: 'ماك فيتامين E', category: 'skincare', price: 28000, image: '', inStock: true, stockLevel: 'low' },
  { id: '4', name: 'نيووتريسين', nameAr: 'نيووتريسين', category: 'medicines', price: 55000, image: '', inStock: true, stockLevel: 'in' },
  { id: '5', name: 'كونسيرن لوشن', nameAr: 'كونسيرن لوشن', category: 'skincare', price: 38000, image: '', inStock: false, stockLevel: 'out' },
  { id: '6', name: 'MAYBELINE ماسكارا', nameAr: 'MAYBELINE ماسكارا', category: 'makeup', price: 22000, image: '', inStock: true, stockLevel: 'in' },
  { id: '7', name: 'ميبيلين احمر شفاه', nameAr: 'ميبيلين احمر شفاه', category: 'makeup', price: 18000, image: '', inStock: true, stockLevel: 'in' },
  { id: '8', name: 'جهاز قياس الضغط', nameAr: 'جهاز قياس الضغط', category: 'devices', price: 85000, image: '', inStock: true, stockLevel: 'in' },
  { id: '9', name: 'ميبيلين كريم اساس', nameAr: 'ميبيلين كريم اساس', category: 'makeup', price: 35000, image: '', inStock: true, stockLevel: 'low' },
  { id: '10', name: 'ابسورجين', nameAr: 'ابسورجين', category: 'medicines', price: 42000, image: '', inStock: true, stockLevel: 'in' },
  { id: '11', name: 'ريدشن واقي شمس', nameAr: 'ريدشن واقي شمس', category: 'skincare', price: 29000, image: '', inStock: true, stockLevel: 'in' },
  { id: '12', name: 'جهاز قياس السكر', nameAr: 'جهاز قياس السكر', category: 'devices', price: 120000, image: '', inStock: true, stockLevel: 'in' }
];

// Cart State
let cart = [];
let favorites = [];
let displayedProducts = [...products];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // تحميل البيانات من localStorage بشكل آمن
  try {
    const savedCart = localStorage.getItem('cart');
    const savedFavorites = localStorage.getItem('favorites');
    if (savedCart) {
      cart = JSON.parse(savedCart);
      // التحقق من صحة بيانات السلة
      if (!Array.isArray(cart)) cart = [];
    }
    if (savedFavorites) {
      favorites = JSON.parse(savedFavorites);
      // التحقق من صحة بيانات المفضلة
      if (!Array.isArray(favorites)) favorites = [];
    }
  } catch (e) {
    console.warn('Error loading from localStorage:', e);
    cart = [];
    favorites = [];
  }

  setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }, 800);

  lucide.createIcons();
  renderProducts(products);
  updateCartUI();
  updateFavoritesUI();
  initScrollAnimations();
  initCounters();
  initNavbarScroll();
  initEventListeners();
});

// تهيئة المستمعين للأحداث
function initEventListeners() {
  // نموذج إتمام الطلب
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', function(e) {
      e.preventDefault();
      sendToWhatsApp();
    });
  }

  // نموذج التواصل
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleContactSubmit();
    });
  }
}

// Navigation Scroll Effect
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      navbar.classList.add('nav-scrolled');
      navbar.querySelectorAll('.text-white').forEach(el => {
        el.classList.remove('text-white', 'text-white/90');
        el.classList.add('text-brand-900');
      });
    } else {
      navbar.classList.remove('nav-scrolled');
      navbar.querySelectorAll('.text-brand-900').forEach(el => {
        el.classList.add('text-white');
        if(el.classList.contains('text-brand-900')) el.classList.remove('text-brand-900');
        const parent = el.closest('a') || el;
        if(parent.tagName === 'A' || parent.classList.contains('brand-emblem')) {
          el.classList.add('text-white');
          if(el.classList.contains('text-brand-900')) el.classList.remove('text-brand-900');
        }
      });
    }
  });
}

// Scroll Animations
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale').forEach(el => {
    observer.observe(el);
  });
}

// Counter Animation
function initCounters() {
  const counters = document.querySelectorAll('.counter');
  counters.forEach(counter => {
    const target = parseFloat(counter.dataset.target);
    const isDecimal = target % 1 !== 0;
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;

    const updateCounter = () => {
      current += increment;
      if (current < target) {
        counter.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = isDecimal ? target.toFixed(1) : target;
      }
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        updateCounter();
        observer.disconnect();
      }
    }, { threshold: 0.5 });

    observer.observe(counter);
  });
}

// Render Products
function renderProducts(productsToRender) {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = productsToRender.map(product => {
    const safeId = SecurityValidator.escapeHtml(product.id);
    const safeCategory = SecurityValidator.escapeHtml(product.category);
    const safeName = SecurityValidator.escapeHtml(product.nameAr);
    const isFavorite = favorites.includes(product.id);

    let stockBadge = '';
    if (!product.inStock) {
      stockBadge = '<span class="stock-badge out-of-stock absolute top-12 right-12 z-10">نفذت الكمية</span>';
    } else if (product.stockLevel === 'low') {
      stockBadge = '<span class="stock-badge low-stock absolute top-12 right-12 z-10">كمية محدودة</span>';
    } else if (product.stockLevel === 'in') {
      stockBadge = '<span class="stock-badge in-stock absolute top-12 right-12 z-10">متوفر</span>';
    }

    return `
      <div class="product-card-main scroll-animate-scale" role="listitem" data-category="${safeCategory}" data-id="${safeId}">
        ${stockBadge}
        <button onclick="toggleFavorite('${safeId}')" class="favorite-btn ${isFavorite ? 'active' : ''}" aria-label="${isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}">
          <i data-lucide="heart" class="w-5 h-5 ${isFavorite ? 'fill-red-500 stroke-red-500' : ''}"></i>
        </button>
        <div class="product-image-wrapper cursor-pointer" onclick="openQuickView('${safeId}')">
          <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50">
            <svg class="w-16 h-16 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M5 17a2 2 0 01-2-2V5"/>
            </svg>
          </div>
          <div class="product-overlay">
            <button class="bg-white text-brand-700 px-6 py-2.5 rounded-full font-semibold hover:bg-brand-50 transition-colors">
              عرض سريع
            </button>
          </div>
        </div>
        <div class="p-6">
          <span class="inline-block bg-brand-50 text-brand-600 text-xs font-medium px-3 py-1 rounded-full mb-3">
            ${SecurityValidator.escapeHtml(getCategoryLabel(product.category))}
          </span>
          <h3 class="font-heading font-bold text-lg text-brand-900 mb-2">${safeName}</h3>
          <div class="flex items-center justify-between">
            <span class="text-xl font-bold text-brand-700">${SecurityValidator.escapeHtml(formatPrice(product.price))}</span>
            <button onclick="addToCart('${safeId}')" class="btn-primary bg-brand-700 hover:bg-brand-600 text-white px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 ${!product.inStock ? 'opacity-50 cursor-not-allowed' : ''}" ${!product.inStock ? 'disabled' : ''}>
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>أضف للسلة</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
  initScrollAnimations();
}

function getCategoryLabel(category) {
  const labels = {
    medicines: 'أدوية',
    skincare: 'العناية بالبشرة',
    makeup: 'مكياج',
    devices: 'أجهزة طبية'
  };
  return labels[category] || category;
}

function formatPrice(price) {
  return price.toLocaleString('ar-IQ') + ' د.ع';
}

// Filter Products
function filterProducts(category) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  const activeBtn = event.target.closest('.filter-btn');
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.setAttribute('aria-selected', 'true');
  }

  if (category === 'all') {
    displayedProducts = [...products];
  } else {
    displayedProducts = products.filter(p => p.category === category);
  }
  renderProducts(displayedProducts);
}

// Cart Functions
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || !product.inStock) return;

  const existingItem = cart.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({ productId, quantity: 1 });
  }

  saveCart();
  updateCartUI();
  showToast('تمت الإضافة للسلة', 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.productId !== productId);
  saveCart();
  updateCartUI();
}

function updateCartQuantity(productId, change) {
  const item = cart.find(item => item.productId === productId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      saveCart();
      updateCartUI();
    }
  }
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
}

function saveCart() {
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
  } catch (e) {
    console.warn('Error saving cart:', e);
  }
}

function updateCartUI() {
  const cartItems = document.getElementById('cartItems');
  const cartBadge = document.getElementById('cartBadge');
  const cartCountText = document.getElementById('cartCountText');
  const cartTotal = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cartBadge) {
    if (totalItems > 0) {
      cartBadge.textContent = totalItems;
      cartBadge.classList.remove('hidden');
    } else {
      cartBadge.classList.add('hidden');
    }
  }

  if (cartCountText) {
    cartCountText.textContent = `${totalItems} ${totalItems === 1 ? 'منتج' : 'منتجات'}`;
  }

  if (checkoutBtn) {
    checkoutBtn.disabled = cart.length === 0;
  }

  if (cartItems) {
    if (cart.length === 0) {
      cartItems.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-brand-400">
          <svg class="w-16 h-16 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <p class="text-lg font-medium">السلة فارغة</p>
          <p class="text-sm">أضف منتجات للبدء</p>
        </div>
      `;
    } else {
      let total = 0;
      cartItems.innerHTML = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return '';
        total += product.price * item.quantity;
        const safeProductId = SecurityValidator.escapeHtml(item.productId);
        const safeName = SecurityValidator.escapeHtml(product.nameAr);
        return `
          <div class="flex items-center gap-4 p-4 bg-brand-50 rounded-xl">
            <div class="w-16 h-16 bg-gradient-to-br from-brand-100 to-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-8 h-8 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5"/>
              </svg>
            </div>
            <div class="flex-grow">
              <h4 class="font-semibold text-brand-900 text-sm">${safeName}</h4>
              <p class="text-brand-500 text-sm">${SecurityValidator.escapeHtml(formatPrice(product.price))}</p>
              <div class="flex items-center gap-2 mt-2">
                <button onclick="updateCartQuantity('${safeProductId}', -1)" class="w-7 h-7 bg-white rounded-full flex items-center justify-center text-brand-600 hover:bg-brand-100 transition-colors">
                  <i data-lucide="minus" class="w-3 h-3"></i>
                </button>
                <span class="font-medium text-brand-900 w-8 text-center">${SecurityValidator.escapeHtml(String(item.quantity))}</span>
                <button onclick="updateCartQuantity('${safeProductId}', 1)" class="w-7 h-7 bg-white rounded-full flex items-center justify-center text-brand-600 hover:bg-brand-100 transition-colors">
                  <i data-lucide="plus" class="w-3 h-3"></i>
                </button>
              </div>
            </div>
            <button onclick="removeFromCart('${safeProductId}')" class="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        `;
      }).join('');
      if (cartTotal) cartTotal.textContent = SecurityValidator.escapeHtml(formatPrice(total));
    }
    lucide.createIcons();
  }
}

// Cart Sidebar
function openCart() {
  document.getElementById('cartSidebar').classList.add('active');
  document.getElementById('cartOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartSidebar').classList.remove('active');
  document.getElementById('cartOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// Favorites
function toggleFavorite(productId) {
  const index = favorites.indexOf(productId);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(productId);
  }
  try {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  } catch (e) {
    console.warn('Error saving favorites:', e);
  }
  updateFavoritesUI();
  renderProducts(displayedProducts);
}

function updateFavoritesUI() {
  const badge = document.getElementById('favoritesBadge');
  if (badge) {
    if (favorites.length > 0) {
      badge.textContent = favorites.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function openFavorites() {
  if (favorites.length > 0) {
    const favoriteProducts = products.filter(p => favorites.includes(p.id));
    renderProducts(favoriteProducts);
    showToast('عرض المنتجات المفضلة');
  } else {
    showToast('لا توجد منتجات مفضلة', 'error');
  }
}

// Checkout
function openCheckout() {
  closeCart();
  document.getElementById('checkoutModal').classList.add('active');
  document.body.style.overflow = 'hidden';

  const checkoutItems = document.getElementById('checkoutItems');
  let total = 0;
  checkoutItems.innerHTML = cart.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return '';
    const subtotal = product.price * item.quantity;
    total += subtotal;
    return `
      <div class="flex justify-between">
        <span>${SecurityValidator.escapeHtml(product.nameAr + ' × ' + item.quantity)}</span>
        <span class="font-medium">${SecurityValidator.escapeHtml(formatPrice(subtotal))}</span>
      </div>
    `;
  }).join('');
  document.getElementById('checkoutTotal').textContent = SecurityValidator.escapeHtml(formatPrice(total));
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('active');
  document.body.style.overflow = '';
}

function closeCheckoutOnBackdrop(e) {
  if (e.target === document.getElementById('checkoutModal')) {
    closeCheckout();
  }
}

function sendToWhatsApp() {
  const nameInput = document.getElementById('customerName');
  const phoneInput = document.getElementById('customerPhone');
  const addressInput = document.getElementById('customerAddress');
  const notesInput = document.getElementById('customerNotes');

  const name = SecurityValidator.sanitizeInput(nameInput.value);
  const phone = SecurityValidator.sanitizeInput(phoneInput.value);
  const address = SecurityValidator.sanitizeInput(addressInput.value);
  const notes = SecurityValidator.sanitizeInput(notesInput.value);

  // التحقق من الاسم
  const nameValidation = SecurityValidator.validateName(name);
  if (!nameValidation.valid) {
    showToast(nameValidation.message, 'error');
    nameInput.focus();
    return;
  }

  // التحقق من رقم الهاتف
  const phoneValidation = SecurityValidator.validatePhone(phone);
  if (!phoneValidation.valid) {
    showToast(phoneValidation.message, 'error');
    phoneInput.focus();
    return;
  }

  // التحقق من العنوان
  const addressValidation = SecurityValidator.validateAddress(address);
  if (!addressValidation.valid) {
    showToast(addressValidation.message, 'error');
    addressInput.focus();
    return;
  }

  // التحقق من الملاحظات
  const notesValidation = SecurityValidator.validateNotes(notes);
  if (!notesValidation.valid) {
    showToast(notesValidation.message, 'error');
    notesInput.focus();
    return;
  }

  let message = `🛒 *طلب جديد من صيدلية neurobin*\n\n`;
  message += `👤 *العميل:* ${name}\n`;
  message += `📱 *الهاتف:* ${phone}\n`;
  if (address) message += `📍 *العنوان:* ${address}\n`;
  if (notes) message += `📝 *ملاحظات:* ${notes}\n\n`;
  message += `*المنتجات:*\n`;

  let total = 0;
  cart.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      const subtotal = product.price * item.quantity;
      total += subtotal;
      message += `• ${product.nameAr} × ${item.quantity} = ${formatPrice(subtotal)}\n`;
    }
  });

  message += `\n💰 *الإجمالي:* ${formatPrice(total)}`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/9647870404967?text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

  clearCart();
  closeCheckout();
  showToast('شكراً لك! سيتم التواصل معك قريباً', 'success');
}

// Quick View
function openQuickView(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('quickViewModal');
  const content = document.getElementById('quickViewContent');
  const safeId = SecurityValidator.escapeHtml(product.id);
  const safeName = SecurityValidator.escapeHtml(product.nameAr);
  const safeCategory = SecurityValidator.escapeHtml(getCategoryLabel(product.category));
  const safePrice = SecurityValidator.escapeHtml(formatPrice(product.price));
  const stockText = product.inStock ? 'متوفر في المخزون' : 'نفذت الكمية';
  const isFavorite = favorites.includes(product.id);

  content.innerHTML = `
    <div class="bg-gradient-to-br from-brand-100 to-brand-50 h-64 flex items-center justify-center">
      <svg class="w-24 h-24 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M5 17a2 2 0 01-2-2V5"/>
      </svg>
    </div>
    <div class="p-6">
      <span class="inline-block bg-brand-50 text-brand-600 text-sm font-medium px-3 py-1 rounded-full mb-3">
        ${safeCategory}
      </span>
      <h3 class="font-heading font-bold text-2xl text-brand-900 mb-2">${safeName}</h3>
      <p class="text-3xl font-bold text-brand-700 mb-4">${safePrice}</p>
      <p class="text-brand-600/80 mb-6">${SecurityValidator.escapeHtml(stockText)}</p>
      <div class="flex gap-3">
        <button onclick="addToCart('${safeId}')" class="flex-grow btn-primary bg-brand-700 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${!product.inStock ? 'opacity-50 cursor-not-allowed' : ''}" ${!product.inStock ? 'disabled' : ''}>
          <i data-lucide="shopping-cart" class="w-5 h-5"></i>
          أضف للسلة
        </button>
        <button onclick="toggleFavorite('${safeId}')" class="p-3 border-2 border-brand-200 rounded-xl hover:bg-brand-50 transition-colors ${isFavorite ? 'text-red-500 border-red-200' : ''}">
          <i data-lucide="heart" class="w-5 h-5 ${isFavorite ? 'fill-red-500' : ''}"></i>
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
}

function closeQuickView() {
  document.getElementById('quickViewModal').classList.remove('active');
  document.body.style.overflow = '';
}

function closeQuickViewOnBackdrop(e) {
  if (e.target === document.getElementById('quickViewModal')) {
    closeQuickView();
  }
}

// Search
function openSearch() {
  document.getElementById('searchModal').classList.add('active');
  document.getElementById('searchInput').focus();
  document.body.style.overflow = 'hidden';
}

function closeSearch() {
  document.getElementById('searchModal').classList.remove('active');
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '';
  document.body.style.overflow = '';
}

function closeSearchOnBackdrop(e) {
  if (e.target === document.getElementById('searchModal')) {
    closeSearch();
  }
}

function performSearch() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const results = document.getElementById('searchResults');

  if (query.length < 2) {
    results.innerHTML = '';
    return;
  }

  const matches = products.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.nameAr.includes(query) ||
    p.category.includes(query)
  );

  if (matches.length === 0) {
    results.innerHTML = `
      <div class="p-6 text-center text-brand-400">
        <p>لم يتم العثور على نتائج</p>
      </div>
    `;
  } else {
    results.innerHTML = matches.map(p => {
      const safeId = SecurityValidator.escapeHtml(p.id);
      const safeName = SecurityValidator.escapeHtml(p.nameAr);
      const safePrice = SecurityValidator.escapeHtml(formatPrice(p.price));
      return `
        <div class="search-result-item" onclick="openQuickView('${safeId}'); closeSearch();">
          <div class="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M5 17a2 2 0 01-2-2V5"/>
            </svg>
          </div>
          <div>
            <h4 class="font-medium text-brand-900">${safeName}</h4>
            <p class="text-sm text-brand-500">${safePrice}</p>
          </div>
        </div>
      `;
    }).join('');
  }
}

function handleSearchKeydown(e) {
  if (e.key === 'Escape') closeSearch();
}

// Toast Notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  toast.className = `toast ${type}`;
  toastMessage.textContent = SecurityValidator.escapeHtml(message);
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Back to Top
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Back to Top Button Visibility
window.addEventListener('scroll', () => {
  const backToTop = document.getElementById('backToTop');
  if (window.scrollY > 500) {
    backToTop.classList.add('visible');
  } else {
    backToTop.classList.remove('visible');
  }
});

// Contact Form
function handleContactSubmit() {
  const nameInput = document.getElementById('contactName');
  const infoInput = document.getElementById('contactInfo');
  const messageInput = document.getElementById('contactMessage');

  const name = SecurityValidator.sanitizeInput(nameInput.value);
  const info = SecurityValidator.sanitizeInput(infoInput.value);
  const message = SecurityValidator.sanitizeInput(messageInput.value);

  // التحقق من الاسم
  const nameValidation = SecurityValidator.validateName(name);
  if (!nameValidation.valid) {
    showToast(nameValidation.message, 'error');
    nameInput.focus();
    return;
  }

  // التحقق من رقم الهاتف أو البريد
  const phoneRegex = /^07[0-9]{9}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!phoneRegex.test(info.replace(/\s/g, '')) && !emailRegex.test(info)) {
    showToast('يرجى إدخال رقم هاتف أو بريد إلكتروني صحيح', 'error');
    infoInput.focus();
    return;
  }

  // التحقق من الرسالة
  const messageValidation = SecurityValidator.validateMessage(message);
  if (!messageValidation.valid) {
    showToast(messageValidation.message, 'error');
    messageInput.focus();
    return;
  }

  let whatsappMessage = `📬 *رسالة جديدة من الموقع*\n\n`;
  whatsappMessage += `👤 *الاسم:* ${name}\n`;
  whatsappMessage += `📱 *التواصل:* ${info}\n`;
  whatsappMessage += `💬 *الرسالة:* ${message}`;

  const encodedMessage = encodeURIComponent(whatsappMessage);
  window.open(`https://wa.me/9647870404967?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');

  document.getElementById('contactForm').reset();
  showToast('تم إرسال رسالتك بنجاح!', 'success');
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    openSearch();
  }
  if (e.key === 'Escape') {
    closeCart();
    closeSearch();
    closeCheckout();
    closeQuickView();
  }
});