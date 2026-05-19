// ===================================================
// Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Supabase â€” Supabase Configuration
// ===================================================
const SUPABASE_URL = 'https://hczsskviliuqyayylutv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yEU6M3goCClpcjHBFqniLg_FdN9oSXb';

let supabaseClient = null;

function initSupabase() {
  try {
    if (typeof supabase !== 'undefined') {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('âœ… Supabase initialized successfully');
    } else {
      console.warn('âš ï¸ Supabase SDK not loaded');
    }
  } catch (e) {
    console.warn('âš ï¸ Supabase init failed:', e.message);
  }
}

// ===================================================
// FIX #1: Ù†Ø¸Ø§Ù… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ù…Ø¯Ø®Ù„Ø§Øª â€” Security Validator (Ù…ÙØµÙ„Ø­)
// ===================================================
const SecurityValidator = {
  validatePhone: function(phone) {
    const phoneRegex = /^07[0-9]{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, '').replace(/^\+964/, '0'))) {
      return { valid: false, message: 'ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø±Ù‚Ù… Ù‡Ø§ØªÙ Ø¹Ø±Ø§Ù‚ÙŠ ØµØ­ÙŠØ­ (07XX XXX XXXX)' };
    }
    return { valid: true, message: 'ØµØ§Ù„Ø­' };
  },

  validateName: function(name) {
    if (!name || name.trim().length < 3) {
      return { valid: false, message: 'Ø§Ù„Ø§Ø³Ù… ÙŠØ¬Ø¨ Ø£Ù† ÙŠÙƒÙˆÙ† 3 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„' };
    }
    if (name.trim().length > 50) {
      return { valid: false, message: 'Ø§Ù„Ø§Ø³Ù… ÙŠØ¬Ø¨ Ø£Ù„Ø§ ÙŠØªØ¬Ø§ÙˆØ² 50 Ø­Ø±ÙØ§Ù‹' };
    }
    const arabicOk = /^[\u0600-\u06FF\s\-'.]+$/.test(name.trim());
    const englishOk = /^[a-zA-Z\s\-'.]+$/.test(name.trim());
    if (!arabicOk && !englishOk) {
      return { valid: false, message: 'Ø§Ù„Ø§Ø³Ù… ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø£Ø­Ø±Ù ÙÙ‚Ø·' };
    }
    return { valid: true, message: 'ØµØ§Ù„Ø­' };
  },

  validateAddress: function(address) {
    if (!address || address.trim().length < 3) {
      return { valid: false, message: 'ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø¹Ù†ÙˆØ§Ù† Ø§Ù„ØªÙˆØµÙŠÙ„ (Ø¥Ø¬Ø¨Ø§Ø±ÙŠ)' };
    }
    if (address.trim().length > 200) {
      return { valid: false, message: 'Ø§Ù„Ø¹Ù†ÙˆØ§Ù† ÙŠØ¬Ø¨ Ø£Ù„Ø§ ÙŠØªØ¬Ø§ÙˆØ² 200 Ø­Ø±Ù' };
    }
    return { valid: true, message: 'ØµØ§Ù„Ø­' };
  },

  validateNotes: function(notes) {
    if (notes && notes.trim().length > 500) {
      return { valid: false, message: 'Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª ÙŠØ¬Ø¨ Ø£Ù„Ø§ ØªØªØ¬Ø§ÙˆØ² 500 Ø­Ø±Ù' };
    }
    return { valid: true, message: 'ØµØ§Ù„Ø­' };
  },

  validateMessage: function(message) {
    if (!message || message.trim().length < 10) {
      return { valid: false, message: 'Ø§Ù„Ø±Ø³Ø§Ù„Ø© ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† 10 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„' };
    }
    if (message.trim().length > 1000) {
      return { valid: false, message: 'Ø§Ù„Ø±Ø³Ø§Ù„Ø© ÙŠØ¬Ø¨ Ø£Ù„Ø§ ØªØªØ¬Ø§ÙˆØ² 1000 Ø­Ø±Ù' };
    }
    return { valid: true, message: 'ØµØ§Ù„Ø­' };
  },

  // FIX #1 CRITICAL: Ø¯Ø§Ù„Ø© Ø§Ù„ØªÙ†Ø¸ÙŠÙ Ø§Ù„Ù…ØµÙ„Ø­Ø© â€” & Ø£ÙˆÙ„Ø§Ù‹ Ø«Ù… < > " '
  sanitizeInput: function(input) {
    if (typeof input !== 'string') return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  },

  escapeHtml: function(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  },

  // FIX #6: Ø§Ù„ØªØ­Ù‚Ù‚ Ø§Ù„ØµØ§Ø±Ù… Ù…Ù† Ø¨Ù†ÙŠØ© Ø¹Ù†Ø§ØµØ± Ø§Ù„Ø³Ù„Ø©
  validateCartItem: function(item) {
    return (
      item !== null &&
      typeof item === 'object' &&
      typeof item.productId === 'string' &&
      item.productId.length > 0 &&
      item.productId.length < 200 &&
      typeof item.quantity === 'number' &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      item.quantity <= 99
    );
  }
};

// FIX #3: Rate Limiting â€” Ù…Ù†Ø¹ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ù…ØªÙƒØ±Ø± Ù„Ù„Ù†Ù…Ø§Ø°Ø¬
const RateLimiter = {
  timestamps: {},
  canSubmit: function(formId, cooldownMs = 30000) {
    const now = Date.now();
    if (this.timestamps[formId] && (now - this.timestamps[formId]) < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - (now - this.timestamps[formId])) / 1000);
      return { allowed: false, remaining };
    }
    this.timestamps[formId] = now;
    return { allowed: true };
  }
};

