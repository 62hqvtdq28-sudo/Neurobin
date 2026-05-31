/* ============================================================
   pwa-install.js — ph.neurobin
   PWA Install Prompt: iOS + Android + Desktop
   ============================================================ */
(function () {
  'use strict';

  /* ── 1. Already running as installed PWA? Skip banner ─── */
  var isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;

  if (isStandalone) {
    document.documentElement.classList.add('pwa-installed');
    return;
  }

  /* ── 2. Device detection ─────────────────────────────── */
  var ua = navigator.userAgent;
  var isIOS    = /iP(hone|ad|od)/.test(ua) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);
  var isSafari  = /^((?!chrome|android).)*safari/i.test(ua);
  var isChrome  = /Chrome/.test(ua) && !/Edge|OPR/.test(ua);
  var isFirefox = /Firefox/.test(ua);

  /* ── 3. Already dismissed this session? ─────────────── */
  var DISMISS_KEY = 'pwa_banner_dismissed';
  var INSTALL_KEY = 'pwa_installed';

  try {
    if (localStorage.getItem(INSTALL_KEY)) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
  } catch(e) {}

  /* ── 4. Capture BeforeInstallPrompt (Android/Chrome) ── */
  var _deferredPrompt = null;
  var _bannerEl = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    _deferredPrompt = e;
    // Show after short delay for better UX
    setTimeout(showAndroidBanner, 3500);
  });

  window.addEventListener('appinstalled', function () {
    hideBanner();
    try { localStorage.setItem(INSTALL_KEY, '1'); } catch(e) {}
    showInstalledToast();
  });

  /* ── 5. iOS: show after delay if not dismissed ────────── */
  if (isIOS && isSafari) {
    setTimeout(showIOSBanner, 5000);
  }

  /* ── 6. Android banner (BeforeInstallPrompt) ─────────── */
  function showAndroidBanner() {
    if (_bannerEl) return;
    var el = document.createElement('div');
    el.id = 'pwa-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'تثبيت التطبيق');
    el.innerHTML = [
      '<div class="pwa-banner-inner">',
        '<div class="pwa-banner-icon">',
          '<img src="./logo.jpg" alt="ph.neurobin" width="52" height="52">',
        '</div>',
        '<div class="pwa-banner-text">',
          '<strong>ثبّت تطبيق نيروبين</strong>',
          '<span>أسرع، بدون انترنت، مثل تطبيق حقيقي</span>',
        '</div>',
        '<div class="pwa-banner-actions">',
          '<button id="pwa-install-btn" class="pwa-btn-install">تثبيت</button>',
          '<button id="pwa-dismiss-btn" class="pwa-btn-dismiss" aria-label="إغلاق">✕</button>',
        '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(el);
    _bannerEl = el;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('pwa-banner-show');
      });
    });

    document.getElementById('pwa-install-btn').addEventListener('click', function () {
      if (!_deferredPrompt) return;
      _deferredPrompt.prompt();
      _deferredPrompt.userChoice.then(function (result) {
        if (result.outcome === 'accepted') {
          hideBanner();
          try { localStorage.setItem(INSTALL_KEY, '1'); } catch(e) {}
        }
        _deferredPrompt = null;
      });
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', function () {
      hideBanner();
    });
  }

  /* ── 7. iOS banner (Share → Add to Home Screen) ──────── */
  function showIOSBanner() {
    if (_bannerEl) return;
    try { if (sessionStorage.getItem(DISMISS_KEY)) return; } catch(e) {}

    var el = document.createElement('div');
    el.id = 'pwa-ios-sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'إضافة للشاشة الرئيسية');
    el.innerHTML = [
      '<div class="pwa-ios-backdrop" id="pwa-ios-backdrop"></div>',
      '<div class="pwa-ios-card">',
        '<button class="pwa-ios-close" id="pwa-ios-close" aria-label="إغلاق">✕</button>',
        '<div class="pwa-ios-header">',
          '<img src="./logo.jpg" alt="ph.neurobin" class="pwa-ios-logo">',
          '<div>',
            '<strong class="pwa-ios-title">ثبّت صيدلية نيروبين</strong>',
            '<span class="pwa-ios-sub">على شاشتك الرئيسية</span>',
          '</div>',
        '</div>',
        '<div class="pwa-ios-steps">',
          '<div class="pwa-ios-step">',
            '<span class="pwa-ios-step-num">١</span>',
            '<span>اضغط <svg class="pwa-ios-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> <strong>مشاركة</strong></span>',
          '</div>',
          '<div class="pwa-ios-step">',
            '<span class="pwa-ios-step-num">٢</span>',
            '<span>اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong></span>',
          '</div>',
          '<div class="pwa-ios-step">',
            '<span class="pwa-ios-step-num">٣</span>',
            '<span>اضغط <strong>"إضافة"</strong> في الزاوية اليمنى</span>',
          '</div>',
        '</div>',
        '<div class="pwa-ios-benefits">',
          '<span>⚡ أسرع</span>',
          '<span>📦 يعمل بدون انترنت</span>',
          '<span>🔔 إشعارات</span>',
        '</div>',
        '<div class="pwa-ios-arrow"></div>',
      '</div>'
    ].join('');

    document.body.appendChild(el);
    _bannerEl = el;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('pwa-ios-show');
      });
    });

    function closeIOS() { hideBanner(); }
    document.getElementById('pwa-ios-close').addEventListener('click', closeIOS);
    document.getElementById('pwa-ios-backdrop').addEventListener('click', closeIOS);
  }

  /* ── 8. Hide banner ──────────────────────────────────── */
  function hideBanner() {
    if (!_bannerEl) return;
    _bannerEl.classList.remove('pwa-banner-show', 'pwa-ios-show');
    var el = _bannerEl;
    _bannerEl = null;
    setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 400);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch(e) {}
  }

  /* ── 9. Installed toast ──────────────────────────────── */
  function showInstalledToast() {
    var t = document.createElement('div');
    t.className = 'pwa-toast-installed';
    t.textContent = '✅ تم تثبيت التطبيق بنجاح!';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400);
    }, 3500);
  }

  /* ── 10. Inject styles ───────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    /* Android banner */
    '#pwa-banner{position:fixed;bottom:-120px;left:0;right:0;z-index:99998;',
      'padding:0 12px 12px;transition:bottom .4s cubic-bezier(.34,1.3,.64,1);',
      'pointer-events:none;}',
    '#pwa-banner.pwa-banner-show{bottom:0;pointer-events:auto;}',
    '.pwa-banner-inner{display:flex;align-items:center;gap:12px;',
      'background:#fff;border-radius:20px 20px 16px 16px;',
      'padding:14px 16px;box-shadow:0 -4px 30px rgba(45,80,22,.18),0 8px 40px rgba(0,0,0,.12);',
      'border:1px solid #e8f0dc;',
      'font-family:"Cairo",sans-serif;}',
    '.pwa-banner-icon img{width:52px;height:52px;border-radius:14px;',
      'object-fit:cover;box-shadow:0 4px 12px rgba(45,80,22,.2);}',
    '.pwa-banner-text{flex:1;min-width:0;}',
    '.pwa-banner-text strong{display:block;font-size:.95rem;color:#1e350f;font-weight:800;}',
    '.pwa-banner-text span{font-size:.78rem;color:#6b7280;display:block;margin-top:2px;}',
    '.pwa-banner-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}',
    '.pwa-btn-install{background:linear-gradient(135deg,#2D5016,#3D6B2D);color:#fff;',
      'border:none;border-radius:100px;padding:9px 20px;font-weight:800;font-size:.85rem;',
      'cursor:pointer;font-family:"Cairo",sans-serif;',
      'box-shadow:0 4px 14px rgba(45,80,22,.35);',
      'transition:transform .2s,box-shadow .2s;white-space:nowrap;}',
    '.pwa-btn-install:active{transform:scale(.95);}',
    '.pwa-btn-dismiss{background:none;border:none;color:#94a3b8;',
      'font-size:1.1rem;cursor:pointer;padding:6px;',
      'border-radius:50%;width:30px;height:30px;',
      'display:flex;align-items:center;justify-content:center;',
      'transition:background .2s;font-family:"Cairo",sans-serif;}',
    '.pwa-btn-dismiss:hover{background:#f1f5f9;}',

    /* iOS sheet */
    '#pwa-ios-sheet{position:fixed;inset:0;z-index:99998;',
      'pointer-events:none;font-family:"Cairo",sans-serif;}',
    '#pwa-ios-sheet.pwa-ios-show{pointer-events:auto;}',
    '.pwa-ios-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0);',
      'transition:background .35s ease;}',
    '#pwa-ios-sheet.pwa-ios-show .pwa-ios-backdrop{background:rgba(0,0,0,.4);}',
    '.pwa-ios-card{position:absolute;bottom:-100%;left:12px;right:12px;',
      'background:#fff;border-radius:24px;padding:24px 20px 36px;',
      'box-shadow:0 -8px 40px rgba(0,0,0,.2);',
      'transition:bottom .4s cubic-bezier(.34,1.2,.64,1);',
      'max-width:480px;margin:0 auto;}',
    '#pwa-ios-sheet.pwa-ios-show .pwa-ios-card{bottom:16px;}',
    '.pwa-ios-close{position:absolute;top:14px;left:14px;',
      'background:#f1f5f9;border:none;border-radius:50%;',
      'width:32px;height:32px;font-size:.9rem;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'color:#64748b;transition:background .2s;}',
    '.pwa-ios-close:hover{background:#e2e8f0;}',
    '.pwa-ios-header{display:flex;align-items:center;gap:14px;margin-bottom:20px;}',
    '.pwa-ios-logo{width:60px;height:60px;border-radius:16px;object-fit:cover;',
      'box-shadow:0 4px 16px rgba(45,80,22,.25);}',
    '.pwa-ios-title{display:block;font-size:1.05rem;font-weight:800;color:#1e350f;}',
    '.pwa-ios-sub{font-size:.82rem;color:#6b7280;display:block;margin-top:2px;}',
    '.pwa-ios-steps{display:flex;flex-direction:column;gap:12px;margin-bottom:18px;}',
    '.pwa-ios-step{display:flex;align-items:center;gap:12px;font-size:.88rem;color:#374151;}',
    '.pwa-ios-step-num{width:26px;height:26px;border-radius:50%;',
      'background:linear-gradient(135deg,#2D5016,#3D6B2D);',
      'color:#fff;font-weight:800;font-size:.75rem;flex-shrink:0;',
      'display:flex;align-items:center;justify-content:center;}',
    '.pwa-ios-share-icon{width:16px;height:16px;display:inline-block;',
      'vertical-align:middle;margin:0 2px;color:#007AFF;}',
    '.pwa-ios-benefits{display:flex;gap:8px;flex-wrap:wrap;',
      'padding:12px;background:#f8fdf4;border-radius:12px;',
      'border:1px solid #e0ead0;}',
    '.pwa-ios-benefits span{font-size:.78rem;font-weight:700;color:#2D5016;',
      'background:#fff;padding:4px 10px;border-radius:100px;',
      'border:1px solid #e0ead0;}',
    '.pwa-ios-arrow{position:absolute;bottom:-14px;left:50%;',
      'transform:translateX(-50%);',
      'width:0;height:0;',
      'border-left:14px solid transparent;',
      'border-right:14px solid transparent;',
      'border-top:14px solid #fff;}',

    /* Installed toast */
    '.pwa-toast-installed{position:fixed;bottom:80px;left:50%;',
      'transform:translateX(-50%) translateY(20px);',
      'background:linear-gradient(135deg,#10B981,#059669);',
      'color:#fff;padding:12px 24px;border-radius:100px;',
      'font-weight:700;font-size:.9rem;z-index:99999;',
      'opacity:0;transition:all .4s cubic-bezier(.34,1.3,.64,1);',
      'font-family:"Cairo",sans-serif;white-space:nowrap;',
      'box-shadow:0 8px 24px rgba(16,185,129,.4);}',
    '.pwa-toast-installed.show{opacity:1;transform:translateX(-50%) translateY(0);}',

    /* Installed app: hide install prompts, show app-only UI */
    '.pwa-installed .pwa-show-only{display:none!important;}',
  ].join('');
  document.head.appendChild(style);

  /* ── 11. SW Registration — with update notification ─── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: '/Neurobin/' })
        .then(function (reg) {
          /* Check for updates every 60 seconds */
          setInterval(function () { reg.update(); }, 60000);

          reg.addEventListener('updatefound', function () {
            var newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', function () {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateToast(newWorker);
              }
            });
          });
        })
        .catch(function (err) {
          console.warn('[PWA] SW registration failed:', err);
        });

      /* When SW takes control, reload for fresh cache */
      var refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!refreshing) { refreshing = true; /* soft reload */ }
      });
    });
  }

  function showUpdateToast(worker) {
    var t = document.createElement('div');
    t.className = 'pwa-update-toast';
    t.innerHTML = '<span>🔄 تحديث جديد متاح!</span>' +
      '<button onclick="this.closest(\'.pwa-update-toast\').remove();' +
      'if(window.__pwaNewWorker)window.__pwaNewWorker.postMessage({type:\'SKIP_WAITING\'})">تحديث</button>';
    window.__pwaNewWorker = worker;

    var ts = document.createElement('style');
    ts.textContent = '.pwa-update-toast{position:fixed;bottom:80px;right:16px;left:16px;max-width:340px;margin:auto;' +
      'background:#1e350f;color:#fff;padding:12px 16px;border-radius:14px;' +
      'display:flex;align-items:center;justify-content:space-between;gap:12px;' +
      'z-index:99997;box-shadow:0 8px 28px rgba(0,0,0,.25);' +
      'font-family:"Cairo",sans-serif;font-size:.88rem;font-weight:600;animation:pwaToastIn .4s ease;}' +
      '.pwa-update-toast button{background:#5C933B;border:none;color:#fff;' +
      'padding:6px 16px;border-radius:100px;font-weight:800;font-size:.82rem;' +
      'cursor:pointer;font-family:"Cairo",sans-serif;white-space:nowrap;}' +
      '@keyframes pwaToastIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(ts);
    document.body.appendChild(t);
  }

})();
