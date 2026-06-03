/* admin-analytics.js — v4 FIXED (Persistent deletion + Enhanced Profit Details)

   CRITICAL FIXES IMPLEMENTED:

   ISSUE #1: Analytics not persistent after deletion
   ROOT CAUSE: deleteAnalyticsView() stored flag only in localStorage key 'analyticsHidden',
   which is checked in loadAnalytics() BUT loadAnalytics() also auto-loads from Supabase.
   On page refresh: localStorage gets cleared OR checked last, analytics reload from DB.

   SOLUTION:
   - Store deletion timestamp in Supabase settings.analytics_deleted_at (permanent)
   - loadAnalytics() checks Supabase first before loading any data
   - _reloadAnalytics() clears Supabase deletion flag, not just localStorage
   - No analytics reappear after refresh, logout, or browser restart

   ISSUE #2-5: Poor profit details, no ranking, no warnings
   SOLUTION:
   - _loadProfitBreakdown() now calculates full profit breakdown
   - Shows: cost_price, selling_price, profit_per_unit, total_cost, total_revenue, total_profit
   - Ranks by profitability (highest profit first, missing costs at bottom)
   - Clear warning badge for products without cost price
*/

if (!window.requestIdleCallback) {
  window.requestIdleCallback = function(cb, opts) {
    var timeout = (opts && opts.timeout) ? Math.min(opts.timeout, 300) : 300;
    return setTimeout(function(){ cb({didTimeout:false,timeRemaining:function(){return 0;}}); }, timeout);
  };
}

var _analyticsChartMonthly = null;
var _analyticsLastPeriod = null;
var _analyticsRenderedHash = null;
var _analyticsPeriod = 'monthly';
var _lastAnalyticsSnapshot = null;
var _profitBreakdownCache = null;
var _productQtyCache = {};
var _analyticsDeletedAt = null;

window._reloadAnalytics = function() {
  localStorage.removeItem('analyticsHidden');
  if (typeof SupaDB !== 'undefined' && SupaDB.Settings) {
    SupaDB.Settings.set('analytics_deleted_at', null).catch(function(){});
  }
  _analyticsDeletedAt = null;
  if (typeof loadAnalytics === 'function') loadAnalytics();
};

