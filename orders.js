// orders.js — Migrated to Supabase
// طلبات العملاء تظهر في لوحة التحكم مبا[...]

var currentOrderFilter = 'all';
var currentCommentFilter = 'all';
var selectedCommentId = null;

async function loadOrders() {
  var container = document.getElementById('ordersList');
  var noOrders  = document.getElementById('noOrders');
  try {
    var allOrders = currentOrderFilter === 'deleted'
      ? await SupaDB.Orders.listDeleted()
      : await SupaDB.Orders.list();
    var orders = allOrders;
    var q = document.getElementById('orderSearch') ? document.getElementById('orderSearch').value.toLowerCase() : '';
    if (currentOrderFilter !== 'all' && currentOrderFilter !== 'deleted') orders = orders.filter(function(o){ return o.status === currentOrderFilter; });
    // #30: Advanced date filter
    var _df = (typeof window._orderDateFrom !== 'undefined') ? window._orderDateFrom : '';
    var _dt = (typeof window._orderDateTo !== 'undefined') ? window._orderDateTo : '';
    var _rg = (typeof window._orderRegion !== 'undefined') ? window._orderRegion : '';
    if (_df) { var _dfd=new Date(_df); orders=orders.filter(function(o){ return new Date(o.created_at||0)>=_dfd; }); }
    if (_dt) { var _dtd=new Date(_dt); _dtd.setHours(23,59,59,999); orders=orders.filter(function(o){ return new Date(o.created_at||0)<=_dtd; }); }
    if (_rg) orders=orders.filter(function(o){ return ((o.customer_address||o.address||'').toLowerCase()).includes(_rg.toLowerCase()); });
    if (q) orders = orders.filter(function(o){ var itemsStr=(Array.isArray(o.items)?o.items:Array.isArray(o.order_items)?o.order_items:[]).map(function(it){return (it.name||it.product_name||'').toLowerCase();}).join(' '); return (o.name||o.customer_name||'').toLowerCase().includes(q)||(o.phone||o.customer_phone||'').includes(q)||(o.customer_address||o.address||'').toLowerCase().includes(q)||itemsStr.includes(q); });
    if (!orders.length) { container.classList.add('hidden'); noOrders.classList.remove('hidden'); return; }
    container.classList.remove('hidden'); noOrders.classList.add('hidden');
    var statusLabels={new:'✅ تم التثبيت',pending:'✅ تم التثبيت',preparing:'📦 جاري التجهيز',shipped:'🚐 مع المندوب',progress:'🚚 في الطريق',on_the_way:'🚚 في الطريق',delivered:'✅ تم التسليم',cancelled:'❌ ملغى'};
    var statusClasses={new:'order-new',pending:'order-new',preparing:'order-progress',shipped:'order-progress',progress:'order-progress',on_the_way:'order-progress',delivered:'order-delivered',cancelled:'order-cancelled'};
    var html = '';
    // ── VIP: count orders per phone (excluding cancelled) ──────────────────
    var _phoneCount = {};
    (allOrders||[]).filter(function(o){ return o.status!=='cancelled'&&o.status!=='deleted'; }).forEach(function(o){
      var ph = (o.customer_phone||o.phone||'').trim();
      if (ph) _phoneCount[ph] = (_phoneCount[ph]||0)+1;
    });
    // Sequential numbering
    var _numberedOrders = (allOrders||[]).filter(function(o){ return o.status!=='cancelled' && !o.deleted_at; }).slice().sort(function(a,b){ return new Date(a.created_at)-new Date(b.created_at); });
    var _numMap = {};
    _numberedOrders.forEach(function(o,i){ _numMap[String(o.id)] = i+1; });
    orders.forEach(function(order) {
      var oid = escapeHTML(String(order.id));
      var status = order.status || 'new';
      var items = (Array.isArray(order.order_items) && order.order_items.length > 0) ? order.order_items : (Array.isArray(order.items) ? order.items : []);

      // ─── بناء أزرار الإجراءات حسب الحالة ───
      var actionBtns = '';
      var isDeleted = !!order.deleted_at;
      if (isDeleted) {
        actionBtns = '<button data-action="restore-order" data-order-id="' + oid + '" class="flex-1 min-w-[90px] bg-amber-100 text-amber-700 py-2 rounded-lg text-sm font-semibold hover:bg-amber-200 transition-colors">↩ استعادة</button>' +
          '<button data-action="hard-delete-order" data-order-id="' + oid + '" class="flex-1 min-w-[90px] bg-red-100 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors">🗑️ حذف نهائي</button>';
      } else if (status === 'delivered') {
        actionBtns = '<p class="text-center text-sm text-green-700 font-bold py-2 bg-green-50 rounded-lg">✅ تم تسليم الطلب</p>';
        actionBtns += '<button data-action="delete-order" data-order-id="' + oid + '" class="w-full mt-2 bg-red-50 text-red-400 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors">🗑️ حذف</button>';
      } else if (status === 'cancelled') {
        actionBtns = '<p class="text-center text-sm text-red-500 font-bold py-2 bg-red-50 rounded-lg">❌ تم إلغاء الطلب</p>';
        actionBtns += '<button data-action="delete-order" data-order-id="' + oid + '" class="w-full mt-2 bg-red-50 text-red-400 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors">🗑️ حذف</button>';
      } else {
        // #15: if order < 30 minutes old and status is new, show cancel hint
        var _orderAge = Date.now() - new Date(order.created_at||0).getTime();
        var _canCancelAge = _orderAge < 30*60*1000;
        var _statusFlow = {new:'preparing',preparing:'shipped',shipped:'on_the_way',on_the_way:'delivered'};
        var _statusBtnLabels = {new:'📦 تجهيز الطلب',preparing:'🚐 تسليم للمندوب',shipped:'🚚 المندوب في الطريق',on_the_way:'✅ تم التوصيل'};
        var _nextStatus = _statusFlow[status];
        if (_nextStatus) {
          actionBtns += '<button data-action="status-next" data-order-id="' + oid + '" data-next-status="' + _nextStatus + '" class="flex-1 min-w-[90px] bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors">' + (_statusBtnLabels[status]||'التالي') + '</button>';
        }
        actionBtns += '<button data-action="status-delivered" data-order-id="' + oid + '" class="flex-1 min-w-[90px] bg-green-100 text-green-700 py-2 rounded-lg text-sm font-semibold hover:bg-green-200 transition-colors">✅ تم التسليم</button>' +
          '<button data-action="status-cancelled" data-order-id="' + oid + '" class="flex-1 min-w-[90px] bg-red-100 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors">✕ إلغاء</button>';
      }

      // ─── بناء HTML الكارد بشكل صحيح ───
      var cardHtml = '<div class="bg-white rounded-xl p-4 sm:p-5 border border-brand-100 animate-fade-in">';

      // رأس الكارد: الاسم + الحالة
      cardHtml += '<div class="flex items-start justify-between mb-3">';
      cardHtml += '<div>';
      var _orderNum = _numMap[String(order.id)]; var _numBadge = _orderNum ? '<span style="display:inline-block;background:#1a5c0f;color:#ffffff;font-size:11px;font-family:monospace;font-weight:700;padding:2px 8px;border-radius:6px;margin-left:5px;letter-spacing:0.5px">#NB-' + String(_orderNum).padStart(3,'0') + '</span>' : '';
      var _custPhone = (order.customer_phone||order.phone||'').trim();
      var _isVip = _custPhone && (_phoneCount[_custPhone]||0) >= 3;
      var _vipBadge = _isVip ? '<span style="display:inline-flex;align-items:center;gap:3px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:12px;margin-right:4px;">👑 VIP</span>' : '';
      cardHtml += '<h3 class="font-bold text-brand-900" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">' + _numBadge + ' ' + escapeHTML(order.customer_name||order.name||'—') + _vipBadge + '</h3>';
      cardHtml += '<p style="color:#4a7c2d;font-size:13px;margin-top:2px;direction:ltr;text-align:right;">' + escapeHTML(order.customer_phone||order.phone||'') + '</p>';
      if (order.tracking_code) {
        cardHtml += '<p style="font-size:11px;font-weight:700;color:#92400e;margin-top:2px;">📱 ' + escapeHTML(order.tracking_code) + '</p>';
      }
      cardHtml += '</div>';
      cardHtml += '<div class="text-left">';
      cardHtml += '<span class="order-status ' + (statusClasses[status]||'order-new') + '">' + (statusLabels[status]||'جديد') + '</span>';
      cardHtml += '<p class="text-brand-400 text-xs mt-1">' + new Date(order.created_at||order.date||Date.now()).toLocaleDateString('ar-EG') + '</p>';
      cardHtml += '</div>';
      cardHtml += '</div>'; // end header

      // العنوان
      if (order.customer_address||order.address) {
        cardHtml += '<p class="text-brand-500 text-sm mb-2"><i data-lucide="map-pin" class="w-4 h-4 inline-block ml-1"></i>' + escapeHTML(order.customer_address||order.address||'') + '</p>';
      }

      // كود الخصم
      if (order.discount_code) {
        cardHtml += '<p class="text-amber-600 text-sm mb-2"><i data-lucide="tag" class="w-4 h-4 inline-block ml-1"></i>كود خصم: <strong>' + escapeHTML(order.discount_code) + '</strong></p>';
      }

      // المنتجات
      if (items.length > 0) {
        cardHtml += '<div class="text-sm text-brand-600 mb-3 flex flex-wrap gap-1">';
        items.forEach(function(item) {
          cardHtml += '<span class="inline-block bg-brand-50 px-2 py-1 rounded">' + escapeHTML(item.product_name||item.name||'') + ' × ' + (item.quantity||1) + '</span>';
        });
        cardHtml += '</div>';
      }

      // السعر الإجمالي
      cardHtml += '<div class="flex items-center justify-between mb-3">';
      cardHtml += '<span class="font-bold text-brand-900">' + ((order.total_amount||order.total||0)).toLocaleString() + ' د.ع</span>';
      cardHtml += '</div>';

      // أزرار الإجراءات
      cardHtml += '<div class="flex gap-2 flex-wrap">' + actionBtns + '</div>';

      cardHtml += '</div>'; // end card

      html += cardHtml;
    });
    container.innerHTML = html;
    lucide.createIcons();
  } catch(e) {
    if(container) container.innerHTML = '<div class="text-center py-8 text-red-500">خطأ في تحميل الطلبات: ' + escapeHTML(e.message) + '</div>';
  }
}

