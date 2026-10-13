// Variant 2: "-ai" — a large language model (Claude) behind our own proxy.
// Understands free-form questions and typos best, but costs money per
// message and needs the Worker from ai/server/ to be deployed.
// If the endpoint is missing or fails, we fall back to the rule-based bot
// so the patient always gets an answer.
import { AI_CONFIG } from './config.js';
import { botEngine } from '../bot/bot-engine.js';
import { VERSION } from './version.js';

export function createAiEngine(options = {}) {
  const endpoint = options.endpoint || AI_CONFIG.endpoint;
  const timeoutMs = options.timeoutMs || AI_CONFIG.timeoutMs;

  async function fallback(message, reason) {
    const reply = await botEngine.ask(message);
    return { ...reply, degraded: reason };
  }

  return {
    name: 'ai',
    label: 'Asystent AI',
    version: VERSION,
    configured: Boolean(endpoint),

    async ask(message, history = []) {
      if (!endpoint) return fallback(message, 'offline');

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history }),
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) return fallback(message, 'rate_limited');
        if (!res.ok || !data.reply) return fallback(message, 'error');
        return { links: [], chips: [], ...data.reply };
      } catch (err) {
        return fallback(message, 'network');
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export const aiEngine = createAiEngine();
export default aiEngine;
