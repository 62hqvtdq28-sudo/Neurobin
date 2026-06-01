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
      window.supabaseClient = supabaseClient; // expose to window for inline scripts
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
let _showingFavorites = false;
let displayedProducts = [...products];
let activeCategory   = 'all';  // tracks current filter tab

// ===================================================
// \u062f\u0648\u0627\u0644 Supabase
// ===================================================

// Skeleton loading placeholders while Supabase data loads
function showProductSkeletons(count) {
  var grid = document.getElementById('productsGrid');
  if (!grid) return;
  var html = '';
  for (var i = 0; i < (count || 8); i++) {
    html += '<div class="skeleton-card">' +
      '<div class="skeleton skeleton-img"></div>' +
      '<div class="skeleton-body">' +
        '<div class="skeleton skeleton-tag"></div>' +
        '<div class="skeleton skeleton-title"></div>' +
        '<div class="skeleton skeleton-sub"></div>' +
        '<div class="skeleton-row">' +
          '<div class="skeleton skeleton-price"></div>' +
          '<div class="skeleton skeleton-btn"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  grid.innerHTML = html;
}

async function loadProductsFromSupabase() {
  if (!supabaseClient) {
    console.error('\u274c supabaseClient is null — initSupabase() failed');
    return;
  }
  showProductSkeletons(8);
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
        stockLevel: p.stock_level || 'in',
        stock: (p.stock !== undefined && p.stock !== null) ? Number(p.stock) : null,
        description: p.description || '',
        originalPrice: p.original_price ? Number(p.original_price) : null,
        qty2Price: p.qty_2_price ? Number(p.qty_2_price) : null,
        qty3Price: p.qty_3_price ? Number(p.qty_3_price) : null
      }));
      if (activeCategory === 'bundles') {
        displayedProducts = [...products];
      } else {
        displayedProducts = activeCategory === 'all' ? [...products] : products.filter(function(p) { return p.category === activeCategory; });
        renderProducts(displayedProducts);
      }
      updateCartUI();
      console.log('\u2705 Products loaded from Supabase:', products.length);
    }
  } catch (e) {
    console.warn('\u26a0\ufe0f Using fallback products. Supabase error:', e.message);
  }
}

var bundles = [];

async function loadBundlesFromSupabase() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from('bundles').select('*').eq('active', true).order('created_at', { ascending: true });
    if (error) throw error;
    if (data) {
      bundles = data.map(b => ({
        id: String(b.id),
        titleAr: b.title_ar || '',
        productIds: Array.isArray(b.product_ids) ? b.product_ids : (b.product_ids ? JSON.parse(b.product_ids) : []),
        bundlePrice: Number(b.bundle_price) || 0,
        originalPrice: b.original_price ? Number(b.original_price) : null
      }));
      console.log('✅ Bundles loaded:', bundles.length);
    }
  } catch(e) { console.warn('⚠️ Bundles load error:', e.message); }
}

