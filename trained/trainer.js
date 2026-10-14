// Wspólne funkcje nauki modelu „trained” — używane przez:
//   - trained/train.js (npm run train),
//   - lokalny serwer panelu (zakładka „Nauka” → „Zapisz i naucz model”),
//   - panel w przeglądarce (podpowiedzi tematów, test przed/po, trafność).
// Czysty JS bez zależności od Node, więc działa też w przeglądarce.
import { train, predict, withKeywords } from './naive-bayes.js';
import { INTENTS, INTENT_BY_ID } from '../shared/js/knowledge.js';
import { normalize } from '../shared/js/text.js';

export const TRAINING_LIMITS = { exampleLength: 200, perIntent: 1000, total: 20000 };

/**
 * Sprawdza i porządkuje dane treningowe: znane tematy, przycięte teksty,
 * bez duplikatów (wielkość liter i polskie znaki nie mają znaczenia), w limitach.
 * Zwraca { dataset, unknown } — unknown = tematy, których nie ma w knowledge.js.
 */
export function cleanDataset(input) {
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const dataset = {};
  if (typeof src._info === 'string') dataset._info = src._info.slice(0, 1000);
  const unknown = [];
  let total = 0;
  for (const [id, examples] of Object.entries(src)) {
    if (id.startsWith('_')) continue;
    if (!INTENT_BY_ID[id]) {
      unknown.push(id);
      continue;
    }
    const seen = new Set();
    const list = [];
    for (const ex of Array.isArray(examples) ? examples : []) {
      const text = String(ex ?? '').replace(/\s+/g, ' ').trim().slice(0, TRAINING_LIMITS.exampleLength);
      const key = normalize(text);
      if (!key || seen.has(key) || list.length >= TRAINING_LIMITS.perIntent || total >= TRAINING_LIMITS.total) continue;
      seen.add(key);
      list.push(text);
      total++;
    }
    dataset[id] = list;
  }
  return { dataset, unknown };
}

// Model gotowy do zapisu jako trained/model.json (przykłady + słowa kluczowe bota).
export function buildModel(dataset, version) {
  return { version, ...train(withKeywords(dataset, INTENTS)) };
}

// Odpowiedź modelu tak, jak liczy ją silnik: brak znanych słów = „nie na temat”.
export function topIntent(model, text) {
  const { ranked, knownFeatures } = predict(model, text);
  return knownFeatures === 0 ? { id: 'offtopic', p: 0, ranked, knownFeatures } : { id: ranked[0].id, p: ranked[0].p, ranked, knownFeatures };
}

/**
 * Trafność „leave-one-out”: każdy przykład po kolei ukrywamy, uczymy model na reszcie
 * i sprawdzamy, czy go odgadnie. Uczciwa miara na pytaniach, których model „nie widział”.
 */
export function evaluate(dataset) {
  let correct = 0;
  let total = 0;
  const errors = [];
  for (const [id, examples] of Object.entries(dataset)) {
    if (id.startsWith('_')) continue;
    examples.forEach((ex, i) => {
      const reduced = { ...dataset, [id]: examples.filter((_, j) => j !== i) };
      const got = topIntent(train(withKeywords(reduced, INTENTS)), ex).id;
      total++;
      if (got === id) correct++;
      else errors.push({ text: ex, expected: id, got });
    });
  }
  return { correct, total, accuracy: total ? correct / total : 0, errors };
}

// Liczba przykładów (bez pól technicznych zaczynających się od „_”).
export function countExamples(dataset) {
  return Object.entries(dataset).filter(([k]) => !k.startsWith('_')).reduce((n, [, v]) => n + v.length, 0);
}

// Opis zmian między dwiema wersjami danych — do CHANGES.md.
export function describeChanges(before, after) {
  const added = [];
  const removed = [];
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (id.startsWith('_')) continue;
    const a = new Set((before[id] || []).map(normalize));
    const b = new Set((after[id] || []).map(normalize));
    const plus = [...b].filter((x) => !a.has(x)).length;
    const minus = [...a].filter((x) => !b.has(x)).length;
    if (plus) added.push([id, plus]);
    if (minus) removed.push([id, minus]);
  }
  const sum = (list) => list.reduce((n, [, c]) => n + c, 0);
  const parts = [];
  if (added.length) parts.push(`dodano ${sum(added)} przykł. (${added.map(([id, c]) => `${id} +${c}`).join(', ')})`);
  if (removed.length) parts.push(`usunięto ${sum(removed)} przykł. (${removed.map(([id, c]) => `${id} −${c}`).join(', ')})`);
  return { text: parts.join('; ') || 'bez zmian w przykładach', added: sum(added), removed: sum(removed) };
}
