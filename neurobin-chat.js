/* Neurobin Pharmacy Chat Widget v3
 * Uses createElement only — no innerHTML, no copy-paste issues
 * Add before </body>: <script src="neurobin-chat.js"></script>
 */
(function () {
  'use strict';

  var API = 'https://app.codewords.agemo.ai/run/neurobin_pharmacy_chat_8f619152';
  var history = [], isOpen = false, loading = false;

  /* ── CSS ─────────────────────────────────────────────────────────── */
  function injectCSS() {
    var s = document.createElement('style');
    s.id = 'nb-styles';
    s.textContent = [
      '#nb-fab{position:fixed;bottom:90px;right:20px;z-index:99999;',
      'width:60px;height:60px;border-radius:50%;',
      'background:linear-gradient(135deg,#1a5c25,#2d8a40);',
      'border:none;cursor:pointer;font-size:26px;',
      'box-shadow:0 4px 20px rgba(45,138,64,.5);',
      'transition:transform .2s,box-shadow .2s;}',
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
      '#nb-box{width:calc(100vw - 20px);right:10px;left:10px;bottom:162px;}',
      '#nb-fab{right:16px;bottom:90px;}}',

      '#nb-head{background:linear-gradient(135deg,#163d1e,#1e5228);',
      'padding:14px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0;}',
      '#nb-head-ico{width:40px;height:40px;border-radius:50%;background:#2d8a40;',
      'display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}',
      '#nb-head-title{color:#a3e4ab;font-weight:700;font-size:15px;}',
      '#nb-head-sub{color:#6a9970;font-size:12px;margin-top:2px;}',
      '#nb-close{margin-right:auto;background:none;border:none;',
      'color:#6a9970;font-size:22px;cursor:pointer;padding:4px;}',
      '#nb-close:hover{color:#a3e4ab;}',

      '#nb-msgs{flex:1;overflow-y:auto;padding:14px;',
      'display:flex;flex-direction:column;gap:10px;}',
      '.nb-m{max-width:84%;border-radius:14px;padding:11px 15px;',
      'line-height:1.6;font-size:15px;word-wrap:break-word;}',
      '.nb-u{background:#163d1e;color:#c5e8c8;align-self:flex-start;',
      'border-bottom-right-radius:3px;}',
      '.nb-b{background:#0e1e10;color:#d5ead7;border:1px solid #1e3a22;',
      'align-self:flex-end;border-bottom-left-radius:3px;}',
      '.nb-err{background:#2a0808;color:#f0a0a0;border:1px solid #5a1010;',
      'align-self:flex-end;border-radius:10px;}',

      '.nb-cards{display:flex;flex-direction:column;gap:8px;',
      'align-self:flex-end;width:100%;}',
      '.nb-card{display:flex;gap:10px;align-items:center;',
      'background:#0a150c;border:1px solid #1e3a22;border-radius:10px;',
      'padding:9px 12px;cursor:pointer;transition:border-color .2s;}',
      '.nb-card:hover{border-color:#2d8a40;}',
      '.nb-card-img{width:46px;height:46px;border-radius:8px;object-fit:cover;',
      'background:#1a2e1c;flex-shrink:0;}',
      '.nb-card-name{color:#a3e4ab;font-weight:700;font-size:13px;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.nb-card-price{color:#6ee87a;font-size:12px;margin-top:2px;}',
      '.nb-order{font-size:11.5px;color:#fff;background:#2d8a40;',
      'border-radius:6px;padding:5px 10px;white-space:nowrap;',
      'border:none;cursor:pointer;margin-right:auto;flex-shrink:0;}',
      '.nb-order:hover{background:#3aaa50;}',

      '#nb-foot{padding:12px 14px;display:flex;gap:8px;align-items:flex-end;',
      'border-top:1px solid #1e3a22;flex-shrink:0;}',
      '#nb-inp{flex:1;background:#0e1e10;border:1px solid #1e3a22;',
      'border-radius:11px;padding:10px 14px;color:#d5ead7;',
      'font-family:inherit;font-size:15px;outline:none;',
      'resize:none;direction:rtl;max-height:90px;line-height:1.5;}',
      '#nb-inp:focus{border-color:#2d8a40;}',
      '#nb-inp::placeholder{color:#3a5a3e;}',
      '#nb-send{background:#2d8a40;border:none;border-radius:11px;',
      'width:42px;height:42px;cursor:pointer;flex-shrink:0;font-size:20px;',
      'transition:background .2s;}',
      '#nb-send:hover{background:#3aaa50;}',
      '#nb-send:disabled{background:#1a3a20;cursor:not-allowed;opacity:.6;}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ── DOM builders ────────────────────────────────────────────────── */
  function el(tag, props) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function(k) {
      if (k === 'text') { e.textContent = props[k]; }
      else if (k === 'cls') { e.className = props[k]; }
      else { e.setAttribute(k, props[k]); }
    });
    return e;
  }

  function buildUI() {
    /* Floating button */
    var fab = el('button', {id:'nb-fab', title:'مساعد الصيدلية', text:'💬'});
    document.body.appendChild(fab);

    /* Chat box */
    var box = el('div', {id:'nb-box', cls:'nb-h'});

    /* Header */
    var head = el('div', {id:'nb-head'});
    var ico  = el('div', {id:'nb-head-ico', text:'💊'});
    var info = el('div', {});
    var t    = el('div', {id:'nb-head-title', text:'مساعد صيدلية Neurobin'});
    var sub  = el('div', {id:'nb-head-sub',   text:'مدعوم بـ Gemini AI ✨'});
    var cls  = el('button', {id:'nb-close', text:'✕'});
    info.appendChild(t); info.appendChild(sub);
    head.appendChild(ico); head.appendChild(info); head.appendChild(cls);

    /* Messages */
    var msgs = el('div', {id:'nb-msgs'});

    /* Footer / input */
    var foot = el('div', {id:'nb-foot'});
    var inp  = el('textarea', {id:'nb-inp', rows:'1',
                  placeholder:'اسألني عن أي منتج أو دواء...'});
    var snd  = el('button', {id:'nb-send', text:'➤', disabled:'true'});
    foot.appendChild(snd); foot.appendChild(inp);

    box.appendChild(head); box.appendChild(msgs); box.appendChild(foot);
    document.body.appendChild(box);

    /* Events */
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

  /* ── Chat logic ──────────────────────────────────────────────────── */
  function toggle() {
    isOpen = !isOpen;
    var box = document.getElementById('nb-box');
    if (isOpen) {
      box.classList.remove('nb-h');
      if (!history.length) addMsg('b', 'مرحباً! أنا مساعدك الصيدلاني في Neurobin. كيف يمكنني مساعدتك؟ 🌿');
    } else {
      box.classList.add('nb-h');
    }
  }

  function addMsg(type, text, cards) {
    var msgs = document.getElementById('nb-msgs');
    var t = document.getElementById('nb-typing');
    if (t) t.parentNode.removeChild(t);

    var d = el('div', {cls: 'nb-m nb-' + type, text: text});
    msgs.appendChild(d);

    if (cards && cards.length) {
      var wrap = el('div', {cls: 'nb-cards'});
      cards.forEach(function(p) {
        var card = el('div', {cls: 'nb-card'});
        if (p.image_url) {
          var img = el('img', {cls:'nb-card-img', src:p.image_url, alt:p.name});
          card.appendChild(img);
        } else {
          card.appendChild(el('div', {cls:'nb-card-img', text:'💊'}));
        }
        var info = el('div', {style:'flex:1;min-width:0'});
        info.appendChild(el('div', {cls:'nb-card-name', text:p.name}));
        info.appendChild(el('div', {cls:'nb-card-price',
          text: Number(p.price).toLocaleString('ar-IQ') + ' د.ع'}));
        var btn = el('button', {cls:'nb-order', text:'اطلب الآن'});
        card.appendChild(info); card.appendChild(btn);
        wrap.appendChild(card);
      });
      msgs.appendChild(wrap);
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var msgs = document.getElementById('nb-msgs');
    var d = el('div', {id:'nb-typing', cls:'nb-m nb-b', text:'جاري التفكير...'});
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
    document.getElementById('nb-send').disabled = true;

    addMsg('u', msg);
    history.push({role:'user', content:msg});
    showTyping();

    fetch(API, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message:msg, history:history.slice(-8)})
    })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(d) {
      addMsg('b', d.response, d.suggestions || []);
      history.push({role:'assistant', content:d.response});
      if (history.length > 20) history = history.slice(-20);
    })
    .catch(function(e) {
      addMsg('err', 'خطأ في الاتصال: ' + e.message);
      console.error('[NB Chat]', e);
    })
    .finally(function() {
      loading = false;
      document.getElementById('nb-send').disabled = false;
    });
  }

  /* ── Init ────────────────────────────────────────────────────────── */
  function init() {
    injectCSS();
    buildUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