function renderBundles() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  if (!bundles.length) {
    grid.innerHTML = '<div class="col-span-full text-center py-12 text-brand-400">لا توجد عروض حالياً</div>';
    return;
  }
  grid.innerHTML = bundles.map(function(b, i) {
    var bid = SecurityValidator.escapeHtml(b.id);
    var bundleProducts = b.productIds.map(function(pid) {
      var p = products.find(function(x){ return String(x.id) === String(pid); });
      return p ? SecurityValidator.escapeHtml(p.nameAr || p.name || '') : '';
    }).filter(Boolean);
    var saving = b.originalPrice && b.originalPrice > b.bundlePrice ? b.originalPrice - b.bundlePrice : 0;
    var prodList = bundleProducts.map(function(n){ return '<span class="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">' + n + '</span>'; }).join('');
    return '<div class="product-card-main scroll-animate-scale" role="listitem">' +
      (saving > 0 ? '<span class="stock-badge in-stock z-10" style="background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;">توفير ' + saving.toLocaleString() + ' د.ع</span>' : '') +
      '<div class="product-image-wrapper" style="background:linear-gradient(135deg,#fef2f2,#fff7ed);display:flex;align-items:center;justify-content:center;">' +
        '<svg class="w-16 h-16 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>' +
      '</div>' +
      '<div class="p-2.5 product-card-body">' +
        '<span class="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1" style="background:#fef2f2;color:#ef4444;">عرض خاص</span>' +
        '<h3 class="font-heading font-bold text-sm text-brand-900 leading-snug">' + SecurityValidator.escapeHtml(b.titleAr) + '</h3>' +
        '<div class="flex flex-wrap gap-1 my-1">' + prodList + '</div>' +
        '<div class="flex items-center justify-between">' +
          '<div class="flex flex-col leading-none">' +
            (b.originalPrice ? '<span class="text-xs text-black line-through leading-none mb-0.5">' + SecurityValidator.escapeHtml(formatPrice(b.originalPrice)) + '</span>' : '') +
            '<span class="text-sm font-bold text-red-600 leading-none">' + SecurityValidator.escapeHtml(formatPrice(b.bundlePrice)) + '</span>' +
          '</div>' +
          '<button data-bid="' + bid + '" onclick="addBundleToCart(this.dataset.bid)" class="btn-primary bg-brand-700 hover:bg-brand-600 text-white px-2.5 py-1.5 rounded-full font-medium text-xs flex items-center gap-1 whitespace-nowrap flex-shrink-0 transition-all">' +
            '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/></svg>' +
            '<span>أضف الباقة</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  lucide.createIcons();
  if (typeof initScrollAnimations === 'function') initScrollAnimations();
}

function addBundleToCart(bundleId) {
  var bundle = bundles.find(function(b){ return b.id === bundleId; });
  if (!bundle) return;
  var bundleCartId = 'bundle_' + bundleId;
  var existing = cart.find(function(item){ return item.productId === bundleCartId; });
  if (existing) { showToast('الباقة موجودة بالفعل في السلة', 'info'); return; }
  cart.push({ productId: bundleCartId, quantity: 1, isBundle: true, bundleData: { id: bundleId, titleAr: bundle.titleAr, price: bundle.bundlePrice, originalPrice: bundle.originalPrice } });
  saveCart();
  updateCartUI();
  showToast('تمت إضافة الباقة للسلة ✓', 'success');
}

function getEffectivePrice(product, quantity) {
  if (!product) return 0;
  if (quantity >= 3 && product.qty3Price) return product.qty3Price;
  if (quantity >= 2 && product.qty2Price) return product.qty2Price;
  return product.price;
}

function generateTrackingCode(){return 'NB-'+Math.floor(1000+Math.random()*9000);}

async function saveOrderToSupabase(orderData) {
  if (!supabaseClient) return null;
  try {
    // Try to insert WITH tracking_code first
    var _itemsArr = (orderData.items || []).map(function(it) {
      return { name: it.productName || it.name || '', quantity: it.quantity || 1, price: it.price || 0 };
    });
    var _tCode = orderData.trackingCode || generateTrackingCode();
    // Use ACTUAL orders table column names: name, phone, address, total, items, status
    var orderInsert = {
      name:             orderData.name,
      phone:            orderData.phone || '',
      address:          orderData.address || '',
      total:            orderData.total || 0,
      status:           'new',
      items:            _itemsArr,
      tracking_code:    _tCode,
      notes:            orderData.notes || null,
      customer_name:    orderData.name,
      customer_phone:   orderData.phone || '',
      customer_address: orderData.address || null,
      total_amount:     orderData.total || 0
    };
    var { data: order, error: orderError } = await supabaseClient.from('orders').insert(orderInsert).select().single();
    // Fallback: if tracking_code column doesn't exist yet, save without it (run SQL migration)
    if (orderError && (orderError.code === '42703' || (orderError.message && orderError.message.includes('tracking_code')))) {
      console.warn('\u26a0\ufe0f tracking_code column missing - saving without it. Run SQL migration.');
      var orderInsert2 = { customer_name: orderData.name, customer_phone: orderData.phone, customer_address: orderData.address || null, notes: orderData.notes || null, total_amount: orderData.total };
      var { data: order2, error: err2 } = await supabaseClient.from('orders').insert(orderInsert2).select().single();
      if (err2) throw err2;
      order = order2;
      orderError = null;
    }
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
    return { id: order.id, tracking_code: order.tracking_code || _tCode };
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
  // تحديث الإجمالي فورًا عند تطبيق/إلغاء الخصم
  const totalEl = document.getElementById('checkoutTotal');
  if (totalEl) {
    let sub = 0;
    cart.forEach(function(item) {
      const product = products.find(function(p) { return p.id === item.productId; });
      if (product) sub += product.price * item.quantity;
    });
    totalEl.textContent = SecurityValidator.escapeHtml(formatPrice(calcTotal(sub) + DELIVERY_FEE));
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
  loadBundlesFromSupabase();
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
  /* Guard: perf.js registers an optimized rAF-throttled scroll handler that handles
     navbar + backToTop in one rAF. If it loaded, skip this unthrottled version to
     prevent two scroll handlers fighting each other (causes jank on Safari). */
  if (window.__perfScrollActive) return;
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  let _ticking = false;
  let _wasScrolled = null;
  window.addEventListener('scroll', () => {
    if (_ticking) return; /* rAF throttle */
    _ticking = true;
    requestAnimationFrame(() => {
      _ticking = false;
      const scrolled = window.scrollY > 100;
      if (scrolled === _wasScrolled) return; /* skip if unchanged */
      _wasScrolled = scrolled;
      if (scrolled) {
        navbar.classList.add('nav-scrolled');
      } else {
        navbar.classList.remove('nav-scrolled');
      }
    });
  }, { passive: true }); /* passive: no scroll blocking */
}

function initScrollAnimations() {
  /* threshold:0 + large rootMargin → triggers earlier, prevents Safari IO "miss" */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0, rootMargin: '100px 0px 100px 0px' });
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
    const safeName   = SecurityValidator.escapeHtml(product.nameAr);
    const safeNameEn = SecurityValidator.escapeHtml(product.name);
    const safeDesc   = SecurityValidator.escapeHtml(product.description || '');
    const isFavorite = favorites.includes(product.id);
    let stockBadge = '';
    var _sn = (typeof product.stock === 'number') ? product.stock : null;
    if (!product.inStock || _sn === 0) {
      stockBadge = '<span class="stock-badge out-of-stock z-10">\u0646\u0641\u0630\u062a \u0627\u0644\u0643\u0645\u064a\u0629</span>';
    } else if (_sn === 1) {
      stockBadge = '<span class="stock-badge low-stock z-10">\u0622\u062e\u0631 \u0642\u0637\u0639\u0629</span>';
    } else if (_sn === 2) {
      stockBadge = '<span class="stock-badge low-stock z-10">\u0622\u062e\u0631 \u0642\u0637\u0639\u062a\u064a\u0646</span>';
    } else {
      stockBadge = '<span class="stock-badge in-stock z-10">\u0645\u062a\u0648\u0641\u0631 \u0644\u0644\u062a\u0633\u0644\u064a\u0645 \u0627\u0644\u0641\u0648\u0631\u064a</span>';
    }
    const _discPct = (product.originalPrice && product.originalPrice > product.price)
      ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
    const discountBadge = _discPct >= 5
      ? `<span class="discount-badge">-${_discPct}%</span>` : '';
    return `
      <div class="product-card-main scroll-animate-scale" role="listitem" data-category="${safeCategory}" data-id="${safeId}">
        ${stockBadge}${discountBadge}
        <button onclick="toggleFavorite('${safeId}')" class="favorite-btn ${isFavorite ? 'active' : ''}" aria-label="${isFavorite ? '\u0625\u0632\u0627\u0644\u0629 \u0645\u0646 \u0627\u0644\u0645\u0641\u0636\u0644\u0629' : '\u0625\u0636\u0627\u0641\u0629 \u0644\u0644\u0645\u0641\u0636\u0644\u0629'}">
          <i data-lucide="heart" class="w-5 h-5 ${isFavorite ? 'fill-red-500 stroke-red-500' : ''}"></i>
        </button>
        <div class="product-image-wrapper cursor-pointer" onclick="openQuickView('${safeId}')">
          ${product.image
            ? `<img src="${SecurityValidator.escapeHtml(product.image)}" alt="${safeName}" class="w-full h-full object-contain bg-white product-img-animated" loading="lazy" decoding="async">`
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
          <h3 class="font-heading font-bold text-sm text-brand-900 leading-snug">${safeName}</h3>
          ${safeNameEn && safeNameEn !== safeName ? `<p class="font-heading font-bold text-sm text-brand-900 leading-snug mb-1">${safeNameEn}</p>` : '<div class="mb-1"></div>'}
          ${safeDesc ? `<p class="text-xs text-gray-900 leading-snug mb-1 line-clamp-2 overflow-hidden" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${safeDesc}</p>` : ''}
          ${(function(){var st=typeof SkinType!=='undefined'?SkinType.get(product.id):[];var stLabels={'combination':'💧 مختلطة','oily':'✨ دهنية','dry':'🌿 جافة','normal':'⭐ عادية','sensitive':'🌹 حساسة','acne_prone':'🟠 حبوب','all_types':'🌸 لكل الأنواع'};return st.length?'<div class="flex flex-wrap gap-1 mb-1">'+st.map(function(t){return'<span style="font-size:10px;padding:2px 6px;border-radius:999px;background:#F0FDF4;color:#166534;border:1px solid #BBF7D0;font-family:Cairo,sans-serif;">'+((stLabels[t])||t)+'</span>';}).join('')+'</div>':'';}())}
          <div class="flex items-center justify-between">
            <div class="flex flex-col leading-none">
              ${product.originalPrice && product.originalPrice > product.price ? `<span class="text-xs text-gray-400 line-through leading-none mb-0.5">${SecurityValidator.escapeHtml(formatPrice(product.originalPrice))}</span>` : ''}
              <span class="${product.originalPrice && product.originalPrice > product.price ? 'text-base' : 'text-sm'} font-bold text-red-600 leading-none">${SecurityValidator.escapeHtml(formatPrice(product.price))}</span>
              ${product.qty2Price ? `<span class="${product.originalPrice ? 'text-base' : 'text-sm'} font-bold text-orange-600 leading-none mt-1">٢ قطعة: ${SecurityValidator.escapeHtml(formatPrice(product.qty2Price))}</span>` : ''}${product.qty3Price ? `<span class="${product.originalPrice ? 'text-base' : 'text-sm'} font-bold text-orange-600 leading-none mt-0.5">٣ قطع: ${SecurityValidator.escapeHtml(formatPrice(product.qty3Price))}</span>` : ''}
            </div>
            ${product.inStock
              ? `<button onclick="addToCart('${safeId}')" class="btn-primary bg-brand-700 hover:bg-brand-600 text-white px-2.5 py-1.5 rounded-full font-medium text-xs flex items-center gap-1 whitespace-nowrap flex-shrink-0 transition-all"><i data-lucide="plus" class="w-3 h-3"></i><span>أضف للسلة</span></button>`
              : `<button onclick="openNotifyModal('${safeId}','${safeName.replace(/'/g,"&#39;")}')" class="btn-primary bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1.5 rounded-full font-medium text-xs flex items-center gap-1 whitespace-nowrap flex-shrink-0 transition-all"><i data-lucide="bell" class="w-3 h-3"></i><span>أخبرني</span></button>`
            }
          </div>
        </div>
      </div>
    `;
  }).join('');
  lucide.createIcons();
  initScrollAnimations();
}

function getCategoryLabel(category) {
  const labels = { medicines: 'أدوية', skincare: 'العناية بالبشرة', makeup: 'مكياج', devices: 'أجهزة', perfumes: 'عطور' };
  return labels[category] || category;
}

function formatPrice(price) {
  return Number(price).toLocaleString('en-US') + ' \u062f.\u0639';
}

// FIX #2: \u062a\u0645\u0631\u064a\u0631 event \u0643\u0645\u0639\u0627\u0645\u0644 \u2014 \u0644\u0627 global event object
function filterProducts(e, category) {
  _showingFavorites = false;
  // Remove active from all
  document.querySelectorAll('.cat-icon-btn').forEach(function(btn) {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  // Set active via data-filter (reliable on all browsers/iOS)
  var activeBtn = document.querySelector('.cat-icon-btn[data-filter="' + category + '"]');
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.setAttribute('aria-selected', 'true');
  }
  activeCategory = category;
  if (category === 'bundles') {
    renderBundles();
    return;
  }
  displayedProducts = category === 'all' ? [...products] : products.filter(p => p.category === category);
  if (typeof SkinType !== 'undefined' && SkinType.hookMainFilter) SkinType.hookMainFilter(category);
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
        if (item.isBundle && item.bundleData) {
          var bd = item.bundleData;
          total += bd.price;
          var safeBundleId = SecurityValidator.escapeHtml(item.productId);
          return `<div class="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
            <div class="w-16 h-16 bg-gradient-to-br from-red-100 to-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/></svg>
            </div>
            <div class="flex-grow">
              <span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">عرض خاص</span>
              <h4 class="font-semibold text-brand-900 text-sm mt-0.5">${SecurityValidator.escapeHtml(bd.titleAr || 'باقة')}</h4>
              <p class="font-bold text-red-600 text-sm">${SecurityValidator.escapeHtml(formatPrice(bd.price))}</p>
            </div>
            <button onclick="removeFromCart('${safeBundleId}')" class="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>`;
        }
        const product = products.find(p => p.id === item.productId);
        if (!product) return '';
        const effectivePrice = getEffectivePrice(product, item.quantity);
        total += effectivePrice * item.quantity;
        const safeProductId = SecurityValidator.escapeHtml(item.productId);
        const safeName = SecurityValidator.escapeHtml(product.nameAr);
        const hasDiscount = effectivePrice < product.price;
        return `
          <div class="flex items-center gap-4 p-4 bg-brand-50 rounded-xl">
            <div class="w-16 h-16 bg-gradient-to-br from-brand-100 to-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg class="w-8 h-8 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5"/>
              </svg>
            </div>
            <div class="flex-grow">
              <h4 class="font-semibold text-brand-900 text-sm">${safeName}</h4>
              <div class="flex items-center gap-2">
                ${hasDiscount ? '<span class="text-xs text-gray-400 line-through">' + SecurityValidator.escapeHtml(formatPrice(product.price)) + '</span>' : ''}
                <p class="text-red-600 font-bold text-sm">${SecurityValidator.escapeHtml(formatPrice(effectivePrice))}</p>
                ${hasDiscount ? '<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">خصم كمية</span>' : ''}
              </div>
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
  document.getElementById('checkoutTotal').textContent = SecurityValidator.escapeHtml(formatPrice(calcTotal(total) + DELIVERY_FEE));
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
    if (item.isBundle && item.bundleData) {
      var bd = item.bundleData;
      total += bd.price;
      message += '\u2022 \u{1F381} ' + (bd.titleAr || '\u0628\u0627\u0642\u0629') + ' = ' + formatPrice(bd.price) + '\n';
      orderItems.push({ productId: item.productId, productName: bd.titleAr || '\u0628\u0627\u0642\u0629', quantity: 1, price: bd.price, subtotal: bd.price });
      return;
    }
    const product = products.find(p => p.id === item.productId);
    if (product) {
      const effectiveP = getEffectivePrice(product, item.quantity);
      const subtotal = effectiveP * item.quantity;
      total += subtotal;
      message += '\u2022 ' + product.nameAr + ' \u00D7 ' + item.quantity + ' = ' + formatPrice(subtotal) + '\n';
      orderItems.push({ productId: item.productId, productName: product.nameAr, quantity: item.quantity, price: effectiveP, subtotal });
    }
  });
  const discountedTotal = calcTotal(total);
  message += '\n\u{1F69A} *\u0631\u0633\u0648\u0645 \u0627\u0644\u062a\u0648\u0635\u064a\u0644:* ' + formatPrice(DELIVERY_FEE);
  if (appliedDiscount) { const dD = appliedDiscount.discount_type==='percent' ? appliedDiscount.discount_value+'%' : formatPrice(appliedDiscount.discount_value); message += '\n\u{1F3F7}\uFE0F *\u0643\u0648\u062f \u0627\u0644\u062e\u0635\u0645:* ' + appliedDiscount.code + ' (' + dD + ')'; message += '\n\u{1F4B0} *\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0634\u0627\u0645\u0644 \u0627\u0644\u062a\u0648\u0635\u064a\u0644:* ' + formatPrice(discountedTotal + DELIVERY_FEE); } else { message += '\n\u{1F4B0} *\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0634\u0627\u0645\u0644 \u0627\u0644\u062a\u0648\u0635\u064a\u0644:* ' + formatPrice(total + DELIVERY_FEE); }

  // ── Pre-generate tracking code (BEFORE any await — needed for iOS) ──
  const _waTrackingCode = generateTrackingCode();
  message += '\n📱 *كود التتبع:* ' + _waTrackingCode;

  // ── CRITICAL: Open WhatsApp FIRST (must be in user-gesture context for iOS Safari) ──
  window.open('https://wa.me/9647870404967?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');

  // ── Save order to Supabase in background (after opening WhatsApp) ──
  var _saveTotal = (appliedDiscount ? discountedTotal : total) + DELIVERY_FEE;
  var _oRes = null;
  try {
    _oRes = await saveOrderToSupabase({ name, phone, address, notes, total: _saveTotal, items: orderItems, trackingCode: _waTrackingCode });
  } catch(_saveErr) { console.warn('[order save]', _saveErr); }
  var orderId = _oRes ? (typeof _oRes === 'object' ? _oRes.id : _oRes) : null;
  var trackingCode = _oRes && _oRes.tracking_code ? _oRes.tracking_code : _waTrackingCode;
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


// ── Track Order from main page ────────────────────────────────────
function goTrackOrder() {
  var val = (document.getElementById('trackInputMain').value || '').trim();
  if (!val) { alert('يرجى إدخال رقم الهاتف أو كود التتبع'); return; }
  var url = (val.toUpperCase().startsWith('NB-'))
    ? 'track.html?code=' + encodeURIComponent(val.toUpperCase())
    : 'track.html?phone=' + encodeURIComponent(val.replace(/\s/g,''));
  window.open(url, '_blank');
}

function showTrackingCodeModal(code){
  var ex=document.getElementById('TCM');if(ex)ex.remove();
  var ov=document.createElement('div');ov.id='TCM';
  ov.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);padding:16px;';
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  var bx=document.createElement('div');
  bx.style.cssText='background:white;border-radius:22px;padding:32px 28px;max-width:360px;width:100%;text-align:center;font-family:Cairo,sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.35);';
  var icon=document.createElement('div');
  icon.style.cssText='width:60px;height:60px;background:#2D5016;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;';
  icon.innerHTML='<svg width="28" height="28" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>';
  var h2=document.createElement('h2');h2.style.cssText='font-size:20px;font-weight:900;color:#1E350F;margin-bottom:6px;';h2.textContent='تم استلام طلبك!';
  var p1=document.createElement('p');p1.style.cssText='color:#83A962;font-size:13px;margin-bottom:22px;';p1.textContent='احتفظ بكود التتبع لمتابعة طلبك';
  var bxIn=document.createElement('div');bxIn.style.cssText='background:#F6F7F4;border:2px dashed #5C933B;border-radius:16px;padding:20px;margin-bottom:22px;';
  var lbl=document.createElement('p');lbl.style.cssText='font-size:11px;color:#83A962;margin-bottom:8px;';lbl.textContent='كود التتبع';
  var codeEl=document.createElement('p');codeEl.style.cssText='font-size:34px;font-weight:900;color:#1E350F;letter-spacing:4px;font-family:monospace;';codeEl.textContent=code||'';
  var hint=document.createElement('p');hint.style.cssText='font-size:11px;color:#AABF89;margin-top:6px;';hint.textContent='احتفظ بهذا الكود';
  bxIn.appendChild(lbl);bxIn.appendChild(codeEl);bxIn.appendChild(hint);
  var lnk=document.createElement('a');lnk.href='track.html?code='+(code||'');lnk.textContent='تتبع طلبك الآن';
  lnk.style.cssText='display:block;background:#2D5016;color:white;padding:13px;border-radius:13px;font-weight:800;font-size:15px;text-decoration:none;margin-bottom:10px;';
  var btn=document.createElement('button');btn.textContent='إغلاق';btn.onclick=function(){ov.remove();};
  btn.style.cssText='background:#F6F7F4;color:#5C933B;padding:11px;border-radius:13px;font-family:Cairo,sans-serif;font-weight:700;font-size:14px;border:none;cursor:pointer;width:100%;';
  bx.appendChild(icon);bx.appendChild(h2);bx.appendChild(p1);bx.appendChild(bxIn);bx.appendChild(lnk);bx.appendChild(btn);
  ov.appendChild(bx);document.body.appendChild(ov);
}

function openQuickView(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  const modal = document.getElementById('quickViewModal');
  const content = document.getElementById('quickViewContent');
  const safeId = SecurityValidator.escapeHtml(product.id);
  const safeName   = SecurityValidator.escapeHtml(product.nameAr);
  const safeNameEn = SecurityValidator.escapeHtml(product.name);
  const safeDesc   = SecurityValidator.escapeHtml(product.description || '');
  const safeCategory = SecurityValidator.escapeHtml(getCategoryLabel(product.category));
  const safePrice = SecurityValidator.escapeHtml(formatPrice(product.price));
  const safeOriginalPrice = product.originalPrice ? SecurityValidator.escapeHtml(formatPrice(product.originalPrice)) : null;
  const stockText = product.inStock ? '\u0645\u062a\u0648\u0641\u0631 \u0641\u064a \u0627\u0644\u0645\u062e\u0632\u0648\u0646' : '\u0646\u0641\u0630\u062a \u0627\u0644\u0643\u0645\u064a\u0629';
  const isFavorite = favorites.includes(product.id);
  content.innerHTML = `
    ${product.image
      ? `<div class="h-64 bg-white flex items-center justify-center overflow-hidden"><img src="${SecurityValidator.escapeHtml(product.image)}" alt="" class="max-w-full max-h-full object-contain" loading="lazy" style="max-height:256px"></div>`
      : `<div class="bg-gradient-to-br from-brand-100 to-brand-50 h-64 flex items-center justify-center"><svg class="w-24 h-24 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M5 17a2 2 0 01-2-2V5"/></svg></div>`
    }
    <div class="p-2.5 product-card-body">
      <span class="inline-block bg-brand-50 text-brand-600 text-sm font-medium px-3 py-1 rounded-full mb-3">${safeCategory}</span>
      <h3 class="font-heading font-bold text-2xl text-brand-900 leading-snug mb-1">${safeName}</h3>
      ${safeNameEn && safeNameEn !== safeName ? `<p class="text-base text-brand-500 mb-3">${safeNameEn}</p>` : '<div class="mb-2"></div>'}
      ${safeDesc ? `<p class="text-sm text-brand-600 leading-relaxed mb-3">${safeDesc}</p>` : ''}
      ${safeOriginalPrice ? `<p class="text-base text-black line-through leading-none mb-1">${safeOriginalPrice}</p>` : ''}
      <p class="text-3xl font-bold text-red-600 mb-1">${safePrice}</p>
      ${product.qty2Price ? `<p class="text-base font-bold text-orange-600 mb-0.5">٢ قطعة: ${SecurityValidator.escapeHtml(formatPrice(product.qty2Price))}</p>` : ''}
      ${product.qty3Price ? `<p class="text-base font-bold text-orange-600 mb-2">٣ قطع: ${SecurityValidator.escapeHtml(formatPrice(product.qty3Price))}</p>` : ''}
      <p class="text-brand-600/80 mb-4">${SecurityValidator.escapeHtml(stockText)}</p>
      <div class="flex gap-3">
        ${product.inStock
          ? `<button onclick="addToCart('${safeId}')" class="flex-grow btn-primary bg-brand-700 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"><i data-lucide="shopping-cart" class="w-5 h-5"></i>أضف للسلة</button>`
          : `<button onclick="openNotifyModal('${safeId}','${safeName.replace(/'/g,"&#39;")}')" class="flex-grow btn-primary bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"><i data-lucide="bell" class="w-5 h-5"></i>أخبرني عند التوفر</button>`
        }
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