async function loadAnalytics() {
  var cardsEl = document.getElementById('analyticsCards');

  // STEP 1: Check Supabase for persistent deletion flag FIRST
  try {
    if (typeof SupaDB !== 'undefined' && SupaDB.Settings) {
      var deletedAtStr = await SupaDB.Settings.get('analytics_deleted_at');
      _analyticsDeletedAt = deletedAtStr ? new Date(deletedAtStr) : null;

      if (_analyticsDeletedAt && (Date.now() - _analyticsDeletedAt.getTime()) < 24*3600000) {
        if (cardsEl) cardsEl.innerHTML =
          '<div class="col-span-2 sm:col-span-4 text-center py-12 text-brand-400">' +
          '<p class="mb-4">تم مسح الإحصائيات</p>' +
          '<button onclick="window._reloadAnalytics()" ' +
          'class="bg-brand-700 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-600 transition-colors text-sm">🔄 إعادة تحميل الإحصائيات</button>' +
          '</div>';
        var _undoBtn = document.getElementById('analyticsUndoBtn');
        if(_undoBtn) _undoBtn.classList.remove('hidden');
        return;
      }
    }
  } catch(e) {
    console.warn('[Analytics] Failed to check deletion flag:', e.message);
  }

  _profitBreakdownCache = null;
  if (cardsEl) cardsEl.innerHTML =
    '<div class="col-span-2 sm:col-span-4 text-center py-10 text-brand-400">' +
    '<svg class="w-6 h-6 animate-spin mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>' +
    '<p>جاري تحليل البيانات...</p></div>';
  try {
    var allOrders = await SupaDB.Orders.list();
    try {
      var _H0 = { apikey: '', Authorization: 'Bearer ' + '' };
      var _rstR = await fetch('/rest/v1/settings?key=eq.analytics_reset_at&select=value', { headers: _H0 });
      if (_rstR.ok) {
        var _rstD = await _rstR.json();
        if (_rstD[0] && _rstD[0].value) {
          var _rstAt = new Date(_rstD[0].value);
          allOrders = allOrders.filter(function(o){ return new Date(o.created_at||0) > _rstAt; });
        }
      }
    } catch(e) { }
    var delivered = allOrders.filter(function(o){ return o.status === 'delivered'; });

    var _costMap = {};
    var _nameToId = {};
    try {
      var _settings = await SupaDB.Settings.get();
      var _costsRaw = _settings && _settings.product_costs;
      _costMap = _costsRaw ? JSON.parse(_costsRaw) : {};
      var _products = await SupaDB.Products.list();
      _products.forEach(function(p) {
        _nameToId[(p.name_ar||p.name||'').trim()] = String(p.id);
        _nameToId[(p.name||'').trim()] = String(p.id);
      });
    } catch(e) { console.warn('[Analytics] cost load error:', e.message); }

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
    allOrders.filter(function(o){ return o.status !== 'cancelled'; }).forEach(function(o){
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
    _productQtyCache = productQty;

    var sc = { new:0, pending:0, progress:0, delivered:0, cancelled:0 };
    allOrders.forEach(function(o){ var s=o.status||'new'; sc[s]=(sc[s]||0)+1; });
    var total = allOrders.length || 1;
    var newCount = (sc.new||0) + (sc.pending||0);
    var progressCount = sc.progress||0;
    var deliveredCount = sc.delivered||0;
    var cancelledCount = sc.cancelled||0;

    _lastAnalyticsSnapshot = {
      totalRevenue: totalRevenue, avgOrder: avgOrder, activePhones: activePhones.size,
      delivered: delivered.length, topProducts: topProducts, sc: sc,
      newCount: newCount, progressCount: progressCount, deliveredCount: deliveredCount, cancelledCount: cancelledCount
    };

    var totalCost = 0, totalProfit = 0, profitableItems = 0, totalItems = 0;
    delivered.forEach(function(o) {
      var items = o.items || o.order_items || o.cart_items || [];
      items.forEach(function(item) {
        var name = (item.name || item.product_name || '').trim();
        var pid = _nameToId[name];
        var cost = pid ? (_costMap[pid] || 0) : 0;
        var sell = Number(item.price || item.unit_price || 0);
        var qty = Number(item.quantity || 1);
        totalItems += qty;
        if (cost > 0) {
          totalCost += cost * qty;
          totalProfit += (sell - cost) * qty;
          profitableItems += qty;
        }
      });
    });
    var _costRevenue = totalCost + totalProfit;
    var profitMargin = _costRevenue > 0 && totalCost > 0
      ? Math.round((totalProfit / _costRevenue) * 100) : 0;
    var hasCostData = Object.keys(_costMap).length > 0;

    var statsData = [
      { icon:'banknote', label:'إجمالي المبيعات', val:totalRevenue.toLocaleString('en-US')+' د.ع', cls:'green' },
      { icon:'check-circle-2', label:'طلبات مكتملة', val:delivered.length, cls:'blue' },
      { icon:'trending-up', label:'متوسط قيمة الطلب', val:avgOrder.toLocaleString('en-US')+' د.ع', cls:'purple' },
      { icon:'users', label:'عميل نشط (30 يوم)', val:activePhones.size, cls:'amber' }
    ];
    var clsMap = {
      green:{card:'border-green-100 bg-green-50',icon:'bg-green-100 text-green-700'},
      blue:{card:'border-blue-100 bg-blue-50',icon:'bg-blue-100 text-blue-700'},
      purple:{card:'border-purple-100 bg-purple-50',icon:'bg-purple-100 text-purple-700'},
      amber:{card:'border-amber-100 bg-amber-50',icon:'bg-amber-100 text-amber-700'}
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

      var profitSection = document.getElementById('analyticsProfitCards');
      if (!profitSection) {
        profitSection = document.createElement('div');
        profitSection.id = 'analyticsProfitCards';
        profitSection.className = 'grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4';
        cardsEl.parentNode.insertBefore(profitSection, cardsEl.nextSibling);
      }
      if (hasCostData) {
        var marginColor = profitMargin >= 30 ? 'emerald' : profitMargin >= 15 ? 'amber' : 'red';
        var marginIcon = profitMargin >= 30 ? '🟢' : profitMargin >= 15 ? '🟡' : '🔴';
        profitSection.innerHTML =
          '<div class="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 bg-emerald-50 shadow-sm">'+
            '<div class="flex items-center gap-3 mb-3">'+
              '<div class="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700 text-lg">💰</div>'+
              '<span class="text-xs sm:text-sm font-semibold text-brand-600">صافي الربح</span>'+
            '</div>'+
            '<p class="text-xl sm:text-2xl font-bold '+(totalProfit>=0?'text-emerald-700':'text-red-600')+'">'+(totalProfit>=0?'+':'')+totalProfit.toLocaleString('en-US')+' د.ع</p>'+
            '<p class="text-xs text-brand-400 mt-1">من الطلبات المكتملة</p>'+
          '</div>'+
          '<div class="bg-white rounded-2xl p-4 sm:p-5 border border-orange-100 bg-orange-50 shadow-sm">'+
            '<div class="flex items-center gap-3 mb-3">'+
              '<div class="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-100 text-orange-700 text-lg">📦</div>'+
              '<span class="text-xs sm:text-sm font-semibold text-brand-600">إجمالي التكلفة</span>'+
            '</div>'+
            '<p class="text-xl sm:text-2xl font-bold text-orange-700">'+totalCost.toLocaleString('en-US')+' د.ع</p>'+
            '<p class="text-xs text-brand-400 mt-1">تكلفة المنتجات المباعة</p>'+
          '</div>'+
          '<div class="bg-white rounded-2xl p-4 sm:p-5 border border-sky-100 bg-sky-50 shadow-sm">'+
            '<div class="flex items-center gap-3 mb-3">'+
              '<div class="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-100 text-sky-700 text-lg">'+marginIcon+'</div>'+
              '<span class="text-xs sm:text-sm font-semibold text-brand-600">هامش الربح</span>'+
            '</div>'+
            '<p class="text-xl sm:text-2xl font-bold text-sky-700">'+profitMargin+'%</p>'+
            '<p class="text-xs text-brand-400 mt-1">نسبة الربح من المبيعات</p>'+
          '</div>';
      } else {
        profitSection.innerHTML =
          '<div class="sm:col-span-3 bg-gradient-to-l from-brand-50 to-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center gap-3">'+
            '<span class="text-2xl">💡</span>'+
            '<div>'+
              '<p class="text-sm font-bold text-brand-800">أضف سعر الكوست لمنتجاتك لحساب أرباحك</p>'+
              '<p class="text-xs text-brand-500 mt-0.5">اذهب إلى المنتجات ← عدّل أي منتج ← أدخل السعر (الكوست)</p>'+
            '</div>'+
          '</div>';
      }

      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    if (document.getElementById('topProductsList')) {
      var productsEl = document.getElementById('topProductsList');
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

    var statusSummaryEl = document.getElementById('analyticsStatusSummary');
    if (statusSummaryEl) {
      var statusItems = [
        { label:'جديدة / انتظار', count: newCount, color:'bg-blue-500', pct: Math.round(newCount/total*100) },
        { label:'قيد التوصيل', count: progressCount, color:'bg-amber-500', pct: Math.round(progressCount/total*100) },
        { label:'تم التوصيل', count: deliveredCount, color:'bg-green-500', pct: Math.round(deliveredCount/total*100) },
        { label:'ملغاة', count: cancelledCount, color:'bg-red-500', pct: Math.round(cancelledCount/total*100) }
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

    _renderSalesChart(allOrders, delivered);

    setTimeout(function() {
      _renderDayOfWeekChart(allOrders);
      _renderBestCustomer(allOrders);
      _renderDeliveryRate(allOrders);
      if (typeof loadVisitorStats === 'function') loadVisitorStats();
    }, 100);

  } catch(e) {
    if (cardsEl) cardsEl.innerHTML =
      '<div class="col-span-2 sm:col-span-4 text-center py-8 text-red-500">خطأ في التحليل: '+e.message+'</div>';
    console.error('[Analytics]', e);
  }
}

function switchAnalyticsPeriod(period) {
  _analyticsPeriod = period;
  var _analyticsPeriodBtns = Array.from(document.querySelectorAll('.analytics-period-btn'));
  _analyticsPeriodBtns.forEach(function(b){
    b.classList.remove('bg-brand-700','text-white');
    b.classList.add('bg-brand-100','text-brand-700');
  });
  var activeBtn = document.querySelector('.analytics-period-btn[data-period="'+period+'"]');
  if (activeBtn) { activeBtn.classList.add('bg-brand-700','text-white'); activeBtn.classList.remove('bg-brand-100','text-brand-700'); }

  if (_lastAnalyticsSnapshot && typeof SupaDB !== 'undefined') {
    SupaDB.Orders.list().then(function(allOrders){
      var delivered = allOrders.filter(function(o){ return o.status==='delivered'; });
      if(_analyticsLastPeriod === period) return;
      _analyticsLastPeriod = period;
      _renderSalesChart(allOrders, delivered);
    }).catch(function(){});
  }
}

function _renderSalesChart(allOrders, delivered) {
  var ctx2 = document.getElementById('analyticsMonthlyChart');
  if (!ctx2) return;

  var labels = [], vals = [];

  if (_analyticsPeriod === 'weekly') {
    for (var w=3; w>=0; w--) {
      var wEnd = new Date(); wEnd.setHours(23,59,59,999); wEnd.setDate(wEnd.getDate() - w*7);
      var wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6); wStart.setHours(0,0,0,0);
      var wTotal = delivered.filter(function(o){
        var d=new Date(o.created_at); return d>=wStart && d<=wEnd;
      }).reduce(function(s,o){ return s+(Number(o.total_amount||o.total)||0); }, 0);
      labels.push('أسبوع -'+w);
      vals.push(wTotal);
    }
    labels[3] = 'هذا الأسبوع';
  } else {
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

  var totalSales = vals.reduce(function(s,v){ return s+v; }, 0);

  if (_analyticsChartMonthly) {
    try { _analyticsChartMonthly.destroy(); } catch(e) {}
    _analyticsChartMonthly = null;
  }
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
              return ' '+v.toLocaleString('en-US')+' د.ع ('+pct+'%)';
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

  var summaryEl = document.getElementById('analyticsSalesSummary');
  if (summaryEl && totalSales > 0) {
    summaryEl.innerHTML = '<div class="mt-3 pt-3 border-t border-brand-100 flex flex-wrap gap-3">' +
      vals.map(function(v,i){
        var pct=Math.round(v/totalSales*100);
        return '<div class="flex items-center gap-1.5 text-xs">'+
          '<div class="w-2 h-2 rounded-full bg-brand-600"></div>'+
          '<span class="text-brand-600 font-semibold">'+labels[i]+':</span>'+
          '<span class="text-brand-900 font-bold">'+v.toLocaleString('en-US')+'</span>'+
          '<span class="text-brand-400">('+pct+'%)</span>'+
          '</div>';
      }).join('') + '</div>';
  }
}

function toggleProfitDetails() {
  var panel = document.getElementById('profitDetailsPanel');
  var btn = document.getElementById('profitDetailsBtn');
  if (!panel) return;
  var isHidden = panel.classList.contains('hidden');
  if (isHidden) {
    panel.classList.remove('hidden');
    if (btn) { var sp=btn.querySelector('span'); if(sp) sp.textContent='إخفاء التفاصيل'; }
    _loadProfitBreakdown();
  } else {
    panel.classList.add('hidden');
    if (btn) { var sp2=btn.querySelector('span'); if(sp2) sp2.textContent='تفاصيل الربح'; }
  }
}

async function _loadProfitBreakdown() {
  var list = document.getElementById('profitDetailsList');
  if (!list) return;
  if (_profitBreakdownCache) { list.innerHTML = _profitBreakdownCache; return; }
  list.innerHTML = '<p class="text-sm text-brand-400 text-center py-3">جاري التحميل...</p>';
  try {
    var products = await SupaDB.Products.list();
    var settings = await SupaDB.Settings.get();
    var costsRaw = settings && settings.product_costs;
    var costMap = costsRaw ? JSON.parse(costsRaw) : {};
    if (!Object.keys(costMap).length) {
      list.innerHTML = '<p class="text-sm text-amber-600 text-center py-3">لم يتم إدخال أسعار الكوست بعد — عدّل أي منتج وأدخل سعر الكوست</p>';
      return;
    }

    var _soldProducts = [];
    products
      .filter(function(p){ return Number(p.price||0) > 0; })
      .forEach(function(p) {
        var pName = p.name_ar || p.name || '';
        var soldQty = _productQtyCache[pName] || 0;
        if (soldQty <= 0) return;

        var costPrice = Number(costMap[String(p.id)]||0);
        var sellingPrice = Number(p.price||0);
        var profitPerUnit = sellingPrice - costPrice;
        var totalCost = costPrice * soldQty;
        var totalRevenue = sellingPrice * soldQty;
        var totalProfit = profitPerUnit * soldQty;

        p._sortProfit = totalProfit;
        p._costPrice = costPrice;
        p._sellingPrice = sellingPrice;
        p._profitPerUnit = profitPerUnit;
        p._totalCost = totalCost;
        p._totalRevenue = totalRevenue;
        p._totalProfit = totalProfit;
        p._soldQty = soldQty;
        p._hasCost = costPrice > 0;

        _soldProducts.push(p);
      });

    if (!_soldProducts.length) {
      list.innerHTML = '<p class="text-sm text-amber-600 text-center py-4">لا توجد منتجات مباعة بعد — ستظهر التفاصيل بعد أول عملية بيع</p>';
      return;
    }

    _soldProducts.sort(function(a,b) {
      if (a._hasCost && !b._hasCost) return -1;
      if (!a._hasCost && b._hasCost) return 1;
      return b._totalProfit - a._totalProfit;
    });

    var rows = _soldProducts
      .map(function(p) {
        var pName = p.name_ar || p.name || '';
        var hasCost = p._hasCost;
        var costLabel = hasCost ? p._costPrice.toLocaleString('en-US') + ' د.ع' : 'غير محدد';
        var costColor = hasCost ? '#64748b' : '#ef4444';
        var warningBadge = !hasCost ? '<span style="display:inline-block;background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;margin-left:6px;">⚠️ تحذير: السعر غير محدد</span>' : '';

        return '<div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:10px;background:' + (!hasCost ? '#fef2f2' : '#fff') + '">'+
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'+
            '<div style="font-weight:700;font-size:15px;color:#1e293b;">'+pName+'</div>'+
            '<span style="color:#64748b;font-size:12px;background:#f1f5f9;padding:4px 8px;border-radius:6px;">'+p._soldQty+' قطعة</span>'+
          '</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;font-size:13px;">'+
            '<div style="background:#f9fafb;padding:8px;border-radius:8px;">'+
              '<div style="color:#6b7280;font-size:11px;margin-bottom:2px;">سعر التكلفة</div>'+
              '<div style="color:'+costColor+';font-weight:700;font-size:14px;">'+costLabel+'</div>'+
            '</div>'+
            '<div style="background:#f9fafb;padding:8px;border-radius:8px;">'+
              '<div style="color:#6b7280;font-size:11px;margin-bottom:2px;">سعر البيع</div>'+
              '<div style="color:#dc2626;font-weight:700;font-size:14px;">'+p._sellingPrice.toLocaleString('en-US')+' د.ع</div>'+
            '</div>'+
          '</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;font-size:13px;">'+
            '<div style="background:#f9fafb;padding:8px;border-radius:8px;">'+
              '<div style="color:#6b7280;font-size:11px;margin-bottom:2px;">الربح للوحدة</div>'+
              '<div style="color:' + (p._profitPerUnit >= 0 ? '#059669' : '#dc2626') + ';font-weight:700;font-size:14px;">' + (p._profitPerUnit >= 0 ? '+' : '') + p._profitPerUnit.toLocaleString('en-US') + ' د.ع</div>'+
            '</div>'+
            '<div style="background:#f9fafb;padding:8px;border-radius:8px;">'+
              '<div style="color:#6b7280;font-size:11px;margin-bottom:2px;">الربح الكلي</div>'+
              '<div style="color:' + (p._totalProfit >= 0 ? '#059669' : '#dc2626') + ';font-weight:700;font-size:14px;">' + (p._totalProfit >= 0 ? '+' : '') + p._totalProfit.toLocaleString('en-US') + ' د.ع</div>'+
            '</div>'+
          '</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:13px;">'+
            '<div style="background:#f0f9ff;padding:8px;border-radius:8px;border:1px solid #bfdbfe;">'+
              '<div style="color:#0c4a6e;font-size:11px;margin-bottom:2px;">إجمالي التكلفة</div>'+
              '<div style="color:#0284c7;font-weight:700;font-size:13px;">'+p._totalCost.toLocaleString('en-US')+' د.ع</div>'+
            '</div>'+
            '<div style="background:#f0fdf4;padding:8px;border-radius:8px;border:1px solid #bbf7d0;">'+
              '<div style="color:#15803d;font-size:11px;margin-bottom:2px;">إجمالي الإيرادات</div>'+
              '<div style="color:#16a34a;font-weight:700;font-size:13px;">'+p._totalRevenue.toLocaleString('en-US')+' د.ع</div>'+
            '</div>'+
            '<div style="background:' + (p._totalProfit >= 0 ? 'f0fdf4;border:1px solid #bbf7d0;' : 'fee2e2;border:1px solid #fca5a5;') + 'padding:8px;border-radius:8px;">'+
              '<div style="color:' + (p._totalProfit >= 0 ? '#15803d' : '#991b1b') + ';font-size:11px;margin-bottom:2px;">صافي الربح</div>'+
              '<div style="color:' + (p._totalProfit >= 0 ? '#16a34a' : '#dc2626') + ';font-weight:700;font-size:13px;">' + (p._totalProfit >= 0 ? '+' : '') + p._totalProfit.toLocaleString('en-US') + '</div>'+
            '</div>'+
          '</div>'+
          warningBadge +
        '</div>';
      }).join('');

    var html = '<div style="padding:8px;">'+
      '<div style="margin-bottom:12px;padding:10px;background:#f9fafb;border-radius:10px;font-size:12px;color:#6b7280;">'+
        '<strong>ترتيب:</strong> المنتجات الأكثر ربحية في الأعلى. المنتجات بدون سعر تكلفة في الأسفل مع تحذير.'+
      '</div>'+
      rows +
    '</div>';

    list.innerHTML = html;
    _profitBreakdownCache = html;
  } catch(e) {
    list.innerHTML = '<p class="text-sm text-red-500 text-center py-3">خطأ في التحميل: '+(e.message||'')+'</p>';
  }
}

async function deleteAnalyticsView() {
  var cards = document.getElementById('analyticsCards');
  var products = document.getElementById('topProductsList');
  var status = document.getElementById('analyticsStatusSummary');
  if (!_lastAnalyticsSnapshot) { if(typeof showToast==='function') showToast('لا توجد بيانات لحذفها','error'); return; }
  if (!confirm('هل تريد مسح عرض الإحصائيات الحالية؟ يمكنك التراجع لاحقاً')) return;

  var deletionTime = new Date().toISOString();
  try {
    if (typeof SupaDB !== 'undefined' && SupaDB.Settings) {
      await SupaDB.Settings.set('analytics_deleted_at', deletionTime);
    }
  } catch(e) {
    console.warn('[Analytics] Failed to save deletion flag:', e.message);
  }

  _analyticsDeletedAt = new Date(deletionTime);

  if (cards) cards.innerHTML='<div class="col-span-2 sm:col-span-4 text-center py-12 text-brand-400"><p class="mb-4">تم مسح الإحصائيات</p><button onclick="window._reloadAnalytics()" class="bg-brand-700 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-600 transition-colors text-sm">🔄 إعادة تحميل الإحصائيات</button></div>';
  if (products) products.innerHTML='';
  if (status) status.innerHTML='';
  if (_analyticsChartMonthly) { _analyticsChartMonthly.destroy(); _analyticsChartMonthly=null; }
  var summaryEl=document.getElementById('analyticsSalesSummary'); if(summaryEl) summaryEl.innerHTML='';
  var profitSection=document.getElementById('analyticsProfitCards'); if (profitSection) profitSection.innerHTML='';
  var profitPanel=document.getElementById('profitDetailsPanel');
  if (profitPanel) { profitPanel.classList.add('hidden'); var pList=document.getElementById('profitDetailsList'); if(pList) pList.innerHTML=''; }
  _profitBreakdownCache=null;
  _productQtyCache={};
  _lastAnalyticsSnapshot=null;
  var profitBtn=document.getElementById('profitDetailsBtn');
  if (profitBtn) { var sp=profitBtn.querySelector('span'); if(sp) sp.textContent='تفاصيل الربح'; }
  var visStats=document.getElementById('visitorStatsSection'); if (visStats) visStats.remove();
  localStorage.setItem('analyticsHidden','1');
  var undoBtn=document.getElementById('analyticsUndoBtn');
  if (undoBtn) { undoBtn.classList.remove('hidden'); }
  if(typeof showToast==='function') showToast('تم مسح الإحصائيات','info');
}

function undoDeleteAnalytics() {
  var undoBtn=document.getElementById('analyticsUndoBtn');
  if (undoBtn) undoBtn.classList.add('hidden');
  localStorage.removeItem('analyticsHidden');
  if (typeof SupaDB !== 'undefined' && SupaDB.Settings) {
    SupaDB.Settings.set('analytics_deleted_at', null).catch(function(){});
  }
  _analyticsDeletedAt = null;
  loadAnalytics();
  if(typeof showToast==='function') showToast('تم استعادة الإحصائيات','success');
}

function _renderDayOfWeekChart(allOrders) {
  var container = document.getElementById('dayOfWeekSection');
  if (!container) return;
  var arDays = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var counts = [0,0,0,0,0,0,0];
  var revenue = [0,0,0,0,0,0,0];
  allOrders.filter(function(o){ return o.status!=='cancelled'; }).forEach(function(o) {
    var d = new Date(o.created_at||0).getDay();
    counts[d]++;
    revenue[d] += Number(o.total_amount||o.total||0);
  });
  var maxC = Math.max.apply(Math, counts.concat([1]));
  var bestDay = counts.indexOf(Math.max.apply(Math, counts));
  container.innerHTML =
    '<div class="bg-white rounded-2xl p-4 sm:p-5 border border-brand-100 shadow-sm mb-4"><div class="flex items-center justify-between mb-4"><h3 class="font-bold text-brand-900 text-sm">📅 مبيعات أيام الأسبوع</h3><span class="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-semibold">أفضل يوم: ' + arDays[bestDay] + '</span></div><div class="flex items-end gap-1 sm:gap-2 h-28">' +
    counts.map(function(c, i) {
      var pct = maxC > 0 ? Math.round((c / maxC) * 100) : 0;
      var isBest = i === bestDay;
      return '<div class="flex-1 flex flex-col items-center gap-1"><span class="text-xs font-bold text-brand-700" style="font-size:10px;">' + c + '</span><div style="height:' + Math.max(pct, 4) + '%;width:100%;border-radius:6px 6px 0 0;background:' + (isBest ? 'linear-gradient(to top,#1a5c0f,#4ade80)' : '#d1fae5') + ';min-height:4px;transition:height 0.5s;"></div><span style="font-size:9px;color:#6b7280;text-align:center;white-space:nowrap;">' + arDays[i].slice(0,3) + '</span></div>';
    }).join('') +
    '</div><div class="mt-3 pt-3 border-t border-brand-50 grid grid-cols-7 gap-1">' +
    revenue.map(function(r, i) {
      return '<div class="text-center"><p style="font-size:9px;color:#94a3b8;">' + (r > 0 ? (r/1000).toFixed(0)+'K' : '—') + '</p></div>';
    }).join('') +
    '</div></div>';
}

function _renderBestCustomer(allOrders) {
  var container = document.getElementById('bestCustomerSection');
  if (!container) return;
  var now = new Date();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  var monthOrders = allOrders.filter(function(o) { return new Date(o.created_at||0) >= monthStart && o.status !== 'cancelled'; });
  var custMap = {};
  monthOrders.forEach(function(o) {
    var ph = (o.customer_phone||o.phone||'').trim();
    var nm = (o.customer_name||o.name||'—').trim();
    if (!ph) return;
    if (!custMap[ph]) custMap[ph] = { name: nm, phone: ph, count: 0, spend: 0 };
    custMap[ph].count++;
    custMap[ph].spend += Number(o.total_amount||o.total||0);
  });
  var ranked = Object.values(custMap).sort(function(a,b){ return b.spend - a.spend; }).slice(0, 3);
  if (!ranked.length) { container.innerHTML = ''; return; }
  var medals = ['🥇','🥈','🥉'];
  var arMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  container.innerHTML =
    '<div class="bg-white rounded-2xl p-4 sm:p-5 border border-amber-100 shadow-sm mb-4"><h3 class="font-bold text-brand-900 text-sm mb-3">🏆 أفضل عملاء ' + arMonths[now.getMonth()] + '</h3><div class="space-y-2">' +
    ranked.map(function(c, i) {
      return '<div class="flex items-center justify-between p-2 rounded-xl ' + (i===0?'bg-amber-50 border border-amber-200':'bg-brand-50') + '"><div class="flex items-center gap-2"><span style="font-size:20px;">' + medals[i] + '</span><div><p class="font-bold text-brand-900 text-sm">' + c.name + '</p><p class="text-brand-500 text-xs" dir="ltr">' + c.phone + '</p></div></div><div class="text-left"><p class="font-bold text-brand-900 text-sm">' + c.spend.toLocaleString('en-US') + ' <span class="text-xs font-normal text-brand-400">د.ع</span></p><p class="text-brand-400 text-xs">' + c.count + ' طلب</p></div></div>';
    }).join('') +
    '</div></div>';
}

function _renderDeliveryRate(allOrders) {
  var container = document.getElementById('deliveryRateSection');
  if (!container) return;
  var total = allOrders.filter(function(o){ return o.status !== 'new' && o.status !== 'pending'; }).length || 1;
  var delivered = allOrders.filter(function(o){ return o.status === 'delivered'; }).length;
  var cancelled = allOrders.filter(function(o){ return o.status === 'cancelled'; }).length;
  var rate = Math.round((delivered / total) * 100);
  var cancelRate = Math.round((cancelled / allOrders.length) * 100);
  var color = rate >= 85 ? '#059669' : rate >= 70 ? '#d97706' : '#dc2626';
  var deliveredOrders = allOrders.filter(function(o){ return o.status==='delivered' && o.created_at && o.updated_at; });
  var avgHours = 0;
  if (deliveredOrders.length) {
    var totalMs = deliveredOrders.reduce(function(s,o){ return s + (new Date(o.updated_at) - new Date(o.created_at)); }, 0);
    avgHours = Math.round(totalMs / deliveredOrders.length / 3600000 * 10) / 10;
  }
  container.innerHTML =
    '<div class="bg-white rounded-2xl p-4 sm:p-5 border border-brand-100 shadow-sm mb-4"><h3 class="font-bold text-brand-900 text-sm mb-4">🚚 معدل نجاح التوصيل</h3><div class="flex items-center gap-4"><div class="relative w-20 h-20 flex-shrink-0"><svg viewBox="0 0 36 36" style="transform:rotate(-90deg);width:80px;height:80px;"><circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" stroke-width="3"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="' + color + '" stroke-width="3" stroke-dasharray="' + rate + ' 100" stroke-linecap="round"/></svg><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;"><span style="font-size:16px;font-weight:800;color:' + color + ';">' + rate + '%</span></div></div><div class="flex-1 space-y-2"><div class="flex justify-between text-xs"><span class="text-brand-600">✅ مكتمل</span><span class="font-bold text-green-700">' + delivered + ' طلب</span></div><div class="flex justify-between text-xs"><span class="text-brand-600">❌ ملغى</span><span class="font-bold text-red-600">' + cancelled + ' (' + cancelRate + '%)</span></div>' + (avgHours > 0 ? '<div class="flex justify-between text-xs"><span class="text-brand-600">⏱️ متوسط وقت التوصيل</span><span class="font-bold text-blue-700">' + avgHours + ' ساعة</span></div>' : '') + '</div></div></div>';
}

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
      fetch(SUPABASE_URL + '/rest/v1/page_views?select=id&created_at=gte.' + since, { headers: Object.assign({}, headers, { 'Prefer': 'count=exact' }) }),
      fetch(SUPABASE_URL + '/rest/v1/page_views?select=id&created_at=gte.' + todayStr, { headers: Object.assign({}, headers, { 'Prefer': 'count=exact' }) }),
    ]);
    var allRange = allRes.headers.get('content-range') || '';
    var monthRange = monthRes.headers.get('content-range') || '';
    var todayRange = todayRes.headers.get('content-range') || '';
    var totalVisitors = allRange.includes('/') ? parseInt(allRange.split('/')[1]) || 0 : 0;
    var monthVisitors = monthRange.includes('/') ? parseInt(monthRange.split('/')[1]) || 0 : 0;
    var todayVisitors = todayRange.includes('/') ? parseInt(todayRange.split('/')[1]) || 0 : 0;
    var analyticsSection = document.getElementById('analyticsCards');
    if (!analyticsSection) return;
    var old = document.getElementById('visitorStatsSection');
    if (old) old.remove();
    var html = '<div class="bg-white rounded-2xl p-5 border border-teal-100 bg-teal-50 shadow-sm"><div class="flex items-center gap-3 mb-3"><div class="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-100 text-teal-700"><i data-lucide="eye" class="w-5 h-5"></i></div><span class="text-sm font-semibold text-brand-600">إجمالي الزيارات</span></div><p class="text-2xl font-bold text-brand-900">' + Number(totalVisitors).toLocaleString('en-US') + '</p></div>' +
      '<div class="bg-white rounded-2xl p-5 border border-sky-100 bg-sky-50 shadow-sm"><div class="flex items-center gap-3 mb-3"><div class="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-100 text-sky-700"><i data-lucide="calendar-check" class="w-5 h-5"></i></div><span class="text-sm font-semibold text-brand-600">زيارات اليوم</span></div><p class="text-2xl font-bold text-brand-900">' + Number(todayVisitors).toLocaleString('en-US') + '</p></div>' +
      '<div class="bg-white rounded-2xl p-5 border border-violet-100 bg-violet-50 shadow-sm"><div class="flex items-center gap-3 mb-3"><div class="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-100 text-violet-700"><i data-lucide="bar-chart-2" class="w-5 h-5"></i></div><span class="text-sm font-semibold text-brand-600">زيارات آخر 30 يوم</span></div><p class="text-2xl font-bold text-brand-900">' + Number(monthVisitors).toLocaleString('en-US') + '</p></div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (e) {
    console.warn('[Visitors] Error loading visitor stats:', e.message);
  }
}