function filterOrders(filter) {
  currentOrderFilter = filter;
  document.querySelectorAll('#section-orders .tab-btn').forEach(function(b){ b.classList.remove('active','bg-brand-700','text-white'); b.classList.add('bg-brand-100','text-brand-700'); });
  var ab = document.querySelector('#section-orders [data-filter="' + filter + '"]');
  if (ab) { ab.classList.add('active','bg-brand-700','text-white'); ab.classList.remove('bg-brand-100','text-brand-700'); }
  loadOrders();
}
function searchOrders() { loadOrders(); }

async function updateOrderStatus(orderId, status) {
  // Validate inputs directly (no sessionStorage dependency)
  if (!orderId || String(orderId) === 'undefined') { showToast('معرف الطلب غير صالح','error'); return; }
  var validStatuses = ['new','pending','preparing','shipped','progress','on_the_way','delivered','cancelled'];
  if (!validStatuses.includes(status)) { showToast('حالة غير صالحة: ' + status,'error'); return; }
  try {
    await SupaDB.Orders.updateStatus(String(orderId), status);
    await loadOrders();
    if (typeof updateOrdersBadge === 'function') updateOrdersBadge();
    showToast('تم تحديث حالة الطلب ✅','success');
  } catch(e) {
    console.error('updateOrderStatus error:', e);
    showToast('خطأ في تحديث الطلب: ' + (e.message||'غير معروف'),'error');
  }
}

