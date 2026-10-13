// Wariant 1: "-bot" — klasyczny asystent regułowy.
// Bez AI i bez sieci. Dopasowuje ręcznie wpisane słowa kluczowe z shared/js/knowledge.js.
// Przewidywalny i darmowy, ale rozumie tylko słowa, które wpisaliśmy.
import { normalize, containsAny } from '../shared/js/text.js';
import { INTENTS, replyFor, replyForOpinionWithTopic } from '../shared/js/knowledge.js';
import { VERSION } from './version.js';

// Minimalny wynik, by uznać dopasowanie (jedno słowo kluczowe, nawet ogólne).
const MIN_SCORE = 3;

// Punktujemy każdą intencję: każde dopasowane słowo dodaje swoją długość (dłuższe słowo =
// bardziej konkretne dopasowanie; krótkie skróty jak "l4" czy "tsh" liczą się jako 4),
// pomnożoną przez opcjonalną wagę intencji.
export function scoreIntents(message) {
  const t = normalize(message);
  const scores = [];
  for (const intent of INTENTS) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (containsAny(t, [kw])) score += Math.max(4, kw.replace('*', '').length);
    }
    score *= intent.weight ?? 1;
    if (score > 0) scores.push({ id: intent.id, score, routing: !!intent.routing });
  }
  return scores.sort((a, b) => b.score - a.score);
}

export function classify(message) {
  const scores = scoreIntents(message);
  if (!scores.length || scores[0].score < MIN_SCORE) return { id: null, scores };
  return { id: scores[0].id, scores };
}

export const botEngine = {
  name: 'bot',
  label: 'Asystent (bot regułowy)',
  version: VERSION,

  async ask(message) {
    const { id, scores } = classify(message);
    if (!id) return replyFor(null);

    // Prośba o opinię + temat -> odmawiamy opinii, ale wskazujemy zakładkę.
    const hasOpinion = scores.some((s) => s.id === 'opinia');
    const topic = scores.find((s) => s.routing);
    if (hasOpinion && topic) return replyForOpinionWithTopic(topic.id);

    return replyFor(id);
  },
};

export default botEngine;
