(function () {
  'use strict';

  var _origOpen = window.open;

  window.open = function (url) {
    var result = _origOpen.apply(this, arguments);
    try {
      if (typeof url === 'string' && url.indexOf('wa.me/') !== -1) {
        var textStart = url.indexOf('text=');
        if (textStart !== -1) {
          var waText = decodeURIComponent(url.slice(textStart + 5));
          if (
            waText.indexOf('طلب جديد') !== -1 ||
            waText.indexOf('كود التتبع') !== -1 ||
            waText.indexOf('المنتجات') !== -1
          ) {
            sendOrderToTelegram(waText);
          }
        }
      }
    } catch (e) {
      console.warn('[TelegramNotify] error:', e.message);
    }
    return result;
  };

  function sendOrderToTelegram(waText) {
    fetch('/api/telegram/raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: waText })
    }).catch(function (e) {
      console.warn('[Telegram] notify failed:', e.message);
    });
  }
})();