async function loadComments() {
  var container = document.getElementById('commentsList');
  var noComments = document.getElementById('noComments');
  try {
    var allComments = await SupaDB.Comments.list();
    var comments = allComments;
    if (currentCommentFilter !== 'all') comments = comments.filter(function(c){ return currentCommentFilter==='new' ? !c.is_read : c.is_read; });
    if (!comments.length) { container.classList.add('hidden'); noComments.classList.remove('hidden'); return; }
    container.classList.remove('hidden'); noComments.classList.add('hidden');
    var html = '';
    comments.forEach(function(c, i) {
      var cid = escapeHTML(String(c.id));
      var badge = c.is_read ? '<span class="badge badge-read px-2 py-1 rounded text-xs">تم القراءة</span>' : '<span class="badge badge-new px-2 py-1 rounded text-xs">جديد</span>';
      html += '<div class="comment-card bg-white rounded-xl p-4 sm:p-6 border border-brand-100 animate-fade-in" style="animation-delay:' + (i*0.05) + 's">' +
        '<div class="flex items-start justify-between mb-3"><div>' +
        '<h3 class="font-bold text-brand-900">' + escapeHTML(c.name||'') + '</h3>' +
        '<p class="text-brand-500 text-sm">' + escapeHTML(c.contact_info||c.phone||'بدون هاتف') + '</p></div>' + badge + '</div>' +
        '<p class="text-brand-700 mb-4 leading-relaxed">' + escapeHTML(c.message||'') + '</p>' +
        '<div class="flex items-center justify-between">' +
        '<span class="text-brand-400 text-xs">' + new Date(c.created_at||c.date||Date.now()).toLocaleDateString('ar-EG') + '</span>' +
        '<button data-action="view-comment" data-id="' + cid + '" class="bg-brand-100 text-brand-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-200 transition-colors">عرض</button>' +
        '</div></div>';
    });
    container.innerHTML = html;
    lucide.createIcons();
  } catch(e) {
    if(container) container.innerHTML = '<div class="text-center py-8 text-red-500">خطأ: ' + escapeHTML(e.message) + '</div>';
  }
}

