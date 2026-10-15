// Testy asystentów, panelu sterowania, serwera panelu i kontroli strony. Uruchom: npm test
// Każdy przypadek: wiadomość -> oczekiwana intencja (lub jedna z kilku).
// Te same przypadki testujemy na bot i trained; wariant ai testujemy
// w trybie offline (musi przejść na bota) i sprawdzamy jego prompt.
import { readFileSync } from 'node:fs';
import { respond } from '../shared/js/pipeline.js';
import { botEngine } from '../bot/bot-engine.js';
import { decide } from '../trained/trained-engine.js';
import { createAiEngine } from '../ai/ai-engine.js';
import { buildSystemPrompt } from '../ai/server/prompt.js';
import { INTENTS, PAGES, siteFacts } from '../shared/js/knowledge.js';
import { setPanelConfig, matchRule } from '../panel/client.js';
import { sanitizeConfig, filterLogEntry, DEFAULT_CONFIG, wrapSettings, unwrapSettings } from '../panel/schema.js';
import { initPanel, getPanelConfig, panelStatus } from '../panel/client.js';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { anonymize } from '../shared/js/privacy.js';
import { createRouterEngine } from '../shared/js/router.js';
import { checkSite, collectLinks } from '../panel/site-check.js';

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
  ['ile kosztuje psychiatra', [/^cennik/, 'psychiatra']],
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
let r = await respond(aiOffline, 'mam wysypkę');
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

// =============================================================================
// Testy akceptacyjne ze specyfikacji czatu „Ilona” (v1.1, sekcja 10) — bot.
// Niezaliczony test blokuje publikację (GitHub Actions uruchamia npm test).
// =============================================================================

const urlOf = (r, label) => r.links.find((l) => l.label.startsWith(label))?.url || '';
const labels = (r) => r.links.map((l) => l.label);
const tiles = (r) => r.links.filter((l) => l.tile);
const svcIds = (r) => r.links.map((l) => l.id);
// A i B (v1.1): u góry zielona odpowiedź, czerwona karta z 112 — osobno (r.alarm), zawsze POD nią.
const ALARM_OK = (r) => r.emergency && r.alarm?.links[0]?.url === 'tel:112' && r.alarm.text.includes('112 lub 999') && !r.links.some((l) => l.url === 'tel:112') && !labels(r).some((l) => l.includes('zł'));
const A_OK = (r) => ALARM_OK(r) && r.text.startsWith('Zadbaj o swoje bezpieczeństwo') && labels(r)[0] === 'Umów konsultację lekarską';
const B_OK = (r) => ALARM_OK(r) && ['psychiatra', 'psycholog', 'terapeuta'].every((id) => svcIds(r).includes(id));
const L_OK = (r) => r.case === 'L' && r.text.startsWith('Nie jestem pewna') && tiles(r).length >= 5 && r.links.some((l) => l.ask === 'Jaki specjalista?');
const D_OK = (r) => r.case === 'D' && svcIds(r).slice(0, 3).join() === 'wizyta_umow,wyniki,skierowanie' && new Set(tiles(r).slice(0, 3).map((l) => l.color)).size === 3;
const C_OK = (r) => r.case === 'C' && svcIds(r).includes('psychiatra') && svcIds(r).includes('psycholog_terapeuta');

