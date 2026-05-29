// admin-analytics.js — v3 (weekly/monthly toggle, delete+undo, no status chart)
var _analyticsChartMonthly = null;
var _analyticsPeriod = 'monthly'; // 'monthly' | 'weekly'
var _lastAnalyticsSnapshot = null; // for undo

async function loadAnalytics() {
  var cardsEl    = document.getElementById('analyticsCards');
  var productsEl = document.getElementById('topProductsList');
  if (cardsEl) cardsEl.innerHTML =
    '<div class="col-span-2 sm:col-span-4 text-center py-10 text-brand-400">' +
    '<svg class="w-6 h-6 animate-spin mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>' +
    '<p>جاري تحليل البيانات...</p></div>';
  try {
    var allOrders = await SupaDB.Orders.list();
    var delivered = allOrders.filter(function(o){ return o.status === 'delivered'; });

    var totalRevenue = delivered.reduce(function(s,o){
      return s + (Number(o.total_amount || o.total) || 0);
    }, 0);
    var avgOrder = delivered.length ? Math.round(totalRevenue / delivered.length) : 0;

    var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    var activePhones = new Set(
      allOrders
        .filter(function(o){ return new Date(o.created_at) >= cutoff; })
        .map(function(o){ return o.phone || o.customer_phone || ''; })
        .filter(Boolean)
    );

    var productQty = {};
    allOrders.forEach(function(o){
      var items = [];
      if (Array.isArray(o.items) && o.items.length > 0) items = o.items;
      else if (Array.isArray(o.order_items) && o.order_items.length > 0) items = o.order_items;
      else if (Array.isArray(o.cart_items) && o.cart_items.length > 0) items = o.cart_items;
      items.forEach(function(item){
        var name = item.name || item.product_name || 'منتج';
        productQty[name] = (productQty[name]||0) + (Number(item.quantity)||1);
      });
    });
    var topProducts = Object.entries(productQty)
      .sort(function(a,b){ return b[1]-a[1]; })
      .slice(0, 7);

    // حالات الطلبات — أعداد ونسب بدل رسم بياني
    var sc = { new:0, pending:0, progress:0, delivered:0, cancelled:0 };
    allOrders.forEach(function(o){ var s=o.status||'new'; sc[s]=(sc[s]||0)+1; });
    var total = allOrders.length || 1;
    var newCount      = (sc.new||0) + (sc.pending||0);
    var progressCount = sc.progress||0;
    var deliveredCount= sc.delivered||0;
    var cancelledCount= sc.cancelled||0;

    // ═══ حفظ snapshot للـ undo ═══
    _lastAnalyticsSnapshot = {
      totalRevenue: totalRevenue, avgOrder: avgOrder, activePhones: activePhones.size,
      delivered: delivered.length, topProducts: topProducts, sc: sc,
      newCount: newCount, progressCount: progressCount, deliveredCount: deliveredCount, cancelledCount: cancelledCount
    };

    // ═══ RENDER STATS CARDS ═══
    var statsData = [
      { icon:'banknote',       label:'إجمالي المبيعات',      val:totalRevenue.toLocaleString('ar-IQ')+' د.ع', cls:'green'  },
      { icon:'check-circle-2', label:'طلبات مكتملة',         val:delivered.length,                            cls:'blue'   },
      { icon:'trending-up',    label:'متوسط قيمة الطلب',     val:avgOrder.toLocaleString('ar-IQ')+' د.ع',    cls:'purple' },
      { icon:'users',          label:'عميل نشط (30 يوم)',    val:activePhones.size,                           cls:'amber'  }
    ];
    var clsMap = {
      green :{card:'border-green-100 bg-green-50',   icon:'bg-green-100  text-green-700' },
      blue  :{card:'border-blue-100  bg-blue-50',    icon:'bg-blue-100   text-blue-700'  },
      purple:{card:'border-purple-100 bg-purple-50', icon:'bg-purple-100 text-purple-700'},
      amber :{card:'border-amber-100  bg-amber-50',  icon:'bg-amber-100  text-amber-700' }
    };
    if (cardsEl) {
      cardsEl.innerHTML = statsData.map(function(s){
        var c=clsMap[s.cls];
        return '<div class="bg-white rounded-2xl p-4 sm:p-5 border '+c.card+' shadow-sm">'+
          '<div class="flex items-center gap-3 mb-3">'+
          '<div class="w-9 h-9 rounded-xl flex items-center justify-center '+c.icon+'">'+
          '<i data-lucide="'+s.icon+'" class="w-5 h-5"></i></div>'+
          '<span class="text-xs sm:text-sm font-semibold text-brand-600">'+s.label+'</span></div>'+
          '<p class="text-xl sm:text-2xl font-bold text-brand-900">'+s.val+'</p>'+
          '</div>';
      }).join('');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ═══ أكثر المنتجات مبيعاً ═══
    if (productsEl) {
      var maxQ = topProducts.length ? topProducts[0][1] : 1;
      var medals = ['🥇','🥈','🥉'];
      productsEl.innerHTML = topProducts.length
        ? topProducts.map(function(p,i){
            var pct=Math.round((p[1]/maxQ)*100);
            return '<div class="mb-4">'+
              '<div class="flex items-center justify-between mb-1.5">'+
              '<span class="text-sm font-semibold text-brand-800">'+(medals[i]||'  ')+' '+p[0]+'</span>'+
              '<span class="text-xs font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">'+p[1]+' قطعة</span></div>'+
              '<div class="h-2.5 bg-brand-100 rounded-full overflow-hidden">'+
              '<div class="h-full rounded-full bg-gradient-to-l from-brand-600 to-brand-400" style="width:'+pct+'%"></div>'+
              '</div></div>';
          }).join('')
        : '<p class="text-brand-400 text-sm text-center py-6">لا توجد بيانات بعد</p>';
    }

    // ═══ ملخص حالات الطلبات (أرقام + نسب بدل chart) ═══
    var statusSummaryEl = document.getElementById('analyticsStatusSummary');
    if (statusSummaryEl) {
      var statusItems = [
        { label:'جديدة / انتظار', count: newCount,       color:'bg-blue-500',  pct: Math.round(newCount/total*100) },
        { label:'قيد التوصيل',    count: progressCount,  color:'bg-amber-500', pct: Math.round(progressCount/total*100) },
        { label:'تم التوصيل',     count: deliveredCount, color:'bg-green-500', pct: Math.round(deliveredCount/total*100) },
        { label:'ملغاة',          count: cancelledCount, color:'bg-red-500',   pct: Math.round(cancelledCount/total*100) }
      ];
      statusSummaryEl.innerHTML = statusItems.map(function(s){
        return '<div class="mb-3">'+
          '<div class="flex items-center justify-between mb-1">'+
            '<span class="text-sm font-semibold text-brand-800">'+s.label+'</span>'+
            '<div class="flex items-center gap-2">'+
              '<span class="text-sm font-bold text-brand-900">'+s.count+' طلب</span>'+
              '<span class="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">'+s.pct+'%</span>'+
            '</div>'+
          '</div>'+
          '<div class="h-2.5 bg-brand-100 rounded-full overflow-hidden">'+
            '<div class="h-full rounded-full '+s.color+'" style="width:'+s.pct+'%"></div>'+
          '</div></div>';
      }).join('') +
      '<div class="mt-3 pt-3 border-t border-brand-100 flex items-center justify-between">'+
        '<span class="text-xs text-brand-500">إجمالي الطلبات</span>'+
        '<span class="text-sm font-bold text-brand-900">'+allOrders.length+' طلب</span>'+
      '</div>';
    }

    // ═══ رسم المبيعات الشهرية / الأسبوعية ═══
    _renderSalesChart(allOrders, delivered);

  } catch(e) {
    if (cardsEl) cardsEl.innerHTML =
      '<div class="col-span-2 sm:col-span-4 text-center py-8 text-red-500">خطأ في التحليل: '+e.message+'</div>';
    console.error('[Analytics]', e);
  }
}

// ═══ تبديل بين الأسبوعي والشهري ═══
function switchAnalyticsPeriod(period) {
  _analyticsPeriod = period;
  document.querySelectorAll('.analytics-period-btn').forEach(function(b){
    b.classList.remove('bg-brand-700','text-white');
    b.classList.add('bg-brand-100','text-brand-700');
  });
  var activeBtn = document.querySelector('.analytics-period-btn[data-period="'+period+'"]');
  if (activeBtn) { activeBtn.classList.add('bg-brand-700','text-white'); activeBtn.classList.remove('bg-brand-100','text-brand-700'); }

  // إعادة تحميل الرسم باستخدام البيانات المحفوظة
  if (_lastAnalyticsSnapshot && typeof SupaDB !== 'undefined') {
    SupaDB.Orders.list().then(function(allOrders){
      var delivered = allOrders.filter(function(o){ return o.status==='delivered'; });
      _renderSalesChart(allOrders, delivered);
    }).catch(function(){});
  }
}

function _renderSalesChart(allOrders, delivered) {
  var ctx2 = document.getElementById('analyticsMonthlyChart');
  if (!ctx2) return;

  var labels = [], vals = [];

  if (_analyticsPeriod === 'weekly') {
    // آخر 4 أسابيع — مجمعة أسبوعياً
    for (var w=3; w>=0; w--) {
      var wEnd   = new Date(); wEnd.setHours(23,59,59,999); wEnd.setDate(wEnd.getDate() - w*7);
      var wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6); wStart.setHours(0,0,0,0);
      var wTotal = delivered.filter(function(o){
        var d=new Date(o.created_at); return d>=wStart && d<=wEnd;
      }).reduce(function(s,o){ return s+(Number(o.total_amount||o.total)||0); }, 0);
      labels.push('أسبوع -'+w);
      vals.push(wTotal);
    }
    // تسمية أفضل للأسبوع الحالي
    labels[3] = 'هذا الأسبوع';
  } else {
    // آخر 6 أشهر
    var mm = {};
    delivered.forEach(function(o){
      var d=new Date(o.created_at);
      var k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      mm[k]=(mm[k]||0)+(Number(o.total_amount||o.total)||0);
    });
    for (var i=5; i>=0; i--) {
      var md=new Date(); md.setMonth(md.getMonth()-i);
      var mk=md.getFullYear()+'-'+String(md.getMonth()+1).padStart(2,'0');
      if (!mm[mk]) mm[mk]=0;
    }
    var arM=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    var sortedM=Object.keys(mm).sort().slice(-6);
    labels=sortedM.map(function(k){ return arM[parseInt(k.split('-')[1])-1]; });
    vals=sortedM.map(function(k){ return mm[k]; });
  }

  // حساب المجموع والنسب لكل عمود
  var totalSales = vals.reduce(function(s,v){ return s+v; }, 0);

  if (_analyticsChartMonthly) _analyticsChartMonthly.destroy();
  _analyticsChartMonthly = new Chart(ctx2.getContext('2d'), {
    type:'bar',
    data:{ labels:labels,
      datasets:[{ label:'المبيعات (د.ع)', data:vals,
        backgroundColor:'rgba(45,80,22,0.12)', borderColor:'#2D5016',
        borderWidth:2.5, borderRadius:10, borderSkipped:false,
        hoverBackgroundColor:'rgba(45,80,22,0.25)' }] },
    options:{
      responsive:true,
      plugins:{
        legend:{ display:false },
        tooltip:{
          callbacks:{
            label: function(ctx){
              var v=ctx.raw||0;
              var pct = totalSales>0 ? Math.round(v/totalSales*100) : 0;
              return ' '+v.toLocaleString('ar-IQ')+' د.ع ('+pct+'%)';
            }
          }
        }
      },
      scales:{
        x:{ grid:{display:false}, ticks:{font:{family:'Cairo'}} },
        y:{ ticks:{ font:{family:'Cairo'}, callback:function(v){ return v===0?'0':(v/1000).toFixed(0)+'K'; } },
          grid:{color:'rgba(0,0,0,0.05)'} }
      }
    }
  });

  // عرض الإجمالي والنسب تحت الرسم
  var summaryEl = document.getElementById('analyticsSalesSummary');
  if (summaryEl && totalSales > 0) {
    summaryEl.innerHTML = '<div class="mt-3 pt-3 border-t border-brand-100 flex flex-wrap gap-3">' +
      vals.map(function(v,i){
        var pct=Math.round(v/totalSales*100);
        return '<div class="flex items-center gap-1.5 text-xs">'+
          '<div class="w-2 h-2 rounded-full bg-brand-600"></div>'+
          '<span class="text-brand-600 font-semibold">'+labels[i]+':</span>'+
          '<span class="text-brand-900 font-bold">'+v.toLocaleString('ar-IQ')+'</span>'+
          '<span class="text-brand-400">('+pct+'%)</span>'+
          '</div>';
      }).join('') + '</div>';
  }
}

