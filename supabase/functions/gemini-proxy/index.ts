// Neurobin Pharmacy - Secure Gemini Proxy v9
// v9: reads GEMINI_API_KEY from ai_config table (fallback to env var)
// No external imports - uses fetch API directly

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash-lite';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const FALLBACK_PROMPT = [
  'انت مساعد صيدلاني ذكي لصيدلية Neurobin في العراق.',
  'مهمتك الإجابة على استفسارات العملاء بالعربية العراقية بأسلوب ودود واحترافي.',
  'عند اقتراح منتج اذكر رقمه بصيغة [ID] مثل [46].',
  'لا تقترح سوى منتجات موجودة في الكتالوج.',
  'اجب بشكل مختصر 3 الى 4 جمل فقط.',
  'لا تقدم استشارات طبية تشخيصية.',
  'الاسعار بالدينار العراقي.',
].join(' ');

async function getAiConfig(): Promise<{ system_prompt: string; gemini_api_key: string | null }> {
  const defaults = { system_prompt: FALLBACK_PROMPT, gemini_api_key: null };
  try {
    const sUrl = Deno.env.get('SUPABASE_URL');
    const sKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!sUrl || !sKey) return defaults;
    const r = await fetch(sUrl + '/rest/v1/ai_config?select=system_prompt,gemini_api_key&id=eq.1&limit=1', {
      headers: { 'apikey': sKey, 'Authorization': 'Bearer ' + sKey },
    });
    if (r.ok) {
      const rows = await r.json();
      if (Array.isArray(rows) && rows.length > 0) {
        console.log('[gemini-proxy] Loaded config from ai_config table');
        return {
          system_prompt: rows[0].system_prompt || FALLBACK_PROMPT,
          gemini_api_key: rows[0].gemini_api_key || null,
        };
      }
    }
  } catch (e) {
    console.warn('[gemini-proxy] DB error, using fallback config');
  }
  return defaults;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const config = await getAiConfig();

    // Key priority: DB → env var
    const geminiKey = config.gemini_api_key || Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const reqBody = await req.json();
    if (!reqBody.contents || !Array.isArray(reqBody.contents)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: contents array required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const geminiBody = { ...reqBody, system_instruction: { parts: [{ text: config.system_prompt }] } };
    const geminiUrl = GEMINI_BASE + '/' + GEMINI_MODEL + ':generateContent?key=' + geminiKey;
    const fetchOpts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    };

    console.log('[gemini-proxy] Calling Gemini ' + GEMINI_MODEL + '...');

    // Retry on 429 with backoff (3s then 6s)
    let geminiRes = await fetch(geminiUrl, fetchOpts);
    if (geminiRes.status === 429) {
      console.log('[gemini-proxy] Rate limited, retry 1 in 3s...');
      await new Promise((r) => setTimeout(r, 3000));
      geminiRes = await fetch(geminiUrl, fetchOpts);
    }
    if (geminiRes.status === 429) {
      console.log('[gemini-proxy] Rate limited, retry 2 in 6s...');
      await new Promise((r) => setTimeout(r, 6000));
      geminiRes = await fetch(geminiUrl, fetchOpts);
    }

    const resData = await geminiRes.json();
    if (geminiRes.ok) {
      console.log('[gemini-proxy] Success');
    } else {
      console.error('[gemini-proxy] Error ' + geminiRes.status + ' after retries');
    }

    return new Response(JSON.stringify(resData), {
      status: geminiRes.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[gemini-proxy] Unhandled error: ' + msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
