// supabase/functions/gemini-proxy/index.ts
// Neurobin Pharmacy — Secure Gemini Proxy v4
// NOW: reads system_prompt from Supabase ai_config table (admin-configurable)
// v4: Added exponential backoff retry on 429 rate limit errors

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash-lite';
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models';

// Fallback system prompt (used if DB is unreachable)
const FALLBACK_SYSTEM_PROMPT = [
  'انت مساعد صيدلاني ذكي لصيدلية Neurobin في العراق.',
  'مهمتك الإجابة على استفسارات العملاء بالعربية.',
  'عند اقتراح منتج اذكر رقمه بصيغة [ID] مثل [46].',
  'لا تقترح سوى منتجات موجودة في الكتالوج.',
  'اجب بشكل مختصر 3 الى 4 جمل فقط.',
  'لا تقدم استشارات طبية تشخيصية.',
  'الاسعار بالدينار العراقي.'
].join(' ');

// Helper: call Gemini with exponential backoff on 429 rate limit
async function callGeminiWithRetry(
  url: string,
  body: object,
  maxRetries = 3
): Promise<Response> {
  let lastRes!: Response;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delayMs = 3000 * attempt; // 3s then 6s
      console.log(`[gemini-proxy] Rate limited (429) — waiting ${delayMs}ms before retry ${attempt}/${maxRetries - 1}...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
    lastRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (lastRes.status !== 429) break;
  }
  return lastRes;
}

Deno.serve(async (req: Request) => {

  // ── CORS preflight ───────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // ── Read Gemini key from Supabase secrets ────────────────
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      console.error('[gemini-proxy] GEMINI_API_KEY secret not set in Supabase');
      return new Response(
        JSON.stringify({ error: 'Server configuration error — GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Parse frontend request body ──────────────────────────
    const body = await req.json();

    if (!body.contents || !Array.isArray(body.contents)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: contents array required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Load system_prompt from Supabase ai_config table ─────
    let systemPrompt = FALLBACK_SYSTEM_PROMPT;
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

      if (supabaseUrl && supabaseServiceKey) {
        const db = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await db
          .from('ai_config')
          .select('system_prompt')
          .eq('id', 1)
          .single();

        if (!error && data?.system_prompt) {
          systemPrompt = data.system_prompt;
          console.log('[gemini-proxy] Loaded system_prompt from Supabase ai_config ✓');
        } else {
          console.warn('[gemini-proxy] Could not load ai_config, using fallback:', error?.message);
        }
      } else {
        console.warn('[gemini-proxy] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set, using fallback');
      }
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.warn('[gemini-proxy] DB error, using fallback system prompt:', msg);
    }

    // ── Build request with dynamic system instruction ─────────
    const geminiBody = {
      ...body,
      system_instruction: {
        parts: [{ text: systemPrompt }]
      }
    };

    // ── Forward to Gemini API (with retry on 429) ─────────────
    const geminiUrl = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
    console.log(`[gemini-proxy] Calling Gemini ${GEMINI_MODEL}...`);

    const geminiRes = await callGeminiWithRetry(geminiUrl, geminiBody, 3);
    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('[gemini-proxy] Gemini API error after retries:', geminiRes.status, JSON.stringify(data));
    } else {
      console.log('[gemini-proxy] Success ✓');
    }

    return new Response(JSON.stringify(data), {
      status: geminiRes.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[gemini-proxy] Error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
