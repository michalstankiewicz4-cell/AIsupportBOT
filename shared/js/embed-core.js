// Bootstraps a variant from its <script> tag.
// Reads data-* attributes, loads the engine and mounts the widget.
import { mountWidget } from './widget.js';

const ENGINES = {
  bot: () => import('../../bot/bot-engine.js').then((m) => m.botEngine),
  trained: () => import('../../trained/trained-engine.js').then((m) => m.trainedEngine),
  ai: (data) => import('../../ai/ai-engine.js').then((m) => m.createAiEngine({ endpoint: data.endpoint })),
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
  // Expose a small API for the host page, e.g. LTChat.open() from a button.
  window.LTChat = widget;
  return widget;
}