// ── Recent Searches (stored in localStorage) ──────────────
var _recentSearches = [];
function _loadRecentSearches() {
  try { _recentSearches = JSON.parse(localStorage.getItem('nbRecentSearches') || '[]').slice(0, 6); }
  catch(e) { _recentSearches = []; }
}
function _saveRecentSearch(q) {
  if (!q || q.length < 2) return;
  _loadRecentSearches();
  _recentSearches = _recentSearches.filter(function(s) { return s !== q; });
  _recentSearches.unshift(q);
  _recentSearches = _recentSearches.slice(0, 6);
  try { localStorage.setItem('nbRecentSearches', JSON.stringify(_recentSearches)); } catch(e) {}
}
function _showRecentSearches() {
  _loadRecentSearches();
  var el = document.getElementById('searchResults');
  if (!el || _recentSearches.length === 0) { if(el) el.innerHTML = ''; return; }
  var esc = function(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  el.innerHTML =
    '<div style="padding:12px 16px 4px;display:flex;align-items:center;justify-content:space-between;">' +
      '<span style="font-size:11px;font-weight:700;color:#AABF89;letter-spacing:0.05em;">&#128336; عمليات البحث الأخيرة</span>' +
      '<button onclick="_clearRecentSearches()" style="font-size:11px;color:#94a3b8;background:none;border:none;cursor:pointer;font-family:Cairo,sans-serif;" onmouseover="this.style.color=\'#ef4444\'" onmouseout="this.style.color=\'#94a3b8\'">مسح الكل</button>' +
    '</div>' +
    _recentSearches.map(function(s) {
      var safe = esc(s);
      var safeJs = s.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return '<div class="search-result-item recent-search-item" onclick="document.getElementById(\'searchInput\').value=\'' + safeJs + '\';performSearch();" style="gap:12px;padding:10px 16px;cursor:pointer;">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AABF89" stroke-width="2" style="flex-shrink:0"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
        '<span style="font-size:13px;color:#4a7c2d;flex-grow:1;">' + safe + '</span>' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2"><path d="M7 17L17 7M7 7h10v10"/></svg>' +
      '</div>';
    }).join('');
}
function _clearRecentSearches() {
  _recentSearches = [];
  try { localStorage.removeItem('nbRecentSearches'); } catch(e) {}
  document.getElementById('searchResults').innerHTML = '';
}

// Highlight matching text in search results
function _highlightMatch(text, query) {
  if (!text || !query || query.length < 2) return text;
  try {
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + escaped + ')', 'gi'),
      '<mark style="background:linear-gradient(90deg,#fef08a,#fde047);color:#1E350F;font-weight:800;border-radius:3px;padding:0 2px;">$1</mark>');
  } catch(e) { return text; }
}

