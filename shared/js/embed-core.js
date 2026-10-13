// Uruchamia wariant na podstawie jego tagu <script>.
// Czyta atrybuty data-*, ładuje silnik i montuje widżet.
import { mountWidget } from './widget.js';

const ENGINES = {
  bot: () => import('../../bot/bot-engine.js').then((m) => m.botEngine),
  trained: () => import('../../trained/trained-engine.js').then((m) => m.trainedEngine),
  ai: (data) => import('../../ai/ai-engine.js').then((m) => m.createAiEngine({ endpoint: data.endpoint, turnstile: data.turnstile })),
};

export async function start(variant, script) {
  const data = { ...(script?.dataset || {}) };
  const engine = await ENGINES[variant](data);
  const widget = mountWidget({
    engine,
    cssUrl: new URL('../css/widget.css', import.meta.url).href,
    title: data.title,
    accent: data.accent,
    position: data.position,
    open: data.open === 'true',
  });
  // Udostępnia stronie małe API, np. LTChat.open() wywołane z przycisku.
  window.LTChat = widget;
  return widget;
}
