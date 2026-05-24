// supabase/functions/gemini-proxy/index.ts
// Neurobin Pharmacy — Secure Gemini Proxy v1
// Stores GEMINI_API_KEY in Supabase secrets, not in frontend code.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models';

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
      console.error('[gemini-proxy] GEMINI_API_KEY secret not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error — contact admin' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Parse frontend request body ──────────────────────────
    const body = await req.json();

    // Basic validation — ensure contents array exists
    if (!body.contents || !Array.isArray(body.contents)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: contents array required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Forward to Gemini API ────────────────────────────────
    const geminiUrl = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),   // pass through: system_instruction, contents, generationConfig
    });

    const data = await geminiRes.json();

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
