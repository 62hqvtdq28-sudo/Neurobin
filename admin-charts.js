// admin-charts.js — v4 (fixed visits chart, category chart, delete+undo)
// ════════════════════════════════════════════════════════════════════════════

var _chartsData = null;
var _statsRefreshInterval = null;
var _lastStatsSnapshot = null; // for undo

var SUPABASE_URL = 'https://hczsskviliuqyayylutv.supabase.co';
var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjenNza3ZpbGl1cXlheXlsdXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDg2OTUsImV4cCI6MjA5NDcyNDY5NX0.mT-fPrPzwbUx3mQZOqFGx8ndWTkUS-MeqLcfaN1zS4k';

async function _loadChartsData(forceRefresh) {
  if (_chartsData && !forceRefresh) return _chartsData;
  var h = { 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + SUPABASE_ANON, 'Accept': 'application/json' };
  var base = SUPABASE_URL + '/rest/v1/';
  var results = await Promise.all([
    fetch(base + 'orders?select=id,status,total_amount,total,items,phone,customer_phone,created_at,date&deleted_at=is.null&order=created_at.desc', { headers: h }).then(function(r){ return r.json(); }),
    fetch(base + 'page_views?select=id,device,created_at&order=created_at.desc&limit=2000', { headers: h }).then(function(r){ return r.json(); }),
    fetch(base + 'products?select=id,name,category', { headers: h }).then(function(r){ return r.json(); })
  ]);
  _chartsData = {
    orders:    Array.isArray(results[0]) ? results[0] : [],
    pageViews: Array.isArray(results[1]) ? results[1] : [],
    products:  Array.isArray(results[2]) ? results[2] : []
  };
  return _chartsData;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date) {
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getDateRangeDates() {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var endDate = new Date(today); endDate.setHours(23, 59, 59, 999);
  var startDate = new Date(today);
  switch (currentDateRange) {
    case 'today':     break;
    case 'yesterday': startDate.setDate(startDate.getDate() - 1); endDate.setDate(endDate.getDate() - 1); endDate.setHours(23, 59, 59, 999); break;
    case 'week':      startDate.setDate(startDate.getDate() - 6); break;
    case 'month':     startDate.setDate(startDate.getDate() - 29); break;
    case 'year':      startDate.setDate(startDate.getDate() - 364); break;
  }
  return { startDate: startDate, endDate: endDate };
}

function getPreviousPeriodDates() {
  var currentRange = getDateRangeDates();
  var days = dateRanges[currentDateRange].days;
  var prevEndDate = new Date(currentRange.startDate); prevEndDate.setDate(prevEndDate.getDate() - 1); prevEndDate.setHours(23, 59, 59, 999);
  var prevStartDate = new Date(prevEndDate); prevStartDate.setDate(prevStartDate.getDate() - days + 1); prevStartDate.setHours(0, 0, 0, 0);
  return { startDate: prevStartDate, endDate: prevEndDate };
}

function getDateRangeText(range) {
  var today = new Date();
  var rangeConfig = dateRanges[range];
  if (range === 'today') return 'عرض إحصائيات اليوم: ' + formatDate(today);
  if (range === 'yesterday') { var y = new Date(today); y.setDate(y.getDate() - 1); return 'عرض إحصائيات الأمس: ' + formatDate(y); }
  var startDate = new Date(today); startDate.setDate(startDate.getDate() - rangeConfig.days + 1);
  return 'عرض إحصائيات ' + rangeConfig.label + ' (من ' + formatDate(startDate) + ' إلى ' + formatDate(today) + ')';
}

function _filterPageViews(pageViews, startDate, endDate) {
  var total = 0;
  var dailyData = [];
  var byDay = {};
  pageViews.forEach(function(v) {
    var d = new Date(v.created_at);
    if (d >= startDate && d <= endDate) {
      var key = v.created_at.slice(0, 10);
      byDay[key] = (byDay[key] || 0) + 1;
    }
  });
  var cur = new Date(startDate);
  while (cur <= endDate) {
    var key = cur.toISOString().slice(0, 10);
    var count = byDay[key] || 0;
    dailyData.push({ date: new Date(cur), dateKey: key, visitors: count });
    total += count;
    cur.setDate(cur.getDate() + 1);
  }
  return { total: total, dailyData: dailyData };
}

function _filterOrders(orders, startDate, endDate) {
  return orders.filter(function(o) {
    var d = new Date(o.created_at || o.date);
    return d >= startDate && d <= endDate;
  });
}

// ── Main update ──────────────────────────────────────────────────────────────

async function updateStatsForDateRange() {
  var dateRange     = getDateRangeDates();
  var prevDateRange = getPreviousPeriodDates();

  var data;
  try { data = await _loadChartsData(); }
  catch(e) { console.error('[Charts] load failed', e); return; }

  var currentViews  = _filterPageViews(data.pageViews, dateRange.startDate, dateRange.endDate);
  var previousViews = _filterPageViews(data.pageViews, prevDateRange.startDate, prevDateRange.endDate);

  var avgVisitors   = currentViews.total > 0 ? Math.round(currentViews.total / dateRanges[currentDateRange].days) : 0;
  var changePercent = previousViews.total > 0 ? Math.round(((currentViews.total - previousViews.total) / previousViews.total) * 100) : 0;
  var changeIcon    = changePercent >= 0 ? 'trending-up' : 'trending-down';
  var changeColor   = changePercent >= 0 ? 'text-green-600' : 'text-red-600';

  var periodOrders  = _filterOrders(data.orders, dateRange.startDate, dateRange.endDate);
  var newOrders     = periodOrders.filter(function(o){ return o.status !== 'delivered' && o.status !== 'cancelled'; }).length;

  // حفظ snapshot
  _lastStatsSnapshot = {
    currentViews: currentViews, previousViews: previousViews,
    avgVisitors: avgVisitors, changePercent: changePercent,
    periodOrders: periodOrders, newOrders: newOrders
  };

  var html = '';
  html += '<div class="stat-card bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 border-r-4 border-brand-500 animate-fade-in">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg"><i data-lucide="users" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl text-brand-900 mb-1">' + currentViews.total + '</h3>' +
    '<p class="text-brand-600 text-xs sm:text-sm">إجمالي الزوار</p>' +
    '<p class="text-brand-400 text-xs mt-1">(' + dateRanges[currentDateRange].periodLabel + ')</p></div>';

  html += '<div class="stat-card bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 border-r-4 border-brand-600 animate-fade-in" style="animation-delay:0.1s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-400 to-brand-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg"><i data-lucide="bar-chart-2" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl text-brand-900 mb-1">' + avgVisitors + '</h3>' +
    '<p class="text-brand-600 text-xs sm:text-sm">متوسط الزوار يومياً</p></div>';

  html += '<div class="stat-card bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 border-r-4 border-gold animate-fade-in" style="animation-delay:0.2s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-gold to-yellow-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg"><i data-lucide="shopping-bag" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl text-brand-900 mb-1">' + periodOrders.length + '</h3>' +
    '<p class="text-brand-600 text-xs sm:text-sm">إجمالي الطلبات</p>' +
    '<p class="text-gold text-xs font-semibold mt-1">' + newOrders + ' جديدة</p></div>';

  html += '<div class="stat-card bg-gradient-to-br from-brand-700 to-brand-800 rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 animate-fade-in" style="animation-delay:0.3s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center"><i data-lucide="' + changeIcon + '" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl mb-1 text-white">' + (changePercent >= 0 ? '+' : '') + changePercent + '%</h3>' +
    '<p class="text-white/80 text-xs sm:text-sm">مقارنة بالفترة السابقة</p></div>';

  document.getElementById('statsCardsContainer').innerHTML = DOMPurify.sanitize(html);

  var diff = currentViews.total - previousViews.total;
  var diffColor = diff >= 0 ? 'text-green-600' : 'text-red-600';
  var diffIcon2 = diff >= 0 ? 'arrow-up' : 'arrow-down';
  var compHtml =
    '<div class="period-stat-card text-center"><div class="text-2xl sm:text-3xl font-bold text-brand-700 mb-1 sm:mb-2">' + currentViews.total + '</div><div class="text-xs sm:text-sm text-brand-600">الزوار الحالي</div><div class="text-xs text-brand-400 mt-1">(' + dateRanges[currentDateRange].label + ')</div></div>' +
    '<div class="period-stat-card text-center"><div class="text-2xl sm:text-3xl font-bold text-brand-500 mb-1 sm:mb-2">' + previousViews.total + '</div><div class="text-xs sm:text-sm text-brand-600">الزوار السابق</div><div class="text-xs text-brand-400 mt-1">(نفس المدة)</div></div>' +
    '<div class="period-stat-card text-center"><div class="' + diffColor + ' text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 flex items-center justify-center gap-2"><i data-lucide="' + diffIcon2 + '" class="w-5 h-5 sm:w-6"></i>' + Math.abs(diff) + '</div><div class="text-xs sm:text-sm text-brand-600">الفرق</div><div class="' + diffColor + ' text-xs mt-1">' + (diff >= 0 ? '+' : '') + changePercent + '%</div></div>';

  document.getElementById('comparisonContent').innerHTML = DOMPurify.sanitize(compHtml);
  document.getElementById('chartChangeValue').textContent = (changePercent >= 0 ? '+' : '') + changePercent + '%';
  document.getElementById('chartTotalChange').className = 'flex items-center gap-2 text-xs sm:text-sm font-semibold ' + changeColor;

  renderDetailedStatsTable(currentViews.dailyData);

  // إظهار زر التراجع إذا كان مختفياً
  var undoBtn = document.getElementById('statsUndoBtn');
  if (undoBtn) undoBtn.classList.add('hidden');

  lucide.createIcons();
}

function renderDetailedStatsTable(dailyData) {
  var total = dailyData.reduce(function(s, d){ return s + d.visitors; }, 0);
  var html = '<table class="w-full text-xs sm:text-sm"><thead><tr class="border-b border-brand-200">' +
    '<th class="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">التاريخ</th>' +
    '<th class="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">الزوار</th>' +
    '<th class="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">النسبة</th></tr></thead><tbody>';
  dailyData.forEach(function(day) {
    var pct = total > 0 ? Math.round((day.visitors / total) * 100) : 0;
    html += '<tr class="border-b border-brand-100 hover:bg-brand-50">' +
      '<td class="py-2 sm:py-3 px-2 sm:px-4 text-brand-700">' + formatDate(day.date) + '</td>' +
      '<td class="py-2 sm:py-3 px-2 sm:px-4 text-center font-semibold text-brand-900">' + day.visitors + '</td>' +
      '<td class="py-2 sm:py-3 px-2 sm:px-4"><div class="flex items-center gap-2">' +
      '<div class="flex-1 bg-brand-100 rounded-full h-1.5 sm:h-2 overflow-hidden"><div class="progress-bar" style="width:' + pct + '%"></div></div>' +
      '<span class="text-xs text-brand-600 w-10">' + pct + '%</span></div></td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('detailedStatsTable').innerHTML = DOMPurify.sanitize(html);
}

// ── Charts ───────────────────────────────────────────────────────────────────

async function initVisitorsChart() {
  var ctx = document.getElementById('visitorsChart');
  if (!ctx) return;

  // إظهار حالة تحميل
  var container = ctx.closest('.chart-container') || ctx.parentElement;

  var data;
  try {
    data = await _loadChartsData();
  } catch(e) {
    console.error('[Charts] initVisitorsChart load failed:', e);
    if (container) container.innerHTML = '<div class="flex items-center justify-center h-full text-red-400 text-sm">تعذر تحميل بيانات الزيارات</div>';
    return;
  }

  if (!data.pageViews || data.pageViews.length === 0) {
    if (container) container.innerHTML = '<div class="flex items-center justify-center h-full text-brand-300 text-sm">لا توجد بيانات زيارات بعد</div>';
    return;
  }

  var dateRange     = getDateRangeDates();
  var prevDateRange = getPreviousPeriodDates();
  var currentViews  = _filterPageViews(data.pageViews, dateRange.startDate, dateRange.endDate);
  var previousViews = _filterPageViews(data.pageViews, prevDateRange.startDate, prevDateRange.endDate);

  // إعادة إنشاء canvas إن احتاج
  if (!document.getElementById('visitorsChart')) {
    var newCanvas = document.createElement('canvas');
    newCanvas.id = 'visitorsChart';
    container.innerHTML = '';
    container.appendChild(newCanvas);
    ctx = newCanvas;
  } else {
    ctx = document.getElementById('visitorsChart');
  }

  var labels         = currentViews.dailyData.map(function(d){ return d.date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }); });
  var currentValues  = currentViews.dailyData.map(function(d){ return d.visitors; });
  var previousValues = previousViews.dailyData.map(function(d){ return d.visitors; });

  if (visitorsChart) { try { visitorsChart.destroy(); } catch(e){} }
  visitorsChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'الفترة المحددة', data: currentValues, borderColor: '#5C933B', backgroundColor: 'rgba(92,147,59,0.15)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: (currentDateRange === 'today' || currentDateRange === 'yesterday') ? 6 : 3, pointBackgroundColor: '#5C933B', pointBorderColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 8 },
        { label: 'الفترة السابقة', data: previousValues, borderColor: '#D1D5B1', backgroundColor: 'rgba(209,213,177,0.15)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#D1D5B1', pointBorderColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#2D5016', titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' }, padding: 12, cornerRadius: 8 } },
      scales: { x: { grid: { display: false }, ticks: { font: { family: 'Cairo' } } }, y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Cairo' }, callback: function(v){ return v; } }, beginAtZero: true } }
    }
  });
}

