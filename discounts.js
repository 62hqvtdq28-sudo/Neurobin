// discounts.js \u2014 \u0646\u0638\u0627\u0645 \u0643\u0648\u062F\u0627\u062A \u0627\u0644\u062E\u0635\u0645 \u0645\u0639 \u062A\u062D\u0643\u0645 \u0643\u0627\u0645\u0644 \u0628\u0639\u062F\u062F \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646

function generateSecureCode(len) {
  len = len || 12;
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, function(n){ return chars[n % chars.length]; }).join('');
}

// \u2500\u2500 \u062A\u062D\u0645\u064A\u0644 \u0648\u0639\u0631\u0636 \u0627\u0644\u0643\u0648\u062F\u0627\u062A \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function loadDiscountCodes() {
  var el = document.getElementById('discountCodesList');
  if (!el) return;
  el.innerHTML = '<div class="text-center py-8 text-brand-400"><div class="loading-spinner mx-auto mb-3"></div><p>\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644...</p></div>';
  try {
    var codes = await SupaDB.DiscountCodes.list();
    renderDiscountCodes(codes);
  } catch(e) {
    el.innerHTML = '<div class="text-center py-8 text-red-500">\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644: ' + escapeHTML(e.message) + '</div>';
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
      '<p class="font-semibold text-lg">\u0644\u0627 \u062A\u0648\u062C\u062F \u0643\u0648\u062F\u0627\u062A \u062E\u0635\u0645</p>' +
      '<p class="text-sm mt-1">\u0623\u0646\u0634\u0626 \u0643\u0648\u062F\u0627\u064B \u062C\u062F\u064A\u062F\u0627\u064B \u0628\u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0623\u0639\u0644\u0627\u0647</p></div>';
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

    // \u062D\u0633\u0627\u0628 \u0646\u0633\u0628\u0629 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645
    var usagePct = (maxU && maxU > 0) ? Math.min(100, Math.round(used / maxU * 100)) : 0;
    var usageExhausted = (maxU !== null && maxU !== undefined && used >= maxU);

    // \u0634\u0627\u0631\u0629 \u0627\u0644\u062D\u0627\u0644\u0629
    var statusColor, statusText;
    if (!active)          { statusColor = 'bg-gray-100 text-gray-600';   statusText = '\u0645\u0639\u0637\u0651\u0644'; }
    else if (expired)     { statusColor = 'bg-red-100 text-red-600';     statusText = '\u0645\u0646\u062A\u0647\u064A'; }
    else if (usageExhausted) { statusColor = 'bg-orange-100 text-orange-600'; statusText = '\u0627\u0633\u062A\u064F\u0646\u0641\u062F'; }
    else                  { statusColor = 'bg-green-100 text-green-700'; statusText = '\u0646\u0634\u0637 \u2713'; }

    // \u0627\u0644\u0645\u062F\u0629 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629
    var timeLeft = expired ? '<span class="text-red-500 font-medium">\u0627\u0646\u062A\u0647\u062A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629</span>'
      : days >= 1 ? '<span class="text-green-700 font-medium">\u064A\u0646\u062A\u0647\u064A \u0628\u0639\u062F ' + days + (days===1?' \u064A\u0648\u0645':' \u0623\u064A\u0627\u0645') + '</span>'
      : hrs > 0  ? '<span class="text-yellow-700 font-medium">\u064A\u0646\u062A\u0647\u064A \u0628\u0639\u062F ' + hrs + ' \u0633\u0627\u0639\u0629</span>'
      : '<span class="text-red-600 font-medium">\u064A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u0627\u064B</span>';

    // \u0642\u064A\u0645\u0629 \u0627\u0644\u062E\u0635\u0645
    var disc = code.discount_type === 'percent'
      ? code.discount_value + '%'
      : code.discount_value.toLocaleString() + ' \u062F.\u0639';

    // \u0634\u0631\u064A\u0637 \u0627\u0644\u062A\u0642\u062F\u0645 \u0644\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645
    var progressBar = '';
    if (maxU !== null && maxU !== undefined) {
      var barColor = usagePct >= 90 ? 'bg-red-500' : usagePct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
      progressBar = '<div class="mt-2">' +
        '<div class="flex justify-between text-xs text-brand-500 mb-1">' +
        '<span>\u062A\u0645 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645: <b>' + used + '</b> / <b>' + maxU + '</b></span>' +
        '<span>' + usagePct + '%</span></div>' +
        '<div class="w-full bg-brand-100 rounded-full h-2.5 overflow-hidden">' +
        '<div class="h-2.5 rounded-full transition-all duration-500 ' + barColor + '" style="width:' + usagePct + '%"></div>' +
        '</div></div>';
    } else {
      progressBar = '<div class="mt-2 text-xs text-brand-500">\u062A\u0645 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645: <b>' + used + '</b> \u0645\u0631\u0629 / \u0628\u0644\u0627 \u062D\u062F \u0623\u0642\u0635\u0649</div>';
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
      '<button onclick="copyDiscountCode(\'' + codeStr + '\')" class="p-2 bg-brand-100 text-brand-700 hover:bg-brand-200 rounded-lg transition-colors" title="\u0646\u0633\u062E \u0627\u0644\u0643\u0648\u062F"><i data-lucide="copy" class="w-4 h-4"></i></button>' +
      '<button onclick="toggleCodeActive(\'' + cid + '\',' + (!active) + ')" class="p-2 ' + (active ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200') + ' rounded-lg transition-colors" title="' + (active ? '\u062A\u0639\u0637\u064A\u0644' : '\u062A\u0641\u0639\u064A\u0644') + '">' +
      '<i data-lucide="' + (active ? 'pause-circle' : 'play-circle') + '" class="w-4 h-4"></i></button>' +
      '<button data-action="delete-discount" data-id="' + cid + '" class="p-2 bg-red-100 text-red-500 hover:bg-red-200 rounded-lg transition-colors" title="\u062D\u0630\u0641"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
      '</div></div>' +

      // Body
      '<div class="p-4">' +
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">' +
      // \u0627\u0644\u062E\u0635\u0645
      '<div class="bg-brand-50 rounded-xl p-3 text-center">' +
      '<p class="text-xs text-brand-400 mb-1">\u0642\u064A\u0645\u0629 \u0627\u0644\u062E\u0635\u0645</p>' +
      '<p class="text-xl font-black text-brand-900">' + disc + '</p>' +
      '<p class="text-xs text-brand-500">' + (code.discount_type === 'percent' ? '\u0646\u0633\u0628\u0629' : '\u0645\u0628\u0644\u063A \u062B\u0627\u0628\u062A') + '</p>' +
      '</div>' +
      // \u0627\u0644\u0645\u062F\u0629
      '<div class="bg-brand-50 rounded-xl p-3 text-center">' +
      '<p class="text-xs text-brand-400 mb-1">\u0627\u0644\u0645\u062F\u0629 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629</p>' +
      timeLeft +
      '<p class="text-xs text-brand-400 mt-1">' + expiry.toLocaleDateString('ar-EG') + '</p>' +
      '</div>' +
      // \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u2014 \u0645\u0639 \u0632\u0631 \u0627\u0644\u062A\u062D\u0643\u0645
      '<div class="bg-brand-50 rounded-xl p-3 col-span-2 sm:col-span-1">' +
      '<div class="flex items-center justify-between mb-1">' +
      '<p class="text-xs text-brand-400">\u0639\u062F\u062F \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646</p>' +
      '<button onclick="openUsageEditor(\'' + cid + '\', ' + (maxU !== null && maxU !== undefined ? maxU : 'null') + ')" ' +
      'class="text-xs text-brand-600 hover:text-brand-900 underline">\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062D\u062F</button>' +
      '</div>' +
      progressBar +
      '<button onclick="resetUsageCount(\'' + cid + '\')" ' +
      'class="mt-2 w-full text-xs text-brand-500 hover:text-red-600 border border-brand-200 hover:border-red-300 rounded-lg py-1 px-2 transition-colors flex items-center justify-center gap-1">' +
      '<i data-lucide="rotate-ccw" class="w-3 h-3"></i> \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0639\u062F\u0627\u062F' +
      '</button>' +
      '</div>' +
      '</div>' +

      // Inline Usage Editor (hidden by default)
      '<div id="usage-editor-' + cid + '" class="hidden mt-3 p-3 sm:p-4 bg-amber-50 rounded-xl border-2 border-amber-200">' +
      '<p class="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">' +
      '<i data-lucide="settings" class="w-4 h-4"></i> \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645' +
      '</p>' +
      '<div class="flex gap-2">' +
      '<input type="number" id="new-max-uses-' + cid + '" ' +
      'class="flex-1 px-3 py-2 border-2 border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" ' +
      'placeholder="\u0623\u062F\u062E\u0644 \u0627\u0644\u0639\u062F\u062F \u0627\u0644\u0623\u0642\u0635\u0649 (\u0623\u0648 0 = \u0628\u0644\u0627 \u062D\u062F)" min="0" value="' + (maxU !== null && maxU !== undefined ? maxU : '') + '">' +
      '<button onclick="saveMaxUses(\'' + cid + '\')" class="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">\u062D\u0641\u0638</button>' +
      '<button onclick="closeUsageEditor(\'' + cid + '\')" class="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors">\u0625\u0644\u063A\u0627\u0621</button>' +
      '</div>' +
      '<p class="text-xs text-amber-700 mt-1">\u0627\u0643\u062A\u0628 0 \u0623\u0648 \u0627\u062A\u0631\u0643\u0647 \u0641\u0627\u0631\u063A\u0627\u064B = \u0628\u0644\u0627 \u062D\u062F \u0644\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645</p>' +
      '</div>' +

      '</div></div>'; // end body + card
  });
  html += '</div>';
  el.innerHTML = html;
  lucide.createIcons();
}

