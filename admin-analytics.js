// admin-analytics.js — لوحة تحليلات Neurobin
var _analyticsChartStatus  = null;
var _analyticsChartMonthly = null;

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

    // إجمالي المبيعات
    var totalRevenue = delivered.reduce(function(s,o){
      return s + (Number(o.total_amount || o.total) || 0);
    }, 0);

    // متوسط الطلب
    var avgOrder = delivered.length ? Math.round(totalRevenue / delivered.length) : 0;

    // العملاء النشطين (آخر 30 يوم)
    var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    var activePhones = new Set(
      allOrders
        .filter(function(o){ return new Date(o.created_at) >= cutoff; })
        .map(function(o){ return o.customer_phone || o.phone || ''; })
        .filter(Boolean)
    );

    // أكثر المنتجات مبيعاً
    var productQty = {};
    allOrders.forEach(function(o){
      (o.order_items || o.items || []).forEach(function(item){
        var name = item.product_name || item.name || 'منتج';
        productQty[name] = (productQty[name]||0) + (Number(item.quantity)||1);
      });
    });
    var topProducts = Object.entries(productQty)
      .sort(function(a,b){ return b[1]-a[1]; })
      .slice(0, 7);

    // حالات الطلبات
    var sc = { new:0, pending:0, progress:0, delivered:0, cancelled:0 };
    allOrders.forEach(function(o){ var s=o.status||'new'; sc[s]=(sc[s]||0)+1; });

    // مبيعات آخر 6 أشهر
    var mm = {};
    delivered.forEach(function(o){
      var d = new Date(o.created_at);
      var k = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      mm[k] = (mm[k]||0) + (Number(o.total_amount||o.total)||0);
    });
    for (var i=5; i>=0; i--) {
      var md=new Date(); md.setMonth(md.getMonth()-i);
      var mk=md.getFullYear()+'-'+String(md.getMonth()+1).padStart(2,'0');
      if (!mm[mk]) mm[mk]=0;
    }
    var sortedM = Object.keys(mm).sort().slice(-6);
    var arM = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    var mLabels = sortedM.map(function(k){ return arM[parseInt(k.split('-')[1])-1]; });
    var mVals   = sortedM.map(function(k){ return mm[k]; });

    // ════ RENDER ════════════════════════════════════════════════════════════

    // كروت الإحصاء
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

    // أكثر المنتجات مبيعاً
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

    // رسم حالات الطلبات (Doughnut)
    if (typeof Chart !== 'undefined') {
      if (_analyticsChartStatus) _analyticsChartStatus.destroy();
      var ctx1 = document.getElementById('analyticsStatusChart');
      if (ctx1) {
        _analyticsChartStatus = new Chart(ctx1.getContext('2d'), {
          type:'doughnut',
          data:{ labels:['جديد','قيد التوصيل','تم التوصيل','ملغى'],
            datasets:[{ data:[(sc.new||0)+(sc.pending||0),sc.progress||0,sc.delivered||0,sc.cancelled||0],
              backgroundColor:['#3b82f6','#f59e0b','#22c55e','#ef4444'],
              borderWidth:3, borderColor:'#fff', hoverOffset:6 }] },
          options:{ responsive:true, cutout:'65%',
            plugins:{ legend:{ position:'bottom', labels:{ font:{family:'Cairo',size:12}, padding:12 } },
              tooltip:{ callbacks:{ label:function(c){ return ' '+c.label+': '+c.raw+' طلب'; } } } } }
        });
      }

      // رسم المبيعات الشهرية (Bar)
      if (_analyticsChartMonthly) _analyticsChartMonthly.destroy();
      var ctx2 = document.getElementById('analyticsMonthlyChart');
      if (ctx2) {
        _analyticsChartMonthly = new Chart(ctx2.getContext('2d'), {
          type:'bar',
          data:{ labels:mLabels,
            datasets:[{ label:'المبيعات (د.ع)', data:mVals,
              backgroundColor:'rgba(45,80,22,0.12)', borderColor:'#2D5016',
              borderWidth:2.5, borderRadius:10, borderSkipped:false,
              hoverBackgroundColor:'rgba(45,80,22,0.25)' }] },
          options:{ responsive:true, plugins:{ legend:{ display:false } },
            scales:{ x:{ grid:{display:false}, ticks:{font:{family:'Cairo'}} },
              y:{ ticks:{ font:{family:'Cairo'}, callback:function(v){ return v===0?'0':(v/1000).toFixed(0)+'K'; } },
                grid:{color:'rgba(0,0,0,0.05)'} } } }
        });
      }
    }

  } catch(e) {
    if (cardsEl) cardsEl.innerHTML =
      '<div class="col-span-2 sm:col-span-4 text-center py-8 text-red-500">خطأ في التحليل: '+e.message+'</div>';
    console.error('[Analytics]', e);
  }
}
// visitors-analytics-section.js
// ════════════════════════════════════════════════════════════
// أضف هذه الدالة في admin-analytics.js أو admin.js
// واستدعها من loadAnalytics() بعد تحميل باقي الإحصائيات
// ════════════════════════════════════════════════════════════

