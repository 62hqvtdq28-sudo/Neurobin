const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const HOST = '0.0.0.0';

const GROQ_MODEL = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';

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

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function convertContents(contents, systemPrompt) {
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const c of contents) {
    const role = c.role === 'model' ? 'assistant' : 'user';
    const content = (c.parts || []).map(p => p.text || '').join('');
    if (content.trim()) messages.push({ role, content });
  }
  return messages;
}

async function handleGroqProxy(req, res) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const groqKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (!groqKey) {
    res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Groq API key not configured' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const reqBody = JSON.parse(body);
      if (!reqBody.contents || !Array.isArray(reqBody.contents)) {
        res.writeHead(400, { ...CORS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request: contents array required' }));
        return;
      }

      let systemPrompt = FALLBACK_PROMPT;
      if (reqBody.system_instruction?.parts?.[0]?.text) {
        systemPrompt = reqBody.system_instruction.parts[0].text;
      } else if (reqBody.catalog_context && typeof reqBody.catalog_context === 'string') {
        systemPrompt = systemPrompt + '\n\n' + reqBody.catalog_context;
      }

      const messages = convertContents(reqBody.contents, systemPrompt);
      const genConfig = reqBody.generationConfig || {};

      const groqBody = {
        model: GROQ_MODEL,
        messages,
        temperature: genConfig.temperature ?? 0.4,
        max_tokens: genConfig.maxOutputTokens ?? 600,
      };

      const { default: fetch } = await import('node-fetch');

      let groqRes = await fetch(GROQ_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + groqKey,
        },
        body: JSON.stringify(groqBody),
      });

      if (groqRes.status === 429) {
        console.log('[groq-proxy] Rate limited, retrying in 3s...');
        await new Promise(r => setTimeout(r, 3000));
        groqRes = await fetch(GROQ_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
          body: JSON.stringify(groqBody),
        });
      }

      const resData = await groqRes.json();

      if (!groqRes.ok) {
        console.error('[groq-proxy] Groq error', groqRes.status, JSON.stringify(resData));
        res.writeHead(groqRes.status, { ...CORS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: resData }));
        return;
      }

      const text = resData.choices?.[0]?.message?.content || '';
      const geminiResponse = {
        candidates: [{ content: { parts: [{ text }], role: 'model' } }],
      };

      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(geminiResponse));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[groq-proxy] Unhandled error:', msg);
      res.writeHead(500, { ...CORS, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: msg }));
    }
  });
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // Groq AI proxy (replaces Supabase Edge Function)
  if (urlPath === '/api/groq-proxy') {
    handleGroqProxy(req, res);
    return;
  }

  // API endpoint: returns Telegram config from environment variables
  if (urlPath === '/api/config') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify({
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
      telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    }));
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(__dirname, urlPath);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }
    const headers = { 'Content-Type': contentType };
    // The service worker file and manifest must always be revalidated so
    // browsers pick up updates promptly instead of serving a stale worker.
    if (urlPath === '/sw.js' || urlPath === '/manifest.json') {
      headers['Cache-Control'] = 'no-cache';
    } else if (urlPath === '/index.html') {
      headers['Cache-Control'] = 'no-cache';
    } else if (/\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/.test(ext)) {
      headers['Cache-Control'] = 'public, max-age=604800, immutable';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
