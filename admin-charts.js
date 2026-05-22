// Stats Functions
function setDateRange(range) {
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
  updateStatsForDateRange();
  if (visitorsChart) initVisitorsChart();
  lucide.createIcons();
}

function getDateRangeText(range) {
  var today = new Date();
  var rangeConfig = dateRanges[range];

  if (range === 'today') return 'عرض إحصائيات اليوم: ' + formatDate(today);
  else if (range === 'yesterday') {
    var yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    return 'عرض إحصائيات الأمس: ' + formatDate(yesterday);
  } else {
    var startDate = new Date(today); startDate.setDate(startDate.getDate() - rangeConfig.days + 1);
    return 'عرض إحصائيات ' + rangeConfig.label + ' (من ' + formatDate(startDate) + ' إلى ' + formatDate(today) + ')';
  }
}

function formatDate(date) { return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }); }

function getDateRangeDates() {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var endDate = new Date(today); endDate.setHours(23, 59, 59, 999);
  var startDate = new Date(today);

  switch (currentDateRange) {
    case 'today': break;
    case 'yesterday': startDate.setDate(startDate.getDate() - 1); endDate.setDate(endDate.getDate() - 1); endDate.setHours(23, 59, 59, 999); break;
    case 'week': startDate.setDate(startDate.getDate() - 6); break;
    case 'month': startDate.setDate(startDate.getDate() - 29); break;
    case 'year': startDate.setDate(startDate.getDate() - 364); break;
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

function getVisitorsForDateRange(startDate, endDate) {
  var historicalData = safeJSONParse(localStorage.getItem('phHistoricalVisitors'), {}) || {};
  var stats = safeJSONParse(localStorage.getItem('phStats'), {}) || {};
  var total = 0;
  var dailyData = [];
  var currentDate = new Date(startDate);
  var today = new Date(); today.setHours(0, 0, 0, 0);

  while (currentDate <= endDate) {
    var dateKey = currentDate.toISOString().split('T')[0];
    var dayVisitors = 0;
    if (currentDate.getTime() === today.getTime()) dayVisitors = stats.todayVisitors || 0;
    else if (historicalData[dateKey]) dayVisitors = historicalData[dateKey].visitors || 0;

    dailyData.push({ date: new Date(currentDate), dateKey: dateKey, visitors: dayVisitors });
    total += dayVisitors;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return { total: total, dailyData: dailyData };
}

function updateStatsForDateRange() {
  var dateRange = getDateRangeDates();
  var prevDateRange = getPreviousPeriodDates();
  var currentData = getVisitorsForDateRange(dateRange.startDate, dateRange.endDate);
  var previousData = getVisitorsForDateRange(prevDateRange.startDate, prevDateRange.endDate);

  var avgVisitors = currentData.total > 0 ? Math.round(currentData.total / dateRanges[currentDateRange].days) : 0;
  var maxVisitors = Math.max.apply(Math, currentData.dailyData.map(function(d) { return d.visitors; })) || 0;
  var changePercent = previousData.total > 0 ? Math.round(((currentData.total - previousData.total) / previousData.total) * 100) : 0;
  var changeIcon = changePercent >= 0 ? 'trending-up' : 'trending-down';
  var changeColor = changePercent >= 0 ? 'text-green-600' : 'text-red-600';

  var orders = safeJSONParse(localStorage.getItem('phOrders'), []) || [];
  var periodOrders = orders.filter(function(o) {
    var orderDate = new Date(o.date);
    return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
  });

  var html = '';

  html += '<div class="stat-card bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 border-r-4 border-brand-500 animate-fade-in">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg"><i data-lucide="users" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl text-brand-900 mb-1">' + currentData.total + '</h3>' +
    '<p class="text-brand-600 text-xs sm:text-sm">إجمالي الزوار</p>' +
    '<p class="text-brand-400 text-xs mt-1">(' + dateRanges[currentDateRange].periodLabel + ')</p></div>';

  html += '<div class="stat-card bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 border-r-4 border-brand-600 animate-fade-in" style="animation-delay: 0.1s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-400 to-brand-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg"><i data-lucide="bar-chart-2" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl text-brand-900 mb-1">' + avgVisitors + '</h3>' +
    '<p class="text-brand-600 text-xs sm:text-sm">متوسط الزوار يومياً</p></div>';

  var newOrders = periodOrders.filter(function(o) { return o.status !== 'delivered' && o.status !== 'cancelled'; }).length;
  html += '<div class="stat-card bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 border-r-4 border-gold animate-fade-in" style="animation-delay: 0.2s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-gold to-yellow-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg"><i data-lucide="shopping-bag" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl text-brand-900 mb-1">' + periodOrders.length + '</h3>' +
    '<p class="text-brand-600 text-xs sm:text-sm">إجمالي الطلبات</p>' +
    '<p class="text-gold text-xs font-semibold mt-1">' + newOrders + ' جديدة</p></div>';

  html += '<div class="stat-card bg-gradient-to-br from-brand-700 to-brand-800 rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-6 animate-fade-in" style="animation-delay: 0.3s">' +
    '<div class="flex items-center justify-between mb-2 sm:mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center"><i data-lucide="' + changeIcon + '" class="w-5 h-5 sm:w-7 sm:h-7 text-white"></i></div></div>' +
    '<h3 class="font-bold text-xl sm:text-2xl md:text-4xl mb-1">' + (changePercent >= 0 ? '+' : '') + changePercent + '%</h3>' +
    '<p class="text-white/80 text-xs sm:text-sm">مقارنة بالفترة السابقة</p></div>';

  document.getElementById('statsCardsContainer').innerHTML = DOMPurify.sanitize(html);

  var comparisonHtml = '';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="text-2xl sm:text-3xl font-bold text-brand-700 mb-1 sm:mb-2">' + currentData.total + '</div><div class="text-xs sm:text-sm text-brand-600">الزوار الحالي</div><div class="text-xs text-brand-400 mt-1">(' + dateRanges[currentDateRange].label + ')</div></div>';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="text-2xl sm:text-3xl font-bold text-brand-500 mb-1 sm:mb-2">' + previousData.total + '</div><div class="text-xs sm:text-sm text-brand-600">الزوار السابق</div><div class="text-xs text-brand-400 mt-1">(نفس المدة)</div></div>';
  var diff = currentData.total - previousData.total;
  var diffColor = diff >= 0 ? 'text-green-600' : 'text-red-600';
  var diffIcon = diff >= 0 ? 'arrow-up' : 'arrow-down';
  comparisonHtml += '<div class="period-stat-card text-center"><div class="' + diffColor + ' text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 flex items-center justify-center gap-2"><i data-lucide="' + diffIcon + '" class="w-5 h-5 sm:w-6"></i>' + Math.abs(diff) + '</div><div class="text-xs sm:text-sm text-brand-600">الفرق</div><div class="' + diffColor + ' text-xs mt-1">' + (diff >= 0 ? '+' : '') + changePercent + '%</div></div>';

  document.getElementById('comparisonContent').innerHTML = DOMPurify.sanitize(comparisonHtml);
  document.getElementById('chartChangeValue').textContent = (changePercent >= 0 ? '+' : '') + changePercent + '%';
  document.getElementById('chartTotalChange').className = 'flex items-center gap-2 text-xs sm:text-sm font-semibold ' + changeColor;

  renderDetailedStatsTable(currentData.dailyData);
  lucide.createIcons();
}

function renderDetailedStatsTable(dailyData) {
  var html = '<table class="w-full text-xs sm:text-sm"><thead><tr class="border-b border-brand-200"><th class="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">التاريخ</th><th class="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">الزوار</th><th class="text-center py-2 sm:py-3 px-2 sm:px-4 font-semibold text-brand-700">النسبة</th></tr></thead><tbody>';
  var total = dailyData.reduce(function(sum, d) { return sum + d.visitors; }, 0);

  dailyData.forEach(function(day) {
    var percentage = total > 0 ? Math.round((day.visitors / total) * 100) : 0;
    var barWidth = percentage;
    html += '<tr class="border-b border-brand-100 hover:bg-brand-50"><td class="py-2 sm:py-3 px-2 sm:px-4 text-brand-700">' + formatDate(day.date) + '</td><td class="py-2 sm:py-3 px-2 sm:px-4 text-center font-semibold text-brand-900">' + day.visitors + '</td><td class="py-2 sm:py-3 px-2 sm:px-4"><div class="flex items-center gap-2"><div class="flex-1 bg-brand-100 rounded-full h-1.5 sm:h-2 overflow-hidden"><div class="progress-bar" style="width: ' + barWidth + '%"></div></div><span class="text-xs text-brand-600 w-10">' + percentage + '%</span></div></td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('detailedStatsTable').innerHTML = DOMPurify.sanitize(html);
}

function initVisitorsChart() {
  var ctx = document.getElementById('visitorsChart');
  if (!ctx) return;

  var dateRange = getDateRangeDates();
  var prevDateRange = getPreviousPeriodDates();
  var currentData = getVisitorsForDateRange(dateRange.startDate, dateRange.endDate);
  var previousData = getVisitorsForDateRange(prevDateRange.startDate, prevDateRange.endDate);

  var labels = currentData.dailyData.map(function(d) { return d.date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }); });
  var currentValues = currentData.dailyData.map(function(d) { return d.visitors; });
  var previousValues = previousData.dailyData.map(function(d) { return d.visitors; });

  if (visitorsChart) visitorsChart.destroy();

  visitorsChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'الفترة المحددة', data: currentValues, borderColor: '#5C933B', backgroundColor: 'rgba(92, 147, 59, 0.15)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: currentDateRange === 'today' || currentDateRange === 'yesterday' ? 6 : 3, pointBackgroundColor: '#5C933B', pointBorderColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 8 },
        { label: 'الفترة السابقة', data: previousValues, borderColor: '#D1D5B1', backgroundColor: 'rgba(209, 213, 177, 0.15)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#D1D5B1', pointBorderColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#2D5016', titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' }, padding: 12, cornerRadius: 8 } },
      scales: { x: { grid: { display: false }, ticks: { font: { family: 'Cairo' } }, y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Cairo' } }, beginAtZero: true } } }
    }
  });
}

function initCategoryChart() {
  var ctx = document.getElementById('categoryChart');
  if (!ctx) return;

  var products = safeJSONParse(localStorage.getItem('phProducts'), []) || [];
  var categories = { medicines: 0, skincare: 0, makeup: 0, devices: 0 };
  products.forEach(function(p) { if (categories.hasOwnProperty(p.category)) categories[p.category]++; });

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['أدوية', 'عناية بالبشرة', 'مكياج', 'أجهزة'],
      datasets: [{
        data: [categories.medicines, categories.skincare, categories.makeup, categories.devices],
        backgroundColor: ['#3B82F6', '#EC4899', '#8B5CF6', '#6B7280'],
        borderWidth: 0, hoverOffset: 10
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 12 }, padding: 15 } }, tooltip: { backgroundColor: '#2D5016', titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } } },
      cutout: '60%'
    }
  });
}