async function loadVisitorStats() {
  const SUPABASE_URL = 'https://hczsskviliuqyayylutv.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjenNza3ZpbGl1cXlheXlsdXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDg2OTUsImV4cCI6MjA5NDcyNDY5NX0.mT-fPrPzwbUx3mQZOqFGx8ndWTkUS-MeqLcfaN1zS4k';

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Accept': 'application/json'
  };

  try {
    // جلب آخر 30 يوم من الزيارات
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();

    const [allRes, monthRes, todayRes] = await Promise.all([
      // إجمالي الزيارات
      fetch(`${SUPABASE_URL}/rest/v1/page_views?select=count`, { headers })
        .then(r => r.json()),
      // زيارات آخر 30 يوم
      fetch(`${SUPABASE_URL}/rest/v1/page_views?select=id,device,created_at&created_at=gte.${since}&order=created_at.desc&limit=1000`, { headers })
        .then(r => r.json()),
      // زيارات اليوم
      fetch(`${SUPABASE_URL}/rest/v1/page_views?select=count&created_at=gte.${new Date().toISOString().slice(0,10)}`, { headers })
        .then(r => r.json()),
    ]);

    const totalVisitors = allRes[0]?.count || 0;
    const todayVisitors = todayRes[0]?.count || 0;
    const monthVisitors = Array.isArray(monthRes) ? monthRes.length : 0;

    // توزيع الأجهزة
    const devices = { mobile: 0, desktop: 0, tablet: 0 };
    if (Array.isArray(monthRes)) {
      monthRes.forEach(v => {
        const d = v.device || 'desktop';
        devices[d] = (devices[d] || 0) + 1;
      });
    }

    // زيارات آخر 7 أيام (يومياً)
    const dailyCounts = {};
    if (Array.isArray(monthRes)) {
      monthRes.forEach(v => {
        const day = v.created_at.slice(0, 10);
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      });
    }
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last7.push({ day: key.slice(5), count: dailyCounts[key] || 0 });
    }

    // ══ رسم في لوحة الإدمن ══════════════════════════════════

    // ابحث عن عنصر الإحصائيات الموجود وأضف بعده
    const analyticsSection = document.getElementById('analyticsCards');
    if (!analyticsSection) return;

    // إزالة قسم الزوار القديم إن وجد
    const old = document.getElementById('visitorStatsSection');
    if (old) old.remove();

    const mobilePercent = monthVisitors ? Math.round((devices.mobile / monthVisitors) * 100) : 0;
    const desktopPercent = monthVisitors ? Math.round((devices.desktop / monthVisitors) * 100) : 0;
    const tabletPercent  = monthVisitors ? Math.round((devices.tablet  / monthVisitors) * 100) : 0;

    const maxDay = Math.max(...last7.map(d => d.count), 1);

    const html = `
    <div id="visitorStatsSection" class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">

      <!-- كرت: إجمالي الزوار -->
      <div class="bg-white rounded-2xl p-5 border border-teal-100 bg-teal-50 shadow-sm">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-100 text-teal-700">
            <i data-lucide="eye" class="w-5 h-5"></i>
          </div>
          <span class="text-sm font-semibold text-brand-600">إجمالي الزيارات</span>
        </div>
        <p class="text-2xl font-bold text-brand-900">${Number(totalVisitors).toLocaleString('ar-IQ')}</p>
      </div>

      <!-- كرت: زيارات اليوم -->
      <div class="bg-white rounded-2xl p-5 border border-sky-100 bg-sky-50 shadow-sm">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-100 text-sky-700">
            <i data-lucide="calendar-check" class="w-5 h-5"></i>
          </div>
          <span class="text-sm font-semibold text-brand-600">زيارات اليوم</span>
        </div>
        <p class="text-2xl font-bold text-brand-900">${Number(todayVisitors).toLocaleString('ar-IQ')}</p>
      </div>

      <!-- كرت: زيارات 30 يوم -->
      <div class="bg-white rounded-2xl p-5 border border-violet-100 bg-violet-50 shadow-sm">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-100 text-violet-700">
            <i data-lucide="bar-chart-2" class="w-5 h-5"></i>
          </div>
          <span class="text-sm font-semibold text-brand-600">زيارات آخر 30 يوم</span>
        </div>
        <p class="text-2xl font-bold text-brand-900">${Number(monthVisitors).toLocaleString('ar-IQ')}</p>
      </div>

      <!-- رسم بياني: آخر 7 أيام -->
      <div class="sm:col-span-2 bg-white rounded-2xl p-5 border border-brand-100 shadow-sm">
        <h4 class="text-sm font-bold text-brand-700 mb-4">الزيارات — آخر 7 أيام</h4>
        <div class="flex items-end gap-2 h-24">
          ${last7.map(d => `
            <div class="flex-1 flex flex-col items-center gap-1">
              <span class="text-[10px] text-brand-400 font-semibold">${d.count}</span>
              <div class="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400"
                   style="height:${Math.max(4, Math.round((d.count / maxDay) * 80))}px"></div>
              <span class="text-[10px] text-brand-400">${d.day}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- توزيع الأجهزة -->
      <div class="bg-white rounded-2xl p-5 border border-brand-100 shadow-sm">
        <h4 class="text-sm font-bold text-brand-700 mb-4">نوع الجهاز</h4>
        <div class="space-y-3">
          <div>
            <div class="flex justify-between text-xs font-semibold text-brand-600 mb-1">
              <span>📱 موبايل</span><span>${mobilePercent}%</span>
            </div>
            <div class="h-2 bg-brand-100 rounded-full overflow-hidden">
              <div class="h-full bg-green-400 rounded-full" style="width:${mobilePercent}%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs font-semibold text-brand-600 mb-1">
              <span>🖥️ كمبيوتر</span><span>${desktopPercent}%</span>
            </div>
            <div class="h-2 bg-brand-100 rounded-full overflow-hidden">
              <div class="h-full bg-blue-400 rounded-full" style="width:${desktopPercent}%"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs font-semibold text-brand-600 mb-1">
              <span>📲 تابلت</span><span>${tabletPercent}%</span>
            </div>
            <div class="h-2 bg-brand-100 rounded-full overflow-hidden">
              <div class="h-full bg-purple-400 rounded-full" style="width:${tabletPercent}%"></div>
            </div>
          </div>
        </div>
      </div>

    </div>`;

    analyticsSection.insertAdjacentHTML('afterend', html);
    if (typeof lucide !== 'undefined') lucide.createIcons();

  } catch (e) {
    console.warn('[Visitors] Error loading visitor stats:', e.message);
  }
}
await loadVisitorStats();
