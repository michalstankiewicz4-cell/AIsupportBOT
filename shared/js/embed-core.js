// Uruchamia asystenta na podstawie jego tagu <script>.
// Czyta atrybuty data-*, wczytuje ustawienia z panelu, ładuje silnik(i) i montuje widżet.
//   variant = 'bot' | 'trained' | 'ai'  — stały wariant (bot/embed.js, ai/embed.js, trained/embed.js)
//   variant = 'auto'                    — tryb pracy wybierany w panelu sterowania (embed.js w katalogu głównym)
import { mountWidget } from './widget.js';
import { createRouterEngine } from './router.js';
import { initPanel, getPanelConfig } from '../../panel/client.js';
import { PANEL_CONFIG } from '../../panel/config.js';

const ENGINES = {
  bot: () => import('../../bot/bot-engine.js').then((m) => m.botEngine),
  trained: () => import('../../trained/trained-engine.js').then((m) => m.trainedEngine),
  ai: (data) => import('../../ai/ai-engine.js').then((m) => m.createAiEngine({ endpoint: data.endpoint, turnstile: data.turnstile })),
};

// Ładuje tylko te silniki, które są potrzebne w łańcuchu.
export async function loadChain(chain, data = {}) {
  const engines = {};
  await Promise.all(chain.map(async (name) => (engines[name] = await ENGINES[name](data))));
  return createRouterEngine(chain, engines);
}

export async function start(variant, script) {
  const data = { ...(script?.dataset || {}) };
  await initPanel({ endpoint: data.panel || PANEL_CONFIG.endpoint });
  const chain = variant === 'auto' ? getPanelConfig().engine.chain : [variant];
  const engine = await loadChain(chain, data);
  const widget = mountWidget({
    engine,
    cssUrl: new URL('../css/widget.css', import.meta.url).href,
    title: data.title,
    accent: data.accent,
    position: data.position,
    open: data.open ? data.open === 'true' : undefined, // brak atrybutu = ustawienie z panelu
  });
  // Udostępnia stronie małe API, np. LTChat.open() wywołane z przycisku.
  window.LTChat = widget;
  return widget;
}
