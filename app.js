// ===================================================
// \u0625\u0639\u062f\u0627\u062f\u0627\u062a Supabase \u2014 Supabase Configuration
// ===================================================
const SUPABASE_URL = 'https://hczsskviliuqyayylutv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjenNza3ZpbGl1cXlheXlsdXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDg2OTUsImV4cCI6MjA5NDcyNDY5NX0.mT-fPrPzwbUx3mQZOqFGx8ndWTkUS-MeqLcfaN1zS4k'; // Fixed: use JWT key

let supabaseClient = null;

function initSupabase() {
  try {
    if (typeof supabase !== 'undefined') {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('\u2705 Supabase initialized successfully');
    } else {
      console.error('\u274c Supabase SDK not loaded - check script tag in HTML');
    }
  } catch (e) {
    console.error('\u274c Supabase init failed:', e.message);
    supabaseClient = null;
  }
}

// ===================================================
// FIX #1: \u0646\u0638\u0627\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u062f\u062e\u0644\u0627\u062a \u2014 Security Validator (\u0645\u064f\u0635\u0644\u062d)
// ===================================================
const SecurityValidator = {
  validatePhone: function(phone) {
    const phoneRegex = /^07[0-9]{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, '').replace(/^\+964/, '0'))) {
      return { valid: false, message: '\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0631\u0642\u0645 \u0647\u0627\u062a\u0641 \u0639\u0631\u0627\u0642\u064a \u0635\u062d\u064a\u062d (07XX XXX XXXX)' };
    }
    return { valid: true, message: '\u0635\u0627\u0644\u062d' };
  },

  validateName: function(name) {
    if (!name || name.trim().length < 3) {
      return { valid: false, message: '\u0627\u0644\u0627\u0633\u0645 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 3 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644' };
    }
    if (name.trim().length > 50) {
      return { valid: false, message: '\u0627\u0644\u0627\u0633\u0645 \u064a\u062c\u0628 \u0623\u0644\u0627 \u064a\u062a\u062c\u0627\u0648\u0632 50 \u062d\u0631\u0641\u0627\u064b' };
    }
    const arabicOk = /^[\u0600-\u06FF\s\-'.]+$/.test(name.trim());
    const englishOk = /^[a-zA-Z\s\-'.]+$/.test(name.trim());
    if (!arabicOk && !englishOk) {
      return { valid: false, message: '\u0627\u0644\u0627\u0633\u0645 \u064a\u062c\u0628 \u0623\u0646 \u064a\u062d\u062a\u0648\u064a \u0639\u0644\u0649 \u0623\u062d\u0631\u0641 \u0641\u0642\u0637' };
    }
    return { valid: true, message: '\u0635\u0627\u0644\u062d' };
  },

  validateAddress: function(address) {
    if (!address || address.trim().length < 3) {
      return { valid: false, message: '\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 (\u0625\u062c\u0628\u0627\u0631\u064a)' };
    }
    if (address.trim().length > 200) {
      return { valid: false, message: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u064a\u062c\u0628 \u0623\u0644\u0627 \u064a\u062a\u062c\u0627\u0648\u0632 200 \u062d\u0631\u0641' };
    }
    return { valid: true, message: '\u0635\u0627\u0644\u062d' };
  },

  validateNotes: function(notes) {
    if (notes && notes.trim().length > 500) {
      return { valid: false, message: '\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u064a\u062c\u0628 \u0623\u0644\u0627 \u062a\u062a\u062c\u0627\u0648\u0632 500 \u062d\u0631\u0641' };
    }
    return { valid: true, message: '\u0635\u0627\u0644\u062d' };
  },

  validateMessage: function(message) {
    if (!message || message.trim().length < 10) {
      return { valid: false, message: '\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 10 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644' };
    }
    if (message.trim().length > 1000) {
      return { valid: false, message: '\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u064a\u062c\u0628 \u0623\u0644\u0627 \u062a\u062a\u062c\u0627\u0648\u0632 1000 \u062d\u0631\u0641' };
    }
    return { valid: true, message: '\u0635\u0627\u0644\u062d' };
  },

  // FIX #1 CRITICAL: \u062f\u0627\u0644\u0629 \u0627\u0644\u062a\u0646\u0638\u064a\u0641 \u0627\u0644\u0645\u0635\u0644\u062d\u0629 \u2014 & \u0623\u0648\u0644\u0627\u064b \u062b\u0645 < > " '
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

  // FIX #6: \u0627\u0644\u062a\u062d\u0642\u0642 \u0627\u0644\u0635\u0627\u0631\u0645 \u0645\u0646 \u0628\u0646\u064a\u0629 \u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0633\u0644\u0629
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

// FIX #3: Rate Limiting \u2014 \u0645\u0646\u0639 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0645\u062a\u0643\u0631\u0631 \u0644\u0644\u0646\u0645\u0627\u0630\u062c
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
// \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0627\u062d\u062a\u064a\u0627\u0637\u064a\u0629 (Fallback)
// ===================================================
const FALLBACK_PRODUCTS = []; // Products managed via Supabase admin panel

// ===================================================
// \u0631\u0633\u0648\u0645 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u2014 Delivery Fee (\u0644\u062c\u0645\u064a\u0639 \u0623\u0646\u062d\u0627\u0621 \u0627\u0644\u0639\u0631\u0627\u0642)
// ===================================================
const DELIVERY_FEE = 4000; // 4,000 \u062f\u064a\u0646\u0627\u0631 \u0639\u0631\u0627\u0642\u064a

let products = []; // loaded from Supabase
let cart = [];
let favorites = [];
let displayedProducts = [...products];

// ===================================================
// \u062f\u0648\u0627\u0644 Supabase
// ===================================================

async function loadProductsFromSupabase() {
  if (!supabaseClient) {
    console.error('\u274c supabaseClient is null — initSupabase() failed');
    return;
  }
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
      console.log('\u2705 Products loaded from Supabase:', products.length);
    }
  } catch (e) {
    console.warn('\u26a0\ufe0f Using fallback products. Supabase error:', e.message);
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

    console.log('\u2705 Order saved to Supabase:', order.id);
    return order.id;
  } catch (e) {
    console.warn('\u26a0\ufe0f Order not saved to Supabase:', e.message);
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
    console.log('\u2705 Contact message saved to Supabase');
    return true;
  } catch (e) {
    console.warn('\u26a0\ufe0f Contact message not saved:', e.message);
    return false;
  }
}

// ===================================================
// Initialize
// ===================================================

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u0643\u0648\u062f \u0627\u0644\u062e\u0635\u0645 \u2014 Discount Code State & Functions
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
let appliedDiscount = null;

async function applyDiscountCode() {
  const input = document.getElementById('discountCodeInput');
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  if (!code) { return; }

  const btn = document.getElementById('applyDiscountBtn');
  if (btn) { btn.disabled = true; btn.textContent = '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0642\u0642...'; }

  try {
    if (!supabaseClient) { showToast('\u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631 \u062d\u062a\u0649 \u0627\u0643\u062a\u0645\u0627\u0644 \u0627\u0644\u062a\u062d\u0645\u064a\u0644', 'error'); return; }
    const { data, error } = await supabaseClient
      .from('discount_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) { showToast('\u0643\u0648\u062f \u0627\u0644\u062e\u0635\u0645 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d \u0623\u0648 \u0645\u0646\u062a\u0647\u064a \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629 \u274c', 'error'); appliedDiscount = null; updateDiscountDisplay(); return; }
    if (data.max_uses !== null && data.used_count >= data.max_uses) { showToast('\u062a\u0645 \u0627\u0633\u062a\u0646\u0641\u0627\u062f \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062f', 'error'); appliedDiscount = null; updateDiscountDisplay(); return; }

    appliedDiscount = data;
    updateDiscountDisplay();
    const displayVal = data.discount_type === 'percent' ? data.discount_value + '%' : data.discount_value.toLocaleString('en-US') + ' \u062f.\u0639';
    showToast('\u2705 \u062a\u0645 \u062a\u0637\u0628\u064a\u0642 \u062e\u0635\u0645 ' + displayVal, 'success');
  } catch(e) {
    showToast('\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u062d\u0642\u0642: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '\u062a\u0637\u0628\u064a\u0642'; }
  }
}

function updateDiscountDisplay() {
  const row = document.getElementById('discountRow');
  const amt = document.getElementById('discountAmount');
  if (!row || !amt) return;
  if (appliedDiscount) {
    row.classList.remove('hidden');
    amt.textContent = appliedDiscount.discount_type === 'percent'
      ? '\u2212 ' + appliedDiscount.discount_value + '%'
      : '\u2212 ' + appliedDiscount.discount_value.toLocaleString('en-US') + ' \u062f.\u0639';
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


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0625\u064a\u0645\u064a\u0644 \u2014 EmailJS Configuration
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
const EMAILJS_CONFIG = {
  serviceId:  'service_al7y77e',
  templateId: 'template_s9h0fnc',
  publicKey:  'NLgoFaGejqrqg5uTP',
  adminEmail: 'neurobinph2009@gmail.com'
};

async function sendEmailNotification(orderData) {
  if (typeof emailjs === 'undefined') {
    console.warn('EmailJS not loaded \u2014 skipping email notification');
    return;
  }
  try {
    emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });

    var itemsList = orderData.items.map(function(item) {
      return '\u2022 ' + item.productName + ' \u00d7 ' + item.quantity + ' = ' + formatPrice(item.subtotal);
    }).join('\n');

    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
      to_email:       EMAILJS_CONFIG.adminEmail,
      customer_name:  orderData.name,
      customer_phone: orderData.phone,
      customer_address: orderData.address || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
      order_items:    itemsList,
      order_total:    formatPrice(orderData.total),
      discount_code:  orderData.discountCode || '\u0644\u0627 \u064a\u0648\u062c\u062f',
      order_date:     new Date().toLocaleDateString('en-US'),
      order_time:     new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'}),
      order_id:       orderData.orderId || '\u2014'
    });

    console.log('\u2705 Email notification sent to', EMAILJS_CONFIG.adminEmail);
  } catch(e) {
    console.warn('\u26a0\ufe0f Email notification failed:', e.message || e);
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


// ==== Notify When Available ====
var _nPid='', _nPname='';
function openNotifyModal(pid,pname){
  _nPid=pid; _nPname=pname;
  var m=document.getElementById('notifyModal');
  var t=document.getElementById('notifyProductTitle');
  var p=document.getElementById('notifyPhone');
  if(t) t.textContent=pname;
  if(p) p.value='';
  if(m){m.classList.add('active');document.body.style.overflow='hidden';}
}
function closeNotifyModal(){
  var m=document.getElementById('notifyModal');
  if(m){m.classList.remove('active');document.body.style.overflow='';}
}
async function submitNotifyRequest(){
  var ph=document.getElementById('notifyPhone');
  var btn=document.getElementById('notifySubmitBtn');
  if(!ph) return;
  var phone=ph.value.trim();
  var v=SecurityValidator.validatePhone(phone);
  if(!v.valid){showToast(v.message,'error');ph.focus();return;}
  if(btn)btn.disabled=true;
  try{
    if(supabaseClient){
      await supabaseClient.from('contact_messages').insert({
        name:'\u0625\u0634\u0639\u0627\u0631 \u0639\u0646\u062f \u0627\u0644\u062a\u0648\u0641\u0631',
        contact_info:phone,
        message:'\u0623\u0631\u064a\u062f \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0639\u0646\u062f \u062a\u0648\u0641\u0631: '+_nPname
      });
    }
    showToast('\u062a\u0645 \u062a\u0633\u062c\u064a\u0644\u0643! \u0633\u0646\u062e\u0637\u0631\u0643 \u0639\u0646\u062f \u062a\u0648\u0641\u0631 \u0627\u0644\u0645\u0646\u062a\u062c \u2705','success');
    closeNotifyModal();
  }catch(e){
    showToast('\u062d\u062f\u062b \u062e\u0637\u0623\u060c \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649','error');
  }finally{
    if(btn)btn.disabled=false;
  }
}
// ================================

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
      stockBadge = '<span class="stock-badge out-of-stock z-10">\u0646\u0641\u0630\u062a \u0627\u0644\u0643\u0645\u064a\u0629</span>';
    } else if (product.stockLevel === 'low') {
      stockBadge = '<span class="stock-badge low-stock z-10">\u0643\u0645\u064a\u0629 \u0645\u062d\u062f\u0648\u062f\u0629</span>';
    } else if (product.stockLevel === 'in') {
      stockBadge = '<span class="stock-badge in-stock z-10">\u0645\u062a\u0648\u0641\u0631</span>';
    }
    return `
      <div class="product-card-main scroll-animate-scale" role="listitem" data-category="${safeCategory}" data-id="${safeId}">
        ${stockBadge}
        <button onclick="toggleFavorite('${safeId}')" class="favorite-btn ${isFavorite ? 'active' : ''}" aria-label="${isFavorite ? '\u0625\u0632\u0627\u0644\u0629 \u0645\u0646 \u0627\u0644\u0645\u0641\u0636\u0644\u0629' : '\u0625\u0636\u0627\u0641\u0629 \u0644\u0644\u0645\u0641\u0636\u0644\u0629'}">
          <i data-lucide="heart" class="w-5 h-5 ${isFavorite ? 'fill-red-500 stroke-red-500' : ''}"></i>
        </button>
        <div class="product-image-wrapper cursor-pointer" onclick="openQuickView('${safeId}')">
          ${product.image
            ? `<img src="${SecurityValidator.escapeHtml(product.image)}" alt="" class="w-full h-full object-contain bg-white" loading="lazy">`
            : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50"><svg class="w-16 h-16 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M5 17a2 2 0 01-2-2V5"/></svg></div>`
          }
          <div class="product-overlay">
            <button class="bg-white text-brand-700 px-6 py-2.5 rounded-full font-semibold hover:bg-brand-50 transition-colors">\u0639\u0631\u0636 \u0633\u0631\u064a\u0639</button>
          </div>
        </div>
        <div class="p-2.5 product-card-body">
          <span class="inline-block bg-brand-50 text-brand-600 text-xs font-medium px-2 py-0.5 rounded-full mb-1">
            ${SecurityValidator.escapeHtml(getCategoryLabel(product.category))}
          </span>
          <h3 class="font-heading font-bold text-sm text-brand-900 mb-1 leading-snug">${safeName}</h3>
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold text-brand-700 leading-none">${SecurityValidator.escapeHtml(formatPrice(product.price))}</span>
            <button onclick="addToCart('${safeId}')" class="btn-primary ${!product.inStock ? 'bg-amber-600 hover:bg-amber-500' : 'bg-brand-700 hover:bg-brand-600'} text-white px-2.5 py-1.5 rounded-full font-medium text-xs flex items-center gap-1 whitespace-nowrap flex-shrink-0 transition-all" >
              <i data-lucide="plus" class="w-3 h-3"></i>
              ${product.inStock ? '<span>أضف للسلة</span>' : '<span>أخبرني</span>'}
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
  const labels = { medicines: 'أدوية', skincare: 'العناية بالبشرة', makeup: 'مكياج', devices: 'أجهزة طبية', perfumes: 'عطور' };
  return labels[category] || category;
}