const ACCEPTANCE = [
  [1, 'mam duszności i kołatanie serca', 'A', A_OK],
  [2, 'nie mogę oddychać, kołatanie serca', 'A', A_OK],
  [3, 'boli mnie w klatce piersiowej', 'A', A_OK],
  [4, 'zemdlałem', 'A', A_OK],
  [5, 'połknąłem za dużo tabletek', 'A', A_OK],
  [6, 'chcę się zabić', 'B', (r) => B_OK(r) && r.text.includes('Nie jesteś z tym sam(a)')],
  [7, 'nie mam po co żyć', 'B', B_OK],
  [8, 'mój mąż mówi, że chce się zabić', 'B', (r) => B_OK(r) && r.text.includes('kogoś bliskiego')],
  [9, 'tnę się', 'B', B_OK],
  [10, 'mam depresję i chcę się zabić', 'B', B_OK],
  [11, 'potrzebuję recepty, mam ból w klatce', 'A', A_OK],
  [13, 'mam depresję', 'C', C_OK],
  [14, 'ataki paniki i bezsenność', 'C', C_OK],
  [15, 'potrzebuję leków psychiatrycznych', 'C', C_OK],
  [16, 'boli mnie kręgosłup', 'D', D_OK],
  [17, 'kregoslup mnie boli', 'D', D_OK],
  [18, 'boli mnie noga', 'D', D_OK],
  [19, 'jestem chory', 'D', D_OK],
  [20, 'mam wysypkę na rękach', 'D', (r) => D_OK(r) && svcIds(r).includes('dermatologia')],
  [21, 'chcę receptę', 'E', (r) => svcIds(r).join() === 'wizyta_umow,recepta,kontynuacja' && r.links[1].url.includes('service=e-Recepta+online')],
  [22, 'potrzebuję L4', 'F', (r) => r.links.length === 2 && r.links[1].url.includes('service=L4+online') && !labels(r).includes('Cennik')],
  [23, 'mam wyniki badań', 'G', (r) => svcIds(r).slice(0, 2).join() === 'wyniki,skierowanie'],
  [24, 'nie robiłem badań, chcę skierowanie', 'G', (r) => svcIds(r).slice(0, 2).join() === 'wyniki,skierowanie'],
  [25, 'tabletka dzień po', 'H', (r) => svcIds(r).join() === 'dzien_po,antykoncepcja,trt' && new Set(r.links.map((l) => l.color)).size === 3 && r.links.every((l) => !l.outline)],
  [26, 'jaką dawkę ibuprofenu?', 'I', (r) => !/\d/.test(r.text) && labels(r)[0].startsWith('Umów konsultację lekarską')],
  [27, 'ile kosztuje psychiatra', 'J', (r) => r.text.includes('259 zł') && r.text.includes('169 zł') && svcIds(r).join() === 'psychiatra,psycholog_terapeuta' && !labels(r).some((l) => l.includes('cennik'))],
  [28, 'jak umówić wizytę', 'K', (r) => r.text.includes('1)') && r.text.includes('4)') && r.links.some((l) => l.ask === 'Jaki specjalista?')],
  ['28b', 'Jaki specjalista?', 'K', (r) => svcIds(r).join() === 'lekarz,psychiatra,psycholog,terapeuta'],
  [29, 'jaka jutro pogoda', 'L', L_OK],
  [30, 'czy jutro jest dzień wolny', 'L', L_OK],
  [31, 'asdfgh', 'L', L_OK],
  [32, 'cześć', 'M', (r) => r.text.includes('Nie jestem lekarzem') && tiles(r).filter((l) => l.label.includes('zł')).length >= 12],
  // Normalizacja wpisu (specyfikacja, pkt 8.5): literówki i powtórzenia liter.
  ['8.5a', 'dermatolok', 'D', (r) => svcIds(r).includes('dermatologia')],
  ['8.5b', 'potrzebuje zwolninie', 'F', () => true],
  ['8.5c', 'boooli mnie kregoslup', 'D', D_OK],
  ['8.5d', 'nie moge odychac', 'A', A_OK],
];

let accOk = 0;
for (const [nr, msg, expCase, check] of ACCEPTANCE) {
  const r = await respond(botEngine, msg, [], {});
  const pass = r.case === expCase && check(r) && r.links.length > 0;
  if (pass) accOk++;
  else {
    failed++;
    console.log(`  ✗ [spec ${nr}] "${msg}" → ${r.case}/${r.intent} (oczekiwano: ${expCase})`, JSON.stringify({ text: r.text, links: r.links?.map((l) => `${l.id}:${l.label}`), alarm: r.alarm?.text }));
  }
}
// 12: tryb kryzysowy — po B „nie wiem” dostaje odpowiedź B (góra) + czerwoną kartę (dół), nie „Nie jestem pewna…”.
{
  const flow = {};
  await respond(botEngine, 'nie chcę żyć', [], flow);
  const r = await respond(botEngine, 'nie wiem', [], flow);
  const pass = r.case === 'B' && B_OK(r) && r.text.includes('Nie jesteś z tym sam(a)');
  if (pass) accOk++;
  else { failed++; console.log('  ✗ [spec 12] tryb kryzysowy', r); }
}
// 8.19: po dwóch niezrozumiałych wiadomościach z rzędu — „Napisz do nas”.
{
  const flow = {};
  const r1 = await respond(botEngine, 'asdfgh', [], flow);
  const r2 = await respond(botEngine, 'qwerty', [], flow);
  const pass = !r1.links.some((l) => l.label === 'Napisz do nas') && r2.links.some((l) => l.label === 'Napisz do nas');
  if (pass) accOk++;
  else { failed++; console.log('  ✗ [spec 8.19] „Napisz do nas” po dwóch niezrozumiałych', r1.links, r2.links); }
}
console.log(`Testy akceptacyjne specyfikacji: ${accOk}/${ACCEPTANCE.length + 2}`);