async function initCategoryChart() {
  var ctx = document.getElementById('categoryChart');
  if (!ctx) return;

  var data;
  try { data = await _loadChartsData(); } catch(e) {
    console.error('[Charts] initCategoryChart load failed:', e);
    return;
  }

  if (!data.products || data.products.length === 0) {
    var cont = ctx.closest('.chart-container') || ctx.parentElement;
    if (cont) cont.innerHTML = '<div class="flex items-center justify-center h-full text-brand-300 text-sm">لا توجد منتجات بعد</div>';
    return;
  }

  // خريطة شاملة لأسماء الأقسام (تدعم العربي والإنجليزي والأحرف الكبيرة)
  var labelMap = {
    medicines:   'أدوية',  medicine: 'أدوية',
    skincare:    'عناية بالبشرة', skin_care: 'عناية بالبشرة', skin: 'عناية بالبشرة',
    makeup:      'مكياج', cosmetics: 'مكياج',
    devices:     'أجهزة', device: 'أجهزة',
    supplements: 'مكملات',
    perfumes:    'عطور', perfume: 'عطور',
    haircare:    'عناية بالشعر', hair: 'عناية بالشعر', hair_care: 'عناية بالشعر',
    dental:      'عناية بالأسنان', teeth: 'عناية بالأسنان',
    packages:    'بكجات', bundles: 'باقات',
    other:       'أخرى'
  };

  var categories = {};
  data.products.forEach(function(p) {
    var cat = (p.category || 'other').toLowerCase().replace(/\s+/g, '_');
    var label = labelMap[cat] || p.category || 'أخرى';
    categories[label] = (categories[label] || 0) + 1;
  });

  var catLabels = Object.keys(categories);
  var catVals   = catLabels.map(function(k){ return categories[k]; });
  var colors    = ['#3B82F6','#EC4899','#8B5CF6','#10B981','#F59E0B','#6B7280','#EF4444','#14B8A6'];

  if (categoryChart) { try { categoryChart.destroy(); } catch(e){} }
  categoryChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: { labels: catLabels, datasets: [{ data: catVals, backgroundColor: colors.slice(0, catLabels.length), borderWidth: 0, hoverOffset: 10 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 12 }, padding: 15 } },
        tooltip: {
          backgroundColor: '#2D5016', titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' },
          callbacks: {
            label: function(ctx) {
              var total = ctx.dataset.data.reduce(function(s,v){ return s+v; }, 0);
              var pct = total > 0 ? Math.round(ctx.raw/total*100) : 0;
              return ' ' + ctx.label + ': ' + ctx.raw + ' منتج (' + pct + '%)';
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}

// ordersChart محذوف (حسب طلب المستخدم — حالة الطلبات تظهر في التحليلات كأرقام)

// ── Date range selector ──────────────────────────────────────────────────────

async function setDateRange(range) {
  currentDateRange = range;
  document.querySelectorAll('.date-btn').forEach(function(btn) {
    btn.classList.remove('active', 'bg-brand-700', 'text-white');
    btn.classList.add('bg-brand-100', 'text-brand-700');
  });
  var activeBtn = document.querySelector('[data-range="' + range + '"]');
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-brand-700', 'text-white');
    activeBtn.classList.remove('bg-brand-100', 'text-brand-700');
  }
  document.getElementById('dateRangeText').textContent = getDateRangeText(range);
  await updateStatsForDateRange();
  await initVisitorsChart();
  lucide.createIcons();
}

// ── حذف السجل الحالي + تراجع ────────────────────────────────────────────────

function deleteCurrentStats() {
  if (!_lastStatsSnapshot) { if(typeof showToast==='function') showToast('لا توجد بيانات لحذفها','error'); return; }
  if (!confirm('هل تريد مسح السجل الحالي من العرض؟ يمكنك التراجع')) return;

  var statsEl = document.getElementById('statsCardsContainer');
  var compEl  = document.getElementById('comparisonContent');
  var tableEl = document.getElementById('detailedStatsTable');

  if (statsEl) statsEl.innerHTML = '<div class="col-span-4 text-center py-6 text-brand-400 text-sm">تم مسح السجل — اضغط "تراجع" لاستعادته</div>';
  if (compEl)  compEl.innerHTML  = '';
  if (tableEl) tableEl.innerHTML = '';
  if (visitorsChart) { try { visitorsChart.destroy(); visitorsChart=null; } catch(e){} }
  if (categoryChart) { try { categoryChart.destroy(); categoryChart=null; } catch(e){} }

  var undoBtn = document.getElementById('statsUndoBtn');
  if (undoBtn) undoBtn.classList.remove('hidden');
  if(typeof showToast==='function') showToast('تم مسح السجل — اضغط "تراجع" لاستعادته','info');
}

function undoDeleteStats() {
  var undoBtn = document.getElementById('statsUndoBtn');
  if (undoBtn) undoBtn.classList.add('hidden');
  _chartsData = null; // إعادة تحميل من Supabase
  setDateRange(currentDateRange);
  initCategoryChart();
  if(typeof showToast==='function') showToast('تم استعادة السجل','success');
}

// ── Utility actions ──────────────────────────────────────────────────────────

function resetTodayStats() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  showToast('الإحصائيات تُقرأ من Supabase مباشرةً ولا يمكن إعادة تعيينها من هنا', 'error');
}

function resetAllStats() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  showToast('الإحصائيات تُقرأ من Supabase مباشرةً ولا يمكن إعادة تعيينها من هنا', 'error');
}

