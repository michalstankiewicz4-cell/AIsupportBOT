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
import { INTENTS, PAGES, SITE_FACTS } from '../shared/js/knowledge.js';
import { setPanelConfig, matchRule } from '../panel/client.js';
import { sanitizeConfig, filterLogEntry, DEFAULT_CONFIG } from '../panel/schema.js';
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
  overrides: { skora: { text: 'Skóra → dermatolog.' }, fallback: { text: 'Nie wiem.' } },
});
r = await respond(botEngine, 'Czy pracujecie w SOBOTĘ?');
expect('reguła z frazą sobot* działa', r.intent === 'custom:sob' && r.source === 'custom', r);
expect('niebezpieczny link usunięty', r.links.length === 0, r.links);
expect('wyłączona reguła nie działa', !matchRule('gdzie jest parking'));
r = await respond(botEngine, 'boli mnie w klatce piersiowej w sobotę');
expect('stan nagły wygrywa z własną regułą', r.intent === 'emergency' && r.source === 'safety', r);
r = await respond(botEngine, 'mam wysypkę');
expect('nadpisanie tekstu działa (bot)', r.text.startsWith('Skóra → dermatolog.') && r.text.includes('konsultacja z lekarzem'), r.text);
r = await respond(trainedOffline, 'mam trądzik');
expect('nadpisanie tekstu działa (trained)', r.text.startsWith('Skóra → dermatolog.'), r.text);
r = await respond(botEngine, 'qwerty zxcv');
expect('nadpisanie „nie rozpoznano” działa', r.intent === 'fallback' && r.text === 'Nie wiem.', r);
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
expect('kontrola: wszystkie fakty sprawdzone', first.facts.length === SITE_FACTS.length && first.facts.every((f) => f.state === 'ok'), first.facts);
const second = await checkSite({ fetchImpl: fakeFetch('changed'), previous: first });
expect('kontrola: wykrywa link 404', second.links.some((l) => l.url.includes('/conditions/migrena') && l.level === 'error'), second.summary);
expect('kontrola: wykrywa brak sekcji #cennik', second.links.some((l) => l.url.endsWith('#cennik') && l.level === 'warn'));
expect('kontrola: wykrywa zmianę ceny', second.facts.find((f) => f.label.includes('259')).state === 'missing');
expect('kontrola: wykrywa zmianę treści', second.changes.some((c) => c.url === 'https://lekarzeiterapeuci.pl/'), second.changes);
expect('kontrola: wynik „wymaga uwagi”', second.ok === false);
const down = await checkSite({ fetchImpl: async () => { throw new TypeError('fetch failed'); } });
expect('kontrola: brak połączenia = jeden czytelny komunikat', down.summary.unreachable === true && down.ok === false, down.summary);

if (failed === panelOk) console.log('panel, serwer panelu, kontrola strony: OK');

if (failed) {
  console.log(`\nBŁĘDY: ${failed}`);
  process.exit(1);
}
console.log('\nWszystkie testy przeszły.');
