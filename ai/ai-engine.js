// Variant 2: "-ai" — a large language model (Claude Haiku) behind our own proxy.
// Understands free-form questions and typos best, but costs money per
// message and needs the Worker from ai/server/ to be deployed.
// If the endpoint is missing or fails, we fall back to the rule-based bot
// so the patient always gets an answer.
import { AI_CONFIG } from './config.js';
import { getTurnstileToken } from './turnstile.js';
import { botEngine } from '../bot/bot-engine.js';
import { VERSION } from './version.js';

const SESSION_KEY = 'lt-chat:ai-session';

export function createAiEngine(options = {}) {
  const endpoint = options.endpoint || AI_CONFIG.endpoint;
  const siteKey = options.turnstile || AI_CONFIG.turnstileSiteKey;
  const timeoutMs = options.timeoutMs || AI_CONFIG.timeoutMs;
  let session = readSession();

  async function fallback(message, reason) {
    const reply = await botEngine.ask(message);
    return { ...reply, degraded: reason };
  }

  async function post(body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    name: 'ai',
    label: 'Asystent AI',
    version: VERSION,
    configured: Boolean(endpoint),

    async ask(message, history = []) {
      if (!endpoint) return fallback(message, 'offline');

      try {
        const body = { message, history, session };
        // No session yet and Turnstile enabled -> prove we are a browser first.
        if (!session && siteKey) body.turnstile = await getTurnstileToken(siteKey);

        let { status, data } = await post(body);

        // Session expired -> get a fresh Turnstile token and retry once.
        if (status === 401 && data.error === 'turnstile_required' && siteKey) {
          session = null;
          ({ status, data } = await post({ message, history, turnstile: await getTurnstileToken(siteKey) }));
        }

        if (data.session) {
          session = data.session;
          writeSession(session);
        }
        if (status === 429) return fallback(message, 'rate_limited');
        if (status !== 200 || !data.reply) return fallback(message, data.error === 'daily_limit' ? 'rate_limited' : 'error');
        return { links: [], chips: [], ...data.reply };
      } catch (err) {
        return fallback(message, 'network');
      }
    },
  };
}

function readSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
function writeSession(value) {
  try {
    sessionStorage.setItem(SESSION_KEY, value);
  } catch { /* storage blocked — keep it in memory only */ }
}

export const aiEngine = createAiEngine();
export default aiEngine;
