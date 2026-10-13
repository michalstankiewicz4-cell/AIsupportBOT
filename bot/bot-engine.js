// Variant 1: "-bot" — classic rule-based assistant.
// No AI, no network. Matches hand-written keywords from shared/js/knowledge.js.
// Predictable and free, but understands only the words we listed.
import { normalize, containsAny } from '../shared/js/text.js';
import { INTENTS, replyFor, replyForOpinionWithTopic } from '../shared/js/knowledge.js';
import { VERSION } from './version.js';

// Minimum score to accept a match (one keyword, even a generic one).
const MIN_SCORE = 3;

// Score every intent: each matched keyword adds its length (longer keyword =
// more specific match; short codes like "l4" or "tsh" count as 4),
// multiplied by the intent's optional weight.
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

    // Opinion request + a topic -> decline opinion, but still route.
    const hasOpinion = scores.some((s) => s.id === 'opinia');
    const topic = scores.find((s) => s.routing);
    if (hasOpinion && topic) return replyForOpinionWithTopic(topic.id);

    return replyFor(id);
  },
};

export default botEngine;