// ===================================================
// Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ø§Ø­ØªÙŠØ§Ø·ÙŠØ© (Fallback)
// ===================================================
const FALLBACK_PRODUCTS = []; // Products managed via Supabase admin panel

// ===================================================
// Ø±Ø³ÙˆÙ… Ø§Ù„ØªÙˆØµÙŠÙ„ â€” Delivery Fee (Ù„Ø¬Ù…ÙŠØ¹ Ø£Ù†Ø­Ø§Ø¡ Ø§Ù„Ø¹Ø±Ø§Ù‚)
// ===================================================
const DELIVERY_FEE = 4000; // 4,000 Ø¯ÙŠÙ†Ø§Ø± Ø¹Ø±Ø§Ù‚ÙŠ

let products = []; // loaded from Supabase
let cart = [];
let favorites = [];
let displayedProducts = [...products];

// ===================================================
// Ø¯ÙˆØ§Ù„ Supabase
// ===================================================

async function loadProductsFromSupabase() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) {
      products = data.map(p => ({
        id: String(p.id),
        name: p.name || p.name_ar || '',
        nameAr: p.name_ar || p.name || '',
        category: p.category || 'other',
        price: Number(p.price) || 0,
        image: p.image_url || '',
        inStock: Boolean(p.in_stock),
        stockLevel: p.stock_level || 'in'
      }));
      displayedProducts = [...products];
      renderProducts(products);
      updateCartUI();
      console.log('âœ… Products loaded from Supabase:', products.length);
    }
  } catch (e) {
    console.warn('âš ï¸ Using fallback products. Supabase error:', e.message);
  }
}

async function saveOrderToSupabase(orderData) {
  if (!supabaseClient) return null;
  try {
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        customer_name: orderData.name,
        customer_phone: orderData.phone,
        customer_address: orderData.address || null,
        notes: orderData.notes || null,
        total_amount: orderData.total
      })
      .select()
      .single();

    if (orderError) throw orderError;

    if (orderData.items && orderData.items.length > 0) {
      const itemsToInsert = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }));
      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }

    console.log('âœ… Order saved to Supabase:', order.id);
    return order.id;
  } catch (e) {
    console.warn('âš ï¸ Order not saved to Supabase:', e.message);
    return null;
  }
}

async function saveContactMessageToSupabase(name, contactInfo, message) {
  if (!supabaseClient) return false;
  try {
    const { error } = await supabaseClient
      .from('contact_messages')
      .insert({ name, contact_info: contactInfo, message });
    if (error) throw error;
    console.log('âœ… Contact message saved to Supabase');
    return true;
  } catch (e) {
    console.warn('âš ï¸ Contact message not saved:', e.message);
    return false;
  }
}

// ===================================================
// Initialize
// ===================================================

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ÙƒÙˆØ¯ Ø§Ù„Ø®ØµÙ… â€” Discount Code State & Functions
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let appliedDiscount = null;