// Zasady nadrzędne (sekcja 3): każda odpowiedź tematu ma przycisk; teksty maks. 4 zdania;
// czerwony kolor (alarm) wyłącznie przy 112.
{
  const { TEXTS } = await import('../shared/js/texts.js');
  for (const i of INTENTS) {
    const a = i.answer;
    if (!a.links.length) { failed++; console.log(`  ✗ temat ${i.id} bez przycisku`); }
    // Wytyczna klienta: każda odpowiedź prowadzi do zakupu — co najmniej jeden kafelek usługi.
    if (!a.links.some((l) => l.tile && l.url?.includes('wypelnij-formularz'))) { failed++; console.log(`  ✗ temat ${i.id} bez kafelka zakupu`); }
    if (a.links.some((l) => l.kind === 'alarm' || /^#c0392b$/i.test(l.color || ''))) { failed++; console.log(`  ✗ temat ${i.id} ma czerwony przycisk`); }
    // Specyfikacja v1.1: sąsiednie kafelki nie mają tego samego koloru (chyba że jeden to obrys).
    const t = a.links.filter((l) => l.tile);
    for (let k = 1; k < t.length; k++) {
      if (t[k].color === t[k - 1].color && !t[k].outline && !t[k - 1].outline) { failed++; console.log(`  ✗ temat ${i.id}: sąsiednie kafelki w tym samym kolorze (${t[k - 1].label} / ${t[k].label})`); }
    }
  }
  for (const [k, t] of Object.entries(TEXTS)) {
    // Krótkie wtrącenia („Jaki specjalista?”) nie liczą się jako zdanie.
    const sentences = t.text.split(/[.!?](?:\s|$)/).filter((x) => x.trim().split(/\s+/).length > 3).length;
    if (sentences > 4) { failed++; console.log(`  ✗ tekst ${k} ma ${sentences} zdań (maks. 4)`); }
  }
}

// =============================================================================
// Panel sterowania
// =============================================================================

function expect(label, cond, detail = '') {
  if (cond) return true;
  failed++;
  console.log(`  ✗ [panel] ${label}${detail ? ` — ${JSON.stringify(detail)}` : ''}`);
  return false;
}
let panelOk = failed;

// Własne odpowiedzi, nadpisania, bezpieczeństwo ponad wszystkim.
setPanelConfig({
  rules: [
    { id: 'sob', phrases: ['sobot*', 'w weekend'], text: 'W soboty 9–18.', links: [{ label: 'Zły', url: 'javascript:alert(1)' }] },
    { id: 'off', phrases: ['parking'], text: 'Parking jest.', active: false },
  ],
  overrides: { D: { text: 'Skóra → dermatolog.' }, L: { text: 'Nie wiem.' }, ALARM: { text: 'zmienione' } },
});
r = await respond(botEngine, 'Czy pracujecie w SOBOTĘ?');
expect('reguła z frazą sobot* działa', r.intent === 'custom:sob' && r.source === 'custom', r);
expect('niebezpieczny link usunięty', r.links.length === 0, r.links);
expect('wyłączona reguła nie działa', !matchRule('gdzie jest parking'));
r = await respond(botEngine, 'boli mnie w klatce piersiowej w sobotę');
expect('stan nagły wygrywa z własną regułą', r.intent === 'emergency' && r.source === 'safety', r);
r = await respond(botEngine, 'mam wysypkę');
expect('nadpisanie tekstu działa (bot)', r.text === 'Skóra → dermatolog.', r.text);
r = await respond(botEngine, 'nie mogę oddychać');
expect('tekstu alarmowego nie da się nadpisać', r.alarm?.text.startsWith('To może być stan nagły'), r.alarm);
r = await respond(trainedOffline, 'mam trądzik');
expect('nadpisanie tekstu działa (trained)', r.text.startsWith('Skóra → dermatolog.'), r.text);
r = await respond(botEngine, 'qwerty zxcv');
expect('nadpisanie „nie rozpoznano” działa', r.intent === 'fallback' && r.text === 'Nie wiem.', r);
// Usługi i przyciski z panelu: cena, kolor i kolejność przycisków bez programisty.
setPanelConfig({ services: { psychiatra: { price: '299 zł', color: '#123456', priceColor: '#FFFFFF' }, nieznana: { price: '1 zł' } }, buttons: { F: ['l4', 'xxx', 'cennik|Ceny'], ALARM: ['cennik'] } });
r = await respond(botEngine, 'ile kosztuje psychiatra');
expect('panel: nowa cena i kolor usługi', r.text.includes('299 zł') && r.links[0].color === '#123456' && r.links[0].priceColor === '#FFFFFF' && r.links[0].label.endsWith('299 zł'), r);
r = await respond(botEngine, 'potrzebuję L4');
expect('panel: własne przyciski (nieznane id odrzucone, własna etykieta)', r.links.map((l) => l.label).join() === 'L4 online · od 79 zł,Ceny', r.links);
expect('panel: tylko znane usługi i przyciski', !sanitizeConfig({ services: { nieznana: { price: '1' } }, buttons: { ALARM: ['cennik'], J: ['l4'] } }).services.nieznana && !Object.keys(sanitizeConfig({ buttons: { ALARM: ['cennik'], J: ['l4'] } }).buttons).length);
expect('panel: kolor tylko #rrggbb', !sanitizeConfig({ services: { l4: { color: 'red;background:url(x)' } } }).services.l4);
expect('panel: kafelki — domyślnie bez zmian', JSON.stringify(sanitizeConfig({}).tiles) === '{}');
{
  const tl = sanitizeConfig({ tiles: { fit: true, nobreak: true, sym: 'both', padding: { t: 4, r: 99, b: 20, l: -3 } } }).tiles;
  expect('panel: kafelki — symetria pełna i zakres 0–24 px', tl.fit && tl.nobreak && tl.padding.t === 4 && tl.padding.b === 4 && tl.padding.l === 4 && tl.padding.r === 4, tl);
  const tp = sanitizeConfig({ tiles: { pack: true, autoWidth: true, fit: 'tak' } }).tiles;
  expect('panel: kafelki — równe odstępy i szerokość do tekstu (tylko true)', tp.pack && tp.autoWidth && !tp.fit, tp);
  const { orderTiles } = await import('../shared/js/knowledge.js');
  const ts = [{ label: 'A · od 79 zł' }, { label: 'B' }, { label: 'C · 259 zł' }, { label: 'D · od 45 zł' }];
  expect('kafelki: kolejność od najtańszej (bez ceny na końcu)', orderTiles(ts, 'cheap').map((x) => x.label[0]).join('') === 'DACB');
  expect('kafelki: od najdroższej / najpierw z ceną / domyślna', orderTiles(ts, 'expensive').map((x) => x.label[0]).join('') === 'CADB' && orderTiles(ts, 'priced').map((x) => x.label[0]).join('') === 'ACDB' && orderTiles(ts, 'default') === ts);
  expect('kafelki: zła kolejność odrzucona', !sanitizeConfig({ tiles: { order: 'xxx' } }).tiles.order && sanitizeConfig({ tiles: { order: 'cheap' } }).tiles.order === 'cheap');
  const tf = sanitizeConfig({ tiles: { center: true, fontSize: 99 } }).tiles;
  expect('panel: kafelki — wyśrodkowanie i czcionka (10–20 px)', tf.center && tf.fontSize === 20 && sanitizeConfig({ tiles: { fontSize: 11.3 } }).tiles.fontSize === 11.5 && !('fontSize' in sanitizeConfig({ tiles: { fontSize: 13.5 } }).tiles), tf);
  const tv = sanitizeConfig({ tiles: { sym: 'vertical', padding: { t: 6, b: 18, l: 2, r: 30 } } }).tiles;
  expect('panel: kafelki — symetria pionowa (dół = góra)', tv.padding.b === 6 && tv.padding.l === 2 && tv.padding.r === 24, tv);
}
expect('panel: kolor plakietki z ceną (auto albo #rrggbb)', sanitizeConfig({ services: { l4: { priceColor: '#fff4d6' } } }).services.l4.priceColor === '#FFF4D6' && !sanitizeConfig({ services: { l4: { priceColor: 'auto' } } }).services.l4);
// Strona i wygląd, adresy zakładek, słowa kluczowe, przyciski dodatkowe, komunikaty — z panelu.
{
  const { SITE, PAGES, activeNotices } = await import('../shared/js/knowledge.js');
  setPanelConfig({
    site: { phone: '+48 600 100 200', hours: 'pon–pt 7:00–21:00', assistant: 'Ola', email: 'zly-adres' },
    pages: { pricing: 'https://lekarzeiterapeuci.pl/cennik', terms: 'javascript:alert(1)' },
    keywords: { inny_specjalista: { add: ['rw* kulszow*'] }, skora: { remove: ['wysypk*'] } },
    topics: { inny_specjalista: { extras: ['dermatologia'] }, l4: { extras: ['trt'] } },
    notices: [{ text: 'Teraz', from: '2000-01-01', to: '2999-12-31' }, { text: 'Kiedyś', from: '2999-01-01' }, { text: 'Wyłączony', active: false }],
  });
  r = await respond(botEngine, 'numer telefonu');
  expect('panel: nowy telefon i godziny w odpowiedzi', r.text.includes('+48 600 100 200') && r.text.includes('7:00–21:00') && SITE.phoneHref === 'tel:+48600100200', r.text);
  expect('panel: imię konsultantki, zły e-mail odrzucony', SITE.assistant === 'Ola' && SITE.email === 'kontakt@lekarzeiterapeuci.pl');
  expect('panel: adres zakładki (tylko https)', PAGES.pricing.url === 'https://lekarzeiterapeuci.pl/cennik' && PAGES.terms.url.endsWith('/warunki-umowy'));
  r = await respond(botEngine, 'mam rwę kulszową');
  expect('panel: dodane słowo z gwiazdkami („rw* kulszow*”) + przycisk dodatkowy', r.intent === 'inny_specjalista' && r.links.some((l) => l.id === 'dermatologia'), r);
  r = await respond(botEngine, 'mam wysypkę');
  expect('panel: usunięte słowo przestaje działać', r.intent !== 'skora', r.intent);
  expect('panel: przyciski dodatkowe tylko dla C i D', !sanitizeConfig({ topics: { l4: { extras: ['trt'] } } }).topics.l4);
  expect('panel: komunikaty tylko w swoim terminie', activeNotices().map((n) => n.text).join() === 'Teraz', activeNotices());
  const { siteFacts } = await import('../shared/js/knowledge.js');
  expect('kontrola strony sprawdza nowy telefon i godziny', siteFacts().some((f) => f.pattern.startsWith('600')) && siteFacts().some((f) => f.label.includes('7:00–21:00')));
  expect('panel: obraz tylko PNG/JPEG/WebP', !sanitizeConfig({ site: { logo: 'data:image/svg+xml;base64,PHN2Zz4=' } }).site.logo && sanitizeConfig({ site: { logo: 'data:image/png;base64,iVBORw0KGgo=' } }).site.logo);
  setPanelConfig(DEFAULT_CONFIG);
  expect('panel: powrót do wartości domyślnych', SITE.phone === '+48 881 238 227' && SITE.assistant === 'Ilona' && PAGES.pricing.url.endsWith('/#cennik') && !activeNotices().length);
}
setPanelConfig(DEFAULT_CONFIG);
r = await respond(botEngine, 'mam wysypkę');
expect('powrót do tekstu domyślnego', !r.text.startsWith('Skóra →'), r.text);

// Tryb pracy (łańcuch silników).
const fakeAi = (degraded) => ({ name: 'ai', version: 't', ask: async () => ({ text: 'AI', intent: 'ai', ...(degraded ? { degraded: 'offline' } : {}) }) });
const t = { ...trainedOffline, version: 't' };
let chain = createRouterEngine(['trained', 'ai'], { trained: t, ai: fakeAi(false) });
r = await chain.ask('mam trądzik');
expect('łańcuch: model rozpoznał — AI nie pytane', r.engine === 'trained' && r.intent === 'skora', r);
r = await chain.ask('xyzzy foo');
expect('łańcuch: model nie rozpoznał — odpowiada AI', r.engine === 'ai' && r.via?.[0] === 'trained', r);
chain = createRouterEngine(['ai', 'trained'], { trained: t, ai: fakeAi(true) });
r = await chain.ask('mam trądzik');
expect('łańcuch: AI niedostępne — odpowiada model', r.engine === 'trained' && r.intent === 'skora', r);
expect('domyślny tryb to bot', sanitizeConfig({}).engine.chain.join() === 'bot');
expect('nieznane silniki odrzucone', sanitizeConfig({ engine: { chain: ['ai', 'x', 'ai'] } }).engine.chain.join() === 'ai');

// Rejestracja i anonimizacja.
expect('anonimizacja', anonymize('PESEL 90010112345, tel. +48 600-123-456, a@b.pl') === 'PESEL [numer], tel. [numer], [e-mail]', anonymize('PESEL 90010112345, tel. +48 600-123-456, a@b.pl'));
const entry = { intent: 'skora', consent: true, question: 'pytanie 600123456', answer: 'odp' };
expect('poziom 0: nic', filterLogEntry(entry, { logging: { level: 0 } }) === null);
expect('poziom 1: bez treści', filterLogEntry(entry, { logging: { level: 1 } }).question === null);
expect('poziom 2 bez zgody: bez treści', filterLogEntry({ ...entry, consent: false }, { logging: { level: 2 } }).question === null);
expect('kryzys (B): treści nie zapisujemy', filterLogEntry({ ...entry, case: 'B' }, { logging: { level: 3 } }).question === null);
expect('rejestr: przypadek i przycisk', filterLogEntry({ ...entry, case: 'D', button: 'Umów' }, { logging: { level: 1 } }).case === 'D');
expect('rejestr: zły przypadek odrzucony', filterLogEntry({ ...entry, case: 'Z' }, { logging: { level: 1 } }).case === '');
const l2 = filterLogEntry(entry, { logging: { level: 2 } });
expect('poziom 2 ze zgodą: pytanie bez numeru, bez odpowiedzi', l2.question === 'pytanie [numer]' && l2.answer === null, l2);
expect('poziom 3 ze zgodą: z odpowiedzią', filterLogEntry(entry, { logging: { level: 3 } }).answer === 'odp');

// Serwer panelu na wbudowanym SQLite (atrapa Cloudflare D1).
let sqliteOk = true;
try {
  await import('node:sqlite');
} catch {
  sqliteOk = false;
  console.log('  (pominięto testy serwera panelu — Node bez node:sqlite, wymagany Node 22.13+)');
}
if (sqliteOk) {
  const worker = (await import('../panel/server/worker.js')).default;
  const { createTestD1 } = await import('./d1-sqlite.js');
  const env = { DB: await createTestD1(), ADMIN_PASSWORD: 'tajne', ALLOWED_ORIGINS: 'https://lekarzeiterapeuci.pl' };
  const call = async (method, path, { body, pw, origin = 'https://lekarzeiterapeuci.pl', ip = '1.1.1.1' } = {}) => {
    const headers = { Origin: origin, 'CF-Connecting-IP': ip };
    if (pw) headers.Authorization = `Bearer ${pw}`;
    const res = await worker.fetch(new Request(`https://panel${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
    let data = null;
    try {
      data = await res.json();
    } catch { /* brak treści */ }
    return { status: res.status, data };
  };
  expect('serwer: domyślne ustawienia', (await call('GET', '/config')).data.engine.chain.join() === 'bot');
  expect('serwer: admin bez hasła = 401', (await call('GET', '/admin/config')).status === 401);
  expect('serwer: złe hasło = 401', (await call('GET', '/admin/config', { pw: 'zle' })).status === 401);
  const put = await call('PUT', '/admin/config', { pw: 'tajne', body: { engine: { chain: ['trained', 'ai'] }, logging: { level: 2 }, rules: [{ phrases: ['x'], text: 'y', active: false }] } });
  expect('serwer: zapis ustawień', put.status === 200 && put.data.engine.chain.join() === 'trained,ai', put);
  expect('serwer: wyłączone reguły niepubliczne', (await call('GET', '/config')).data.rules.length === 0);
  expect('serwer: zapis rozmowy', (await call('POST', '/log', { body: { intent: 'skora', consent: true, question: 'tel 600123456' } })).status === 204);
  expect('serwer: obca strona nie zapisze', (await call('POST', '/log', { origin: 'https://zla.pl', body: { intent: 'x' } })).status === 403);
  const logs = (await call('GET', '/admin/logs', { pw: 'tajne' })).data.logs;
  expect('serwer: rozmowa zanonimizowana', logs.length === 1 && logs[0].question === 'tel [numer]', logs);
  env.ADMIN_IPS = '9.9.9.9';
  expect('serwer: admin spoza dozwolonych IP = 404', (await call('GET', '/admin/config', { pw: 'tajne' })).status === 404);
  env.ADMIN_IPS = '';
  for (let i = 0; i < 11; i++) await call('GET', '/admin/config', { pw: 'zle', ip: '2.2.2.2' });
  expect('serwer: blokada po 10 błędnych hasłach', (await call('GET', '/admin/config', { pw: 'tajne', ip: '2.2.2.2' })).status === 429);
  env.DB._raw.prepare('UPDATE logs SET ts = ?').run(Date.now() - 400 * 86400000);
  await worker.scheduled({}, { ...env, DB: env.DB }, { waitUntil: () => {} });
  expect('serwer: stare wpisy usuwane automatycznie', (await call('GET', '/admin/logs', { pw: 'tajne', ip: '3.3.3.3' })).data.logs.length === 0);
}

// Kontrola strony na atrapie strony kliniki.
const goodHome = `<html><head><title>Lekarze i Terapeuci</title></head><body>
  <section id="uslugi">Usługi</section><section id="cennik">Recepta 59 zł, L4 79 zł, otyłość 129 zł, psycholog 169 zł, psychiatra 259 zł</section>
  <section id="kontakt">Tel. +48 881 238 227, kontakt@lekarzeiterapeuci.pl, Pon–Pt: 8:00–20:00, Sb–Nd: 9:00–18:00</section>
  ${'<p>Treść strony głównej. </p>'.repeat(40)}</body></html>`;
const womenPage = `<html><body>Tabletka dzień po od 45 zł, TRT od 199 zł ${'<p>tekst</p>'.repeat(80)}</body></html>`;
const fakeFetch = (variant) => async (url) => {
  const u = new URL(url);
  const html = (body) => new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
  if (u.pathname === '/') return html(variant === 'changed' ? goodHome.replace('259 zł', '279 zł').replace('id="cennik"', 'id="ceny"') : goodHome);
  if (u.pathname === '/dla-kobiet-i-mezczyzn') return html(womenPage);
  if (u.pathname === '/conditions/migrena' && variant === 'changed') return new Response('Not found', { status: 404, headers: { 'content-type': 'text/html' } });
  return html(`<html><body>${'<p>Podstrona.</p>'.repeat(60)}</body></html>`);
};
const links = collectLinks({ rules: [{ phrases: ['x'], text: 'y', links: [{ label: 'Kontakt', url: 'https://lekarzeiterapeuci.pl/#kontakt' }] }] });
expect('kontrola: zbiera linki z odpowiedzi i reguł', links.length > 20 && links.find((l) => l.url.endsWith('/#kontakt')).where.some((w) => w.startsWith('Własna')), links.length);
const first = await checkSite({ fetchImpl: fakeFetch('good') });
expect('kontrola: wszystko OK na dobrej stronie', first.ok && first.summary.errors === 0 && first.summary.factsMissing === 0, first.summary);
expect('kontrola: wszystkie fakty sprawdzone', first.facts.length === siteFacts().length && first.facts.every((f) => f.state === 'ok'), first.facts);
const second = await checkSite({ fetchImpl: fakeFetch('changed'), previous: first });
expect('kontrola: wykrywa link 404', second.links.some((l) => l.url.includes('/conditions/migrena') && l.level === 'error'), second.summary);
expect('kontrola: wykrywa brak sekcji #cennik', second.links.some((l) => l.url.endsWith('#cennik') && l.level === 'warn'));
expect('kontrola: wykrywa zmianę ceny', second.facts.find((f) => f.label.includes('259')).state === 'missing');
expect('kontrola: wykrywa zmianę treści', second.changes.some((c) => c.url === 'https://lekarzeiterapeuci.pl/'), second.changes);
expect('kontrola: wynik „wymaga uwagi”', second.ok === false);
const down = await checkSite({ fetchImpl: async () => { throw new TypeError('fetch failed'); } });
expect('kontrola: brak połączenia = jeden czytelny komunikat', down.summary.unreachable === true && down.ok === false, down.summary);

// Plik ustawień: eksport / import / źródło „plik”.
const exported = wrapSettings({ engine: { chain: ['trained', 'ai'] }, rules: [{ phrases: ['parking'], text: 'Online.' }] });
expect('plik: eksport → import daje te same ustawienia', JSON.stringify(unwrapSettings(JSON.parse(JSON.stringify(exported)))) === JSON.stringify(exported.config));
expect('plik: import „gołych” ustawień', unwrapSettings({ engine: { chain: ['ai'] } }).engine.chain.join() === 'ai');
let importErr = '';
try {
  unwrapSettings({ cokolwiek: 1 });
} catch (err) {
  importErr = err.message;
}
expect('plik: odrzuca plik, który nie jest ustawieniami', importErr.includes('nie zawiera ustawień'));
const repoFile = JSON.parse(readFileSync(new URL('../panel/settings.json', import.meta.url), 'utf8'));
expect('plik: panel/settings.json jest poprawny', unwrapSettings(repoFile).engine.chain.length > 0);

// Czat czyta ustawienia z pliku, gdy nie ma serwera panelu.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => (String(url).endsWith('settings.json') ? new Response(JSON.stringify(exported)) : new Response('', { status: 404 }));
await initPanel({});
expect('plik: czat używa ustawień z pliku', panelStatus().source === 'file' && getPanelConfig().engine.chain.join() === 'trained,ai', panelStatus());
globalThis.fetch = async () => new Response('', { status: 404 });
await initPanel({});
expect('plik: brak pliku = ustawienia domyślne', panelStatus().source === 'default' && getPanelConfig().engine.chain.join() === 'bot');
globalThis.fetch = realFetch;
setPanelConfig(DEFAULT_CONFIG);

// Lokalny serwer panelu: zapis pliku ustawień z kopią zapasową i ochrona przed innymi stronami.
{
  const dir = mkdtempSync(join(tmpdir(), 'lt-panel-'));
  const settingsFile = join(dir, 'settings.json');
  writeFileSync(settingsFile, JSON.stringify(wrapSettings(DEFAULT_CONFIG)));
  const port = 5100 + Math.floor(Math.random() * 800);
  const child = spawn(process.execPath, [new URL('./serve-local.js', import.meta.url).pathname, String(port)], {
    env: { ...process.env, LT_SETTINGS_FILE: settingsFile, LT_BACKUP_DIR: join(dir, 'backups') },
    stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 40; i++) {
      if (await realFetch(`${base}/`).then(() => true, () => false)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const put = (origin, body) =>
      realFetch(`${base}/api/settings`, { method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    expect('lokalny serwer: obca strona nie zapisze pliku', (await put('https://zla.pl', exported)).status === 403);
    const ok = await put(`http://127.0.0.1:${port}`, exported);
    expect('lokalny serwer: zapis pliku ustawień', ok.status === 200);
    const saved = JSON.parse(readFileSync(settingsFile, 'utf8'));
    expect('lokalny serwer: plik ma nowe ustawienia', unwrapSettings(saved).rules[0]?.text === 'Online.', saved);
    expect('lokalny serwer: kopia zapasowa poprzedniej wersji', readdirSync(join(dir, 'backups')).length === 1);
    expect('lokalny serwer: błędny plik odrzucony', (await put(`http://127.0.0.1:${port}`, { x: 1 })).status === 400);
  } finally {
    child.kill();
  }
}

// Nauka modelu (zakładka „Nauka”).
{
  const { cleanDataset, buildModel, topIntent, evaluate, describeChanges } = await import('../trained/trainer.js');
  const raw = JSON.parse(readFileSync(new URL('../trained/data/training.json', import.meta.url), 'utf8'));
  const { dataset, unknown } = cleanDataset({ ...raw, nieistniejacy: ['x'], skora: [...raw.skora, '  MAM TRĄDZIK ', 'mam trądzik'] });
  expect('nauka: nieznane tematy wykryte', unknown.join() === 'nieistniejacy');
  expect('nauka: duplikaty usunięte (wielkość liter, polskie znaki, spacje)', dataset.skora.length === raw.skora.length, dataset.skora.slice(-3));
  const word = 'zgrzybiałość';
  const before = topIntent(buildModel(dataset, 't'), `mam ${word}`);
  const more = { ...dataset, skora: [...dataset.skora, `${word} na stopach`, `${word} paznokci`, `leczenie ${word}`] };
  const after = topIntent(buildModel(more, 't'), `mam ${word}`);
  expect('nauka: model uczy się nowego słowa', before.id !== 'skora' && after.id === 'skora', { before: before.id, after: after.id });
  expect('nauka: opis zmian do CHANGES', describeChanges(dataset, more).text.startsWith('dodano 3 przykł. (skora +3)'), describeChanges(dataset, more).text);
  const ev = evaluate(dataset);
  expect('nauka: trafność jak w npm run train', ev.total === countExamplesQuick(raw) && ev.accuracy > 0.75, ev.accuracy);
}
function countExamplesQuick(d) {
  return Object.entries(d).filter(([k]) => !k.startsWith('_')).reduce((n, [, v]) => n + v.length, 0);
}

// Lokalny serwer: zapis danych treningowych + trening modelu.
{
  const dir = mkdtempSync(join(tmpdir(), 'lt-train-'));
  const trainingFile = join(dir, 'training.json');
  const modelFile = join(dir, 'model.json');
  const original = JSON.parse(readFileSync(new URL('../trained/data/training.json', import.meta.url), 'utf8'));
  writeFileSync(trainingFile, JSON.stringify(original));
  const port = 5100 + Math.floor(Math.random() * 800);
  const child = spawn(process.execPath, [new URL('./serve-local.js', import.meta.url).pathname, String(port)], {
    env: { ...process.env, LT_TRAINING_FILE: trainingFile, LT_MODEL_FILE: modelFile, LT_BACKUP_DIR: join(dir, 'backups'), LT_SKIP_BUMP: '1' },
    stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 40; i++) {
      if (await realFetch(`${base}/`).then(() => true, () => false)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const got = await (await realFetch(`${base}/api/training`)).json();
    expect('nauka/serwer: odczyt danych', got.dataset.skora.length === original.skora.length);
    const next = { ...got.dataset, alergia: [...got.dataset.alergia, 'łzawią mi oczy na wiosnę'] };
    const put = (origin, body) =>
      realFetch(`${base}/api/training`, { method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    expect('nauka/serwer: obca strona nie zapisze', (await put('https://zla.pl', { dataset: next })).status === 403);
    expect('nauka/serwer: nieznany temat odrzucony', (await put(base, { dataset: { ...next, zly_temat: ['x'] } })).status === 400);
    const ok = await put(base, { dataset: next });
    const res = await ok.json();
    expect('nauka/serwer: zapis i trening', ok.status === 200 && res.added === 1 && res.accuracy > 0.75, res);
    expect('nauka/serwer: plik danych zaktualizowany', JSON.parse(readFileSync(trainingFile, 'utf8')).alergia.includes('łzawią mi oczy na wiosnę'));
    const model = JSON.parse(readFileSync(modelFile, 'utf8'));
    expect('nauka/serwer: nowy model zapisany', model.type === 'multinomial-naive-bayes' && model.vocabulary.length > 500);
    expect('nauka/serwer: kopia poprzednich danych', readdirSync(join(dir, 'backups')).some((f) => f.startsWith('training-')));
  } finally {
    child.kill();
  }
}

if (failed === panelOk) console.log('panel, serwer panelu, kontrola strony, plik ustawień, nauka: OK');

if (failed) {
  console.log(`\nBŁĘDY: ${failed}`);
  process.exit(1);
}
console.log('\nWszystkie testy przeszły.');
