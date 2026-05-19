// supabase-db.js \u2014 Supabase adapter v2
// DiscountCodes + ImageStorage added
(function() {
  const SUPABASE_URL = 'https://hczsskviliuqyayylutv.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_yEU6M3goCClpcjHBFqniLg_FdN9oSXb';
  const { createClient } = window.supabase;
  const _db = createClient(SUPABASE_URL, SUPABASE_KEY);

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

  async function all(table, order = 'created_at') {
    const { data, error } = await _db.from(table).select('*').order(order, { ascending: false });
    if (error) throw error; return data || [];
  }
  async function ins(table, row) { const { data, error } = await _db.from(table).insert(row).select().single(); if (error) throw error; return data; }
  async function upd(table, id, row) { const { error } = await _db.from(table).update(row).eq('id', id); if (error) throw error; }
  async function del(table, id)      { const { error } = await _db.from(table).delete().eq('id', id); if (error) throw error; }

  const Products     = { list: () => all('products'), create: p => ins('products', p), update: (id,p) => upd('products', id, p), delete: id => del('products', id) };
  const Orders = {
    async list() {
      const { data, error } = await _db.from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    updateStatus: (id,s) => upd('orders', id, { status:s, updated_at: new Date().toISOString() })
  };
  const Comments     = { list: () => all('contact_messages','created_at'), updateStatus: (id,s) => upd('contact_messages', id, { is_read: s==='read' }), delete: id => del('contact_messages', id) };
  const Features     = { list: () => all('features','display_order'), save: (f,id) => id ? upd('features',id,f) : ins('features',f), delete: id => del('features',id) };
  const Testimonials = { list: () => all('testimonials'), save: (t,id) => id ? upd('testimonials',id,t) : ins('testimonials',t), delete: id => del('testimonials',id) };

  const Settings = {
    async get() { const { data, error } = await _db.from('settings').select('*'); if (error) throw error; return Object.fromEntries((data||[]).map(r=>[r.key,r.value])); },
    async setMultiple(obj) { const rows = Object.entries(obj).map(([key,value])=>({key,value})); const { error } = await _db.from('settings').upsert(rows,{onConflict:'key'}); if (error) throw error; }
  };

  // \u2500\u2500 \u0643\u0648\u062F\u0627\u062A \u0627\u0644\u062E\u0635\u0645
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
    // \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645
    async updateMaxUses(id, maxUses) {
      const { error } = await _db.from('discount_codes')
        .update({ max_uses: maxUses === null ? null : parseInt(maxUses) })
        .eq('id', id);
      if (error) throw error;
    },
    // \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0639\u062F\u0627\u062F \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645
    async resetUsage(id) {
      const { error } = await _db.from('discount_codes')
        .update({ used_count: 0 })
        .eq('id', id);
      if (error) throw error;
    },
    // \u062A\u0641\u0639\u064A\u0644 / \u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u0643\u0648\u062F
    async toggleActive(id, isActive) {
      const { error } = await _db.from('discount_codes')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    }
  };

  // \u2500\u2500 \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631 \u0625\u0644\u0649 Supabase Storage
  const ImageStorage = {
    async upload(file) {
      const ext = (file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z]/g,'');
      const path = 'products/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
      const { data, error } = await _db.storage.from('product-images').upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
      if (error) throw new Error('\u062E\u0637\u0623 \u0641\u064A \u0631\u0641\u0639 \u0627\u0644\u0635\u0648\u0631\u0629: ' + error.message);
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

  window.SupaDB = { Auth, Products, Orders, Comments, Features, Testimonials, Settings, DiscountCodes, ImageStorage, Stats, _db };
  console.log('[SupaDB] v2 \u2713 (DiscountCodes + ImageStorage)');
})();
