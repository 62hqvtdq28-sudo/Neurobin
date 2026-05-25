// supabase-db.js — Supabase adapter v2
// DiscountCodes + ImageStorage added
// v2.1 — iPad Safari Fix: explicit auth + Uint8Array upload
// v2.2 — Mobile RLS Fix: session check before write operations
// v2.3 — Auto Session Refresh: refreshSession() before failing + global expiry handler
(function() {
  const SUPABASE_URL = 'https://hczsskviliuqyayylutv.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjenNza3ZpbGl1cXlheXlsdXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDg2OTUsImV4cCI6MjA5NDcyNDY5NX0.mT-fPrPzwbUx3mQZOqFGx8ndWTkUS-MeqLcfaN1zS4k';
  const { createClient } = window.supabase;

  // ✅ iPad Safari Fix #1: Explicit auth configuration
  // persistSession + autoRefreshToken تضمن بقاء الـ session على iPad Safari
  const _db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: window.localStorage,
    }
  });

  const Auth = {
    async signIn(email, password) {
      const { data, error } = await _db.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return data.session;
    },
    async signOut()    { await _db.auth.signOut(); },
    async getSession() { const { data: { session } } = await _db.auth.getSession(); return session; },
    async isAuthenticated() { const s = await this.getSession(); return !!(s && s.expires_at * 1000 > Date.now()); },
    onStateChange(cb)  { return _db.auth.onAuthStateChange((_e, s) => cb(s)); }
  };

  // ✅ v2.3 — تجديد تلقائي للجلسة قبل أي عملية كتابة
  // على الهاتف قد ينتهي الـ access token لكن الـ refresh token لا يزال صالحاً
  // نحاول تجديده أولاً قبل رمي خطأ
  async function _requireSession() {
    // 1) جلب الجلسة الحالية من localStorage
    let { data: { session } } = await _db.auth.getSession();

    // 2) إذا لم تكن هناك جلسة — حاول تجديدها تلقائياً
    if (!session) {
      try {
        console.log('[SupaDB] Session missing — attempting refresh...');
        const { data: refreshed, error: refreshErr } = await _db.auth.refreshSession();
        if (refreshErr) throw refreshErr;
        session = refreshed.session;
        if (session) console.log('[SupaDB] Session refreshed successfully ✓');
      } catch (e) {
        console.warn('[SupaDB] Auto-refresh failed:', e.message);
      }
    }

    // 3) إذا فشل التجديد — أطلق حدث انتهاء الجلسة وارمِ خطأ واضح
    if (!session) {
      window.dispatchEvent(new CustomEvent('supadb:session-expired'));
      throw new Error('انتهت جلستك — يرجى تسجيل الدخول مجدداً');
    }

    return session;
  }

  // ✅ v2.3 — مراقبة عالمية لانتهاء الجلسة
  // يُطلق حدث supadb:session-expired عند انتهاء الجلسة كلياً
  _db.auth.onAuthStateChange(function(event, session) {
    if ((event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') && !session) {
      console.warn('[SupaDB] Auth state: session fully expired');
      window.dispatchEvent(new CustomEvent('supadb:session-expired'));
    }
    if (event === 'TOKEN_REFRESHED' && session) {
      console.log('[SupaDB] Token auto-refreshed ✓ expires:', new Date(session.expires_at * 1000).toLocaleTimeString());
    }
  });

  // معالج افتراضي لحدث انتهاء الجلسة
  // إذا لم يكن هناك معالج مخصص في admin.js يُعيد التوجيه لصفحة الدخول
  window.addEventListener('supadb:session-expired', function() {
    // نبحث عن دوال تسجيل الخروج الموجودة في admin.js
    if (typeof showLoginSection === 'function') {
      showLoginSection();
    } else if (typeof handleLogout === 'function') {
      handleLogout();
    } else {
      // إعادة تحميل الصفحة — ستُظهر شاشة تسجيل الدخول
      console.log('[SupaDB] Reloading to show login screen...');
      setTimeout(function() { window.location.reload(); }, 1500);
    }
  }, { once: true });

  async function all(table, order = 'created_at') {
    const { data, error } = await _db.from(table).select('*').order(order, { ascending: false });
    if (error) throw error; return data || [];
  }
  async function ins(table, row) {
    await _requireSession();
    const { data, error } = await _db.from(table).insert(row).select().single();
    if (error) throw error; return data;
  }
  async function upd(table, id, row) {
    await _requireSession();
    const { error } = await _db.from(table).update(row).eq('id', id);
    if (error) throw error;
  }
  async function del(table, id) {
    await _requireSession();
    const { error } = await _db.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  const Products     = { list: () => all('products'), create: p => ins('products', p), update: (id,p) => upd('products', id, p), delete: id => del('products', id) };
  const Packages     = { list: () => all('packages'),  create: p => ins('packages', p),  update: (id,p) => upd('packages', id, p), delete: id => del('packages', id) };
  const Orders = {
    async list() {
      const { data, error } = await _db.from('orders')
        .select('*, order_items(*)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async listDeleted() {
      const { data, error } = await _db.from('orders')
        .select('*, order_items(*)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    updateStatus: (id,s) => upd('orders', id, { status:s, updated_at: new Date().toISOString() }),
    softDelete: async (id) => {
      await _requireSession();
      const { error } = await _db.from('orders').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    restore: async (id) => {
      await _requireSession();
      const { error } = await _db.from('orders').update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
    },
    hardDelete: (id) => del('orders', id)
  };
  const Comments     = { list: () => all('contact_messages','created_at'), updateStatus: (id,s) => upd('contact_messages', id, { is_read: s==='read' }), delete: id => del('contact_messages', id) };
  const Features     = { list: () => all('features','display_order'), save: (f,id) => id ? upd('features',id,f) : ins('features',f), delete: id => del('features',id) };
  const Testimonials = { list: () => all('testimonials'), save: (t,id) => id ? upd('testimonials',id,t) : ins('testimonials',t), delete: id => del('testimonials',id) };

  const Settings = {
    async get() { const { data, error } = await _db.from('settings').select('*'); if (error) throw error; return Object.fromEntries((data||[]).map(r=>[r.key,r.value])); },
    async setMultiple(obj) { const rows = Object.entries(obj).map(([key,value])=>({key,value})); const { error } = await _db.from('settings').upsert(rows,{onConflict:'key'}); if (error) throw error; }
  };

  // ── كودات الخصم
  const DiscountCodes = {
    list:   ()     => all('discount_codes'),
    create: code   => ins('discount_codes', code),
    delete: id     => del('discount_codes', id),
    async validate(codeStr) {
      const { data, error } = await _db.from('discount_codes').select('*')
        .eq('code', codeStr.trim().toUpperCase()).eq('is_active', true)
        .gt('expires_at', new Date().toISOString()).single();
      if (error || !data) return null;
      if (data.max_uses !== null && data.used_count >= data.max_uses) return null;
      return data;
    },
    async incrementUsage(id) {
      const { data } = await _db.from('discount_codes').select('used_count').eq('id', id).single();
      if (data) await _db.from('discount_codes').update({ used_count: (data.used_count||0)+1 }).eq('id', id);
    },
    async updateMaxUses(id, maxUses) {
      const { error } = await _db.from('discount_codes')
        .update({ max_uses: maxUses === null ? null : parseInt(maxUses) })
        .eq('id', id);
      if (error) throw error;
    },
    async resetUsage(id) {
      const { error } = await _db.from('discount_codes')
        .update({ used_count: 0 })
        .eq('id', id);
      if (error) throw error;
    },
    async toggleActive(id, isActive) {
      const { error } = await _db.from('discount_codes')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    }
  };

  // ── رفع الصور إلى Supabase Storage
  const ImageStorage = {
    async upload(file) {
      const ext = ((file.name||'image').split('.').pop()||'jpg').toLowerCase().replace(/[^a-z]/g,'') || 'jpg';
      const path = 'products/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
      const contentType = file.type || 'image/jpeg';

      // ✅ iPad Safari Fix #2: Convert File → Uint8Array قبل الرفع
      let payload = file;
      try {
        const ab = await file.arrayBuffer();
        payload = new Uint8Array(ab);
        console.log('[ImageStorage] Uint8Array OK (' + (payload.length/1024).toFixed(0) + 'KB), type:', contentType);
      } catch(e) {
        console.warn('[ImageStorage] arrayBuffer() failed, using File directly:', e.message);
      }

      const { data, error } = await _db.storage.from('product-images').upload(path, payload, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType
      });
      if (error) throw new Error('خطأ في رفع الصورة: ' + error.message);
      const { data: { publicUrl } } = _db.storage.from('product-images').getPublicUrl(data.path);
      return publicUrl;
    },
    async remove(url) {
      if (!url || !url.includes('/product-images/')) return;
      const path = decodeURIComponent(url.split('/product-images/')[1]?.split('?')[0]||'');
      if (path) await _db.storage.from('product-images').remove([path]);
    }
  };

  const Stats = {
    get: (key,def) => { try { return JSON.parse(localStorage.getItem(key))||def; } catch(e) { return def; } },
    set: (key,val) => localStorage.setItem(key, JSON.stringify(val))
  };

  window.SupaDB = { Auth, Products, Packages, Orders, Comments, Features, Testimonials, Settings, DiscountCodes, ImageStorage, Stats, _db };
  console.log('[SupaDB] v2.3 \u2713 (iPad Fix + Mobile RLS Fix + Auto Session Refresh)');
})();