function openSearch() {
  document.getElementById('searchModal').classList.add('active');
  var input = document.getElementById('searchInput');
  if (input) { input.focus(); if (!input.value.trim()) _showRecentSearches(); }
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
// 🤖 تخمين مطلب الزبون — AI Search Suggestion
// ===================================================
var _aiSearchTimer = null;

function _aiSearchSuggest(query) {
  var resultsEl = document.getElementById('searchResults');
  if (!resultsEl) return;

  resultsEl.innerHTML = '<div class="p-5 text-center text-brand-400 py-8">' +
    '<svg class="w-5 h-5 animate-spin mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>' +
    '<p class="text-xs text-purple-500 font-semibold">🤖 يحاول فهم طلبك...</p></div>';

  var productList = products.slice(0, 80).map(function(p, i) {
    return (i + 1) + '. ' + (p.nameAr || p.name || '');
  }).join('|');

  var prompt = 'انت مساعد بحث لصيدلية نيوروبين.' +
    ' قائمة المنتجات (مفصولة بـ|): ' + productList +
    ' الزبون يبحث عن: ' + query +
    ' اكتب فقط اسم المنتج الانسب من القائمة بالضبط كما هو.' +
    ' اذا لم يكن مناسب اكتب: لا يوجد';

  fetch('https://hczsskviliuqyayylutv.supabase.co/functions/v1/gemini-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 60, temperature: 0.1 }
    })
  }).then(function(r) { return r.json(); }).then(function(data) {
    var aiText = '';
    try { aiText = data.candidates[0].content.parts[0].text.trim(); } catch(e) {}

    if (!aiText || aiText.indexOf('لا يوجد') !== -1) {
      resultsEl.innerHTML = '<div class="p-6 text-center text-brand-400"><p>لم يتم العثور على نتائج</p></div>';
      return;
    }

    var matched = null;
    for (var i = 0; i < products.length; i++) {
      if ((products[i].nameAr || products[i].name || '').trim() === aiText.trim()) { matched = products[i]; break; }
    }
    if (!matched) {
      for (var i = 0; i < products.length; i++) {
        var pn = (products[i].nameAr || products[i].name || '').trim();
        if (pn && (aiText.indexOf(pn) !== -1 || pn.indexOf(aiText) !== -1)) { matched = products[i]; break; }
      }
    }

    if (matched) {
      var safeId    = typeof SecurityValidator !== 'undefined' ? SecurityValidator.escapeHtml(String(matched.id)) : String(matched.id);
      var safeName  = typeof SecurityValidator !== 'undefined' ? SecurityValidator.escapeHtml(matched.nameAr || matched.name || '') : (matched.nameAr || matched.name || '');
      var safePrice = typeof formatPrice === 'function' ? formatPrice(matched.price) : String(matched.price);
      var _sn = typeof matched.stock === 'number' ? matched.stock : null;
      var stockBadge = (!matched.inStock || _sn === 0)
        ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">نفذت الكمية</span>'
        : (_sn === 1 ? '<span class="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">آخر قطعة</span>'
        : (_sn === 2 ? '<span class="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">آخر قطعتين</span>'
        : '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">متوفر</span>'));
      var imgSrc = matched.image ? (typeof SecurityValidator !== 'undefined' ? SecurityValidator.escapeHtml(matched.image) : matched.image) : '';
      var imgHtml = imgSrc
        ? '<img src="' + imgSrc + '" alt="" class="w-full h-full object-contain" loading="lazy">'
        : '<svg class="w-7 h-7 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
      resultsEl.innerHTML =
        '<div class="px-4 pt-3 pb-1 flex items-center gap-2">🤖 ' +
        '<span class="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">ربما تقصد...</span></div>' +
        '<div class="search-result-item" onclick="openQuickView(' + JSON.stringify(safeId) + '); closeSearch();" style="gap:14px;padding:12px 16px;border-top:1px solid #f1f5f9;">' +
        '<div class="flex-shrink-0 w-16 h-16 bg-brand-50 rounded-xl overflow-hidden flex items-center justify-center border border-brand-100">' + imgHtml + '</div>' +
        '<div class="flex-grow min-w-0">' +
        '<h4 class="font-semibold text-brand-900 text-sm leading-snug mb-1">' + safeName + '</h4>' +
        '<p class="font-bold text-brand-700 text-sm mb-1">' + safePrice + '</p>' +
        stockBadge + '</div>' +
        '<svg class="flex-shrink-0 w-4 h-4 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></div>';
    } else {
      resultsEl.innerHTML = '<div class="p-5 text-center">🤖' +
        '<p class="text-xs font-bold text-purple-600 mt-2 mb-1">ربما تبحث عن</p>' +
        '<p class="text-sm font-semibold text-brand-800">' + aiText + '</p></div>';
    }
  }).catch(function() {
    resultsEl.innerHTML = '<div class="p-6 text-center text-brand-400"><p>لم يتم العثور على نتائج</p></div>';
  });
}
// ===================================================
// نظام البحث الذكي — Arabic Fuzzy Search
// ===================================================