// \u2500\u2500 \u0645\u062D\u0631\u0631 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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
  if (!isAuthenticated()) { showToast('\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B', 'error'); return; }
  var inp = document.getElementById('new-max-uses-' + id);
  if (!inp) return;
  var val = inp.value.trim();
  var newMax = (val === '' || val === '0') ? null : parseInt(val);
  if (newMax !== null && (isNaN(newMax) || newMax < 1)) {
    showToast('\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0639\u062F\u062F \u0635\u062D\u064A\u062D \u0623\u0643\u0628\u0631 \u0645\u0646 0', 'error'); return;
  }
  try {
    await SupaDB.DiscountCodes.updateMaxUses(id, newMax);
    closeUsageEditor(id);
    loadDiscountCodes();
    showToast(newMax ? '\u062A\u0645 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649: ' + newMax + ' \u0645\u0633\u062A\u062E\u062F\u0645' : '\u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 (\u0628\u0644\u0627 \u062D\u062F)', 'success');
  } catch(e) { showToast('\u062E\u0637\u0623: ' + e.message, 'error'); }
}

// \u2500\u2500 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0639\u062F\u0627\u062F \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function resetUsageCount(id) {
  if (!isAuthenticated()) { showToast('\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B', 'error'); return; }
  if (!confirm('\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0639\u062F\u0627\u062F \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0625\u0644\u0649 0\u061F')) return;
  try {
    await SupaDB.DiscountCodes.resetUsage(id);
    loadDiscountCodes();
    showToast('\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u0639\u062F\u0627\u062F \u2713', 'success');
  } catch(e) { showToast('\u062E\u0637\u0623: ' + e.message, 'error'); }
}

