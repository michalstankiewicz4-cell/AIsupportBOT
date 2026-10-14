// Wariant 1: "-bot" — klasyczny asystent regułowy.
// Bez AI i bez sieci. Dopasowuje słowa kluczowe z shared/js/knowledge.js (z tolerancją literówek)
// i wybiera przypadek ze specyfikacji czatu według STAŁEJ KOLEJNOŚCI (CASE_ORDER):
// pierwszy pasujący przypadek wygrywa, a w obrębie przypadku — temat z najwyższym wynikiem.
// A i B (stany nagłe) sprawdza wcześniej shared/js/safety.js.
import { normalize, matchesPhrase } from '../shared/js/text.js';
import { INTENTS, INTENT_BY_ID, CASE_ORDER, replyFor } from '../shared/js/knowledge.js';
import { VERSION } from './version.js';

// Punktujemy każdy temat: każde dopasowane słowo dodaje swoją długość (dłuższe słowo =
// bardziej konkretne dopasowanie; krótkie skróty jak "l4" czy "tsh" liczą się jako 4),
// pomnożoną przez opcjonalną wagę tematu.
export function scoreIntents(message) {
  const words = normalize(message).split(' ').filter(Boolean);
  const scores = [];
  for (const intent of INTENTS) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (matchesPhrase(words, kw)) score += Math.max(4, kw.replace(/[*=]/g, '').length);
    }
    score *= intent.weight ?? 1;
    if (score > 0) scores.push({ id: intent.id, case: intent.case, score, routing: !!intent.routing });
  }
  return scores.sort((a, b) => b.score - a.score);
}

// Wybór przypadku: pierwszy z CASE_ORDER, który ma dopasowany temat.
// Zwraca { id, topic, scores } — topic = najlepszy temat medyczny (do I i J).
export function classify(message) {
  const scores = scoreIntents(message);
  // Ogólny słownik zdrowia (zdrowie) nie jest „tematem” — nie ma własnej usługi.
  const topic = scores.find((s) => s.routing && s.case !== 'J' && s.id !== 'zdrowie')?.id || null;
  for (const c of CASE_ORDER) {
    const best = scores.find((s) => s.case === c);
    if (best) return { id: best.id, case: c, topic, scores };
  }
  return { id: null, case: 'L', topic, scores };
}

export const botEngine = {
  name: 'bot',
  label: 'Asystent (bot regułowy)',
  version: VERSION,

  async ask(message) {
    const { id, topic } = classify(message);
    if (!id) return { ...replyFor(null), confidence: 0 };
    return replyFor(id, { topic: INTENT_BY_ID[topic] ? topic : null });
  },
};

export default botEngine;
