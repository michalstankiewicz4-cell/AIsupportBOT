// Skrypt treningowy asystenta "trained".
// Użycie (z katalogu głównego):  npm run train      (lub: node trained/train.js)
// Czyta trained/data/training.json, zapisuje trained/model.json i wypisuje
// raport trafności leave-one-out, żeby było widać, czy nowe przykłady pomogły.
// To samo robi panel sterowania w zakładce „Nauka” (przycisk „Zapisz i naucz model”).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cleanDataset, buildModel, evaluate } from './trainer.js';
import { INTENT_BY_ID } from '../shared/js/knowledge.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, 'data', 'training.json');
const modelPath = join(here, 'model.json');
// Wersję czytamy z pliku (a nie importem), bo bump.js mógł ją właśnie zmienić.
const VERSION = readFileSync(join(here, 'version.js'), 'utf8').match(/VERSION = '([^']+)'/)[1];

const raw = JSON.parse(readFileSync(dataPath, 'utf8'));

// 1. Walidacja: każda intencja z danych musi istnieć w bazie wiedzy.
const { dataset, unknown } = cleanDataset(raw);
if (unknown.length) {
  console.error(`Nieznane intencje w training.json (brak w knowledge.js): ${unknown.join(', ')}`);
  process.exit(1);
}
const missing = Object.keys(INTENT_BY_ID).filter((k) => !dataset[k]);
if (missing.length) console.warn(`Uwaga: intencje bez przykładów (model ich nie rozpozna): ${missing.join(', ')}`);

// 2. Ocena leave-one-out.
const ev = evaluate(dataset);

// 3. Trening na wszystkim (przykłady + słowa kluczowe z knowledge.js) i zapis.
const model = buildModel(dataset, VERSION);
writeFileSync(modelPath, JSON.stringify(model));

console.log(`Model zapisany: trained/model.json (wersja ${VERSION})`);
console.log(`Przykładów: ${model.examples}, intencji: ${Object.keys(model.classes).length}, słownik: ${model.vocabulary.length} cech`);
console.log(`Trafność (leave-one-out): ${(ev.accuracy * 100).toFixed(1)}% (${ev.correct}/${ev.total})`);
if (ev.errors.length) {
  console.log('Pomyłki — dopisz podobne przykłady do właściwej intencji:');
  console.log(ev.errors.map((e) => `  "${e.text}" → ${e.got} (oczekiwano: ${e.expected})`).join('\n'));
}
