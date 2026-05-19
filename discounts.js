// discounts.js â€” Ù†Ø¸Ø§Ù… ÙƒÙˆØ¯Ø§Øª Ø§Ù„Ø®ØµÙ… Ù…Ø¹ ØªØ­ÙƒÙ… ÙƒØ§Ù…Ù„ Ø¨Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†

function generateSecureCode(len) {
  len = len || 12;
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, function(n){ return chars[n % chars.length]; }).join('');
}

// â”€â”€ ØªØ­Ù…ÙŠÙ„ ÙˆØ¹Ø±Ø¶ Ø§Ù„ÙƒÙˆØ¯Ø§Øª â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadDiscountCodes() {
  var el = document.getElementById('discountCodesList');
  if (!el) return;
  el.innerHTML = '<div class="text-center py-8 text-brand-400"><div class="loading-spinner mx-auto mb-3"></div><p>Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...</p></div>';
  try {
    var codes = await SupaDB.DiscountCodes.list();
    renderDiscountCodes(codes);
  } catch(e) {
    el.innerHTML = '<div class="text-center py-8 text-red-500">Ø®Ø·Ø£ ÙÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„: ' + escapeHTML(e.message) + '</div>';
  }
}

function renderDiscountCodes(codes) {
  var el = document.getElementById('discountCodesList');
  if (!el) return;
  var now = new Date();

  if (!codes || !codes.length) {
    el.innerHTML = '<div class="text-center py-16 text-brand-400">' +
      '<div class="w-20 h-20 mx-auto mb-4 bg-brand-50 rounded-full flex items-center justify-center">' +
      '<i data-lucide="tag" class="w-10 h-10 text-brand-300"></i></div>' +
      '<p class="font-semibold text-lg">Ù„Ø§ ØªÙˆØ¬Ø¯ ÙƒÙˆØ¯Ø§Øª Ø®ØµÙ…</p>' +
      '<p class="text-sm mt-1">Ø£Ù†Ø´Ø¦ ÙƒÙˆØ¯Ø§Ù‹ Ø¬Ø¯ÙŠØ¯Ø§Ù‹ Ø¨Ø§Ù„Ø¶ØºØ· Ø¹Ù„Ù‰ Ø§Ù„Ø²Ø± Ø£Ø¹Ù„Ø§Ù‡</p></div>';
    lucide.createIcons(); return;
  }

  var html = '<div class="space-y-4">';
  codes.forEach(function(code, i) {
    var expiry  = new Date(code.expires_at);
    var expired = expiry < now;
    var msLeft  = expiry - now;
    var hrs     = Math.max(0, Math.floor(msLeft / 3600000));
    var days    = Math.floor(hrs / 24);
    var used    = code.used_count || 0;
    var maxU    = code.max_uses;
    var active  = code.is_active;

    // Ø­Ø³Ø§Ø¨ Ù†Ø³Ø¨Ø© Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…
    var usagePct = (maxU && maxU > 0) ? Math.min(100, Math.round(used / maxU * 100)) : 0;
    var usageExhausted = (maxU !== null && maxU !== undefined && used >= maxU);

    // Ø´Ø§Ø±Ø© Ø§Ù„Ø­Ø§Ù„Ø©
    var statusColor, statusText;
    if (!active)          { statusColor = 'bg-gray-100 text-gray-600';   statusText = 'Ù…Ø¹Ø·Ù‘Ù„'; }
    else if (expired)     { statusColor = 'bg-red-100 text-red-600';     statusText = 'Ù…Ù†ØªÙ‡ÙŠ'; }
    else if (usageExhausted) { statusColor = 'bg-orange-100 text-orange-600'; statusText = 'Ø§Ø³ØªÙÙ†ÙØ¯'; }
    else                  { statusColor = 'bg-green-100 text-green-700'; statusText = 'Ù†Ø´Ø· âœ“'; }

    // Ø§Ù„Ù…Ø¯Ø© Ø§Ù„Ù…ØªØ¨Ù‚ÙŠØ©
    var timeLeft = expired ? '<span class="text-red-500 font-medium">Ø§Ù†ØªÙ‡Øª Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©</span>'
      : days >= 1 ? '<span class="text-green-700 font-medium">ÙŠÙ†ØªÙ‡ÙŠ Ø¨Ø¹Ø¯ ' + days + (days===1?' ÙŠÙˆÙ…':' Ø£ÙŠØ§Ù…') + '</span>'
      : hrs > 0  ? '<span class="text-yellow-700 font-medium">ÙŠÙ†ØªÙ‡ÙŠ Ø¨Ø¹Ø¯ ' + hrs + ' Ø³Ø§Ø¹Ø©</span>'
      : '<span class="text-red-600 font-medium">ÙŠÙ†ØªÙ‡ÙŠ Ù‚Ø±ÙŠØ¨Ø§Ù‹</span>';

    // Ù‚ÙŠÙ…Ø© Ø§Ù„Ø®ØµÙ…
    var disc = code.discount_type === 'percent'
      ? code.discount_value + '%'
      : code.discount_value.toLocaleString() + ' Ø¯.Ø¹';

    // Ø´Ø±ÙŠØ· Ø§Ù„ØªÙ‚Ø¯Ù… Ù„Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…
    var progressBar = '';
    if (maxU !== null && maxU !== undefined) {
      var barColor = usagePct >= 90 ? 'bg-red-500' : usagePct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
      progressBar = '<div class="mt-2">' +
        '<div class="flex justify-between text-xs text-brand-500 mb-1">' +
        '<span>ØªÙ… Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…: <b>' + used + '</b> / <b>' + maxU + '</b></span>' +
        '<span>' + usagePct + '%</span></div>' +
        '<div class="w-full bg-brand-100 rounded-full h-2.5 overflow-hidden">' +
        '<div class="h-2.5 rounded-full transition-all duration-500 ' + barColor + '" style="width:' + usagePct + '%"></div>' +
        '</div></div>';
    } else {
      progressBar = '<div class="mt-2 text-xs text-brand-500">ØªÙ… Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…: <b>' + used + '</b> Ù…Ø±Ø© / Ø¨Ù„Ø§ Ø­Ø¯ Ø£Ù‚ØµÙ‰</div>';
    }

    var cid     = escapeHTML(String(code.id));
    var codeStr = escapeHTML(code.code);
    var opacity = (!active || expired || usageExhausted) ? 'opacity-70' : '';
    var border  = (!active || expired || usageExhausted) ? 'border-gray-200' : 'border-brand-200';

    html += '<div class="bg-white rounded-2xl border-2 ' + border + ' ' + opacity + ' overflow-hidden animate-fade-in" style="animation-delay:' + (i*0.05) + 's" id="code-card-' + cid + '">' +
      // Header
      '<div class="bg-gradient-to-r from-brand-50 to-white px-3 sm:px-4 py-3 flex flex-wrap items-start sm:items-center justify-between gap-2 border-b border-brand-100">' +
      '<div class="flex items-center gap-3">' +
      '<code class="font-mono text-base sm:text-xl font-black text-brand-900 tracking-wide sm:tracking-widest bg-white px-2 sm:px-3 py-1 rounded-lg border-2 border-brand-200 select-all max-w-full overflow-x-auto block sm:inline-block">' + codeStr + '</code>' +
      '<span class="px-2.5 py-1 ' + statusColor + ' rounded-full text-xs font-bold">' + statusText + '</span>' +
      '</div>' +
      '<div class="flex items-center gap-1 flex-shrink-0">' +
      '<button onclick="copyDiscountCode(\'' + codeStr + '\')" class="p-2 bg-brand-100 text-brand-700 hover:bg-brand-200 rounded-lg transition-colors" title="Ù†Ø³Ø® Ø§Ù„ÙƒÙˆØ¯"><i data-lucide="copy" class="w-4 h-4"></i></button>' +
      '<button onclick="toggleCodeActive(\'' + cid + '\',' + (!active) + ')" class="p-2 ' + (active ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200') + ' rounded-lg transition-colors" title="' + (active ? 'ØªØ¹Ø·ÙŠÙ„' : 'ØªÙØ¹ÙŠÙ„') + '">' +
      '<i data-lucide="' + (active ? 'pause-circle' : 'play-circle') + '" class="w-4 h-4"></i></button>' +
      '<button data-action="delete-discount" data-id="' + cid + '" class="p-2 bg-red-100 text-red-500 hover:bg-red-200 rounded-lg transition-colors" title="Ø­Ø°Ù"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
      '</div></div>' +

      // Body
      '<div class="p-4">' +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">' +
      // Ø§Ù„Ø®ØµÙ…
      '<div class="bg-brand-50 rounded-xl p-3 text-center">' +
      '<p class="text-xs text-brand-400 mb-1">Ù‚ÙŠÙ…Ø© Ø§Ù„Ø®ØµÙ…</p>' +
      '<p class="text-xl font-black text-brand-900">' + disc + '</p>' +
      '<p class="text-xs text-brand-500">' + (code.discount_type === 'percent' ? 'Ù†Ø³Ø¨Ø©' : 'Ù…Ø¨Ù„Øº Ø«Ø§Ø¨Øª') + '</p>' +
      '</div>' +
      // Ø§Ù„Ù…Ø¯Ø©
      '<div class="bg-brand-50 rounded-xl p-3 text-center">' +
      '<p class="text-xs text-brand-400 mb-1">Ø§Ù„Ù…Ø¯Ø© Ø§Ù„Ù…ØªØ¨Ù‚ÙŠØ©</p>' +
      timeLeft +
      '<p class="text-xs text-brand-400 mt-1">' + expiry.toLocaleDateString('ar-EG') + '</p>' +
      '</div>' +
      // Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… â€” Ù…Ø¹ Ø²Ø± Ø§Ù„ØªØ­ÙƒÙ…
      '<div class="bg-brand-50 rounded-xl p-3 col-span-2 sm:col-span-1">' +
      '<div class="flex items-center justify-between mb-1">' +
      '<p class="text-xs text-brand-400">Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†</p>' +
      '<button onclick="openUsageEditor(\'' + cid + '\', ' + (maxU !== null && maxU !== undefined ? maxU : 'null') + ')" ' +
      'class="text-xs text-brand-600 hover:text-brand-900 underline">ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø­Ø¯</button>' +
      '</div>' +
      progressBar +
      '<button onclick="resetUsageCount(\'' + cid + '\')" ' +
      'class="mt-2 w-full text-xs text-brand-500 hover:text-red-600 border border-brand-200 hover:border-red-300 rounded-lg py-1 px-2 transition-colors flex items-center justify-center gap-1">' +
      '<i data-lucide="rotate-ccw" class="w-3 h-3"></i> Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ø¹Ø¯Ø§Ø¯' +
      '</button>' +
      '</div>' +
      '</div>' +

      // Inline Usage Editor (hidden by default)
      '<div id="usage-editor-' + cid + '" class="hidden mt-3 p-3 sm:p-4 bg-amber-50 rounded-xl border-2 border-amber-200">' +
      '<p class="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">' +
      '<i data-lucide="settings" class="w-4 h-4"></i> ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ Ù„Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…' +
      '</p>' +
      '<div class="flex gap-2">' +
      '<input type="number" id="new-max-uses-' + cid + '" ' +
      'class="flex-1 px-3 py-2 border-2 border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" ' +
      'placeholder="Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¹Ø¯Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ (Ø£Ùˆ 0 = Ø¨Ù„Ø§ Ø­Ø¯)" min="0" value="' + (maxU !== null && maxU !== undefined ? maxU : '') + '">' +
      '<button onclick="saveMaxUses(\'' + cid + '\')" class="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">Ø­ÙØ¸</button>' +
      '<button onclick="closeUsageEditor(\'' + cid + '\')" class="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors">Ø¥Ù„ØºØ§Ø¡</button>' +
      '</div>' +
      '<p class="text-xs text-amber-700 mt-1">Ø§ÙƒØªØ¨ 0 Ø£Ùˆ Ø§ØªØ±ÙƒÙ‡ ÙØ§Ø±ØºØ§Ù‹ = Ø¨Ù„Ø§ Ø­Ø¯ Ù„Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…</p>' +
      '</div>' +

      '</div></div>'; // end body + card
  });
  html += '</div>';
  el.innerHTML = html;
  lucide.createIcons();
}

// â”€â”€ Ù…Ø­Ø±Ø± Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openUsageEditor(id, currentMax) {
  var editor = document.getElementById('usage-editor-' + id);
  var inp    = document.getElementById('new-max-uses-' + id);
  if (!editor) return;
  editor.classList.remove('hidden');
  if (inp) { inp.value = (currentMax !== null && currentMax !== undefined) ? currentMax : ''; inp.focus(); }
  lucide.createIcons();
}

