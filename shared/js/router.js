// Silnik-łańcuch: tryb pracy wybierany w panelu sterowania (np. „nasz model, a AI gdy nie rozpozna”).
// Pytanie trafia do pierwszego silnika z listy. Przechodzi do następnego, gdy:
//   - silnik nie rozpoznał pytania (intent "fallback" albo pewność 0),
//   - silnik jest niedostępny (np. AI offline, limit, błąd — pole "degraded"),
//   - silnik rzucił błąd.
// Ostatni silnik w łańcuchu zawsze odpowiada (nawet jeśli nie rozpoznał pytania).

const LABELS = { bot: 'bot', trained: 'nasz model', ai: 'AI' };

export function chainLabel(chain) {
  return chain.map((e) => LABELS[e] || e).join(' → ');
}

/**
 * @param {string[]} chain     np. ['trained', 'ai']
 * @param {object}   engines   mapa nazwa -> silnik { name, version, ask() }
 */
export function createRouterEngine(chain, engines) {
  const list = chain.map((name) => engines[name]).filter(Boolean);
  if (!list.length) throw new Error('router: pusty łańcuch silników');

  return {
    name: list.length === 1 ? list[0].name : 'auto',
    label: list.length === 1 ? list[0].label : `Asystent (${chainLabel(chain)})`,
    version: list.map((e) => `${e.name} ${e.version}`).join(' · '),
    chain: list.map((e) => e.name),

    async ask(message, history = []) {
      let last = null;
      for (let i = 0; i < list.length; i++) {
        const engine = list[i];
        const isLast = i === list.length - 1;
        let reply;
        try {
          reply = await engine.ask(message, history);
        } catch (err) {
          console.error(`[router:${engine.name}]`, err);
          if (isLast && !last) throw err;
          continue;
        }
        reply = { ...reply, engine: engine.name, engineVersion: engine.version };
        if (i > 0) reply.via = list.slice(0, i).map((e) => e.name); // kto przekazał pytanie dalej
        last = reply;

        const unrecognized = reply.intent === 'fallback' || reply.confidence === 0;
        const unavailable = Boolean(reply.degraded);
        if (isLast || (!unrecognized && !unavailable)) return reply;
      }
      return last;
    },
  };
}
