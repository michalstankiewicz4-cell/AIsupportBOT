// Training script for the "trained" assistant.
// Usage (from repo root):  npm run train      (or: node trained/train.js)
// Reads trained/data/training.json, writes trained/model.json and prints
// a leave-one-out accuracy report so you can see if new examples helped.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { train, predict, withKeywords } from './naive-bayes.js';
import { INTENTS, INTENT_BY_ID } from '../shared/js/knowledge.js';
import { VERSION } from './version.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, 'data', 'training.json');
const modelPath = join(here, 'model.json');

const dataset = JSON.parse(readFileSync(dataPath, 'utf8'));

// 1. Validate: every intent in the data must exist in the knowledge base.
const unknown = Object.keys(dataset).filter((k) => !k.startsWith('_') && !INTENT_BY_ID[k]);
if (unknown.length) {
  console.error(`Nieznane intencje w training.json (brak w knowledge.js): ${unknown.join(', ')}`);
  process.exit(1);
}
const missing = Object.keys(INTENT_BY_ID).filter((k) => !dataset[k]);
if (missing.length) console.warn(`Uwaga: intencje bez przykładów (model ich nie rozpozna): ${missing.join(', ')}`);

// 2. Leave-one-out evaluation: train without one example, try to predict it.
let correct = 0;
let total = 0;
const errors = [];
for (const [id, examples] of Object.entries(dataset)) {
  if (id.startsWith('_')) continue;
  examples.forEach((ex, i) => {
    const reduced = { ...dataset, [id]: examples.filter((_, j) => j !== i) };
    const { ranked, knownFeatures } = predict(train(withKeywords(reduced, INTENTS)), ex);
    // No known words at all -> the engine answers with the hotline message,
    // which is the correct behaviour for off-topic nonsense.
    const got = knownFeatures === 0 ? 'offtopic' : ranked[0].id;
    total++;
    if (got === id) correct++;
    else errors.push(`  "${ex}" → ${got} (oczekiwano: ${id})`);
  });
}

// 3. Train on everything (examples + knowledge.js keywords) and save.
const model = { version: VERSION, ...train(withKeywords(dataset, INTENTS)) };
writeFileSync(modelPath, JSON.stringify(model));

console.log(`Model zapisany: trained/model.json (wersja ${VERSION})`);
console.log(`Przykładów: ${model.examples}, intencji: ${Object.keys(model.classes).length}, słownik: ${model.vocabulary.length} cech`);
console.log(`Trafność (leave-one-out): ${((correct / total) * 100).toFixed(1)}% (${correct}/${total})`);
if (errors.length) {
  console.log('Pomyłki — dopisz podobne przykłady do właściwej intencji:');
  console.log(errors.join('\n'));
}