// ── Arabic phonetic transliteration (e.g. 'سيمبل' → 'simple') ──────────
function arabicToPhonetic(str) {
  const m = {
    'ا':'a','أ':'a','إ':'a','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j',
    'ح':'h','خ':'kh','د':'d','ذ':'z','ر':'r','ز':'z','س':'s','ش':'sh',
    'ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'g','ف':'f','ق':'k',
    'ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'o','ي':'i','ى':'i',
    'ة':'h','ء':'','ئ':'a','ؤ':'o','ى':'i',' ':' '
  };
  let r = str.replace(/[ً-ٰٟ]/g,'');
  let out = '';
  for (const c of r) out += (m[c] !== undefined ? m[c] : c);
  return out.toLowerCase().trim();
}

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

// Optimized levenshtein: 1D rolling array + early exit — O(m*n) but no 2D allocation
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  if (Math.abs(m - n) > 4) return 99; // fast early-exit: strings too different
  let prev = Array.from({length: n + 1}, function(_, i) { return i; });
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i-1] === b[j-1] ? prev[j-1] : 1 + Math.min(prev[j], curr[j-1], prev[j-1]);
    }
    prev = curr;
  }
  return prev[n];
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

// ── Product search cache: normalize names ONCE when products load ──
var _productSearchCache = null;
function _invalidateProductCache() { _productSearchCache = null; }
function _getProductCache() {
  if (_productSearchCache && _productSearchCache.length) return _productSearchCache;
  if (typeof products === 'undefined' || !products.length) return [];
  _productSearchCache = products.map(function(p) {
    return {
      p: p,
      nl:  (p.name     || '').toLowerCase(),
      nn:  normalizeArabic(p.nameAr || ''),
      cl:  (p.category || '').toLowerCase(),
      eng: (p.name     || '').toLowerCase().replace(/s+/g, '')
    };
  });
  return _productSearchCache;
}

