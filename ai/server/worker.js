// Cloudflare Worker — secure proxy between the website widget and the LLM API.
// Why a proxy: the API key must NEVER be in the browser (anyone could read it
// from the page source). The key lives here as a Worker secret.
//
// Deploy: see docs/AI-SERWER.md  (wrangler deploy, wrangler secret put ANTHROPIC_API_KEY)
//
// Environment variables (wrangler.toml [vars] / secrets):
//   ANTHROPIC_API_KEY     secret, required
//   TURNSTILE_SECRET_KEY  secret, optional — enables Cloudflare Turnstile anti-bot check
//   ALLOWED_ORIGINS       comma-separated list of origins allowed to call the Worker
//   MODEL                 optional, defaults to DEFAULT_MODEL
//   CACHE_TTL             optional, "5m" (default) or "1h" — prompt cache lifetime
import { buildSystemPrompt } from './prompt.js';
import { checkSafety, cleanInput } from '../../shared/js/safety.js';
import { SITE, OFFTOPIC_REPLY } from '../../shared/js/knowledge.js';

const DEFAULT_MODEL = 'claude-haiku-5-5';
const MAX_HISTORY = 6; // last N messages sent as context
const MAX_TOKENS = 400;
const RATE_LIMIT = 20; // requests per IP per minute (best effort, per isolate)
const SESSION_TTL_MS = 30 * 60 * 1000; // after one Turnstile check, trust the browser for 30 min

const SYSTEM_PROMPT = buildSystemPrompt();
const hits = new Map();

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);
    if (allowed.length && !allowed.includes(origin)) return json({ error: 'forbidden_origin' }, 403, cors);

    // Simple per-IP rate limit. For production also add a Cloudflare
    // Rate Limiting rule in the dashboard (this one resets per isolate).
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(ip)) return json({ error: 'rate_limited' }, 429, cors);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'bad_json' }, 400, cors);
    }

    const message = cleanInput(body.message);
    if (!message) return json({ error: 'empty' }, 400, cors);

    // Anti-bot: valid session token, or a fresh Turnstile token that we verify.
    let session = null;
    if (env.TURNSTILE_SECRET_KEY) {
      const okSession = await verifySession(body.session, ip, env.TURNSTILE_SECRET_KEY);
      if (!okSession) {
        const human = body.turnstile && (await verifyTurnstile(body.turnstile, ip, env.TURNSTILE_SECRET_KEY));
        if (!human) return json({ error: 'turnstile_required' }, 401, cors);
        session = await createSession(ip, env.TURNSTILE_SECRET_KEY);
      }
    }

    // Safety layer runs on the server too (never trust the client).
    const urgent = checkSafety(message);
    if (urgent) return json({ reply: urgent, session }, 200, cors);

    const history = sanitizeHistory(body.history);

    try {
      const text = await callModel(env, [...history, { role: 'user', content: message }]);
      return json({ reply: { text: stripForeignLinks(text), intent: 'ai' }, session }, 200, cors);
    } catch (err) {
      console.error('LLM error', err);
      return json({ error: 'upstream', reply: { ...OFFTOPIC_REPLY, intent: 'error' } }, 502, cors);
    }
  },
};

async function callModel(env, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.MODEL || DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
      // Prompt caching: the long system prompt (rules + site knowledge) is
      // identical for every patient, so Anthropic caches it and bills
      // repeated reads at ~10% of the normal input price.
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: env.CACHE_TTL === '1h' ? { type: 'ephemeral', ttl: '1h' } : { type: 'ephemeral' },
        },
      ],
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // Visible in "wrangler tail" / Workers logs — check cache_read_input_tokens > 0.
  console.log('usage', JSON.stringify(data.usage));
  return (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
}

// Keep only well-formed user/assistant turns, trimmed, alternating.
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const turns = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: cleanInput(m.content) }))
    .filter((m) => m.content);
  // The API requires the conversation to start with a user message.
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return turns;
}

// Remove any URL that is not on the clinic's domain (defence against the
// model inventing links or being tricked into printing external ones).
function stripForeignLinks(text) {
  const host = new URL(SITE.base).hostname;
  return text.replace(/https?:\/\/[^\s)]+/g, (url) => {
    try {
      return new URL(url).hostname.endsWith(host) ? url : '';
    } catch {
      return '';
    }
  });
}

// --- Turnstile + session -----------------------------------------------------

async function verifyTurnstile(token, ip, secret) {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', String(token).slice(0, 2048));
  form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const out = await res.json().catch(() => ({}));
  return out.success === true;
}

// Session token = "<expiry>.<hmac(expiry|ip)>", signed with a key derived
// from the Turnstile secret. Bound to the IP so it cannot be shared.
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode('session:' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]);
}

async function createSession(ip, secret) {
  const exp = Date.now() + SESSION_TTL_MS;
  return `${exp}.${await hmac(secret, `${exp}|${ip}`)}`;
}

async function verifySession(token, ip, secret) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [exp, sig] = token.split('.');
  if (!(Number(exp) > Date.now())) return false;
  return sig === (await hmac(secret, `${exp}|${ip}`));
}

// --- helpers -----------------------------------------------------------------

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