// \u2500\u2500 \u062A\u0641\u0639\u064A\u0644/\u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u0643\u0648\u062F \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function toggleCodeActive(id, newState) {
  if (!isAuthenticated()) { showToast('\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B', 'error'); return; }
  try {
    await SupaDB.DiscountCodes.toggleActive(id, newState);
    loadDiscountCodes();
    showToast(newState ? '\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0643\u0648\u062F \u2713' : '\u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u0643\u0648\u062F', newState ? 'success' : 'warning');
  } catch(e) { showToast('\u062E\u0637\u0623: ' + e.message, 'error'); }
}

// \u2500\u2500 \u0645\u0639\u0627\u064A\u0646\u0629 \u0648\u0642\u062A \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function updateExpiryPreview() {
  var days  = parseInt(document.getElementById('discountDays')?.value)  || 0;
  var hours = parseInt(document.getElementById('discountHours')?.value) || 0;
  var preview = document.getElementById('expiryPreview');
  if (!preview) return;
  if (days <= 0 && hours <= 0) { preview.textContent = '\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0645\u062F\u0629 \u0635\u0627\u0644\u062D\u0629'; preview.className = 'text-xs text-red-500 mt-1'; return; }
  var ms = (days * 86400000) + (hours * 3600000);
  var expiry = new Date(Date.now() + ms);
  var parts = [];
  if (days > 0)  parts.push(days  + (days  === 1 ? ' \u064A\u0648\u0645'   : ' \u0623\u064A\u0627\u0645'));
  if (hours > 0) parts.push(hours + (hours === 1 ? ' \u0633\u0627\u0639\u0629'  : ' \u0633\u0627\u0639\u0627\u062A'));
  preview.innerHTML = '<span class="flex flex-wrap gap-x-1 items-center">\u23F1\uFE0F \u064A\u0646\u062A\u0647\u064A \u0628\u0639\u062F <b>' + parts.join(' \u0648 ') + '</b><span class="hidden sm:inline">\u2014</span><span class="sm:inline">\u0641\u064A ' +
    expiry.toLocaleDateString('ar-EG') + ' \u0627\u0644\u0633\u0627\u0639\u0629 ' +
    expiry.toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) + '</span></span>';
  preview.className = 'text-xs text-green-700 mt-1';
}

