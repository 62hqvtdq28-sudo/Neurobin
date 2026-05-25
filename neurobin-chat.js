/* Neurobin Pharmacy Chat Widget v7 — Quick Replies from Supabase
 * Security: Gemini API key moved to Supabase Edge Function.
 * Frontend never sees the key. Calls /functions/v1/gemini-proxy instead.
 */
(function () {
  'use strict';

  // ── Edge Function URL (no API key here!) ─────────────────
  var SUPABASE_URL = 'https://hczsskviliuqyayylutv.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjenNza3ZpbGl1cXlheXlsdXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDg2OTUsImV4cCI6MjA5NDcyNDY5NX0.mT-fPrPzwbUx3mQZOqFGx8ndWTkUS-MeqLcfaN1zS4k';
  var GEMINI_PROXY = 'https://hczsskviliuqyayylutv.supabase.co/functions/v1/gemini-proxy';

  var SYSTEM_BASE = [
    'انت مساعد صيدلاني ذكي لصيدلية Neurobin في العراق.',
    'مهمتك الإجابة على استفسارات العملاء بالعربية.',
    'عند اقتراح منتج اذكر رقمه بصيغة [ID] مثل [46].',
    'لا تقترح سوى منتجات موجودة في الكتالوج.',
    'اجب بشكل مختصر 3 الى 4 جمل فقط.',
    'لا تقدم استشارات طبية تشخيصية.',
    'الاسعار بالدينار العراقي.'
  ].join(' ');

  var catalog = [];
  var quickReplies = [];
  var history = [], isOpen = false, loading = false;

  function injectCSS() {
    var s = document.createElement('style');
    s.textContent = [
      '#nb-fab{position:fixed;bottom:90px;right:20px;z-index:99999;',
      'width:60px;height:60px;border-radius:50%;',
      'background:linear-gradient(135deg,#1a5c25,#2d8a40);',
      'border:none;cursor:pointer;font-size:26px;',
      'box-shadow:0 4px 20px rgba(45,138,64,.5);',
      'transition:transform .2s;}',
      '#nb-fab:hover{transform:scale(1.1);}',
      '#nb-box{position:fixed;bottom:162px;right:20px;z-index:99998;',
      'width:440px;max-height:600px;background:#0b1a0e;',
      'border:1px solid #1e3a22;border-radius:20px;',
      'display:flex;flex-direction:column;overflow:hidden;',
      'box-shadow:0 16px 48px rgba(0,0,0,.7);',
      'font-family:"Cairo","Segoe UI",Tahoma,sans-serif;',
      'direction:rtl;transition:opacity .25s,transform .25s;}',
      '#nb-box.nb-h{opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;}',
      '@media(max-width:500px){',
      '#nb-box{width:calc(100vw - 20px);right:10px;left:10px;}',
      '#nb-fab{right:16px;bottom:90px;}}',
      '#nb-head{background:linear-gradient(135deg,#163d1e,#1e5228);',
      'padding:14px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0;}',
      '#nb-hico{width:40px;height:40px;border-radius:50%;background:#2d8a40;',
      'display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}',
      '#nb-htit{color:#a3e4ab;font-weight:700;font-size:15px;}',
      '#nb-hsub{color:#6a9970;font-size:12px;margin-top:2px;}',
      '#nb-cls{margin-right:auto;background:none;border:none;',
      'color:#6a9970;font-size:22px;cursor:pointer;padding:4px;}',
      '#nb-cls:hover{color:#a3e4ab;}',
      '#nb-qr{display:flex;flex-wrap:wrap;gap:6px;padding:8px 14px;border-top:1px solid #1e3a22;flex-shrink:0;}',
      '.nb-qrbtn{background:#1a3d1f;border:1px solid #2d8a40;color:#a3e4ab;border-radius:20px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:Cairo,sans-serif;transition:all .2s;}',
      '.nb-qrbtn:hover{background:#2d8a40;color:#fff;}',
      '#nb-msgs{flex:1;overflow-y:auto;padding:14px;',
      'display:flex;flex-direction:column;gap:10px;}',
      '.nb-m{max-width:84%;border-radius:14px;padding:11px 15px;',
      'line-height:1.6;font-size:15px;word-wrap:break-word;}',
      '.nb-u{background:#163d1e;color:#c5e8c8;align-self:flex-start;',
      'border-bottom-right-radius:3px;}',
      '.nb-b{background:#0e1e10;color:#d5ead7;border:1px solid #1e3a22;',
      'align-self:flex-end;border-bottom-left-radius:3px;}',
      '.nb-err{background:#2a0808;color:#f08080;align-self:flex-end;border-radius:10px;}',
      '.nb-cards{display:flex;flex-direction:column;gap:8px;width:100%;align-self:flex-end;}',
      '.nb-card{display:flex;gap:10px;align-items:center;',
      'background:#0a150c;border:1px solid #1e3a22;border-radius:10px;',
      'padding:9px 12px;transition:border-color .2s;}',
      '.nb-card:hover{border-color:#2d8a40;}',
      '.nb-ci{width:46px;height:46px;border-radius:8px;object-fit:cover;',
      'background:#1a2e1c;flex-shrink:0;}',
      '.nb-cp{width:46px;height:46px;border-radius:8px;background:#1a2e1c;',
      'flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;}',
      '.nb-cn{color:#a3e4ab;font-weight:700;font-size:13px;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.nb-cpr{color:#6ee87a;font-size:12px;margin-top:2px;}',
      '.nb-ob{font-size:11.5px;color:#fff;background:#2d8a40;',
      'border-radius:6px;padding:5px 10px;white-space:nowrap;',
      'border:none;cursor:pointer;margin-right:auto;flex-shrink:0;}',
      '.nb-ob:hover{background:#3aaa50;}',
      '#nb-foot{padding:12px 14px;display:flex;gap:8px;align-items:flex-end;',
      'border-top:1px solid #1e3a22;flex-shrink:0;}',
      '#nb-inp{flex:1;background:#0e1e10;border:1px solid #1e3a22;',
      'border-radius:11px;padding:10px 14px;color:#d5ead7;',
      'font-family:inherit;font-size:15px;outline:none;',
      'resize:none;direction:rtl;max-height:90px;line-height:1.5;}',
      '#nb-inp:focus{border-color:#2d8a40;}',
      '#nb-inp::placeholder{color:#3a5a3e;}',
      '#nb-snd{background:#2d8a40;border:none;border-radius:11px;',
      'width:42px;height:42px;cursor:pointer;flex-shrink:0;font-size:20px;}',
      '#nb-snd:hover{background:#3aaa50;}',
      '#nb-snd:disabled{background:#1a3a20;cursor:not-allowed;opacity:.6;}'
    ].join('');
    document.head.appendChild(s);
  }

  function el(tag, attrs) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function(k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'cls') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    return e;
  }

  function buildUI() {
    var fab = el('button', {id:'nb-fab', title:'مساعد الصيدلية', text:'💬'});
    document.body.appendChild(fab);
    var box = el('div', {id:'nb-box', cls:'nb-h'});
    var head = el('div', {id:'nb-head'});
    var ico  = el('div', {id:'nb-hico', text:'💊'});
    var info = el('div', {});
    var cls  = el('button', {id:'nb-cls', text:'✕'});
    info.appendChild(el('div', {id:'nb-htit', text:'مساعد صيدلية Neurobin'}));
    info.appendChild(el('div', {id:'nb-hsub', text:'مدعوم بـ Gemini AI ✨'}));
    head.appendChild(ico); head.appendChild(info); head.appendChild(cls);
    var msgs = el('div', {id:'nb-msgs'});
    var foot = el('div', {id:'nb-foot'});
    var inp  = el('textarea', {id:'nb-inp', rows:'1', placeholder:'اسألني عن أي منتج أو دواء...'});
    var snd  = el('button', {id:'nb-snd', text:'➤', disabled:'true'});
    foot.appendChild(snd); foot.appendChild(inp);
    var qr = el('div', {id:'nb-qr'});
    box.appendChild(head); box.appendChild(msgs); box.appendChild(qr); box.appendChild(foot);
    document.body.appendChild(box);
    fab.addEventListener('click', toggle);
    cls.addEventListener('click', toggle);
    inp.addEventListener('input', function() {
      snd.disabled = !this.value.trim();
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 90) + 'px';
    });
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    snd.addEventListener('click', send);
  }

  function loadCatalog() {
    fetch(SUPABASE_URL + '/rest/v1/products?select=id,name,name_ar,category,price,in_stock,image_url&in_stock=eq.true', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      catalog = data || [];
      console.log('[NB Chat] Catalog:', catalog.length, 'products');
    })
    .catch(function(e) { console.warn('[NB Chat] Catalog failed:', e); });
  }
  function loadQuickReplies() {
    fetch(SUPABASE_URL + '/rest/v1/ai_quick_replies?select=button_text,response_text&is_active=eq.true&order=sort_order.asc', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      quickReplies = data || [];
      console.log('[NB Chat] Quick replies:', quickReplies.length);
      renderQuickReplies();
    })
    .catch(function(e) { console.warn('[NB Chat] Quick replies failed:', e); });
  }

  function renderQuickReplies() {
    var qr = document.getElementById('nb-qr');
    if (!qr) return;
    qr.innerHTML = '';
    if (!quickReplies.length) { qr.style.display = 'none'; return; }
    qr.style.display = 'flex';
    quickReplies.forEach(function(item) {
      var btn = document.createElement('button');
      btn.className = 'nb-qrbtn';
      btn.textContent = item.button_text;
      btn.onclick = function() {
        addMsg('u', item.button_text);
        addMsg('b', item.response_text);
        if (history.length > 20) history = history.slice(-20);
      };
      qr.appendChild(btn);
    });
  }

  function buildCatalogText() {
    if (!catalog.length) return 'لا توجد منتجات.';
    return '=== المنتجات المتاحة ===\n' + catalog.map(function(p) {
      return '[' + p.id + '] ' + (p.name_ar || p.name || '') + ' | ' + (p.category || '') + ' | ' + (p.price || 0) + ' د.ع';
    }).join('\n');
  }

  function extractSuggestions(text) {
    var ids = {};
    var m, rx = /\[(\d+)\]/g;
    while ((m = rx.exec(text)) !== null) ids[parseInt(m[1])] = true;
    return catalog.filter(function(p) { return ids[p.id]; }).slice(0, 4);
  }

  function toggle() {
    isOpen = !isOpen;
    var box = document.getElementById('nb-box');
    if (isOpen) {
      box.classList.remove('nb-h');
      if (!history.length) addMsg('b', 'مرحباً! أنا مساعدك الصيدلاني في Neurobin. كيف يمكنني مساعدتك اليوم؟ 🌿');
    } else {
      box.classList.add('nb-h');
    }
  }

  function addMsg(type, text, cards) {
    var msgs = document.getElementById('nb-msgs');
    var t = document.getElementById('nb-typ');
    if (t) t.parentNode.removeChild(t);
    var d = el('div', {cls:'nb-m nb-' + type, text:text});
    msgs.appendChild(d);
    if (cards && cards.length) {
      var wrap = el('div', {cls:'nb-cards'});
      cards.forEach(function(p) {
        var card = el('div', {cls:'nb-card'});
        if (p.image_url) {
          card.appendChild(el('img', {cls:'nb-ci', src:p.image_url, alt:p.name_ar || p.name || ''}));
        } else {
          card.appendChild(el('div', {cls:'nb-cp', text:'💊'}));
        }
        var info = el('div', {style:'flex:1;min-width:0'});
        info.appendChild(el('div', {cls:'nb-cn', text:p.name_ar || p.name || ''}));
        info.appendChild(el('div', {cls:'nb-cpr', text:Number(p.price).toLocaleString('ar-IQ') + ' د.ع'}));
        card.appendChild(info);
        card.appendChild(el('button', {cls:'nb-ob', text:'اطلب الآن'}));
        wrap.appendChild(card);
      });
      msgs.appendChild(wrap);
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var msgs = document.getElementById('nb-msgs');
    var d = el('div', {id:'nb-typ', cls:'nb-m nb-b', text:'جاري التفكير...'});
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function send() {
    if (loading) return;
    var inp = document.getElementById('nb-inp');
    var msg = inp.value.trim();
    if (!msg) return;
    inp.value = ''; inp.style.height = 'auto';
    loading = true;
    document.getElementById('nb-snd').disabled = true;
    addMsg('u', msg);
    history.push({role:'user', parts:[{text:msg}]});
    showTyping();

    var systemText = SYSTEM_BASE + '\n\n' + buildCatalogText() + '\n\nعند اقتراح منتج اذكر رقمه بين قوسين مربعين مثل [46].';

    // ── Call Edge Function (NOT Gemini directly) ─────────────
    fetch(GEMINI_PROXY, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY},
      body: JSON.stringify({
        system_instruction: {parts: [{text: systemText}]},
        contents: history.slice(-10),
        generationConfig: {temperature: 0.4, maxOutputTokens: 600}
      })
    })
    .then(function(r) {
      if (!r.ok) {
        return r.text().then(function(b) { throw new Error('HTTP ' + r.status + ' ' + b.slice(0, 150)); });
      }
      return r.json();
    })
    .then(function(data) {
      if (!data.candidates || !data.candidates[0]) throw new Error('لا يوجد رد');
      var text = data.candidates[0].content.parts[0].text;
      addMsg('b', text, extractSuggestions(text));
      history.push({role:'model', parts:[{text:text}]});
      if (history.length > 20) history = history.slice(-20);
    })
    .catch(function(e) {
      addMsg('err', 'خطأ: ' + e.message);
      console.error('[NB Chat]', e);
    })
    .finally(function() {
      loading = false;
      document.getElementById('nb-snd').disabled = false;
    });
  }

  function init() {
    injectCSS();
    buildUI();
    loadCatalog();
    loadQuickReplies();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
