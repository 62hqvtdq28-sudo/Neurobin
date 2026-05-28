// visitor-tracker.js — تتبع زوار صيدلية Neurobin
// أضف هذا الملف في index.html قبل </body> مباشرة:
// <script src="visitor-tracker.js"></script>

(function () {
  const SUPABASE_URL = 'https://hczsskviliuqyayylutv.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjenNza3ZpbGl1cXlheXlsdXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDg2OTUsImV4cCI6MjA5NDcyNDY5NX0.mT-fPrPzwbUx3mQZOqFGx8ndWTkUS-MeqLcfaN1zS4k';

  function getDevice() {
    const ua = navigator.userAgent;
    if (/Mobi|Android|iPhone|iPad/i.test(ua)) return 'mobile';
    if (/Tablet|iPad/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  function getPage() {
    return window.location.pathname || '/';
  }

  function getReferrer() {
    return document.referrer
      ? new URL(document.referrer).hostname
      : 'direct';
  }

  // تجنب العد المتكرر لنفس الجلسة (مدة ساعة)
  function shouldTrack() {
    const key = 'nb_tracked';
    const now = Date.now();
    const last = parseInt(sessionStorage.getItem(key) || '0', 10);
    if (now - last < 60 * 60 * 1000) return false;
    sessionStorage.setItem(key, String(now));
    return true;
  }

  async function trackVisit() {
    if (!shouldTrack()) return;
    try {
      await fetch(SUPABASE_URL + '/rest/v1/page_views', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          page: getPage(),
          referrer: getReferrer(),
          device: getDevice()
        })
      });
    } catch (e) {
      // تجاهل الأخطاء — التتبع لا يجب أن يؤثر على تجربة المستخدم
    }
  }

  // تشغيل عند تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackVisit);
  } else {
    trackVisit();
  }
})();
