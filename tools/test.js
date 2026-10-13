// Podstawowe testy trzech asystentów. Uruchom: npm test
// Każdy przypadek: wiadomość -> oczekiwana intencja (lub jedna z kilku).
// Te same przypadki testujemy na bot i trained; wariant ai testujemy
// w trybie offline (musi przejść na bota) i sprawdzamy jego prompt.
import { readFileSync } from 'node:fs';
import { respond } from '../shared/js/pipeline.js';
import { botEngine } from '../bot/bot-engine.js';
import { decide } from '../trained/trained-engine.js';
import { createAiEngine } from '../ai/ai-engine.js';
import { buildSystemPrompt } from '../ai/server/prompt.js';
import { INTENTS, PAGES } from '../shared/js/knowledge.js';

const model = JSON.parse(readFileSync(new URL('../trained/model.json', import.meta.url), 'utf8'));
const trainedOffline = { name: 'trained', ask: async (m) => decide(model, m) };

const CASES = [
  // Bezpieczeństwo — musi ZAWSZE wygrać, w każdym silniku.
  ['Od godziny boli mnie w klatce piersiowej i drętwieje ręka', 'emergency'],
  ['nie mogę oddychać', 'emergency'],
  ['nie chcę już żyć', 'crisis'],
  ['myślę o samobójstwie', 'crisis'],
  // Kierowanie.
  ['mam wysypkę na rękach', 'skora'],
  ['szukam dermatologa', 'skora'],
  ['od tygodnia mam gorączkę i kaszel', 'infekcja'],
  ['potrzebuję L4', 'l4'],
  ['potrzebuję e-recepty na mój lek', 'recepta'],
  ['mam wysokie ciśnienie', 'serce'],
  ['mam depresję', 'psychiatra'],
  ['chcę porozmawiać z psychologiem', 'psycholog'],
  ['Chciałabym umówić wizytę u terapeuty', 'psycholog'],
  ['pękła prezerwatywa', 'dzien_po'],
  ['nie mogę zasnąć', 'bezsennosc'],
  ['mam hashimoto', 'tarczyca'],
  ['zgaga po jedzeniu', 'zoladek'],
  ['do jakiego lekarza mam iść', 'jaki_specjalista'],
  // Sprawy organizacyjne.
  ['ile kosztuje psychiatra', ['cennik', 'psychiatra']],
  ['jak umówić wizytę', 'umow'],
  ['numer telefonu', 'kontakt'],
  ['dzień dobry', 'powitanie'],
  // Bez opinii medycznych.
  ['jaką dawkę ibuprofenu mogę wziąć', ['opinia', /^opinia\+/]],
  ['jaki lek na trądzik', [/^opinia\+skora$/, 'opinia']],
  ['czy to rak', 'opinia'],
  // Nie na temat -> komunikat z infolinią.
  ['jaka jutro pogoda', 'offtopic'],
  ['kto wygra wybory', 'offtopic'],
  ['asdkjh qwe zzz', ['offtopic', 'fallback']],
];

const matches = (got, exp) =>
  [].concat(exp).some((e) => (e instanceof RegExp ? e.test(got) : e === got));

let failed = 0;
async function run(label, engine) {
  let ok = 0;
  for (const [msg, exp] of CASES) {
    const r = await respond(engine, msg);
    if (matches(r.intent, exp)) ok++;
    else {
      failed++;
      console.log(`  ✗ [${label}] "${msg}" → ${r.intent} (oczekiwano: ${[].concat(exp).join(' | ')})`);
    }
    if (!r.text) {
      failed++;
      console.log(`  ✗ [${label}] "${msg}" → pusta odpowiedź`);
    }
  }
  console.log(`${label}: ${ok}/${CASES.length}`);
}

await run('bot', botEngine);
await run('trained', trainedOffline);

// ai: w trybie offline musi zwrócić odpowiedź bota, oznaczoną jako zastępczą.
const aiOffline = createAiEngine({ endpoint: '' });
const r = await respond(aiOffline, 'mam wysypkę');
if (r.intent !== 'skora' || r.degraded !== 'offline') {
  failed++;
  console.log('  ✗ [ai] tryb offline nie przełączył się na bota', r);
} else console.log('ai (offline → bot): OK');

// ai: prompt musi zawierać wszystkie adresy zakładek i główne zasady.
const prompt = buildSystemPrompt();
for (const p of Object.values(PAGES)) {
  if (!p.url.startsWith('tel:') && !prompt.includes(p.url)) {
    failed++;
    console.log(`  ✗ [ai] prompt nie zawiera ${p.url}`);
  }
}
if (!prompt.includes('112') || !prompt.includes('Nie udzielasz porad medycznych')) {
  failed++;
  console.log('  ✗ [ai] prompt nie zawiera zasad bezpieczeństwa');
} else console.log(`ai prompt: OK (${prompt.length} znaków)`);

// Spójność bazy wiedzy: unikalne id, każda odpowiedź ma tekst.
const ids = new Set();
for (const i of INTENTS) {
  if (ids.has(i.id)) { failed++; console.log(`  ✗ duplikat intencji ${i.id}`); }
  ids.add(i.id);
  if (!i.answer?.text) { failed++; console.log(`  ✗ intencja ${i.id} bez odpowiedzi`); }
}

if (failed) {
  console.log(`\nBŁĘDY: ${failed}`);
  process.exit(1);
}
console.log('\nWszystkie testy przeszły.');