function closeUsageEditor(id) {
  var editor = document.getElementById('usage-editor-' + id);
  if (editor) editor.classList.add('hidden');
}

async function saveMaxUses(id) {
  if (!isAuthenticated()) { showToast('ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø£ÙˆÙ„Ø§Ù‹', 'error'); return; }
  var inp = document.getElementById('new-max-uses-' + id);
  if (!inp) return;
  var val = inp.value.trim();
  var newMax = (val === '' || val === '0') ? null : parseInt(val);
  if (newMax !== null && (isNaN(newMax) || newMax < 1)) {
    showToast('ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø¹Ø¯Ø¯ ØµØ­ÙŠØ­ Ø£ÙƒØ¨Ø± Ù…Ù† 0', 'error'); return;
  }
  try {
    await SupaDB.DiscountCodes.updateMaxUses(id, newMax);
    closeUsageEditor(id);
    loadDiscountCodes();
    showToast(newMax ? 'ØªÙ… ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰: ' + newMax + ' Ù…Ø³ØªØ®Ø¯Ù…' : 'ØªÙ… Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ (Ø¨Ù„Ø§ Ø­Ø¯)', 'success');
  } catch(e) { showToast('Ø®Ø·Ø£: ' + e.message, 'error'); }
}

// â”€â”€ Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ø¹Ø¯Ø§Ø¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function resetUsageCount(id) {
  if (!isAuthenticated()) { showToast('ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø£ÙˆÙ„Ø§Ù‹', 'error'); return; }
  if (!confirm('Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø¥Ù„Ù‰ 0ØŸ')) return;
  try {
    await SupaDB.DiscountCodes.resetUsage(id);
    loadDiscountCodes();
    showToast('ØªÙ… Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ø¹Ø¯Ø§Ø¯ âœ“', 'success');
  } catch(e) { showToast('Ø®Ø·Ø£: ' + e.message, 'error'); }
}

