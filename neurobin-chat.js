(function () {
  'use strict';

  var API_URL = 'https://app.codewords.agemo.ai/run/neurobin_pharmacy_chat_8f619152';

  var CSS = [
    /* ── Floating button (above WhatsApp) ── */
    '#nb-btn{position:fixed;bottom:90px;right:20px;z-index:99999;',
    'width:58px;height:58px;border-radius:50%;',
    'background:linear-gradient(135deg,#1a5c25,#2d8a40);',
    'border:none;cursor:pointer;',
    'box-shadow:0 4px 20px rgba(45,138,64,.5);',
    'display:flex;align-items:center;justify-content:center;',
    'transition:transform .2s,box-shadow .2s;}',
    '#nb-btn:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(45,138,64,.7);}',
    '#nb-btn svg{width:28px;height:28px;fill:#fff;}',

    /* ── Chat window ── */
    '#nb-win{position:fixed;bottom:160px;right:20px;z-index:99998;',
    'width:440px;max-height:620px;',
    'background:#0b1a0e;border:1px solid #1e3a22;border-radius:20px;',
    'display:flex;flex-direction:column;',
    'box-shadow:0 16px 48px rgba(0,0,0,.7);',
    'font-family:"Cairo","Segoe UI",Tahoma,sans-serif;',
    'direction:rtl;font-size:15px;overflow:hidden;',
    'transition:opacity .25s,transform .25s;}',
    '#nb-win.nb-h{opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;}',

    /* mobile responsive */
    '@media(max-width:480px){',
    '#nb-win{width:calc(100vw - 16px);right:8px;left:8px;bottom:160px;}',
    '#nb-btn{bottom:90px;right:16px;}}',

    /* ── Header ── */
    '#nb-hd{background:linear-gradient(135deg,#163d1e,#1e5228);',
    'padding:16px 20px;display:flex;align-items:center;gap:12px;',
    'border-radius:20px 20px 0 0;flex-shrink:0;}',
    '.nb-av{width:42px;height:42px;border-radius:50%;background:#2d8a40;',
    'display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}',
    '.nb-tit{color:#a3e4ab;font-weight:700;font-size:16px;}',
    '.nb-sub{color:#6a9970;font-size:12.5px;margin-top:2px;}',
    '#nb-cls{margin-right:auto;background:none;border:none;',
    'color:#6a9970;cursor:pointer;font-size:22px;line-height:1;padding:4px;}',
    '#nb-cls:hover{color:#a3e4ab;}',

    /* ── Messages ── */
    '#nb-msgs{flex:1;overflow-y:auto;padding:16px;',
    'display:flex;flex-direction:column;gap:12px;}',
    '#nb-msgs::-webkit-scrollbar{width:4px;}',
    '#nb-msgs::-webkit-scrollbar-thumb{background:#1e3a22;border-radius:4px;}',
    '.nb-m{max-width:85%;border-radius:16px;padding:12px 16px;line-height:1.6;font-size:15px;}',
    '.nb-u{background:#163d1e;color:#c5e8c8;align-self:flex-start;border-bottom-right-radius:4px;}',
    '.nb-b{background:#0e1e10;color:#d5ead7;border:1px solid #1e3a22;',
    'align-self:flex-end;border-bottom-left-radius:4px;}',
    '.nb-t{background:#0e1e10;color:#4a7a50;border:1px solid #1e3a22;',
    'align-self:flex-end;font-style:italic;}',

    /* ── Product cards ── */
    '.nb-sugs{display:flex;flex-direction:column;gap:9px;margin-top:4px;}',
    '.nb-card{display:flex;gap:12px;align-items:center;',
    'background:#0a150c;border:1px solid #1e3a22;',
    'border-radius:12px;padding:10px 13px;cursor:pointer;',
    'transition:border-color .2s,background .2s;}',
    '.nb-card:hover{border-color:#2d8a40;background:#0e1e10;}',
    '.nb-ci{width:50px;height:50px;border-radius:9px;object-fit:cover;',
    'background:#1a2e1c;flex-shrink:0;}',
    '.nb-cp{width:50px;height:50px;border-radius:9px;background:#1a2e1c;',
    'flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;}',
    '.nb-cn{color:#a3e4ab;font-weight:700;font-size:13.5px;',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.nb-cpr{color:#6ee87a;font-size:13px;margin-top:3px;}',
    '.nb-co{font-size:12px;color:#fff;background:#2d8a40;',
    'border-radius:7px;padding:5px 11px;white-space:nowrap;border:none;',
    'cursor:pointer;font-family:inherit;flex-shrink:0;}',
    '.nb-co:hover{background:#3aaa50;}',

    /* ── Input row ── */
    '#nb-inp-row{padding:13px 16px;display:flex;gap:9px;align-items:flex-end;',
    'border-top:1px solid #1e3a22;flex-shrink:0;}',
    '#nb-inp{flex:1;background:#0e1e10;border:1px solid #1e3a22;',
    'border-radius:12px;padding:11px 15px;color:#d5ead7;',
    'font-family:inherit;font-size:15px;outline:none;',
    'resize:none;direction:rtl;max-height:100px;line-height:1.5;}',
    '#nb-inp:focus{border-color:#2d8a40;}',
    '#nb-inp::placeholder{color:#3a5a3e;}',
    '#nb-snd{background:#2d8a40;border:none;border-radius:12px;',
    'width:44px;height:44px;cursor:pointer;flex-shrink:0;',
    'display:flex;align-items:center;justify-content:center;transition:background .2s;}',
    '#nb-snd:hover{background:#3aaa50;}',
    '#nb-snd:disabled{background:#1a3a20;cursor:not-allowed;}',
    '#nb-snd svg{width:20px;height:20px;fill:#fff;}',
  ].join('');

  var history = [], open = false, loading = false;

  function buildUI() {
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);

    /* Floating button */
    var btn = document.createElement('button');
    btn.id = 'nb-btn';
    btn.title = 'مساعد الصيدلية';
    btn.innerHTML = '';
    document.body.appendChild(btn);

    /* Chat window */
    var win = document.createElement('div');
    win.id = 'nb-win';
    win.className = 'nb-h';
    win.innerHTML =
      '
' +
        '
💊
' +
        '
مساعد صيدلية Neurobin
' +
        '
مدعوم بـ Gemini AI ✨
' +
        '✕' +
      '
' +
      '
' +
      '
' +
        '' +
          '' +
        '' +
        '' +
      '
';
    document.body.appendChild(win);
  }

  function addMsg(role, text, sugs) {
    var msgs = document.getElementById('nb-msgs');
    var typing = document.getElementById('nb-typing');
    if (typing) typing.parentNode.removeChild(typing);

    var d = document.createElement('div');
    d.className = 'nb-m ' + (role === 'user' ? 'nb-u' : 'nb-b');
    d.textContent = text;
    msgs.appendChild(d);

    if (sugs && sugs.length > 0) {
      var sc = document.createElement('div');
      sc.className = 'nb-sugs nb-m nb-b';
      sugs.forEach(function(p) {
        var c = document.createElement('div');
        c.className = 'nb-card';
        var img = p.image_url
          ? '' + p.name + ''
          : '
💊
';
        c.innerHTML = img +
          '
' +
            '
' + p.name + '
' +
            '
' + Number(p.price).toLocaleString('ar-IQ') + ' د.ع
' +
          '
' +
          'اطلب الآن';
        sc.appendChild(c);
      });
      msgs.appendChild(sc);
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var msgs = document.getElementById('nb-msgs');
    var d = document.createElement('div');
    d.id = 'nb-typing';
    d.className = 'nb-m nb-t';
    d.textContent = 'جاري التفكير...';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function toggleChat() {
    open = !open;
    var win = document.getElementById('nb-win');
    if (open) {
      win.classList.remove('nb-h');
      if (history.length === 0) {
        addMsg('bot', 'مرحباً! أنا مساعدك الصيدلاني في Neurobin. يمكنني مساعدتك في اختيار المنتجات المناسبة. كيف يمكنني خدمتك؟ 🌿');
      }
    } else {
      win.classList.add('nb-h');
    }
  }

  function send() {
    if (loading) return;
    var inp = document.getElementById('nb-inp');
    var msg = inp.value.trim();
    if (!msg) return;

    inp.value = '';
    inp.style.height = 'auto';
    loading = true;
    document.getElementById('nb-snd').disabled = true;

    addMsg('user', msg);
    history.push({ role: 'user', content: msg });
    showTyping();

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: history.slice(-8) })
    })
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — تحقق من Console للمزيد');
      return res.json();
    })
    .then(function(data) {
      addMsg('bot', data.response, data.suggestions || []);
      history.push({ role: 'assistant', content: data.response });
      if (history.length > 20) history = history.slice(-20);
    })
    .catch(function(err) {
      addMsg('bot', '⚠️ خطأ في الاتصال: ' + err.message + '\nيرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.');
      console.error('[Neurobin Chat Error]', err);
    })
    .finally(function() {
      loading = false;
      document.getElementById('nb-snd').disabled = false;
    });
  }

  function init() {
    buildUI();
    document.getElementById('nb-btn').addEventListener('click', toggleChat);
    document.getElementById('nb-cls').addEventListener('click', toggleChat);

    var inp = document.getElementById('nb-inp');
    inp.addEventListener('input', function() {
      document.getElementById('nb-snd').disabled = !this.value.trim();
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    document.getElementById('nb-snd').addEventListener('click', send);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
