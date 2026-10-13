// Klasyfikator tekstu Multinomial Naive Bayes — nasz mały, uczony model.
// Czysty JS, bez zależności: ten sam plik używa skrypt treningowy w Node
// (trained/train.js) i przeglądarka (trained/trained-engine.js).
import { features } from '../shared/js/text.js';

// Skrót FNV-1a — wykrywa, że model.json jest nieaktualny względem danych.
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

// dataset: { idIntencji: ["przykład", ...], ... }
// alpha:   wygładzanie Laplace'a
// Prawdopodobieństwa a priori są celowo równe: duża klasa (np. "offtopic") nie
// może wygrywać tylko dlatego, że ma więcej przykładów.
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
      logUnseen: round(Math.log(alpha / denom)), // znane słowo, ale nigdy niewidziane w tej klasie
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

// Zwraca [{ id, p }] posortowane wg prawdopodobieństwa oraz liczbę rozpoznanych cech.
export function predict(model, text) {
  const vocab = model._vocabSet || (model._vocabSet = new Set(model.vocabulary));
  const feats = features(text).filter((f) => vocab.has(f)); // pomijamy nieznane słowa
  const logScores = Object.entries(model.classes).map(([id, c]) => {
    let s = c.logPrior;
    for (const f of feats) s += c.weights[f] ?? c.logUnseen;
    return { id, s };
  });
  // Softmax -> prawdopodobieństwa.
  const max = Math.max(...logScores.map((x) => x.s));
  const exps = logScores.map((x) => ({ id: x.id, e: Math.exp(x.s - max) }));
  const sum = exps.reduce((a, x) => a + x.e, 0);
  const ranked = exps.map((x) => ({ id: x.id, p: x.e / sum })).sort((a, b) => b.p - a.p);
  return { ranked, knownFeatures: feats.length };
}

function round(x) {
  return Math.round(x * 1e4) / 1e4;
}

// Dodajemy do danych treningowych słowa kluczowe bota z knowledge.js, żeby
// model znał każde słowo kluczowe, zanim ktoś dopisze przykładowe zdania.
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