function filterComments(filter) {
  currentCommentFilter = filter;
  document.querySelectorAll('#section-comments .tab-btn').forEach(function(b){ b.classList.remove('active','bg-brand-700','text-white'); b.classList.add('bg-brand-100','text-brand-700'); });
  var ab = document.querySelector('#section-comments [data-filter="' + filter + '"]');
  if (ab) { ab.classList.add('active','bg-brand-700','text-white'); ab.classList.remove('bg-brand-100','text-brand-700'); }
  loadComments();
}

function openViewComment(id) {
  SupaDB.Comments.list().then(function(list) {
    var c = list.find(function(x){ return String(x.id)===String(id); });
    if (!c) return;
    selectedCommentId = id;
    var details = document.getElementById('commentDetails');
    details.innerHTML = '<div class="bg-brand-50 rounded-lg p-4 space-y-2">' +
      '<p class="text-sm text-brand-600">الاسم: <span class="font-semibold text-brand-900">' + escapeHTML(c.name||'') + '</span></p>' +
      '<p class="text-sm text-brand-600">التواصل: <span class="font-semibold text-brand-900">' + escapeHTML(c.contact_info||c.phone||'غير محدد') + '</span></p>' +
      '<p class="text-sm text-brand-600">التاريخ: <span class="font-semibold text-brand-900">' + new Date(c.created_at||c.date||Date.now()).toLocaleDateString('ar-EG') + '</span></p>' +
      '<div class="mt-4"><p class="font-semibold text-brand-700 mb-2">الرسالة:</p><p class="text-brand-600 leading-relaxed">' + escapeHTML(c.message||'') + '</p></div>' +
      '</div>';
    document.getElementById('replyMessage').value = '';
    document.getElementById('viewCommentModal').classList.add('active');
  });
}
function closeViewCommentModal() { document.getElementById('viewCommentModal').classList.remove('active'); }
async function markAsRead() {
  try { await SupaDB.Comments.updateStatus(selectedCommentId,'read'); closeViewCommentModal(); loadComments(); updateCommentsBadge(); showToast('تم تحديث حالة الرسالة','success'); }
  catch(e) { showToast('خطأ: '+e.message,'error'); }
}
async function markAsReplied() {
  try { await SupaDB.Comments.updateStatus(selectedCommentId,'replied'); closeViewCommentModal(); loadComments(); updateCommentsBadge(); showToast('تم تسجيل الرد','success'); }
  catch(e) { showToast('خطأ: '+e.message,'error'); }
}
async function deleteComment() {
  if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
  try { await SupaDB.Comments.delete(selectedCommentId); closeViewCommentModal(); loadComments(); updateCommentsBadge(); showToast('تم حذف الرسالة','success'); }
  catch(e) { showToast('خطأ: '+e.message,'error'); }
}