// ═══ حذف الإحصائيات الحالية + تراجع ═══
function deleteAnalyticsView() {
  var cards=document.getElementById('analyticsCards');
  var products=document.getElementById('topProductsList');
  var status=document.getElementById('analyticsStatusSummary');
  var monthly=document.getElementById('analyticsMonthlyChart');
  if (!_lastAnalyticsSnapshot) { if(typeof showToast==='function') showToast('لا توجد بيانات لحذفها','error'); return; }
  if (!confirm('هل تريد مسح عرض الإحصائيات الحالية؟ يمكنك التراجع لاحقاً')) return;
  if (cards) cards.innerHTML='<div class="col-span-2 sm:col-span-4 text-center py-10 text-brand-400"><p>تم مسح العرض — اضغط "تراجع" لاستعادته أو "تحديث" لإعادة التحميل</p></div>';
  if (products) products.innerHTML='';
  if (status) status.innerHTML='';
  if (_analyticsChartMonthly) { _analyticsChartMonthly.destroy(); _analyticsChartMonthly=null; }
  var summaryEl=document.getElementById('analyticsSalesSummary'); if(summaryEl) summaryEl.innerHTML='';
  var undoBtn=document.getElementById('analyticsUndoBtn');
  if (undoBtn) { undoBtn.classList.remove('hidden'); }
  if(typeof showToast==='function') showToast('تم مسح العرض — يمكنك التراجع','info');
}