function initOrdersChart() {
  var ctx = document.getElementById('ordersChart');
  if (!ctx) return;

  var orders = safeJSONParse(localStorage.getItem('phOrders'), []) || [];
  var statusCounts = { new: 0, progress: 0, delivered: 0, cancelled: 0 };
  orders.forEach(function(o) { if (statusCounts.hasOwnProperty(o.status)) statusCounts[o.status]++; });

  if (ordersChart) ordersChart.destroy();

  ordersChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['جديدة', 'قيد التوصيل', 'تم التوصيل', 'ملغاة'],
      datasets: [{
        data: [statusCounts.new, statusCounts.progress, statusCounts.delivered, statusCounts.cancelled],
        backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#EF4444'],
        borderWidth: 0, hoverOffset: 10
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 12 }, padding: 15 } }, tooltip: { backgroundColor: '#2D5016', titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } } },
      cutout: '60%'
    }
  });
}

function resetTodayStats() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  var stats = safeJSONParse(localStorage.getItem('phStats'), {}) || {};
  stats.todayVisitors = 0;
  localStorage.setItem('phStats', JSON.stringify(stats));
  updateStatsForDateRange();
  showToast('تم إعادة تعيين إحصائيات اليوم');
}

function resetAllStats() {
  if (!isAuthenticated()) { showToast('يرجى تسجيل الدخول أولاً', 'error'); return; }
  if (!confirm('هل أنت متأكد؟ سيتم إعادة تعيين جميع الإحصائيات.')) return;
  localStorage.removeItem('phStats');
  localStorage.removeItem('phHistoricalVisitors');
  updateStatsForDateRange();
  showToast('تم إعادة تعيين جميع الإحصائيات');
}

function exportStats() {
  var historicalData = safeJSONParse(localStorage.getItem('phHistoricalVisitors'), {}) || {};
  var stats = safeJSONParse(localStorage.getItem('phStats'), {});
  var today = new Date().toISOString().split('T')[0];

  var data = [['التاريخ', 'الزوار']];
  for (var date in historicalData) {
    if (historicalData.hasOwnProperty(date)) {
      data.push([date, historicalData[date].visitors]);
    }
  }
  data.push(['اليوم (' + today + ')', stats.todayVisitors || 0]);

  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'الإحصائيات');
  XLSX.writeFile(wb, 'neurobin_stats_' + today + '.xlsx');
  showToast('تم تصدير الإحصائيات بنجاح');
}