// Event delegation for orders + comments
document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action]');
  if (!btn) return;
  var action = btn.dataset.action;
  switch(action) {
    case 'status-progress':  updateOrderStatus(btn.dataset.orderId,'progress');  break;
      case 'status-next':      updateOrderStatus(btn.dataset.orderId, btn.dataset.nextStatus||'preparing'); break;
    case 'status-delivered': updateOrderStatus(btn.dataset.orderId,'delivered'); break;
    case 'status-cancelled': updateOrderStatus(btn.dataset.orderId,'cancelled'); break;
    case 'delete-order':      deleteOrder(btn.dataset.orderId);     break;
    case 'restore-order':     restoreOrder(btn.dataset.orderId);    break;
    case 'hard-delete-order': hardDeleteOrder(btn.dataset.orderId); break;
    case 'view-comment': { var id = btn.dataset.id; if (id) openViewComment(id); break; }
  }
});

async function deleteOrder(orderId) {
  if (!orderId || String(orderId) === 'undefined') { showToast('معرف الطلب غير صالح','error'); return; }
  if (!confirm('هل تريدين حذف هذا الطلب؟ يمكنك استعادته لاحقاً من قائمة المحذوفات.')) return;
  try {
    await SupaDB.Orders.softDelete(String(orderId));
    await loadOrders();
    if (typeof updateOrdersBadge === 'function') updateOrdersBadge();
    showToast('تم حذف الطلب ✅ يمكنك استعادته من المحذوفات','success');
  } catch(e) { showToast('خطأ في حذف الطلب: ' + (e.message||'غير معروف'),'error'); }
}

async function restoreOrder(orderId) {
  if (!orderId || String(orderId) === 'undefined') { showToast('معرف الطلب غير صالح','error'); return; }
  try {
    await SupaDB.Orders.restore(String(orderId));
    await loadOrders();
    if (typeof updateOrdersBadge === 'function') updateOrdersBadge();
    showToast('تم استعادة الطلب ✅','success');
  } catch(e) { showToast('خطأ في استعادة الطلب: ' + (e.message||'غير معروف'),'error'); }
}

async function hardDeleteOrder(orderId) {
  if (!orderId || String(orderId) === 'undefined') { showToast('معرف الطلب غير صالح','error'); return; }
  if (!confirm('⚠️ هل أنتِ متأكدة؟ سيتم حذف الطلب نهائياً ولا يمكن استعادته.')) return;
  try {
    await SupaDB.Orders.hardDelete(String(orderId));
    await loadOrders();
    showToast('تم الحذف النهائي 🗑️','success');
  } catch(e) { showToast('خطأ في الحذف: ' + (e.message||'غير معروف'),'error'); }
}

// ══════════════════════════════════════════════════════════════
// 📦 MANUAL ORDER MODAL
// ══════════════════════════════════════════════════════════════

var _moItems = [];        // { id, name, price, qty }
var _moAllProducts = [];  // cached product list