function undoDeleteAnalytics() {
  var undoBtn=document.getElementById('analyticsUndoBtn');
  if (undoBtn) undoBtn.classList.add('hidden');
  loadAnalytics();
  if(typeof showToast==='function') showToast('تم استعادة الإحصائيات','success');
}

// ════════════════════════════════════════════════════════════
// قسم إحصائيات الزوار
// ════════════════════════════════════════════════════════════
async function loadVisitorStats() {
  const SUPABASE_URL = 'https://hczsskviliuqyayylutv.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjenNza3ZpbGl1cXlheXlsdXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDg2OTUsImV4cCI6MjA5NDcyNDY5NX0.mT-fPrPzwbUx3mQZOqFGx8ndWTkUS-MeqLcfaN1zS4k';
  const headers = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Accept': 'application/json' };

  try {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();
    const todayStr = new Date().toISOString().slice(0, 10);

    const [allRes, monthRes, todayRes] = await Promise.all([
      fetch(SUPABASE_URL + '/rest/v1/page_views?select=id', { headers: Object.assign({}, headers, { 'Prefer': 'count=exact' }) }),
      fetch(SUPABASE_URL + '/rest/v1/page_views?select=id,device,created_at&created_at=gte.' + since + '&order=created_at.desc&limit=1000', { headers }),
      fetch(SUPABASE_URL + '/rest/v1/page_views?select=id&created_at=gte.' + todayStr, { headers: Object.assign({}, headers, { 'Prefer': 'count=exact' }) }),
    ]);

    var allRange   = allRes.headers.get('content-range') || '';
    var todayRange = todayRes.headers.get('content-range') || '';
    var totalVisitors = allRange.includes('/') ? parseInt(allRange.split('/')[1]) || 0 : 0;
    var todayVisitors = todayRange.includes('/') ? parseInt(todayRange.split('/')[1]) || 0 : 0;

    var monthData = await monthRes.json();
    var monthVisitors = Array.isArray(monthData) ? monthData.length : 0;

    var devices = { mobile: 0, desktop: 0, tablet: 0 };
    if (Array.isArray(monthData)) {
      monthData.forEach(function(v) { var d = v.device || 'desktop'; devices[d] = (devices[d] || 0) + 1; });
    }
    var dailyCounts = {};
    if (Array.isArray(monthData)) {
      monthData.forEach(function(v) { var day = v.created_at.slice(0, 10); dailyCounts[day] = (dailyCounts[day] || 0) + 1; });
    }
    var last7 = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var key = d.toISOString().slice(0, 10);
      last7.push({ day: key.slice(5), count: dailyCounts[key] || 0 });
    }

    var analyticsSection = document.getElementById('analyticsCards');
    if (!analyticsSection) return;

    var old = document.getElementById('visitorStatsSection');
    if (old) old.remove();

    var mobilePercent  = monthVisitors ? Math.round((devices.mobile  / monthVisitors) * 100) : 0;
    var desktopPercent = monthVisitors ? Math.round((devices.desktop / monthVisitors) * 100) : 0;
    var tabletPercent  = monthVisitors ? Math.round((devices.tablet  / monthVisitors) * 100) : 0;
    var maxDay = Math.max.apply(Math, last7.map(function(d){ return d.count; }).concat([1]));

    var barsHtml = last7.map(function(d) {
      return '<div class="flex-1 flex flex-col items-center gap-1">' +
        '<span class="text-[10px] text-brand-400 font-semibold">' + d.count + '</span>' +
        '<div class="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400" style="height:' + Math.max(4, Math.round((d.count / maxDay) * 80)) + 'px"></div>' +
        '<span class="text-[10px] text-brand-400">' + d.day + '</span>' +
        '</div>';
    }).join('');

    var html = '<div id="visitorStatsSection" class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">' +
      '<div class="bg-white rounded-2xl p-5 border border-teal-100 bg-teal-50 shadow-sm"><div class="flex items-center gap-3 mb-3"><div class="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-100 text-teal-700"><i data-lucide="eye" class="w-5 h-5"></i></div><span class="text-sm font-semibold text-brand-600">إجمالي الزيارات</span></div><p class="text-2xl font-bold text-brand-900">' + Number(totalVisitors).toLocaleString('ar-IQ') + '</p></div>' +
      '<div class="bg-white rounded-2xl p-5 border border-sky-100 bg-sky-50 shadow-sm"><div class="flex items-center gap-3 mb-3"><div class="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-100 text-sky-700"><i data-lucide="calendar-check" class="w-5 h-5"></i></div><span class="text-sm font-semibold text-brand-600">زيارات اليوم</span></div><p class="text-2xl font-bold text-brand-900">' + Number(todayVisitors).toLocaleString('ar-IQ') + '</p></div>' +
      '<div class="bg-white rounded-2xl p-5 border border-violet-100 bg-violet-50 shadow-sm"><div class="flex items-center gap-3 mb-3"><div class="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-100 text-violet-700"><i data-lucide="bar-chart-2" class="w-5 h-5"></i></div><span class="text-sm font-semibold text-brand-600">زيارات آخر 30 يوم</span></div><p class="text-2xl font-bold text-brand-900">' + Number(monthVisitors).toLocaleString('ar-IQ') + '</p></div>' +
      '<div class="sm:col-span-2 bg-white rounded-2xl p-5 border border-brand-100 shadow-sm"><h4 class="text-sm font-bold text-brand-700 mb-4">الزيارات — آخر 7 أيام</h4><div class="flex items-end gap-2 h-24">' + barsHtml + '</div></div>' +
      '<div class="bg-white rounded-2xl p-5 border border-brand-100 shadow-sm"><h4 class="text-sm font-bold text-brand-700 mb-4">نوع الجهاز</h4><div class="space-y-3">' +
        '<div><div class="flex justify-between text-xs font-semibold text-brand-600 mb-1"><span>📱 موبايل</span><span>' + mobilePercent + '%</span></div><div class="h-2 bg-brand-100 rounded-full overflow-hidden"><div class="h-full bg-green-400 rounded-full" style="width:' + mobilePercent + '%"></div></div></div>' +
        '<div><div class="flex justify-between text-xs font-semibold text-brand-600 mb-1"><span>🖥️ كمبيوتر</span><span>' + desktopPercent + '%</span></div><div class="h-2 bg-brand-100 rounded-full overflow-hidden"><div class="h-full bg-blue-400 rounded-full" style="width:' + desktopPercent + '%"></div></div></div>' +
        '<div><div class="flex justify-between text-xs font-semibold text-brand-600 mb-1"><span>📲 تابلت</span><span>' + tabletPercent + '%</span></div><div class="h-2 bg-brand-100 rounded-full overflow-hidden"><div class="h-full bg-purple-400 rounded-full" style="width:' + tabletPercent + '%"></div></div></div>' +
      '</div></div>' +
    '</div>';

    analyticsSection.insertAdjacentHTML('afterend', html);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (e) {
    console.warn('[Visitors] Error loading visitor stats:', e.message);
  }
}
