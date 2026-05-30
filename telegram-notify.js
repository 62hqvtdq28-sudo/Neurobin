(function () {
  'use strict';

  function sendOrderToTelegram(orderData) {
    fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    }).catch(function (e) {
      console.warn('[Telegram] notify failed:', e.message);
    });
  }

  function hookCheckoutForm() {
    var form = document.getElementById('checkoutForm');
    if (!form || form._tgHooked) return;
    form._tgHooked = true;

    form.addEventListener('submit', function (e) {
      var name    = (document.getElementById('customerName')    || {}).value || '';
      var phone   = (document.getElementById('customerPhone')   || {}).value || '';
      var address = (document.getElementById('customerAddress') || {}).value || '';
      var notes   = (document.getElementById('customerNotes')   || {}).value || '';

      var discountCode = '';
      var discountInput = document.getElementById('discountCodeInput');
      var discountRow   = document.getElementById('discountRow');
      if (discountInput && discountRow && !discountRow.classList.contains('hidden')) {
        discountCode = discountInput.value.trim();
      }

      var items = [];
      var total = 0;
      try {
        var checkoutItemsEl = document.getElementById('checkoutItems');
        if (checkoutItemsEl) {
          var rows = checkoutItemsEl.querySelectorAll('[data-item-id], .checkout-item');
          if (rows.length > 0) {
            rows.forEach(function (row) {
              var itemName  = (row.dataset.name  || row.querySelector('.item-name,  [data-name]')  || {}).textContent || row.dataset.name  || '';
              var itemQty   = parseInt(row.dataset.qty   || 1);
              var itemPrice = parseFloat(row.dataset.price || 0);
              if (itemName) items.push({ name: itemName.trim(), qty: itemQty, price: itemPrice });
            });
          }
        }
        var totalEl = document.getElementById('checkoutTotal');
        if (totalEl) {
          total = parseFloat(totalEl.textContent.replace(/[^\d.]/g, '')) || 0;
        }
        if (items.length === 0 && typeof window.cart !== 'undefined' && Array.isArray(window.cart)) {
          items = window.cart.map(function (c) {
            return { name: c.name || c.product_name || '', qty: c.qty || c.quantity || 1, price: c.price || 0 };
          });
        }
        if (total === 0 && items.length > 0) {
          total = items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
        }
      } catch (_) {}

      var trackingCode = '';
      try {
        if (typeof window._lastTrackingCode === 'string') trackingCode = window._lastTrackingCode;
      } catch (_) {}

      sendOrderToTelegram({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
        items: items,
        total: total,
        discountCode: discountCode,
        trackingCode: trackingCode
      });
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookCheckoutForm);
  } else {
    hookCheckoutForm();
  }

  setTimeout(hookCheckoutForm, 1500);
})();
