// orders.js — Migrated to Supabase
// طلبات العملاء تظهر في لوحة التحكم مبا[...]

var currentOrderFilter = 'all';
var currentCommentFilter = 'all';
var selectedCommentId = null;

async function loadOrders() {
  var container = document.getElementById('ordersList');
  var noOrders  = document.getElementById('noOrders');
  try {
    var allOrders = await SupaDB.Orders.list();
    var orders = allOrders;
    var q = document.getElementById('orderSearch') ? document.getElementById('orderSearch').value.toLowerCase() : '';
    if (currentOrderFilter !== 'all') orders = orders.filter(function(o){ return o.status === currentOrderFilter; });
    if (q) orders = orders.filter(function(o){ return (o.name||o.customer_name||'').toLowerCase().includes(q) || (o.phone||o.customer_phone||'').includes(q); });
    if (!orders.length) { container.classList.add('hidden'); noOrders.classList.remove('hidden'); return; }
    container.classList.remove('hidden'); noOrders.classList.add('hidden');
    var statusLabels={new:'قيد المراجعة',pending:'قيد المراجعة',preparing:'قيد التحضير',progress:'في الطريق 🚚',on_the_way:'في الطريق 🚚',delivered:'تم التسليم',cancelled:'تم الإلغاء'};
    var statusClasses={new:'order-new',pending:'order-new',preparing:'order-progress',progress:'order-progress',on_the_way:'order-progress',delivered:'order-delivered',cancelled:'order-cancelled'};
    var html = '';
    orders.forEach(function(order) {
      var oid = escapeHTML(String(order.id));
      var status = order.status || 'new';
      var items = order.order_items || order.items || [];
      html += '<div class="bg-white rounded-xl p-4 sm:p-5 border border-brand-100 animate-fade-in">' +
        '<div class="flex items-start justify-between mb-3">' +
        '<div><h3 class="font-bold text-brand-900">' + escapeHTML(order.customer_name||order.name||'') + '</h3>' +
        '<p class="text-brand-600 text-sm">' + escapeHTML(order.customer_phone||order.phone||'')+'</p>'+(order.tracking_code?'<p class="text-xs font-bold text-amber-700">📱 '+escapeHTML(order.tracking_code)+'</p>':'') +
        '<span class="order-status ' + (statusClasses[status]||'order-new') + '">' + (statusLabels[status]||'جديد') + '</span>' +
        '</div>';
      if (order.customer_address||order.address) {
        html += '<p class="text-brand-500 text-sm mb-2"><i data-lucide="map-pin" class="w-4 h-4 inline-block ml-1"></i>' + escapeHTML(order.customer_address||order.address||'') + '</p>';
      }
      if (order.discount_code) {
        html += '<p class="text-amber-600 text-sm mb-2"><i data-lucide="tag" class="w-4 h-4 inline-block ml-1"></i>كود خصم: <strong>' + escapeHTML(order.discount_code) + '</strong></p>';
      }
      html += '<div class="text-sm text-brand-600 mb-3 flex flex-wrap gap-1">';
      items.forEach(function(item) {
        html += '<span class="inline-block bg-brand-50 px-2 py-1 rounded">' + escapeHTML(item.product_name||item.name||'') + ' × ' + (item.quantity||1) + '</span>';
      });
      // إظهار الأزرار حسب حالة الطلب فقط
      var actionBtns = '';
      if (status === 'delivered') {
        actionBtns = '<p class="text-center text-sm text-green-700 font-bold py-2 bg-green-50 rounded-lg">✅ تم تسليم الطلب</p>';
      } else if (status === 'cancelled') {
        actionBtns = '<p class="text-center text-sm text-red-600 font-bold py-2 bg-red-50 rounded-lg">❌ تم إلغاء الطلب</p>';
      } else {
        if (status !== 'progress' && status !== 'on_the_way') {
          actionBtns += '<button data-action="status-progress" data-order-id="' + oid + '" class="flex-1 min-w-[80px] bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-colors">في الطريق 🚚</button>';
        }
        actionBtns += '<button data-action="status-delivered" data-order-id="' + oid + '" class="flex-1 min-w-[80px] bg-green-100 text-green-700 py-2 rounded-lg text-sm font-semibold hover:bg-green-200 transition-colors">تم التسليم ✓</button>' +
          '<button data-action="status-cancelled" data-order-id="' + oid + '" class="flex-1 min-w-[80px] bg-red-100 text-red-700 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors">إلغاء ✕</button>';
      }
      html += '</div>' +
        '<div class="flex items-center justify-between mb-3">' +
        '<span class="font-bold text-brand-900">' + ((order.total_amount||order.total||0)).toLocaleString() + ' د.ع</span>' +
        '<span class="text-brand-400 text-xs">' + new Date(order.created_at||order.date||Date.now()).toLocaleDateString('ar-EG') + '</span>' +
        '</div>' +
        '<div class="flex gap-2 flex-wrap">' + actionBtns + '</div></div>';
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
  if (!isAuthenticated()) { showToast('يجب تسجيل الدخول أولاً','error'); return; }
  if (!isValidOrderStatus(status)) { showToast('حالة غير صالحة','error'); return; }
  if (!orderId) { showToast('معرف الطلب غير صالح','error'); return; }
  try {
    await SupaDB.Orders.updateStatus(orderId, status);
    loadOrders();
    updateOrdersBadge();
    showToast('تم تحديث حالة الطلب','success');
  } catch(e) { showToast('خطأ: ' + e.message,'error'); }
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
    case 'status-delivered': updateOrderStatus(btn.dataset.orderId,'delivered'); break;
    case 'status-cancelled': updateOrderStatus(btn.dataset.orderId,'cancelled'); break;
    case 'view-comment': { var id = btn.dataset.id; if (id) openViewComment(id); break; }
  }
});