async function applyDiscountCode() {
  const input = document.getElementById('discountCodeInput');
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  if (!code) { showToast('ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ ÙƒÙˆØ¯ Ø§Ù„Ø®ØµÙ…', 'error'); return; }

  const btn = document.getElementById('applyDiscountBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù‚Ù‚...'; }

  try {
    if (!supabaseClient) { showToast('ÙŠØ±Ø¬Ù‰ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø± Ø­ØªÙ‰ Ø§ÙƒØªÙ…Ø§Ù„ Ø§Ù„ØªØ­Ù…ÙŠÙ„', 'error'); return; }
    const { data, error } = await supabaseClient
      .from('discount_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) { showToast('ÙƒÙˆØ¯ Ø§Ù„Ø®ØµÙ… ØºÙŠØ± ØµØ§Ù„Ø­ Ø£Ùˆ Ù…Ù†ØªÙ‡ÙŠ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ© âŒ', 'error'); appliedDiscount = null; updateDiscountDisplay(); return; }
    if (data.max_uses !== null && data.used_count >= data.max_uses) { showToast('ØªÙ… Ø§Ø³ØªÙ†ÙØ§Ø¯ Ù‡Ø°Ø§ Ø§Ù„ÙƒÙˆØ¯', 'error'); appliedDiscount = null; updateDiscountDisplay(); return; }

    appliedDiscount = data;
    updateDiscountDisplay();
    const displayVal = data.discount_type === 'percent' ? data.discount_value + '%' : data.discount_value.toLocaleString() + ' Ø¯.Ø¹';
    showToast('âœ… ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø®ØµÙ… ' + displayVal, 'success');
  } catch(e) {
    showToast('Ø®Ø·Ø£ ÙÙŠ Ø§Ù„ØªØ­Ù‚Ù‚: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'ØªØ·Ø¨ÙŠÙ‚'; }
  }
}

function updateDiscountDisplay() {
  const row = document.getElementById('discountRow');
  const amt = document.getElementById('discountAmount');
  if (!row || !amt) return;
  if (appliedDiscount) {
    row.classList.remove('hidden');
    amt.textContent = appliedDiscount.discount_type === 'percent'
      ? 'âˆ’ ' + appliedDiscount.discount_value + '%'
      : 'âˆ’ ' + appliedDiscount.discount_value.toLocaleString() + ' Ø¯.Ø¹';
  } else {
    row.classList.add('hidden');
  }
}

function calcTotal(rawTotal) {
  if (!appliedDiscount) return rawTotal;
  if (appliedDiscount.discount_type === 'percent')
    return Math.max(0, rawTotal - Math.round(rawTotal * appliedDiscount.discount_value / 100));
  return Math.max(0, rawTotal - appliedDiscount.discount_value);
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„ â€” EmailJS Configuration
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const EMAILJS_CONFIG = {
  serviceId:  'service_al7y77e',
  templateId: 'template_s9h0fnc',
  publicKey:  'NLgoFaGejqrqg5uTP',
  adminEmail: 'neurobinph2009@gmail.com'
};

async function sendEmailNotification(orderData) {
  if (typeof emailjs === 'undefined') {
    console.warn('EmailJS not loaded â€” skipping email notification');
    return;
  }
  try {
    emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });

    var itemsList = orderData.items.map(function(item) {
      return 'â€¢ ' + item.productName + ' Ã— ' + item.quantity + ' = ' + formatPrice(item.subtotal);
    }).join('\n');

    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
      to_email:       EMAILJS_CONFIG.adminEmail,
      customer_name:  orderData.name,
      customer_phone: orderData.phone,
      customer_address: orderData.address || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯',
      order_items:    itemsList,
      order_total:    formatPrice(orderData.total),
      discount_code:  orderData.discountCode || 'Ù„Ø§ ÙŠÙˆØ¬Ø¯',
      order_date:     new Date().toLocaleDateString('ar-EG'),
      order_time:     new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}),
      order_id:       orderData.orderId || 'â€”'
    });

    console.log('âœ… Email notification sent to', EMAILJS_CONFIG.adminEmail);
  } catch(e) {
    console.warn('âš ï¸ Email notification failed:', e.message || e);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  initSupabase();

  try {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      if (Array.isArray(parsed)) {
        cart = parsed.filter(item => SecurityValidator.validateCartItem(item));
      }
    }
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      const parsed = JSON.parse(savedFavorites);
      if (Array.isArray(parsed)) {
        favorites = parsed.filter(f => typeof f === 'string' && f.length > 0 && f.length < 200);
      }
    }
  } catch (e) {
    console.warn('Error loading from localStorage:', e);
    cart = [];
    favorites = [];
  }

  setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.classList.add('hidden');
  }, 800);

  lucide.createIcons();
  renderProducts(products);
  updateCartUI();
  updateFavoritesUI();
  initScrollAnimations();
  initCounters();
  initNavbarScroll();
  initEventListeners();
  loadProductsFromSupabase();
});