function openManualOrderModal() {
  if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error'); return;
  }

  _moItems = [];

  ['moName','moPhone','moAddress','moNotes'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var moDelivery = document.getElementById('moDelivery');
  if (moDelivery) moDelivery.value = '4000';
  var moStatus = document.getElementById('moStatus');
  if (moStatus) moStatus.value = 'new';
  var moPickerSearch = document.getElementById('moPickerSearch');
  if (moPickerSearch) moPickerSearch.value = '';

  var picker = document.getElementById('moProductPicker');
  if (picker) picker.classList.add('hidden');

  _renderMoSelectedProducts();
  updateManualTotal();

  var modal = document.getElementById('manualOrderModal');
  if (modal) modal.style.display = 'flex';

  SupaDB.Products.list().then(function(products) {
    _moAllProducts = products;
    _renderMoProductGrid(products);
  }).catch(function(e) {
    console.warn('[ManualOrder] load products:', e);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeManualOrderModal() {
  var modal = document.getElementById('manualOrderModal');
  if (modal) modal.style.display = 'none';
  _moItems = [];
  _moAllProducts = [];
}

function toggleMoProductPicker() {
  var picker = document.getElementById('moProductPicker');
  if (!picker) return;
  picker.classList.toggle('hidden');
  if (!picker.classList.contains('hidden')) {
    _renderMoProductGrid(_moAllProducts);
    var search = document.getElementById('moPickerSearch');
    if (search) search.focus();
  }
}

function filterMoProducts() {
  var search = document.getElementById('moPickerSearch');
  var q = search ? search.value.toLowerCase() : '';
  var filtered = _moAllProducts.filter(function(p) {
    return (p.name || '').toLowerCase().includes(q);
  });
  _renderMoProductGrid(filtered);
}

function _renderMoProductGrid(products) {
  var grid = document.getElementById('moProductGrid');
  if (!grid) return;
  if (!products || !products.length) {
    grid.innerHTML = '<p class="col-span-5 text-center text-brand-400 text-sm py-4">لا توجد منتجات</p>';
    return;
  }
  grid.innerHTML = products.map(function(p) {
    var name = escapeHTML(p.name || '');
    var price = (p.price || 0).toLocaleString();
    var imgHtml = p.image_url
      ? '<img src="' + escapeHTML(p.image_url) + '" class="w-full h-14 object-cover rounded-lg mb-1" onerror="this.style.display=\'none\'">'
      : '<div class="w-full h-14 bg-brand-100 rounded-lg mb-1 flex items-center justify-center"><i data-lucide="image" class="w-5 h-5 text-brand-300"></i></div>';
    return '<button onclick="addMoProduct(\'' + escapeHTML(String(p.id)) + '\')" ' +
      'class="flex flex-col items-center text-center p-1.5 bg-white rounded-xl border border-brand-100 hover:border-brand-500 hover:shadow transition-all">' +
      imgHtml +
      '<span class="text-xs text-brand-800 font-semibold leading-tight line-clamp-2 w-full">' + name + '</span>' +
      '<span class="text-xs text-brand-500 mt-0.5">' + price + ' د.ع</span>' +
      '</button>';
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addMoProduct(productId) {
  var p = _moAllProducts.find(function(x) { return String(x.id) === String(productId); });
  if (!p) return;
  var existing = _moItems.find(function(x) { return String(x.id) === String(productId); });
  if (existing) {
    existing.qty++;
  } else {
    _moItems.push({ id: p.id, name: p.name || '', price: p.price || 0, qty: 1 });
  }
  _renderMoSelectedProducts();
  updateManualTotal();
}

function _changeMoQty(productId, delta) {
  var item = _moItems.find(function(x) { return String(x.id) === String(productId); });
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    _moItems = _moItems.filter(function(x) { return String(x.id) !== String(productId); });
  }
  _renderMoSelectedProducts();
  updateManualTotal();
}

function _renderMoSelectedProducts() {
  var container = document.getElementById('moSelectedProducts');
  if (!container) return;
  if (!_moItems.length) {
    container.innerHTML = '<p class="text-xs text-brand-400 text-center py-3">لم يتم اختيار منتجات بعد</p>';
    return;
  }
  container.innerHTML = _moItems.map(function(item) {
    var subtotal = ((item.price || 0) * item.qty).toLocaleString();
    var pid = escapeHTML(String(item.id));
    return '<div class="flex items-center gap-2 bg-white rounded-lg p-2 border border-brand-100">' +
      '<div class="flex-1 min-w-0">' +
      '<p class="text-sm font-semibold text-brand-800 truncate">' + escapeHTML(item.name) + '</p>' +
      '<p class="text-xs text-brand-500">' + (item.price || 0).toLocaleString() + ' × ' + item.qty + ' = ' + subtotal + ' د.ع</p>' +
      '</div>' +
      '<div class="flex items-center gap-1 flex-shrink-0">' +
      '<button onclick="_changeMoQty(\'' + pid + '\',-1)" class="w-7 h-7 rounded-full bg-brand-100 hover:bg-red-100 text-brand-700 font-bold text-lg leading-none flex items-center justify-center transition-colors">−</button>' +
      '<span class="w-6 text-center text-sm font-bold text-brand-900">' + item.qty + '</span>' +
      '<button onclick="_changeMoQty(\'' + pid + '\',1)" class="w-7 h-7 rounded-full bg-brand-100 hover:bg-brand-200 text-brand-700 font-bold text-lg leading-none flex items-center justify-center transition-colors">+</button>' +
      '</div></div>';
  }).join('');
}

function updateManualTotal() {
  var delivery = parseInt((document.getElementById('moDelivery') || {}).value || '4000') || 0;
  var itemsTotal = _moItems.reduce(function(sum, item) { return sum + (item.price || 0) * item.qty; }, 0);
  var el = document.getElementById('moTotal');
  if (el) el.textContent = (itemsTotal + delivery).toLocaleString() + ' د.ع';
}

async function saveManualOrder() {
  if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
    showToast('يرجى تسجيل الدخول أولاً', 'error'); return;
  }

  var name     = ((document.getElementById('moName')    || {}).value || '').trim();
  var phone    = ((document.getElementById('moPhone')   || {}).value || '').trim();
  var address  = ((document.getElementById('moAddress') || {}).value || '').trim();
  var notes    = ((document.getElementById('moNotes')   || {}).value || '').trim();
  var delivery = parseInt((document.getElementById('moDelivery') || {}).value || '4000') || 0;
  var status   = (document.getElementById('moStatus') || {}).value || 'new';

  if (!name)  { showToast('يرجى إدخال اسم العميل', 'error');  return; }
  if (!phone) { showToast('يرجى إدخال رقم الهاتف', 'error'); return; }

  var itemsTotal  = _moItems.reduce(function(sum, i) { return sum + (i.price || 0) * i.qty; }, 0);
  var totalAmount = itemsTotal + delivery;

  var orderItems = _moItems.map(function(i) {
    return { product_name: i.name, name: i.name, quantity: i.qty, price: i.price, subtotal: i.price * i.qty };
  });

  var btn = document.getElementById('moSaveBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin inline-block ml-1"></i> جاري الحفظ...'; if (typeof lucide !== 'undefined') lucide.createIcons(); }

  try {
    if (!_moItems.length) { showToast('يرجى إضافة منتج واحد على الأقل', 'error'); if(btn){btn.disabled=false;btn.innerHTML='<i data-lucide="save" class="w-5 h-5 inline-block ml-1"></i> حفظ الطلب';if(typeof lucide!=='undefined')lucide.createIcons();} return; }
    var result = await SupaDB._db.from('orders').insert({
      customer_name:    name,
      customer_phone:   phone,
      customer_address: address  || null,
      notes:            notes    || null,
      status:           status,
      total_amount:     totalAmount,
      delivery_fee:     delivery,
      items:            orderItems,
      order_items:      orderItems,
      created_at:       new Date().toISOString()
    }).select().single();

    if (result.error) throw result.error;

    closeManualOrderModal();
    await loadOrders();
    if (typeof updateOrdersBadge === 'function') updateOrdersBadge();
    showToast('تم إضافة الطلب بنجاح ✅', 'success');
  } catch(e) {
    console.error('[ManualOrder] save error:', e);
    var _errDetail = (e.message||'') + (e.details?' — '+e.details:'') + (e.hint?' — '+e.hint:'') || JSON.stringify(e)||'غير معروف';
    console.error('[ManualOrder full error]', JSON.stringify(e));
    showToast('❌ خطأ في الحفظ: ' + _errDetail.substring(0,120), 'error');
    alert('تفاصيل الخطأ:\n' + JSON.stringify(e, null, 2));
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save" class="w-5 h-5 inline-block ml-1"></i> حفظ الطلب'; }
  }
}

// ── #11: Save & restore customer address in localStorage ──────────────────
window._saveOrderAddress = function(addr) {
  if (addr && addr.length > 3) {
    try { localStorage.setItem('nb_last_addr', addr); } catch(e) {}
  }
};
window._getLastAddress = function() {
  try { return localStorage.getItem('nb_last_addr') || ''; } catch(e) { return ''; }
};
// Auto-fill address fields when visible
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    var addrInput = document.getElementById('address') || document.getElementById('customerAddress');
    if (addrInput && !addrInput.value) {
      var saved = window._getLastAddress();
      if (saved) addrInput.placeholder = 'آخر عنوان: ' + saved;
    }
  }, 800);
});