// ── Cached DOM refs — avoids getElementById on every keystroke ──
var _srInputRef = null, _srResultsRef = null;
function _srInput()   { return _srInputRef   || (_srInputRef   = document.getElementById('searchInput')); }
function _srResults() { return _srResultsRef || (_srResultsRef = document.getElementById('searchResults')); }

// ── Pending rAF handle to avoid mid-frame DOM writes ──
var _srRafHandle = 0;

function performSearch() {
  const inp = _srInput(), results = _srResults();
  if (!inp || !results) return;
  const rawQuery = inp.value;
  const query = rawQuery.toLowerCase().slice(0, 100);
  if (query.length < 2) { results.innerHTML = ''; return; }

  var cache = _getProductCache();
  if (!cache.length) { results.innerHTML = ''; return; }

  const qNorm = normalizeArabic(rawQuery);

  // Step 1: Exact/partial match using pre-normalised cache
  let matches = [];
  for (var i = 0; i < cache.length; i++) {
    var c = cache[i];
    if (c.nl.includes(query) || c.nn.includes(qNorm) || c.cl.includes(query) || (c.nn && c.nn.includes(normalizeArabic(rawQuery)))) {
      matches.push(c.p);
    }
  }
  // Step 2: Fuzzy match if no results (handles typos like عسول → غسول)
  let isFuzzy = false;
  if (matches.length === 0 && rawQuery.length >= 2) {
    matches = products.filter(p => fuzzyMatchArabic(rawQuery, p.nameAr) || fuzzyMatchArabic(rawQuery, p.name));
    isFuzzy = matches.length > 0;
  }
  // Step 3: Phonetic transliteration (Arabic → English, e.g. سيمبل → simple)
  if (matches.length === 0 && rawQuery.length >= 3) {
    const phonetic = arabicToPhonetic(rawQuery).replace(/s+/g,'');
    if (phonetic.length >= 3) {
      matches = cache.filter(function(c) {
        const eng = c.eng;
        if (!eng) return false;
        if (eng.includes(phonetic) || phonetic.includes(eng.substring(0, phonetic.length))) return true;
        const maxD = phonetic.length <= 4 ? 1 : phonetic.length <= 6 ? 2 : 3;
        return levenshtein(phonetic, eng.substring(0, phonetic.length + 2)) <= maxD;
      }).map(function(c) { return c.p; });
      if (matches.length > 0) isFuzzy = true;
    }
  }
  if (matches.length === 0) {
    results.innerHTML = '<div class="p-6 text-center text-brand-400"><p>لم يتم العثور على نتائج</p></div>';
    if (_aiSearchTimer) clearTimeout(_aiSearchTimer);
    if (rawQuery.length >= 4) { _aiSearchTimer = setTimeout(function() { _aiSearchSuggest(rawQuery); }, 700); }
  } else {
    _saveRecentSearch(rawQuery.trim());
    const fuzzyNotice = isFuzzy ? `<div class="px-4 pt-3 pb-1" style="font-size:11px;color:#AABF89;font-weight:700;">🔍 نتائج مقاربة لـ &quot;${SecurityValidator.escapeHtml(rawQuery)}&quot;</div>` : '';
    // Defer DOM write to next frame — prevents jank during keystroke handling
    cancelAnimationFrame(_srRafHandle);
    _srRafHandle = requestAnimationFrame(function() {
    results.innerHTML = fuzzyNotice + matches.slice(0, 12).map(p => {
      const safeId   = SecurityValidator.escapeHtml(p.id);
      const safeName = SecurityValidator.escapeHtml(p.nameAr);
      const highlightedName = _highlightMatch(safeName, rawQuery);
      const safePrice = SecurityValidator.escapeHtml(formatPrice(p.price));
      const safeImg  = p.image ? SecurityValidator.escapeHtml(p.image) : '';
      var _sn2 = (typeof p.stock === 'number') ? p.stock : null;
      var stockBadge = (!p.inStock || _sn2 === 0)
        ? '<span style="font-size:10px;background:#fee2e2;color:#dc2626;padding:2px 7px;border-radius:999px;font-weight:700;">نفذت الكمية</span>'
        : (_sn2 === 1
          ? '<span style="font-size:10px;background:#fff7ed;color:#ea580c;padding:2px 7px;border-radius:999px;font-weight:700;">آخر قطعة</span>'
          : (_sn2 === 2
            ? '<span style="font-size:10px;background:#fff7ed;color:#ea580c;padding:2px 7px;border-radius:999px;font-weight:700;">آخر قطعتين</span>'
            : '<span style="font-size:10px;background:#dcfce7;color:#16a34a;padding:2px 7px;border-radius:999px;font-weight:700;">✓ متوفر</span>'));
      const discPct = (p.originalPrice && p.originalPrice > p.price)
        ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
      const discBadge = discPct >= 5
        ? `<span style="font-size:10px;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;padding:2px 6px;border-radius:999px;font-weight:800;margin-right:4px;">-${discPct}%</span>` : '';
      const imgHtml = safeImg
        ? `<img src="${safeImg}" alt="" class="w-full h-full object-contain" loading="lazy" decoding="async">`
        : `<svg class="w-7 h-7 text-brand-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1M5 17a2 2 0 01-2-2V5"/></svg>`;
      return `<div class="search-result-item" onclick="openQuickView('${safeId}'); closeSearch();" style="gap:12px;padding:10px 16px;border-top:1px solid #f6f7f4;">
        <div style="flex-shrink:0;width:56px;height:56px;background:#f6f7f4;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid #E8EAD8;">
          ${imgHtml}
        </div>
        <div style="flex-grow:1;min-width:0;">
          <h4 style="font-weight:600;color:#1E350F;font-size:13px;line-height:1.4;margin:0 0 3px;">${highlightedName}</h4>
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
            ${discBadge}
            <span style="font-weight:800;color:#2D5016;font-size:13px;">${safePrice}</span>
            ${p.originalPrice && p.originalPrice > p.price ? `<span style="font-size:11px;color:#94a3b8;text-decoration:line-through;">${SecurityValidator.escapeHtml(formatPrice(p.originalPrice))}</span>` : ''}
          </div>
          <div style="margin-top:3px;">${stockBadge}</div>
        </div>
        <svg style="flex-shrink:0;width:14px;height:14px;color:#AABF89;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      </div>`;
    }).join('');
    }); // end requestAnimationFrame
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

/* backToTop scroll: skip if perf.js is active (it handles this too) */
if (!window.__perfScrollActive) {
  window.addEventListener('scroll', () => {
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
      backToTop.classList.toggle('visible', window.scrollY > 500);
    }
  }, { passive: true });
}

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