// \u2500\u2500 \u0625\u0646\u0634\u0627\u0621 \u0643\u0648\u062F \u062C\u062F\u064A\u062F \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function openCreateDiscountModal() {
  var errDiv = document.getElementById('discountModalError');
  if (errDiv) { errDiv.textContent = ''; errDiv.classList.add('hidden'); }
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
  if (!isAuthenticated()) { showToast('\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B','error'); return; }
  var code = document.getElementById('discountCode').value.trim().toUpperCase();
  var dType = document.getElementById('discountType').value;
  var dVal  = parseInt(document.getElementById('discountValue').value);
  var durDays  = parseInt(document.getElementById('discountDays').value)  || 0;
  var durHours = parseInt(document.getElementById('discountHours').value) || 0;
  var maxU  = document.getElementById('discountMaxUses').value;
  if (!code || code.length < 2 || !/^[A-Z0-9]+$/.test(code)) { showToast('\u0643\u0648\u062F \u063A\u064A\u0631 \u0635\u0627\u0644\u062D (2 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0628\u0627\u0644\u0623\u062D\u0631\u0641 \u0648\u0627\u0644\u0623\u0631\u0642\u0627\u0645)','error'); return; }
  if (!dVal || dVal <= 0) { showToast('\u0642\u064A\u0645\u0629 \u0627\u0644\u062E\u0635\u0645 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629','error'); return; }
  if (dType === 'percent' && dVal > 100) { showToast('\u0646\u0633\u0628\u0629 \u0627\u0644\u062E\u0635\u0645 \u0644\u0627 \u062A\u062A\u062C\u0627\u0648\u0632 100%','error'); return; }
  if (dType === 'fixed' && dVal % 250 !== 0) {
    dVal = Math.max(250, Math.round(dVal / 250) * 250);
    document.getElementById('discountValue').value = dVal;
    showToast('\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0642\u064A\u0645\u0629 \u0627\u0644\u062E\u0635\u0645 \u0625\u0644\u0649 ' + dVal.toLocaleString() + ' \u062F.\u0639', 'info');
  }
  if (durDays <= 0 && durHours <= 0) { showToast('\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0645\u062F\u0629 \u0635\u0627\u0644\u062D\u0629 (\u0623\u064A\u0627\u0645 \u0623\u0648 \u0633\u0627\u0639\u0627\u062A)', 'error'); return; }
  var ms = (durDays * 86400000) + (durHours * 3600000);
  var expiresAt = new Date(Date.now() + ms).toISOString();
  var btn = document.querySelector('#createDiscountModal .save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0641\u0638...'; }
  try {
    var maxUVal = (maxU && parseInt(maxU) > 0) ? parseInt(maxU) : null;
    await SupaDB.DiscountCodes.create({ code, discount_type: dType, discount_value: dVal, expires_at: expiresAt, max_uses: maxUVal, used_count: 0, is_active: true });
    closeCreateDiscountModal();
    loadDiscountCodes();
    showSuccessAnimation('\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0643\u0648\u062F \u0627\u0644\u062E\u0635\u0645 \u0628\u0646\u062C\u0627\u062D!');
  } catch(e) {
    var errMsg = e.message.includes('duplicate') ? 'هذا الكود موجود مسبقاً' : 'خطأ: ' + e.message;
    showToast(errMsg, 'error');
    var errDiv = document.getElementById('discountModalError');
    if (errDiv) { errDiv.textContent = errMsg; errDiv.classList.remove('hidden'); }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0643\u0648\u062F'; }
  }
}

// \u2500\u2500 \u062D\u0630\u0641 \u0627\u0644\u0643\u0648\u062F \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function deleteDiscountCode(id) {
  if (!isAuthenticated()) { showToast('\u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B','error'); return; }
  if (!confirm('\u0647\u0644 \u0623\u0646\u062A \u0645\u062A\u0623\u0643\u062F \u0645\u0646 \u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F\u061F')) return;
  try { await SupaDB.DiscountCodes.delete(id); loadDiscountCodes(); showToast('\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0643\u0648\u062F','warning'); }
  catch(e) { showToast('\u062E\u0637\u0623: ' + e.message,'error'); }
}

// \u2500\u2500 \u0646\u0633\u062E \u0627\u0644\u0643\u0648\u062F \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function copyDiscountCode(code) {
  navigator.clipboard.writeText(code)
    .then(() => showToast('\u062A\u0645 \u0646\u0633\u062E \u0627\u0644\u0643\u0648\u062F: ' + code, 'success'))
    .catch(() => {
      var e = document.createElement('input'); e.value = code;
      document.body.appendChild(e); e.select(); document.execCommand('copy'); document.body.removeChild(e);
      showToast('\u062A\u0645 \u0646\u0633\u062E \u0627\u0644\u0643\u0648\u062F: ' + code, 'success');
    });
}

// \u2500\u2500 Event delegation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-action="delete-discount"]');
  if (btn) deleteDiscountCode(btn.dataset.id);
});