// â”€â”€ ØªÙØ¹ÙŠÙ„/ØªØ¹Ø·ÙŠÙ„ Ø§Ù„ÙƒÙˆØ¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function toggleCodeActive(id, newState) {
  if (!isAuthenticated()) { showToast('ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø£ÙˆÙ„Ø§Ù‹', 'error'); return; }
  try {
    await SupaDB.DiscountCodes.toggleActive(id, newState);
    loadDiscountCodes();
    showToast(newState ? 'ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„ÙƒÙˆØ¯ âœ“' : 'ØªÙ… ØªØ¹Ø·ÙŠÙ„ Ø§Ù„ÙƒÙˆØ¯', newState ? 'success' : 'warning');
  } catch(e) { showToast('Ø®Ø·Ø£: ' + e.message, 'error'); }
}

// â”€â”€ Ù…Ø¹Ø§ÙŠÙ†Ø© ÙˆÙ‚Øª Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateExpiryPreview() {
  var days  = parseInt(document.getElementById('discountDays')?.value)  || 0;
  var hours = parseInt(document.getElementById('discountHours')?.value) || 0;
  var preview = document.getElementById('expiryPreview');
  if (!preview) return;
  if (days <= 0 && hours <= 0) { preview.textContent = 'ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ù…Ø¯Ø© ØµØ§Ù„Ø­Ø©'; preview.className = 'text-xs text-red-500 mt-1'; return; }
  var ms = (days * 86400000) + (hours * 3600000);
  var expiry = new Date(Date.now() + ms);
  var parts = [];
  if (days > 0)  parts.push(days  + (days  === 1 ? ' ÙŠÙˆÙ…'   : ' Ø£ÙŠØ§Ù…'));
  if (hours > 0) parts.push(hours + (hours === 1 ? ' Ø³Ø§Ø¹Ø©'  : ' Ø³Ø§Ø¹Ø§Øª'));
  preview.innerHTML = '<span class="flex flex-wrap gap-x-1 items-center">â±ï¸ ÙŠÙ†ØªÙ‡ÙŠ Ø¨Ø¹Ø¯ <b>' + parts.join(' Ùˆ ') + '</b><span class="hidden sm:inline">â€”</span><span class="sm:inline">ÙÙŠ ' +
    expiry.toLocaleDateString('ar-EG') + ' Ø§Ù„Ø³Ø§Ø¹Ø© ' +
    expiry.toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) + '</span></span>';
  preview.className = 'text-xs text-green-700 mt-1';
}

