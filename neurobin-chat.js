
/** Neurobin Pharmacy Chat Widget — Powered by Gemini AI **/
(function () {
  'use strict';

  const API_URL = 'https://app.codewords.agemo.ai/run/neurobin_pharmacy_chat_8f619152';

  const CSS = `
    #nb-chat-btn {
      position:fixed; bottom:28px; left:28px; z-index:99999;
      width:62px; height:62px; border-radius:50%;
      background:linear-gradient(135deg,#1a5c25,#2d8a40);
      border:none; cursor:pointer;
      box-shadow:0 4px 20px rgba(45,138,64,.45);
      display:flex; align-items:center; justify-content:center;
      transition:transform .2s,box-shadow .2s;
    }
    #nb-chat-btn:hover { transform:scale(1.1); box-shadow:0 6px 28px rgba(45,138,64,.6); }
    #nb-chat-btn svg { width:30px; height:30px; fill:#fff; }
    #nb-chat-window {
      position:fixed; bottom:104px; left:28px; z-index:99998;
      width:360px; max-height:530px;
      background:#0b1a0e; border:1px solid #1e3a22;
      border-radius:18px; display:flex; flex-direction:column;
      box-shadow:0 12px 40px rgba(0,0,0,.6);
      font-family:"Cairo","Segoe UI",Tahoma,sans-serif;
      direction:rtl; font-size:14px; overflow:hidden;
      transition:opacity .25s,transform .25s;
    }
    #nb-chat-window.nb-hidden { opacity:0; transform:translateY(12px) scale(.97); pointer-events:none; }
    #nb-chat-header {
      background:linear-gradient(135deg,#163d1e,#1e5228);
      padding:14px 18px; display:flex; align-items:center; gap:10px;
      border-radius:18px 18px 0 0;
    }
    .nb-avatar { width:38px; height:38px; border-radius:50%; background:#2d8a40;
      display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
    .nb-title { color:#a3e4ab; font-weight:700; font-size:15px; }
    .nb-sub { color:#6a9970; font-size:12px; margin-top:2px; }
    .nb-close { margin-right:auto; background:none; border:none; color:#6a9970; cursor:pointer; font-size:20px; }
    .nb-close:hover { color:#a3e4ab; }
    #nb-chat-messages { flex:1; overflow-y:auto; padding:14px;
      display:flex; flex-direction:column; gap:10px; }
    .nb-msg { max-width:82%; border-radius:14px; padding:10px 14px; line-height:1.55; }
    .nb-user { background:#163d1e; color:#c5e8c8; align-self:flex-start; border-bottom-right-radius:4px; }
    .nb-bot { background:#0e1e10; color:#d5ead7; border:1px solid #1e3a22; align-self:flex-end; border-bottom-left-radius:4px; }
    .nb-typing { background:#0e1e10; color:#4a7a50; border:1px solid #1e3a22; align-self:flex-end; }
    .nb-suggestions { display:flex; flex-direction:column; gap:8px; margin-top:4px; }
    .nb-product-card {
      display:flex; gap:10px; align-items:center;
      background:#0a150c; border:1px solid #1e3a22;
      border-radius:10px; padding:9px 12px;
      text-decoration:none; color:inherit; cursor:pointer;
      transition:border-color .2s,background .2s;
    }
    .nb-product-card:hover { border-color:#2d8a40; background:#0e1e10; }
    .nb-product-img { width:44px; height:44px; border-radius:8px; object-fit:cover; background:#1a2e1c; flex-shrink:0; }
    .nb-product-placeholder { width:44px; height:44px; border-radius:8px; background:#1a2e1c;
      flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:20px; }
    .nb-product-info { flex:1; min-width:0; }
    .nb-product-name { color:#a3e4ab; font-weight:600; font-size:13px;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .nb-product-price { color:#6ee87a; font-size:12px; margin-top:2px; }
    .nb-order-btn { font-size:11px; color:#fff; background:#2d8a40;
      border-radius:6px; padding:4px 9px; white-space:nowrap; border:none;
      cursor:pointer; font-family:inherit; }
    .nb-order-btn:hover { background:#3aaa50; }
    #nb-chat-input-row { padding:12px 14px; display:flex; gap:8px; align-items:center;
      border-top:1px solid #1e3a22; }
    #nb-chat-input {
      flex:1; background:#0e1e10; border:1px solid #1e3a22;
      border-radius:10px; padding:9px 13px; color:#d5ead7;
      font-family:inherit; font-size:14px; outline:none;
      resize:none; direction:rtl;
    }
    #nb-chat-input:focus { border-color:#2d8a40; }
    #nb-chat-input::placeholder { color:#3a5a3e; }
    #nb-send-btn {
      background:#2d8a40; border:none; border-radius:10px;
      width:40px; height:40px; cursor:pointer; flex-shrink:0;
      display:flex; align-items:center; justify-content:center; transition:background .2s;
    }
    #nb-send-btn:hover { background:#3aaa50; }
    #nb-send-btn:disabled { background:#1a3a20; cursor:not-allowed; }
    #nb-send-btn svg { width:18px; height:18px; fill:#fff; }
  `;

  let history = [], isOpen = false, isLoading = false;

  function buildUI() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'nb-chat-btn';
    btn.title = 'مساعد الصيدلية';
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`;
    document.body.appendChild(btn);

    const win = document.createElement('div');
    win.id = 'nb-chat-window';
    win.className = 'nb-hidden';
    win.innerHTML = `
      <div id="nb-chat-header">
        <div class="nb-avatar">💊</div>
        <div>
          <div class="nb-title">مساعد صيدلية Neurobin</div>
          <div class="nb-sub">مدعوم بـ Gemini AI</div>
        </div>
        <button class="nb-close" id="nb-close-btn">✕</button>
      </div>
      <div id="nb-chat-messages"></div>
      <div id="nb-chat-input-row">
        <button id="nb-send-btn" disabled>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
        <textarea id="nb-chat-input" rows="1" placeholder="اسألني عن أي منتج أو دواء..."></textarea>
      </div>
    `;
    document.body.appendChild(win);
  }

  function addMsg(role, text, sugs=[]) {
    const msgs = document.getElementById('nb-chat-messages');
    document.getElementById('nb-typing')?.remove();
    const d = document.createElement('div');
    d.className = 'nb-msg nb-' + role;
    d.textContent = text;
    msgs.appendChild(d);
    if (sugs.length) {
      const sc = document.createElement('div');
      sc.className = 'nb-suggestions nb-msg nb-bot';
      sugs.forEach(p => {
        const c = document.createElement('div');
        c.className = 'nb-product-card';
        const img = p.image_url
          ? `<img class="nb-product-img" src="${p.image_url}" alt="${p.name}">`
          : `<div class="nb-product-placeholder">💊</div>`;
        c.innerHTML = img + `
          <div class="nb-product-info">
            <div class="nb-product-name">${p.name}</div>
            <div class="nb-product-price">${p.price} د.ع</div>
          </div>
          <button class="nb-order-btn">اطلب الآن</button>`;
        sc.appendChild(c);
      });
      msgs.appendChild(sc);
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    const msgs = document.getElementById('nb-chat-messages');
    const d = document.createElement('div');
    d.id = 'nb-typing'; d.className = 'nb-msg nb-typing'; d.textContent = '...';
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }

  async function send() {
    if (isLoading) return;
    const inp = document.getElementById('nb-chat-input');
    const msg = inp.value.trim();
    if (!msg) return;
    inp.value = ''; inp.style.height = 'auto';
    isLoading = true;
    document.getElementById('nb-send-btn').disabled = true;
    addMsg('user', msg);
    history.push({role:'user', content:msg});
    showTyping();
    try {
      const res = await fetch(API_URL, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({message:msg, history:history.slice(-8)})
      });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      addMsg('bot', data.response, data.suggestions||[]);
      history.push({role:'assistant', content:data.response});
      if (history.length > 20) history = history.slice(-20);
    } catch(e) {
      addMsg('bot','عذراً، حدث خطأ. يرجى المحاولة مجدداً.');
    } finally {
      isLoading = false;
      document.getElementById('nb-send-btn').disabled = false;
    }
  }

  function init() {
    buildUI();
    document.getElementById('nb-chat-btn').onclick = () => {
      isOpen = !isOpen;
      document.getElementById('nb-chat-window').classList.toggle('nb-hidden', !isOpen);
      if (isOpen && !history.length)
        addMsg('bot','مرحباً! أنا مساعدك الصيدلاني في Neurobin. كيف يمكنني مساعدتك اليوم؟ 🌿');
    };
    document.getElementById('nb-close-btn').onclick = () => {
      isOpen = false;
      document.getElementById('nb-chat-window').classList.add('nb-hidden');
    };
    const inp = document.getElementById('nb-chat-input');
    inp.oninput = function() {
      document.getElementById('nb-send-btn').disabled = !this.value.trim();
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight,90)+'px';
    };
    inp.onkeydown = e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} };
    document.getElementById('nb-send-btn').onclick = send;
  }

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',init) : init();
})();
