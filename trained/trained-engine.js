// Variant 3: "trained" — our own model, trained on our own examples.
// A Naive Bayes classifier (trained/naive-bayes.js) learns from
// trained/data/training.json (+ keywords from knowledge.js).
// The model only CHOOSES which prepared answer to show — it never writes
// medical text itself, so it cannot "hallucinate" advice.
import { predict } from './naive-bayes.js';
import { replyFor, replyForOpinionWithTopic, INTENT_BY_ID, OFFTOPIC_REPLY } from '../shared/js/knowledge.js';
import { VERSION } from './version.js';

// Confidence thresholds (tune after adding training data).
const ACCEPT = 0.5; // top intent at least this probable...
const MARGIN = 3; // ...or at least 3x more probable than the runner-up
const OPINION_MIX = 0.15; // second intent needed to combine "opinion + topic"

let modelPromise = null;

// Loads model.json next to this file (works on GitHub Pages and locally).
export function loadModel(url = new URL('./model.json', import.meta.url)) {
  if (!modelPromise) {
    modelPromise = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`model.json: HTTP ${r.status}`);
      return r.json();
    });
  }
  return modelPromise;
}

// Pure decision function — exported for tests (Node passes the model in).
export function decide(model, message) {
  const { ranked, knownFeatures } = predict(model, message);
  const top = ranked[0];

  // Nothing we know -> treat as off-topic / nonsense (hotline message).
  if (knownFeatures === 0) return { ...OFFTOPIC_REPLY, intent: 'offtopic', confidence: 0 };

  // Opinion request combined with a medical topic -> decline + route.
  const isRouting = (id) => INTENT_BY_ID[id]?.routing;
  const opinion = ranked.find((r) => r.id === 'opinia');
  const topic = ranked.slice(0, 3).find((r) => isRouting(r.id) && r.p >= OPINION_MIX);
  if (opinion && topic && (top.id === 'opinia' || opinion.p >= OPINION_MIX)) {
    return { ...replyForOpinionWithTopic(topic.id), confidence: top.p };
  }

  const confident = top.p >= ACCEPT || top.p >= MARGIN * (ranked[1]?.p || 0);
  if (!confident) return { ...replyFor(null), confidence: top.p, candidates: ranked.slice(0, 3) };
  return { ...replyFor(top.id), confidence: top.p };
}

export const trainedEngine = {
  name: 'trained',
  label: 'Asystent (nasz wyuczony model)',
  version: VERSION,

  async ask(message) {
    const model = await loadModel();
    return decide(model, message);
  },
};

export default trainedEngine;