// â”€â”€ Ø¥Ù†Ø´Ø§Ø¡ ÙƒÙˆØ¯ Ø¬Ø¯ÙŠØ¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openCreateDiscountModal() {
  document.getElementById('discountCode').value = generateSecureCode(12);
  document.getElementById('discountType').value = 'percent';
  document.getElementById('discountValue').value = '10';
  document.getElementById('discountDays').value = '1';
  document.getElementById('discountHours').value = '0';
  document.getElementById('discountMaxUses').value = '';
  updateExpiryPreview();
  document.getElementById('createDiscountModal').classList.add('active');
  lucide.createIcons();
}
function closeCreateDiscountModal() { document.getElementById('createDiscountModal').classList.remove('active'); }
function regenerateCode() { document.getElementById('discountCode').value = generateSecureCode(12); }

async function saveDiscountCode() {
  if (!isAuthenticated()) { showToast('ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø£ÙˆÙ„Ø§Ù‹','error'); return; }
  var code = document.getElementById('discountCode').value.trim().toUpperCase();
  var dType = document.getElementById('discountType').value;
  var dVal  = parseInt(document.getElementById('discountValue').value);
  var durDays  = parseInt(document.getElementById('discountDays').value)  || 0;
  var durHours = parseInt(document.getElementById('discountHours').value) || 0;
  var maxU  = document.getElementById('discountMaxUses').value;
  if (!code || code.length < 4 || !/^[A-Z0-9]+$/.test(code)) { showToast('ÙƒÙˆØ¯ ØºÙŠØ± ØµØ§Ù„Ø­','error'); return; }
  if (!dVal || dVal <= 0) { showToast('Ù‚ÙŠÙ…Ø© Ø§Ù„Ø®ØµÙ… ØºÙŠØ± ØµØ­ÙŠØ­Ø©','error'); return; }
  if (dType === 'percent' && dVal > 100) { showToast('Ù†Ø³Ø¨Ø© Ø§Ù„Ø®ØµÙ… Ù„Ø§ ØªØªØ¬Ø§ÙˆØ² 100%','error'); return; }
  if (dType === 'fixed' && dVal % 250 !== 0) {
    dVal = Math.max(250, Math.round(dVal / 250) * 250);
    document.getElementById('discountValue').value = dVal;
    showToast('ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ù‚ÙŠÙ…Ø© Ø§Ù„Ø®ØµÙ… Ø¥Ù„Ù‰ ' + dVal.toLocaleString() + ' Ø¯.Ø¹', 'info');
  }
  if (durDays <= 0 && durHours <= 0) { showToast('ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ù…Ø¯Ø© ØµØ§Ù„Ø­Ø© (Ø£ÙŠØ§Ù… Ø£Ùˆ Ø³Ø§Ø¹Ø§Øª)', 'error'); return; }
  var ms = (durDays * 86400000) + (durHours * 3600000);
  var expiresAt = new Date(Date.now() + ms).toISOString();
  var btn = document.querySelector('#createDiscountModal .save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...'; }
  try {
    var maxUVal = (maxU && parseInt(maxU) > 0) ? parseInt(maxU) : null;
    await SupaDB.DiscountCodes.create({ code, discount_type: dType, discount_value: dVal, expires_at: expiresAt, max_uses: maxUVal, used_count: 0, is_active: true });
    closeCreateDiscountModal();
    loadDiscountCodes();
    showSuccessAnimation('ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ÙƒÙˆØ¯ Ø§Ù„Ø®ØµÙ… Ø¨Ù†Ø¬Ø§Ø­!');
  } catch(e) {
    showToast(e.message.includes('duplicate') ? 'Ù‡Ø°Ø§ Ø§Ù„ÙƒÙˆØ¯ Ù…ÙˆØ¬ÙˆØ¯ Ù…Ø³Ø¨Ù‚Ø§Ù‹' : 'Ø®Ø·Ø£: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙƒÙˆØ¯'; }
  }
}

