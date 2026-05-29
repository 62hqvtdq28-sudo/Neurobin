// Neurobin Pharmacy - Grok Proxy v2
// Uses xAI Grok instead of Groq/Gemini
// Response format mimics Gemini so frontend needs zero changes

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROK_MODEL = Deno.env.get('GROK_MODEL') || 'grok-3-mini';
const GROK_BASE = 'https://api.x.ai/v1/chat/completions';

const FALLBACK_PROMPT = [
  'انت مساعد صيدلاني ذكي لصيدلية Neurobin في العراق.',
  'مهمتك الإجابة على استفسارات العملاء بالعربية العراقية بأسلوب مهني واحترافي.',
  'عند اقتراح منتج اذكر رقمه بصيغة [ID] مثل [46].',
  'عند اقتراح باقة اذكر رقمها بصيغة [BND-رقم].',
  'عند اقتراح عرض اذكره بصيغة [PKG-رقم].',
  'لا تقترح سوى منتجات موجودة في الكتالوج.',
  'اجب بشكل مختصر 3 الى 4 جمل فقط لا يلزم تفصيلاً.',
  'لا تقدم استشارات طبية تشخيصية احل الزبون لطبيب عند الحاجة.',
  'الاسعار بالدينار العراقي.',
  'اذكر اسعار الكميات (2 حبة, 3 حبات) عند الاقتضاء للتوفير.',
  'اذكر العروض والتوفير بإيجابية لتشجيع الشراء.',
].join(' ');

async function getConfig(): Promise<{ system_prompt: string }> {
  const defaults = { system_prompt: FALLBACK_PROMPT };
  try {
    const sUrl = Deno.env.get('SUPABASE_URL');
    const sKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!sUrl || !sKey) return defaults;
    const r = await fetch(sUrl + '/rest/v1/ai_config?select=system_prompt&id=eq.1&limit=1', {
      headers: { 'apikey': sKey, 'Authorization': 'Bearer ' + sKey },
    });
    if (r.ok) {
      const rows = await r.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].system_prompt) {
        console.log('[grok-proxy] Loaded system prompt from ai_config');
        return { system_prompt: rows[0].system_prompt };
      }
    }
  } catch (e) {
    console.warn('[grok-proxy] DB error, using fallback prompt');
  }
  return defaults;
}

// Convert Gemini-style contents array to OpenAI/Grok messages format
function convertContents(contents: Array<{role: string; parts: Array<{text: string}>}>, systemPrompt: string) {
  const messages: Array<{role: string; content: string}> = [
    { role: 'system', content: systemPrompt }
  ];
  for (const c of contents) {
    const role = c.role === 'model' ? 'assistant' : 'user';
    const content = (c.parts || []).map(p => p.text || '').join('');
    if (content.trim()) messages.push({ role, content });
  }
  return messages;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  try {
    const grokKey = Deno.env.get('GROK_API_KEY');
    if (!grokKey) {
      return new Response(
        JSON.stringify({ error: 'GROK_API_KEY not configured' }),
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

    const config = await getConfig();

    // Merge system_instruction from frontend if provided
    let systemPrompt = config.system_prompt;
    if (reqBody.system_instruction?.parts?.[0]?.text) {
      systemPrompt = reqBody.system_instruction.parts[0].text;
    }

    const messages = convertContents(reqBody.contents, systemPrompt);
    const genConfig = reqBody.generationConfig || {};

    const grokBody = {
      model: GROK_MODEL,
      messages,
      temperature: genConfig.temperature ?? 0.4,
      max_tokens: genConfig.maxOutputTokens ?? 600,
    };

    console.log('[grok-proxy] Calling Grok model:', GROK_MODEL);

    let grokRes = await fetch(GROK_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + grokKey,
      },
      body: JSON.stringify(grokBody),
    });

    // Retry once on 429
    if (grokRes.status === 429) {
      console.log('[grok-proxy] Rate limited, retrying in 3s...');
      await new Promise(r => setTimeout(r, 3000));
      grokRes = await fetch(GROK_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + grokKey },
        body: JSON.stringify(grokBody),
      });
    }

    const resData = await grokRes.json();

    if (!grokRes.ok) {
      console.error('[grok-proxy] Grok error', grokRes.status, JSON.stringify(resData));
      return new Response(JSON.stringify({ error: resData }), {
        status: grokRes.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Convert Grok (OpenAI format) response → Gemini format so frontend works unchanged
    const text = resData.choices?.[0]?.message?.content || '';
    const geminiResponse = {
      candidates: [{ content: { parts: [{ text }], role: 'model' } }],
    };

    console.log('[grok-proxy] Success, tokens used:', resData.usage?.total_tokens);
    return new Response(JSON.stringify(geminiResponse), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[grok-proxy] Unhandled error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
