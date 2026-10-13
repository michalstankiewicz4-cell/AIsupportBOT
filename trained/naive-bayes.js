// Multinomial Naive Bayes text classifier — our own small, trainable model.
// Pure JS, no dependencies: the same file is used by the Node training
// script (trained/train.js) and by the browser (trained/trained-engine.js).
import { features } from '../shared/js/text.js';

// FNV-1a hash — used to detect that model.json is out of date with the data.
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function datasetHash(dataset) {
  const clean = Object.fromEntries(Object.entries(dataset).filter(([k]) => !k.startsWith('_')));
  return hashString(JSON.stringify(clean));
}

// dataset: { intentId: ["example", ...], ... }
// alpha:   Laplace smoothing
// Priors are uniform on purpose: a big class (e.g. "offtopic") should not
// win just because it has more examples.
export function train(dataset, { alpha = 0.1 } = {}) {
  const intents = Object.keys(dataset).filter((k) => !k.startsWith('_'));
  const counts = {};
  const totals = {};
  const vocab = new Set();
  let nDocs = 0;

  for (const id of intents) {
    counts[id] = {};
    totals[id] = 0;
    for (const example of dataset[id]) {
      nDocs++;
      for (const f of features(example)) {
        counts[id][f] = (counts[id][f] || 0) + 1;
        totals[id]++;
        vocab.add(f);
      }
    }
  }

  const V = vocab.size;
  const classes = {};
  for (const id of intents) {
    const denom = totals[id] + alpha * V;
    const weights = {};
    for (const [f, c] of Object.entries(counts[id])) {
      weights[f] = round(Math.log((c + alpha) / denom));
    }
    classes[id] = {
      logPrior: round(Math.log(1 / intents.length)),
      logUnseen: round(Math.log(alpha / denom)), // known word, never seen in this class
      weights,
    };
  }

  return {
    type: 'multinomial-naive-bayes',
    trainedAt: new Date().toISOString(),
    datasetHash: datasetHash(dataset),
    examples: nDocs,
    vocabulary: [...vocab].sort(),
    classes,
  };
}

// Returns [{ id, p }] sorted by probability, plus how many known features hit.
export function predict(model, text) {
  const vocab = model._vocabSet || (model._vocabSet = new Set(model.vocabulary));
  const feats = features(text).filter((f) => vocab.has(f)); // ignore unknown words
  const logScores = Object.entries(model.classes).map(([id, c]) => {
    let s = c.logPrior;
    for (const f of feats) s += c.weights[f] ?? c.logUnseen;
    return { id, s };
  });
  // Softmax -> probabilities.
  const max = Math.max(...logScores.map((x) => x.s));
  const exps = logScores.map((x) => ({ id: x.id, e: Math.exp(x.s - max) }));
  const sum = exps.reduce((a, x) => a + x.e, 0);
  const ranked = exps.map((x) => ({ id: x.id, p: x.e / sum })).sort((a, b) => b.p - a.p);
  return { ranked, knownFeatures: feats.length };
}

function round(x) {
  return Math.round(x * 1e4) / 1e4;
}

// Seed the training data with the bot's keywords from knowledge.js, so the
// model knows every keyword even before anyone writes example sentences.
export function withKeywords(dataset, intents) {
  const out = {};
  for (const [id, examples] of Object.entries(dataset)) {
    if (!id.startsWith('_')) out[id] = [...examples];
  }
  for (const intent of intents) {
    out[intent.id] = [...(out[intent.id] || []), ...intent.keywords.map((k) => k.replace('*', ''))];
  }
  return out;
}