// â”€â”€ Ø­Ø°Ù Ø§Ù„ÙƒÙˆØ¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function deleteDiscountCode(id) {
  if (!isAuthenticated()) { showToast('ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø£ÙˆÙ„Ø§Ù‹','error'); return; }
  if (!confirm('Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„ÙƒÙˆØ¯ØŸ')) return;
  try { await SupaDB.DiscountCodes.delete(id); loadDiscountCodes(); showToast('ØªÙ… Ø­Ø°Ù Ø§Ù„ÙƒÙˆØ¯','warning'); }
  catch(e) { showToast('Ø®Ø·Ø£: ' + e.message,'error'); }
}

// â”€â”€ Ù†Ø³Ø® Ø§Ù„ÙƒÙˆØ¯ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function copyDiscountCode(code) {
  navigator.clipboard.writeText(code)
    .then(() => showToast('ØªÙ… Ù†Ø³Ø® Ø§Ù„ÙƒÙˆØ¯: ' + code, 'success'))
    .catch(() => {
      var e = document.createElement('input'); e.value = code;
      document.body.appendChild(e); e.select(); document.execCommand('copy'); document.body.removeChild(e);
      showToast('ØªÙ… Ù†Ø³Ø® Ø§Ù„ÙƒÙˆØ¯: ' + code, 'success');
    });
}

// â”€â”€ Event delegation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action="delete-discount"]');
  if (btn) deleteDiscountCode(btn.dataset.id);
});