async function exportStats() {
  var data;
  try { data = await _loadChartsData(); } catch(e) { showToast('خطأ في تحميل البيانات', 'error'); return; }
  var today   = new Date().toISOString().split('T')[0];
  var byDay   = {};
  data.pageViews.forEach(function(v) { var day = v.created_at.slice(0, 10); byDay[day] = (byDay[day] || 0) + 1; });
  var rows = [['التاريخ', 'الزوار']];
  Object.keys(byDay).sort().forEach(function(d){ rows.push([d, byDay[d]]); });
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'الإحصائيات');
  XLSX.writeFile(wb, 'neurobin_stats_' + today + '.xlsx');
  showToast('تم تصدير الإحصائيات بنجاح');
}

// ── Auto-refresh ─────────────────────────────────────────────────────────────

function stopStatsAutoRefresh() {
  if (_statsRefreshInterval) { clearInterval(_statsRefreshInterval); _statsRefreshInterval = null; }
}

async function startStatsAutoRefresh() {
  stopStatsAutoRefresh();
  _statsRefreshInterval = setInterval(async function() {
    try {
      await _loadChartsData(true);
      await updateStatsForDateRange();
      await initVisitorsChart();
    } catch(e) { console.warn('[Charts] auto-refresh error:', e); }
  }, 60000);
}