function formatPrice(price) {
  return Number(price).toLocaleString('en-US') + ' \u062f.\u0639';
}

// FIX #2: \u062a\u0645\u0631\u064a\u0631 event \u0643\u0645\u0639\u0627\u0645\u0644 \u2014 \u0644\u0627 global event object
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
    // FIX #4: \u062d\u062f \u0623\u0642\u0635\u0649 99 \u0648\u062d\u062f\u0629
    if (existingItem.quantity >= 99) {
      showToast('\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 99 \u0648\u062d\u062f\u0629 \u0644\u0643\u0644 \u0645\u0646\u062a\u062c', 'error');
      return;
    }
    existingItem.quantity++;
  } else {
    cart.push({ productId, quantity: 1 });
  }
  saveCart();
  updateCartUI();
  showToast('\u062a\u0645\u062a \u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0644\u0644\u0633\u0644\u0629', 'success');
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
    if (newQty > 99) { showToast('\u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 99 \u0648\u062d\u062f\u0629 \u0644\u0643\u0644 \u0645\u0646\u062a\u062c', 'error'); return; }
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
  if (cartCountText) cartCountText.textContent = `${totalItems} ${totalItems === 1 ? '\u0645\u0646\u062a\u062c' : '\u0645\u0646\u062a\u062c\u0627\u062a'}`;
  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
  if (cartItems) {
    if (cart.length === 0) {
      cartItems.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-brand-400">
          <svg class="w-16 h-16 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <p class="text-lg font-medium">\u0627\u0644\u0633\u0644\u0629 \u0641\u0627\u0631\u063a\u0629</p>
          <p class="text-sm">\u0623\u0636\u0641 \u0645\u0646\u062a\u062c\u0627\u062a \u0644\u0644\u0628\u062f\u0621</p>
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
    showToast('\u0639\u0631\u0636 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0645\u0641\u0636\u0644\u0629');
  } else {
    showToast('\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a \u0645\u0641\u0636\u0644\u0629', 'error');
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
      <span>${SecurityValidator.escapeHtml(product.nameAr + ' \u00d7 ' + item.quantity)}</span>
      <span class="font-medium">${SecurityValidator.escapeHtml(formatPrice(subtotal))}</span>
    </div>`;
  }).join('');
  // \u0625\u0636\u0627\u0641\u0629 \u0631\u0633\u0648\u0645 \u0627\u0644\u062a\u0648\u0635\u064a\u0644
  checkoutItems.innerHTML += `<div class="flex justify-between text-amber-700 border-t border-dashed border-brand-200 pt-2 mt-2 font-medium">
    <span>\u1f69a \u0631\u0633\u0648\u0645 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 (\u062c\u0645\u064a\u0639 \u0623\u0646\u062d\u0627\u0621 \u0627\u0644\u0639\u0631\u0627\u0642)</span>
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
    showToast('\u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631 ' + rateCheck.remaining + ' \u062b\u0627\u0646\u064a\u0629 \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u062c\u062f\u064a\u062f', 'error');
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

  let message = '\u{1F6D2} *\u0637\u0644\u0628 \u062c\u062f\u064a\u062f \u0645\u0646 \u0635\u064a\u062f\u0644\u064a\u0629 neurobin*\n\n';
  message += '\u{1F464} *\u0627\u0644\u0639\u0645\u064a\u0644:* ' + name + '\n';
  message += '\u{1F4F1} *\u0627\u0644\u0647\u0627\u062a\u0641:* ' + phone + '\n';
  message += '\u{1F4CD} *\u0627\u0644\u0639\u0646\u0648\u0627\u0646:* ' + address + '\n';
  if (notes) message += '\u{1F4DD} *\u0645\u0644\u0627\u062d\u0638\u0627\u062a:* ' + notes + '\n\n';
  message += '*\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a:*\n';

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
  message += '\n\u{1F69A} *\u0631\u0633\u0648\u0645 \u0627\u0644\u062a\u0648\u0635\u064a\u0644:* ' + formatPrice(DELIVERY_FEE);
  if (appliedDiscount) { const dD = appliedDiscount.discount_type==='percent' ? appliedDiscount.discount_value+'%' : formatPrice(appliedDiscount.discount_value); message += '\n\u{1F3F7}\uFE0F *\u0643\u0648\u062f \u0627\u0644\u062e\u0635\u0645:* ' + appliedDiscount.code + ' (' + dD + ')'; message += '\n\u{1F4B0} *\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0634\u0627\u0645\u0644 \u0627\u0644\u062a\u0648\u0635\u064a\u0644:* ' + formatPrice(discountedTotal + DELIVERY_FEE); } else { message += '\n\u{1F4B0} *\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0634\u0627\u0645\u0644 \u0627\u0644\u062a\u0648\u0635\u064a\u0644:* ' + formatPrice(total + DELIVERY_FEE); }

  const orderId = await saveOrderToSupabase({ name, phone, address, notes, total: (appliedDiscount ? discountedTotal : total) + DELIVERY_FEE, items: orderItems });
  // \u0625\u0631\u0633\u0627\u0644 \u0625\u0634\u0639\u0627\u0631 \u0625\u064a\u0645\u064a\u0644 \u0644\u0644\u0645\u0634\u0631\u0641
  sendEmailNotification({
    name, phone, address,
    total: calcTotal(total),
    items: orderItems,
    discountCode: appliedDiscount ? appliedDiscount.code : null,
    orderId: orderId ? orderId.slice(-8).toUpperCase() : null
  });
  if (orderId) message += '\n\u{1F516} *\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628:* #' + orderId.slice(-8).toUpperCase();

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
  showToast('\u0634\u0643\u0631\u0627\u064b \u0644\u0643! \u0633\u064a\u062a\u0645 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u0642\u0631\u064a\u0628\u0627\u064b', 'success');
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
  const stockText = product.inStock ? '\u0645\u062a\u0648\u0641\u0631 \u0641\u064a \u0627\u0644\u0645\u062e\u0632\u0648\u0646' : '\u0646\u0641\u0630\u062a \u0627\u0644\u0643\u0645\u064a\u0629';
  const isFavorite = favorites.includes(product.id);
  content.innerHTML = `
    ${product.image
      ? `<div class="h-64 bg-white flex items-center justify-center overflow-hidden"><img src="${SecurityValidator.escapeHtml(product.image)}" alt="" class="max-w-full max-h-full object-contain" loading="lazy" style="max-height:256px"></div>`
      : `<div class="bg-gradient-to-br from-brand-100 to-brand-50 h-64 flex items-center justify-center"><svg class="w-24 h-24 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M5 17a2 2 0 01-2-2V5"/></svg></div>`
    }
    <div class="p-2.5 product-card-body">
      <span class="inline-block bg-brand-50 text-brand-600 text-sm font-medium px-3 py-1 rounded-full mb-3">${safeCategory}</span>
      <h3 class="font-heading font-bold text-2xl text-brand-900 mb-2">${safeName}</h3>
      <p class="text-3xl font-bold text-brand-700 mb-4">${safePrice}</p>
      <p class="text-brand-600/80 mb-6">${SecurityValidator.escapeHtml(stockText)}</p>
      <div class="flex gap-3">
        <button onclick="addToCart('${safeId}')" class="flex-grow btn-primary bg-brand-700 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${!product.inStock ? 'bg-amber-600 hover:bg-amber-500' : 'bg-brand-700 hover:bg-brand-600'}" >
          <i data-lucide="shopping-cart" class="w-5 h-5"></i>\u0623\u0636\u0641 \u0644\u0644\u0633\u0644\u0629
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


// ===================================================
// نظام البحث الذكي — Arabic Fuzzy Search
// ===================================================
function normalizeArabic(str) {
  if (!str) return '';
  return str
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ً-ٰٟ]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = [];
  for (let i = 0; i <= m; i++) { dp[i] = [i]; }
  for (let j = 0; j <= n; j++) { dp[0][j] = j; }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatchArabic(query, productName) {
  const q = normalizeArabic(query);
  const name = normalizeArabic(productName);
  if (name.includes(q)) return true;
  // Split product name into words and check each
  const words = name.split(' ');
  const queryWords = q.split(' ');
  for (const qw of queryWords) {
    if (qw.length < 2) continue;
    const maxDist = qw.length <= 3 ? 1 : qw.length <= 5 ? 2 : 3;
    const found = words.some(w => w.length > 1 && levenshtein(qw, w) <= maxDist);
    if (!found) return false;
  }
  return queryWords.length > 0;
}

function performSearch() {
  const rawQuery = document.getElementById('searchInput').value;
  const query = rawQuery.toLowerCase().slice(0, 100);
  const results = document.getElementById('searchResults');
  if (query.length < 2) { results.innerHTML = ''; return; }
  // Step 1: Exact match
  let matches = products.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.nameAr.includes(rawQuery) ||
    normalizeArabic(p.nameAr).includes(normalizeArabic(rawQuery)) ||
    p.category.includes(query)
  );
  // Step 2: Fuzzy match if no results (handles typos like عسول → غسول)
  let isFuzzy = false;
  if (matches.length === 0 && rawQuery.length >= 2) {
    matches = products.filter(p => fuzzyMatchArabic(rawQuery, p.nameAr) || fuzzyMatchArabic(rawQuery, p.name));
    isFuzzy = matches.length > 0;
  }
  if (matches.length === 0) {
    results.innerHTML = '<div class="p-6 text-center text-brand-400"><p>لم يتم العثور على نتائج</p></div>';
  } else {
    const fuzzyNotice = isFuzzy ? `<div class="px-4 pt-3 text-xs text-brand-500">🔍 نتائج مقاربة لـ &quot;${SecurityValidator.escapeHtml(rawQuery)}&quot;</div>` : '';
    results.innerHTML = fuzzyNotice + matches.map(p => {
      const safeId = SecurityValidator.escapeHtml(p.id);
      const safeName = SecurityValidator.escapeHtml(p.nameAr);
      const safePrice = SecurityValidator.escapeHtml(formatPrice(p.price));
      const safeImg = p.image ? SecurityValidator.escapeHtml(p.image) : '';
      const stockBadge = p.inStock
        ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">متوفر</span>'
        : '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">نفذت الكمية</span>';
      const imgHtml = safeImg
        ? `<img src="${safeImg}" alt="" class="w-full h-full object-contain" loading="lazy">`
        : `<svg class="w-7 h-7 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M5 17a2 2 0 01-2-2V5"/></svg>`;
      return `<div class="search-result-item" onclick="openQuickView('${safeId}'); closeSearch();" style="gap:14px;padding:12px 16px;">
        <div class="flex-shrink-0 w-16 h-16 bg-brand-50 rounded-xl overflow-hidden flex items-center justify-center border border-brand-100">
          ${imgHtml}
        </div>
        <div class="flex-grow min-w-0">
          <h4 class="font-semibold text-brand-900 text-sm leading-snug mb-1">${safeName}</h4>
          <p class="font-bold text-brand-700 text-sm mb-1">${safePrice}</p>
          ${stockBadge}
        </div>
        <svg class="flex-shrink-0 w-4 h-4 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
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
    showToast('\u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631 ' + rateCheck.remaining + ' \u062b\u0627\u0646\u064a\u0629 \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u062c\u062f\u064a\u062f\u0629', 'error');
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
    showToast('\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0631\u0642\u0645 \u0647\u0627\u062a\u0641 \u0623\u0648 \u0628\u0631\u064a\u062f \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0635\u062d\u064a\u062d', 'error');
    infoInput.focus();
    return;
  }

  const msgV = SecurityValidator.validateMessage(message);
  if (!msgV.valid) { showToast(msgV.message, 'error'); messageInput.focus(); return; }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.7'; }

  let whatsappMessage = '\u{1F4EC} *\u0631\u0633\u0627\u0644\u0629 \u062c\u062f\u064a\u062f\u0629 \u0645\u0646 \u0627\u0644\u0645\u0648\u0642\u0639*\n\n';
  whatsappMessage += '\u{1F464} *\u0627\u0644\u0627\u0633\u0645:* ' + name + '\n';
  whatsappMessage += '\u{1F4F1} *\u0627\u0644\u062a\u0648\u0627\u0635\u0644:* ' + info + '\n';
  whatsappMessage += '\u{1F4AC} *\u0627\u0644\u0631\u0633\u0627\u0644\u0629:* ' + message;

  await saveContactMessageToSupabase(name, info, message);
  window.open('https://wa.me/9647870404967?text=' + encodeURIComponent(whatsappMessage), '_blank', 'noopener,noreferrer');
  document.getElementById('contactForm').reset();
  showToast('\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u062a\u0643 \u0628\u0646\u062c\u0627\u062d!', 'success');
  if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
}

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.matches('input, textarea')) { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') { closeCart(); closeSearch(); closeCheckout(); closeQuickView(); }
});
