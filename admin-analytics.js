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