function initEventListeners() {
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', function(e) {
      e.preventDefault();
      sendToWhatsApp();
    });
  }
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleContactSubmit();
    });
  }
}

function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
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
        if (el.classList.contains('text-brand-900')) el.classList.remove('text-brand-900');
        const parent = el.closest('a') || el;
        if (parent.tagName === 'A' || parent.classList.contains('brand-emblem')) {
          el.classList.add('text-white');
          if (el.classList.contains('text-brand-900')) el.classList.remove('text-brand-900');
        }
      });
    }
  });
}

function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale').forEach(el => {
    observer.observe(el);
  });
}

function initCounters() {
  const counters = document.querySelectorAll('.counter');
  counters.forEach(counter => {
    const target = parseFloat(counter.dataset.target);
    if (isNaN(target)) return;
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
      if (entries[0].isIntersecting) { updateCounter(); observer.disconnect(); }
    }, { threshold: 0.5 });
    observer.observe(counter);
  });
}

function renderProducts(productsToRender) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = productsToRender.map(product => {
    const safeId = SecurityValidator.escapeHtml(product.id);
    const safeCategory = SecurityValidator.escapeHtml(product.category);
    const safeName = SecurityValidator.escapeHtml(product.nameAr);
    const isFavorite = favorites.includes(product.id);
    let stockBadge = '';
    if (!product.inStock) {
      stockBadge = '<span class="stock-badge out-of-stock absolute top-12 right-12 z-10">Ù†ÙØ°Øª Ø§Ù„ÙƒÙ…ÙŠØ©</span>';
    } else if (product.stockLevel === 'low') {
      stockBadge = '<span class="stock-badge low-stock absolute top-12 right-12 z-10">ÙƒÙ…ÙŠØ© Ù…Ø­Ø¯ÙˆØ¯Ø©</span>';
    } else if (product.stockLevel === 'in') {
      stockBadge = '<span class="stock-badge in-stock absolute top-12 right-12 z-10">Ù…ØªÙˆÙØ±</span>';
    }
    return `
      <div class="product-card-main scroll-animate-scale" role="listitem" data-category="${safeCategory}" data-id="${safeId}">
        ${stockBadge}
        <button onclick="toggleFavorite('${safeId}')" class="favorite-btn ${isFavorite ? 'active' : ''}" aria-label="${isFavorite ? 'Ø¥Ø²Ø§Ù„Ø© Ù…Ù† Ø§Ù„Ù…ÙØ¶Ù„Ø©' : 'Ø¥Ø¶Ø§ÙØ© Ù„Ù„Ù…ÙØ¶Ù„Ø©'}">
          <i data-lucide="heart" class="w-5 h-5 ${isFavorite ? 'fill-red-500 stroke-red-500' : ''}"></i>
        </button>
        <div class="product-image-wrapper cursor-pointer" onclick="openQuickView('${safeId}')">
          <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50">
            <svg class="w-16 h-16 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M5 17a2 2 0 01-2-2V5"/>
            </svg>
          </div>
          <div class="product-overlay">
            <button class="bg-white text-brand-700 px-6 py-2.5 rounded-full font-semibold hover:bg-brand-50 transition-colors">Ø¹Ø±Ø¶ Ø³Ø±ÙŠØ¹</button>
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
              <span>Ø£Ø¶Ù Ù„Ù„Ø³Ù„Ø©</span>
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
  const labels = { medicines: 'Ø£Ø¯ÙˆÙŠØ©', skincare: 'Ø§Ù„Ø¹Ù†Ø§ÙŠØ© Ø¨Ø§Ù„Ø¨Ø´Ø±Ø©', makeup: 'Ù…ÙƒÙŠØ§Ø¬', devices: 'Ø£Ø¬Ù‡Ø²Ø© Ø·Ø¨ÙŠØ©' };
  return labels[category] || category;
}

function formatPrice(price) {
  return Number(price).toLocaleString('ar-IQ') + ' Ø¯.Ø¹';
}

// FIX #2: ØªÙ…Ø±ÙŠØ± event ÙƒÙ…Ø¹Ø§Ù…Ù„ â€” Ù„Ø§ global event object
function filterProducts(e, category) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  if (e && e.target) {
    const activeBtn = e.target.closest('.filter-btn');
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-selected', 'true');
    }
  }
  displayedProducts = category === 'all' ? [...products] : products.filter(p => p.category === category);
  renderProducts(displayedProducts);
}

function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || !product.inStock) return;
  const existingItem = cart.find(item => item.productId === productId);
  if (existingItem) {
    // FIX #4: Ø­Ø¯ Ø£Ù‚ØµÙ‰ 99 ÙˆØ­Ø¯Ø©
    if (existingItem.quantity >= 99) {
      showToast('Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ 99 ÙˆØ­Ø¯Ø© Ù„ÙƒÙ„ Ù…Ù†ØªØ¬', 'error');
      return;
    }
    existingItem.quantity++;
  } else {
    cart.push({ productId, quantity: 1 });
  }
  saveCart();
  updateCartUI();
  showToast('ØªÙ…Øª Ø§Ù„Ø¥Ø¶Ø§ÙØ© Ù„Ù„Ø³Ù„Ø©', 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.productId !== productId);
  saveCart();
  updateCartUI();
}

function updateCartQuantity(productId, change) {
  const item = cart.find(item => item.productId === productId);
  if (item) {
    const newQty = item.quantity + change;
    if (newQty > 99) { showToast('Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ 99 ÙˆØ­Ø¯Ø© Ù„ÙƒÙ„ Ù…Ù†ØªØ¬', 'error'); return; }
    if (newQty <= 0) { removeFromCart(productId); }
    else { item.quantity = newQty; saveCart(); updateCartUI(); }
  }
}

function clearCart() { cart = []; saveCart(); updateCartUI(); }

function saveCart() {
  try { localStorage.setItem('cart', JSON.stringify(cart)); }
  catch (e) { console.warn('Error saving cart:', e); }
}

function updateCartUI() {
  const cartItems = document.getElementById('cartItems');
  const cartBadge = document.getElementById('cartBadge');
  const cartCountText = document.getElementById('cartCountText');
  const cartTotal = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartBadge) {
    if (totalItems > 0) { cartBadge.textContent = totalItems; cartBadge.classList.remove('hidden'); }
    else { cartBadge.classList.add('hidden'); }
  }
  if (cartCountText) cartCountText.textContent = `${totalItems} ${totalItems === 1 ? 'Ù…Ù†ØªØ¬' : 'Ù…Ù†ØªØ¬Ø§Øª'}`;
  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
  if (cartItems) {
    if (cart.length === 0) {
      cartItems.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-brand-400">
          <svg class="w-16 h-16 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <p class="text-lg font-medium">Ø§Ù„Ø³Ù„Ø© ÙØ§Ø±ØºØ©</p>
          <p class="text-sm">Ø£Ø¶Ù Ù…Ù†ØªØ¬Ø§Øª Ù„Ù„Ø¨Ø¯Ø¡</p>
        </div>`;
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
          </div>`;
      }).join('');
      const cartSubtotalEl = document.getElementById('cartSubtotal');
      if (cartSubtotalEl) cartSubtotalEl.textContent = SecurityValidator.escapeHtml(formatPrice(total));
      if (cartTotal) cartTotal.textContent = SecurityValidator.escapeHtml(formatPrice(total + DELIVERY_FEE));
    }
    lucide.createIcons();
  }
}

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

function toggleFavorite(productId) {
  const index = favorites.indexOf(productId);
  if (index > -1) { favorites.splice(index, 1); } else { favorites.push(productId); }
  try { localStorage.setItem('favorites', JSON.stringify(favorites)); }
  catch (e) { console.warn('Error saving favorites:', e); }
  updateFavoritesUI();
  renderProducts(displayedProducts);
}

function updateFavoritesUI() {
  const badge = document.getElementById('favoritesBadge');
  if (badge) {
    if (favorites.length > 0) { badge.textContent = favorites.length; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
  }
}

function openFavorites() {
  if (favorites.length > 0) {
    renderProducts(products.filter(p => favorites.includes(p.id)));
    showToast('Ø¹Ø±Ø¶ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ù…ÙØ¶Ù„Ø©');
  } else {
    showToast('Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù†ØªØ¬Ø§Øª Ù…ÙØ¶Ù„Ø©', 'error');
  }
}

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
    return `<div class="flex justify-between">
      <span>${SecurityValidator.escapeHtml(product.nameAr + ' Ã— ' + item.quantity)}</span>
      <span class="font-medium">${SecurityValidator.escapeHtml(formatPrice(subtotal))}</span>
    </div>`;
  }).join('');
  // Ø¥Ø¶Ø§ÙØ© Ø±Ø³ÙˆÙ… Ø§Ù„ØªÙˆØµÙŠÙ„
  checkoutItems.innerHTML += `<div class="flex justify-between text-amber-700 border-t border-dashed border-brand-200 pt-2 mt-2 font-medium">
    <span>ðŸšš Ø±Ø³ÙˆÙ… Ø§Ù„ØªÙˆØµÙŠÙ„ (Ø¬Ù…ÙŠØ¹ Ø£Ù†Ø­Ø§Ø¡ Ø§Ù„Ø¹Ø±Ø§Ù‚)</span>
    <span>${formatPrice(DELIVERY_FEE)}</span>
  </div>`;
  document.getElementById('checkoutTotal').textContent = SecurityValidator.escapeHtml(formatPrice(total + DELIVERY_FEE));
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('active');
  document.body.style.overflow = '';
}

function closeCheckoutOnBackdrop(e) {
  if (e.target === document.getElementById('checkoutModal')) closeCheckout();
}

async function sendToWhatsApp() {
  const nameInput = document.getElementById('customerName');
  const phoneInput = document.getElementById('customerPhone');
  const addressInput = document.getElementById('customerAddress');
  const notesInput = document.getElementById('customerNotes');
  const submitBtn = document.querySelector('#checkoutForm [type="submit"]');

  // FIX #3: Rate limiting
  const rateCheck = RateLimiter.canSubmit('checkout', 30000);
  if (!rateCheck.allowed) {
    showToast('ÙŠØ±Ø¬Ù‰ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø± ' + rateCheck.remaining + ' Ø«Ø§Ù†ÙŠØ© Ù‚Ø¨Ù„ Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨ Ø¬Ø¯ÙŠØ¯', 'error');
    return;
  }

  const name = SecurityValidator.sanitizeInput(nameInput.value);
  const phone = SecurityValidator.sanitizeInput(phoneInput.value);
  const address = SecurityValidator.sanitizeInput(addressInput.value);
  const notes = SecurityValidator.sanitizeInput(notesInput.value);

  const nameV = SecurityValidator.validateName(name);
  if (!nameV.valid) { showToast(nameV.message, 'error'); nameInput.focus(); return; }
  const phoneV = SecurityValidator.validatePhone(phone);
  if (!phoneV.valid) { showToast(phoneV.message, 'error'); phoneInput.focus(); return; }
  const addrV = SecurityValidator.validateAddress(address);
  if (!addrV.valid) { showToast(addrV.message, 'error'); addressInput.focus(); return; }
  const notesV = SecurityValidator.validateNotes(notes);
  if (!notesV.valid) { showToast(notesV.message, 'error'); notesInput.focus(); return; }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.7'; }

  let message = '\u{1F6D2} *Ø·Ù„Ø¨ Ø¬Ø¯ÙŠØ¯ Ù…Ù† ØµÙŠØ¯Ù„ÙŠØ© neurobin*\n\n';
  message += '\u{1F464} *Ø§Ù„Ø¹Ù…ÙŠÙ„:* ' + name + '\n';
  message += '\u{1F4F1} *Ø§Ù„Ù‡Ø§ØªÙ:* ' + phone + '\n';
  message += '\u{1F4CD} *Ø§Ù„Ø¹Ù†ÙˆØ§Ù†:* ' + address + '\n';
  if (notes) message += '\u{1F4DD} *Ù…Ù„Ø§Ø­Ø¸Ø§Øª:* ' + notes + '\n\n';
  message += '*Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª:*\n';

  let total = 0;
  const orderItems = [];
  cart.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      const subtotal = product.price * item.quantity;
      total += subtotal;
      message += '\u2022 ' + product.nameAr + ' \u00D7 ' + item.quantity + ' = ' + formatPrice(subtotal) + '\n';
      orderItems.push({ productId: item.productId, productName: product.nameAr, quantity: item.quantity, price: product.price, subtotal });
    }
  });
  const discountedTotal = calcTotal(total);
  message += '\n\u{1F69A} *Ø±Ø³ÙˆÙ… Ø§Ù„ØªÙˆØµÙŠÙ„:* ' + formatPrice(DELIVERY_FEE);
  if (appliedDiscount) { const dD = appliedDiscount.discount_type==='percent' ? appliedDiscount.discount_value+'%' : formatPrice(appliedDiscount.discount_value); message += '\n\u{1F3F7}\uFE0F *ÙƒÙˆØ¯ Ø§Ù„Ø®ØµÙ…:* ' + appliedDiscount.code + ' (' + dD + ')'; message += '\n\u{1F4B0} *Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø´Ø§Ù…Ù„ Ø§Ù„ØªÙˆØµÙŠÙ„:* ' + formatPrice(discountedTotal + DELIVERY_FEE); } else { message += '\n\u{1F4B0} *Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø´Ø§Ù…Ù„ Ø§Ù„ØªÙˆØµÙŠÙ„:* ' + formatPrice(total + DELIVERY_FEE); }

  const orderId = await saveOrderToSupabase({ name, phone, address, notes, total: (appliedDiscount ? discountedTotal : total) + DELIVERY_FEE, items: orderItems });
  // Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± Ø¥ÙŠÙ…ÙŠÙ„ Ù„Ù„Ù…Ø´Ø±Ù
  sendEmailNotification({
    name, phone, address,
    total: calcTotal(total),
    items: orderItems,
    discountCode: appliedDiscount ? appliedDiscount.code : null,
    orderId: orderId ? orderId.slice(-8).toUpperCase() : null
  });
  if (orderId) message += '\n\u{1F516} *Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨:* #' + orderId.slice(-8).toUpperCase();

  window.open('https://wa.me/9647870404967?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
  if (appliedDiscount && supabaseClient) {
    const discId = appliedDiscount.id;
    supabaseClient.from('discount_codes').select('used_count').eq('id', discId).single()
      .then(({ data }) => { if (data) supabaseClient.from('discount_codes').update({ used_count: (data.used_count||0)+1 }).eq('id', discId).then(()=>{}); });
    appliedDiscount = null;
    const inp = document.getElementById('discountCodeInput');
    if (inp) inp.value = '';
    updateDiscountDisplay();
  }
  clearCart();
  closeCheckout();
  showToast('Ø´ÙƒØ±Ø§Ù‹ Ù„Ùƒ! Ø³ÙŠØªÙ… Ø§Ù„ØªÙˆØ§ØµÙ„ Ù…Ø¹Ùƒ Ù‚Ø±ÙŠØ¨Ø§Ù‹', 'success');
  if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
}

function openQuickView(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  const modal = document.getElementById('quickViewModal');
  const content = document.getElementById('quickViewContent');
  const safeId = SecurityValidator.escapeHtml(product.id);
  const safeName = SecurityValidator.escapeHtml(product.nameAr);
  const safeCategory = SecurityValidator.escapeHtml(getCategoryLabel(product.category));
  const safePrice = SecurityValidator.escapeHtml(formatPrice(product.price));
  const stockText = product.inStock ? 'Ù…ØªÙˆÙØ± ÙÙŠ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†' : 'Ù†ÙØ°Øª Ø§Ù„ÙƒÙ…ÙŠØ©';
  const isFavorite = favorites.includes(product.id);
  content.innerHTML = `
    <div class="bg-gradient-to-br from-brand-100 to-brand-50 h-64 flex items-center justify-center">
      <svg class="w-24 h-24 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M5 17a2 2 0 01-2-2V5"/>
      </svg>
    </div>
    <div class="p-6">
      <span class="inline-block bg-brand-50 text-brand-600 text-sm font-medium px-3 py-1 rounded-full mb-3">${safeCategory}</span>
      <h3 class="font-heading font-bold text-2xl text-brand-900 mb-2">${safeName}</h3>
      <p class="text-3xl font-bold text-brand-700 mb-4">${safePrice}</p>
      <p class="text-brand-600/80 mb-6">${SecurityValidator.escapeHtml(stockText)}</p>
      <div class="flex gap-3">
        <button onclick="addToCart('${safeId}')" class="flex-grow btn-primary bg-brand-700 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${!product.inStock ? 'opacity-50 cursor-not-allowed' : ''}" ${!product.inStock ? 'disabled' : ''}>
          <i data-lucide="shopping-cart" class="w-5 h-5"></i>Ø£Ø¶Ù Ù„Ù„Ø³Ù„Ø©
        </button>
        <button onclick="toggleFavorite('${safeId}')" class="p-3 border-2 border-brand-200 rounded-xl hover:bg-brand-50 transition-colors ${isFavorite ? 'text-red-500 border-red-200' : ''}">
          <i data-lucide="heart" class="w-5 h-5 ${isFavorite ? 'fill-red-500' : ''}"></i>
        </button>
      </div>
    </div>`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
}

function closeQuickView() {
  document.getElementById('quickViewModal').classList.remove('active');
  document.body.style.overflow = '';
}

function closeQuickViewOnBackdrop(e) {
  if (e.target === document.getElementById('quickViewModal')) closeQuickView();
}

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
  if (e.target === document.getElementById('searchModal')) closeSearch();
}

function performSearch() {
  const rawQuery = document.getElementById('searchInput').value;
  const query = rawQuery.toLowerCase().slice(0, 100);
  const results = document.getElementById('searchResults');
  if (query.length < 2) { results.innerHTML = ''; return; }
  const matches = products.filter(p =>
    p.name.toLowerCase().includes(query) || p.nameAr.includes(rawQuery) || p.category.includes(query)
  );
  if (matches.length === 0) {
    results.innerHTML = '<div class="p-6 text-center text-brand-400"><p>Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù†ØªØ§Ø¦Ø¬</p></div>';
  } else {
    results.innerHTML = matches.map(p => {
      const safeId = SecurityValidator.escapeHtml(p.id);
      const safeName = SecurityValidator.escapeHtml(p.nameAr);
      const safePrice = SecurityValidator.escapeHtml(formatPrice(p.price));
      return `<div class="search-result-item" onclick="openQuickView('${safeId}'); closeSearch();">
        <div class="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M5 17a2 2 0 01-2-2V5"/>
          </svg>
        </div>
        <div><h4 class="font-medium text-brand-900">${safeName}</h4><p class="text-sm text-brand-500">${safePrice}</p></div>
      </div>`;
    }).join('');
  }
}

function handleSearchKeydown(e) { if (e.key === 'Escape') closeSearch(); }

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  if (!toast || !toastMessage) return;
  toast.className = 'toast ' + type;
  toastMessage.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

window.addEventListener('scroll', () => {
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    if (window.scrollY > 500) backToTop.classList.add('visible');
    else backToTop.classList.remove('visible');
  }
});

async function handleContactSubmit() {
  const nameInput = document.getElementById('contactName');
  const infoInput = document.getElementById('contactInfo');
  const messageInput = document.getElementById('contactMessage');
  const submitBtn = document.querySelector('#contactForm [type="submit"]');

  // FIX #3: Rate limiting
  const rateCheck = RateLimiter.canSubmit('contact', 30000);
  if (!rateCheck.allowed) {
    showToast('ÙŠØ±Ø¬Ù‰ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø± ' + rateCheck.remaining + ' Ø«Ø§Ù†ÙŠØ© Ù‚Ø¨Ù„ Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ù„Ø© Ø¬Ø¯ÙŠØ¯Ø©', 'error');
    return;
  }

  const name = SecurityValidator.sanitizeInput(nameInput.value);
  const info = SecurityValidator.sanitizeInput(infoInput.value);
  const message = SecurityValidator.sanitizeInput(messageInput.value);

  const nameV = SecurityValidator.validateName(name);
  if (!nameV.valid) { showToast(nameV.message, 'error'); nameInput.focus(); return; }

  const phoneRegex = /^07[0-9]{9}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!phoneRegex.test(info.replace(/\s/g, '')) && !emailRegex.test(info)) {
    showToast('ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø±Ù‚Ù… Ù‡Ø§ØªÙ Ø£Ùˆ Ø¨Ø±ÙŠØ¯ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ ØµØ­ÙŠØ­', 'error');
    infoInput.focus();
    return;
  }

  const msgV = SecurityValidator.validateMessage(message);
  if (!msgV.valid) { showToast(msgV.message, 'error'); messageInput.focus(); return; }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.7'; }

  let whatsappMessage = '\u{1F4EC} *Ø±Ø³Ø§Ù„Ø© Ø¬Ø¯ÙŠØ¯Ø© Ù…Ù† Ø§Ù„Ù…ÙˆÙ‚Ø¹*\n\n';
  whatsappMessage += '\u{1F464} *Ø§Ù„Ø§Ø³Ù…:* ' + name + '\n';
  whatsappMessage += '\u{1F4F1} *Ø§Ù„ØªÙˆØ§ØµÙ„:* ' + info + '\n';
  whatsappMessage += '\u{1F4AC} *Ø§Ù„Ø±Ø³Ø§Ù„Ø©:* ' + message;

  await saveContactMessageToSupabase(name, info, message);
  window.open('https://wa.me/9647870404967?text=' + encodeURIComponent(whatsappMessage), '_blank', 'noopener,noreferrer');
  document.getElementById('contactForm').reset();
  showToast('ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ù„ØªÙƒ Ø¨Ù†Ø¬Ø§Ø­!', 'success');
  if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
}

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.matches('input, textarea')) { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') { closeCart(); closeSearch(); closeCheckout(); closeQuickView(); }
});
