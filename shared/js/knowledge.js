// Baza wiedzy o lekarzeiterapeuci.pl — jedno źródło prawdy dla
// wszystkich trzech asystentów: usługi, ceny, linki, słowa kluczowe i przypadki A–M
// ze specyfikacji czatu (v1.0, 14.10.2026). Teksty odpowiedzi są w shared/js/texts.js. Gdy zmieni się strona (zakładki, ceny, telefon,
// usługi), poprawiaj tutaj, a nie w silnikach.
//
// Słowa kluczowe piszemy BEZ polskich znaków i małymi literami
// (patrz normalize() w shared/js/text.js). Gwiazdka "*" na końcu oznacza "początek słowa",
// np. "alergi*" pasuje do "alergia", "alergii", "alergiczny".

export const SITE = {
  name: 'Lekarze i Terapeuci',
  assistant: 'Ilona', // imię wirtualnej konsultantki widoczne w czacie i w prompcie AI
  assistantWith: 'Iloną', // to samo imię w narzędniku („rozmowa z Iloną”)
  base: 'https://lekarzeiterapeuci.pl',
  phone: '+48 881 238 227',
  phoneHref: 'tel:+48881238227',
  email: 'kontakt@lekarzeiterapeuci.pl',
  hours: 'pon–pt 8:00–20:00, sob–niedz 9:00–18:00',
};

import { TEXTS } from './texts.js';

const B = SITE.base;
const form = (service) =>
  service ? `${B}/wypelnij-formularz?service=${encodeURIComponent(service).replace(/%20/g, '+')}` : `${B}/wypelnij-formularz`;

// Zakładki / podstrony, do których asystent może kierować.
export const PAGES = {
  book: { label: 'Umów wizytę', url: form() },
  services: { label: 'Usługi', url: `${B}/#uslugi` },
  pricing: { label: 'Cennik', url: `${B}/#cennik` },
  how: { label: 'Jak to działa?', url: `${B}/jak-to-dziala` },
  womenMen: { label: 'Dla kobiet i mężczyzn', url: `${B}/dla-kobiet-i-mezczyzn` },
  conditions: { label: 'Choroby i stany', url: `${B}/conditions` },
  knowledge: { label: 'Baza wiedzy', url: `${B}/baza-wiedzy` },
  homeTests: { label: 'Badania w domu', url: `${B}/badania-w-domu` },
  doctors: { label: 'Dla lekarzy', url: `${B}/dla-lekarzy` },
  companies: { label: 'Dla firm', url: `${B}/dla-firm` },
  contact: { label: 'Kontakt', url: `${B}/#kontakt` },
  login: { label: 'Zaloguj się', url: `${B}/login` },
  terms: { label: 'Regulamin', url: `${B}/warunki-umowy` },
  privacy: { label: 'Polityka prywatności', url: `${B}/polityka-prywatnosci` },
  phone: { label: `Zadzwoń: ${SITE.phone}`, url: SITE.phoneHref },
};

// Fakty ze strony kliniki, które asystentka podaje w odpowiedziach. Kontrola strony
// (panel → „Kontrola strony”, npm run check-site) sprawdza, czy nadal są na stronie —
// jeśli którego brakuje, prawdopodobnie zmienił się cennik / telefon / godziny i trzeba
// poprawić odpowiedzi w tym pliku albo w panelu. Wzorce to wyrażenia regularne.
export const SITE_FACTS = [
  { label: 'Numer infolinii +48 881 238 227', url: B, pattern: '881[\\s-]*238[\\s-]*227' },
  { label: 'E-mail kontakt@lekarzeiterapeuci.pl', url: B, pattern: 'kontakt@lekarzeiterapeuci\\.pl' },
  { label: 'Godziny pon–pt 8:00–20:00', url: B, pattern: '8[:.]00\\s*[–-]\\s*20[:.]00' },
  { label: 'Godziny sob–niedz 9:00–18:00', url: B, pattern: '9[:.]00\\s*[–-]\\s*18[:.]00' },
  { label: 'Cena: e-recepta / kontynuacja od 59 zł', url: B, pattern: '59\\s*zł' },
  { label: 'Cena: L4 / wizyta / wyniki / skierowanie od 79 zł', url: B, pattern: '79\\s*zł' },
  { label: 'Cena: leczenie otyłości 129 zł', url: B, pattern: '129\\s*zł' },
  { label: 'Cena: psycholog 169 zł', url: B, pattern: '169\\s*zł' },
  { label: 'Cena: psychiatra 259 zł', url: B, pattern: '259\\s*zł' },
  { label: 'Cena: tabletka „dzień po” od 45 zł', url: `${B}/dla-kobiet-i-mezczyzn`, pattern: '45\\s*zł' },
  { label: 'Cena: TRT od 199 zł', url: `${B}/dla-kobiet-i-mezczyzn`, pattern: '199\\s*zł' },
];

// Zdanie zasady „najpierw lekarz” — jest już w tekstach C i D (texts.js); tu dla promptu AI i panelu.
export const DOCTOR_FIRST =
  'Nie oceniam objawów ani nie udzielam porad medycznych — najlepszą drogą jest zawsze konsultacja z lekarzem.';

// ---------------------------------------------------------------------------
// Usługi z formularza strony. Nazwy `service` sprawdzone na stronie 14.10.2026
// (linki „Umów konsultację” / „Zamów”). Ceny w JEDNYM miejscu (specyfikacja, pkt 8.12) —
// kontrola strony (SITE_FACTS) sprawdza, czy nadal zgadzają się ze stroną.
//   kind — kolor przycisku (specyfikacja, sekcja 4):
//     doctor  zielony   konsultacja lekarska
//     psych   fioletowy psychiatra, leki psychiatryczne
//     therapy morski    psycholog / terapeuta
//     paper   niebieski recepta, L4, wyniki, skierowania, kobiety/mężczyźni
//     info    szary     cennik, jak umówić, kontakt, informacje
//     alarm   czerwony  WYŁĄCZNIE 112
// ---------------------------------------------------------------------------
export const SERVICES = {
  wizyta: { label: 'Konsultacja lekarska', service: '', price: 'od 79 zł', priceName: 'Konsultacja lekarska (wizyta lekarska)', kind: 'doctor' },
  recepta: { label: 'e-Recepta online', service: 'e-Recepta online', price: 'od 59 zł', priceName: 'E-recepta online', kind: 'paper' },
  l4: { label: 'L4 online', service: 'L4 online', price: 'od 79 zł', priceName: 'L4 online', kind: 'paper' },
  wyniki: { label: 'Omówienie wyników badań', service: 'Omówienie wyników badań', price: 'od 79 zł', priceName: 'Omówienie wyników badań', kind: 'paper' },
  kontynuacja: { label: 'Kontynuacja leczenia', service: 'Kontynuacja leczenia', price: 'od 59 zł', priceName: 'Kontynuacja leczenia', kind: 'paper' },
  skierowanie: { label: 'Skierowanie', service: 'Skierowanie na badania', price: 'od 79 zł', priceName: 'Skierowanie', kind: 'paper' },
  dzien_po: { label: 'Tabletka „dzień po”', service: 'Tabletka dzień po', price: 'od 45 zł', priceName: 'Konsultacja „tabletka dzień po”', kind: 'paper' },
  antykoncepcja: { label: 'Antykoncepcja', service: 'Antykoncepcja', price: 'od 59 zł', priceName: 'Antykoncepcja', kind: 'paper' },
  trt: { label: 'TRT', service: 'TRT Testosteron', price: 'od 199 zł', priceName: 'TRT (terapia testosteronem)', kind: 'paper' },
  psychiatra: { label: 'Psychiatra online', service: 'Psychiatra Online', price: '259 zł', priceName: 'Konsultacja z psychiatrą online', kind: 'psych' },
  psycholog: { label: 'Psycholog / Terapeuta', service: 'Psycholog / Terapeuta', price: '169 zł', priceName: 'Konsultacja z psychologiem / terapeutą', kind: 'therapy' },
  leki_psych: { label: 'Leki psychiatryczne', service: 'Leki psychiatryczne', price: '', kind: 'psych' },
  otylosc: { label: 'Leczenie otyłości', service: 'Leczenie otyłości', price: '129 zł', priceName: 'Leczenie otyłości', kind: 'doctor' },
  dermatologia: { label: 'Dermatologia online', service: 'Dermatologia online', price: '', kind: 'doctor' },
  ginekologia: { label: 'Ginekologia online', service: 'Ginekologia online', price: '', kind: 'paper' },
  alergie: { label: 'Alergie i astma', service: 'Alergie i astma', price: '', kind: 'doctor' },
  zoladek: { label: 'Problemy żołądkowe', service: 'Problemy żołądkowe', price: '', kind: 'doctor' },
  serce: { label: 'Nadciśnienie i serce', service: 'Nadciśnienie i serce', price: '', kind: 'doctor' },
  infekcje: { label: 'Infekcje i przeziębienia', service: 'Infekcje i przeziębienia', price: '', kind: 'doctor' },
};

// 4 najczęstsze usługi do odpowiedzi J bez rozpoznanej usługi (specyfikacja, karta J).
const TOP_PRICES = ['wizyta', 'recepta', 'l4', 'psychiatra'];

export const BUTTON_KINDS = ['alarm', 'doctor', 'psych', 'therapy', 'paper', 'info'];

// --- Przyciski ----------------------------------------------------------------
// { label, url, kind, main? } — link; { label, ask, kind } — przycisk zadający pytanie w czacie.
// main = KAFELEK ZAKUPU (kolorowy kwadrat z ceną) — czat ma zawsze prowadzić do zakupu usługi
// (wytyczna klienta z 14.10.2026): każda odpowiedź pokazuje od razu kafelki usług.
// Pozostałe przyciski (informacje, cennik) są małe i obrysowane.
const link = (label, url, kind = 'info', main = false) => (main ? { label, url, kind, main: true } : { label, url, kind });
const ask = (label, question, kind = 'info') => ({ label, ask: question, kind });
const page = (key, label, main = false) => link(label || PAGES[key].label, PAGES[key].url, 'info', main);
const cond = (label, slug) => link(label, `${B}/conditions/${slug}`, 'info');
function svc(id, { main = false, price = true, label } = {}) {
  const s = SERVICES[id];
  const text = label || (price && s.price ? `${s.label} · ${s.price}` : s.label);
  return link(text, form(s.service), s.kind, main);
}

export const CALL_112 = link('Zadzwoń 112 →', 'tel:112', 'alarm', true);
// Kafelki zakupu.
const BOOK_DOCTOR = (label = 'Konsultacja lekarska') => link(`${label} · ${SERVICES.wizyta.price}`, form(), 'doctor', true);
const BOOK_GENERAL = () => link(`Konsultacja ogólna · ${SERVICES.wizyta.price}`, form(), 'doctor', true);
const BUY = (id) => svc(id, { main: true });
// Same kafelki (bez małych przycisków) — do łączenia.
const tiles = (...ids) => ids.map((id) => (id === 'wizyta' ? BOOK_DOCTOR() : BUY(id)));

// D — dolegliwość: 1) konsultacja lekarska (usługa specjalisty, jeśli jest — np. Dermatologia online),
// 2) recepta, 3) konsultacja ogólna; dodatkowo małe: wyniki, skierowanie, informacje.
const D_BUTTONS = (intent) => {
  const s = intent?.service && intent.service !== 'wizyta' && SERVICES[intent.service]?.service ? intent.service : null;
  const first = s && SERVICES[s].kind !== 'paper' ? BUY(s) : BOOK_DOCTOR();
  return [
    first,
    BUY('recepta'),
    BOOK_GENERAL(),
    svc('wyniki', { price: false, label: 'Omówienie wyników badań' }),
    svc('skierowanie', { price: false, label: 'Skierowanie na badania' }),
  ];
};
const L_BUTTONS = () => [BOOK_DOCTOR(), ask('Jaki specjalista?', 'Jaki specjalista?'), ask('Jak umówić wizytę?', 'Jak umówić wizytę?'), page('pricing', 'Cennik')];
// M — 6 szybkich kafelków na starcie czatu (konsultacja = zakup, pozostałe zadają pytanie).
export const M_BUTTONS = () => [
  BOOK_DOCTOR(),
  { ...ask(`Recepta · ${SERVICES.recepta.price}`, 'Recepta', 'paper'), main: true },
  { ...ask(`L4 · ${SERVICES.l4.price}`, 'L4', 'paper'), main: true },
  { ...ask(`Wyniki badań · ${SERVICES.wyniki.price}`, 'Wyniki badań', 'paper'), main: true },
  { ...ask(`Psychiatra / Psycholog · od ${SERVICES.psycholog.price}`, 'Psychiatra / Psycholog', 'psych'), main: true },
  { ...ask('Cennik', 'Cennik'), main: true },
];
const C_BUTTONS = (first) => {
  const both = [BUY('psychiatra'), BUY('psycholog')];
  if (first === 'psycholog') both.reverse();
  return [...both, BUY('leki_psych'), cond('Depresja i lęk — informacje', 'depresja-i-zaburzenia-lekowe'), svc('wizyta', { price: false })];
};
const H_BUTTONS = (first) => {
  const ids = ['dzien_po', 'antykoncepcja', 'trt'];
  const order = first === 'ginekologia' ? ['ginekologia', ...ids] : [first, ...ids.filter((i) => i !== first)];
  return order.map((id) => BUY(id));
};

// ---------------------------------------------------------------------------
// Tematy (intencje). Każdy temat należy do przypadku A–M ze specyfikacji:
//   id        — stały identyfikator (model trained, testy, rejestr rozmów)
//   case      — przypadek ze specyfikacji (C, D, E, F, G, H, I, J, K, L, M)
//   text      — klucz tekstu w shared/js/texts.js
//   keywords  — słowa kluczowe bota (bez polskich znaków; "*" = początek słowa)
//   buttons   — przyciski pod odpowiedzią
//   service   — usługa tematu (cena w J, przycisk w I)
//   routing   — temat medyczny (do kogo kierować)
// Słowniki to startowa lista ze specyfikacji — rozbudowywać na podstawie rejestru rozmów.
// ---------------------------------------------------------------------------

const KEYWORDS_ZDROWIE = [
  'bol', 'bul', 'bola', 'boli', 'bolal*', 'bolec', 'bolesn*', 'bolow', 'bolu', 'bolem', 'chory', 'chora', 'chore', 'chorzy', 'choroba', 'chorob*', 'choruj*', 'objaw*',
  'zle sie czuje', 'slabo mi', 'oslabien*', 'oslabion*', 'zawrot*', 'krec* mi sie', 'goraczk*', 'temperatur*', 'dreszcz*', 'wymiot*', 'nudnos*', 'mdli', 'mdlosc*',
  'puchn*', 'spuchn*', 'opuchl*', 'obrzek*', 'swedz*', 'piecze', 'kluje', 'klucie', 'dretw*', 'mrowi*', 'krwawi*', 'uraz*', 'zlaman*', 'skrecon*', 'skrecil*', 'stluczon*',
  'rana', 'rany', 'oparzen*', 'zapalen*', 'dolegliwo*', 'zdrow*', 'cialo', 'ciala', 'lekarz*', 'leczen*', 'przeziebi*',
  'noga', 'nogi', 'noge', 'nodze', 'nog', 'reka', 'reki', 'reke', 'rece', 'dlon*', 'ramie', 'ramien*', 'bark*', 'szyj*', 'kark*', 'plecy', 'plecow', 'plecach',
  'kregoslup*', 'kolan*', 'biodr*', 'stopa', 'stopy', 'stope', 'stopie', 'kostk*', 'palec', 'palca', 'palce', 'palcach', 'klatk*', 'zebr*', 'brzuch*', 'glowa', 'glowy', 'glowe', 'glowie',
  'gardlo', 'gardla', 'gardle', 'ucho', 'ucha', 'uszy', 'uszu', 'oko', 'oka', 'oczy', 'oczu', 'nos', 'nosa', 'zab', 'zeby', 'zeba', 'serce', 'serca', 'pluc*', 'watrob*', 'nerk*', 'skora', 'skory', 'skorze',
];

export const INTENTS = [
  // --- C: zdrowie psychiczne --------------------------------------------------
  {
    id: 'psychiatra', case: 'C', text: 'C', routing: true, service: 'psychiatra',
    keywords: ['depresj*', 'mam lek', 'czuje lek', 'napady leku', 'atak leku', 'ataki leku', 'boje sie', 'strach*', 'lekam sie', 'lekowe', 'lekowy', 'lekowa', 'lekam', 'panik*', 'psychiatr*', 'psychiczn*', 'antydepres*', 'nerwic*', 'adhd', 'zaburzen*', 'smutek', 'smutn*', 'apati*', 'obnizony nastroj', 'nastroj*', 'obsesj*', 'natrectw*', 'chad', 'dwubiegunow*'],
    buttons: () => C_BUTTONS('psychiatra'),
  },
  {
    id: 'psycholog', case: 'C', text: 'C', routing: true, service: 'psycholog',
    keywords: ['psycholog*', 'terapeut*', 'terapi*', 'psychoterap*', 'stres*', 'wypalen*', 'rozstan*', 'zaloba', 'samotn*', 'porozmawiac z kims', 'kryzys', 'relacj*', 'zwiazek', 'zwiazku', 'wsparci*'],
    buttons: () => C_BUTTONS('psycholog'),
  },
  {
    id: 'bezsennosc', case: 'C', text: 'C', routing: true, service: 'psychiatra',
    keywords: ['bezsenn*', 'spac', 'sen', 'snu', 'zasnac', 'zasypia*', 'budze', 'wybudza*', 'nasenn*'],
    buttons: () => [...C_BUTTONS('psychiatra').slice(0, 2), cond('Bezsenność — informacje', 'bezsennosc'), svc('wizyta', { price: false })],
  },

  // --- F: L4 --------------------------------------------------------------------
  {
    id: 'l4', case: 'F', text: 'F', routing: true, service: 'l4', title: () => `L4 online · ${SERVICES.l4.price}`,
    keywords: ['l4', 'zwolnien*', 'chorobow*', 'zus', 'nie moge isc do pracy'],
    buttons: () => [...tiles('l4', 'wizyta', 'recepta'), page('pricing', 'Cennik')],
  },

  // --- E: recepta ---------------------------------------------------------------
  {
    id: 'recepta', case: 'E', text: 'E', routing: true, service: 'recepta', title: () => `e-Recepta online · ${SERVICES.recepta.price}`,
    keywords: ['recept*', 'erecept*', 'e recept*', 'przepisa*', 'wypisa*'],
    buttons: () => [...tiles('recepta', 'kontynuacja', 'wizyta'), page('pricing', 'Cennik')],
  },
  {
    id: 'kontynuacja', case: 'E', text: 'E', routing: true, service: 'kontynuacja', title: () => `Kontynuacja leczenia · ${SERVICES.kontynuacja.price}`,
    keywords: ['kontynuac*', 'przedluz*', 'stale leki', 'leki na stale', 'skonczyly', 'koncza mi sie', 'koncza sie'],
    buttons: () => [...tiles('kontynuacja', 'recepta', 'wizyta'), page('pricing', 'Cennik')],
  },

  // --- G: wyniki badań i skierowania -------------------------------------------
  {
    id: 'wyniki', case: 'G', text: 'G', routing: true, service: 'wyniki',
    keywords: ['wynik*', 'morfologi*', 'badani* krwi', 'badan*', 'analiz*', 'interpret*'],
    buttons: () => [...tiles('wyniki', 'skierowanie', 'wizyta'), page('homeTests')],
  },
  {
    id: 'skierowanie', case: 'G', text: 'G', routing: true, service: 'skierowanie',
    keywords: ['skierowan*'],
    buttons: () => [...tiles('skierowanie', 'wyniki', 'wizyta'), page('homeTests')],
  },
  {
    id: 'badania_dom', case: 'G', text: 'G', routing: false, service: 'wyniki',
    keywords: ['badania w domu', 'badan w domu', 'pobranie krwi', 'pielegniar*', 'dojazd*'],
    buttons: () => [...tiles('wyniki', 'skierowanie', 'wizyta'), page('homeTests')],
  },

  // --- H: kobiety i mężczyźni ---------------------------------------------------
  {
    id: 'dzien_po', case: 'H', text: 'H', routing: true, service: 'dzien_po',
    keywords: ['dzien po', 'dniu po', 'antykoncepcja awaryjna', 'awaryjn*', 'ellaone', 'escapelle', 'peklo*', 'pekla'],
    buttons: () => H_BUTTONS('dzien_po'),
  },
  {
    id: 'antykoncepcja', case: 'H', text: 'H', routing: true, service: 'antykoncepcja',
    keywords: ['antykoncep*', 'tabletki antykoncepcyjne', 'pigulk*', 'plastr*', 'krazek'],
    buttons: () => H_BUTTONS('antykoncepcja'),
  },
  {
    id: 'trt', case: 'H', text: 'H', routing: true, service: 'trt',
    keywords: ['testosteron*', 'trt', 'androlog*', 'libido', 'potencj*', 'erekcj*'],
    buttons: () => H_BUTTONS('trt'),
  },
  {
    id: 'ginekologia', case: 'H', text: 'H', routing: true, service: 'ginekologia',
    keywords: ['ginekolog*', 'okres', 'miesiaczk*', 'menstruac*', 'ciaz*', 'menopauz*', 'uplaw*', 'pochw*', 'infekcja intymna'],
    buttons: () => H_BUTTONS('ginekologia'),
  },

  // --- D: dolegliwości (domyślnie konsultacja lekarska + specjalista jako dodatek) ---
  { id: 'skora', case: 'D', text: 'D', routing: true, service: 'dermatologia',
    keywords: ['skora', 'skory', 'skorze', 'skore', 'skorn*', 'tradzik*', 'wysypk*', 'pryszcz*', 'dermatolog*', 'luszczyc*', 'egzem*', 'atopow*', 'swedz*', 'swiad', 'swiadu', 'znamie', 'pieprzyk*', 'wlos*', 'paznok*'],
    extras: () => [svc('dermatologia'), cond('Trądzik — informacje', 'tradzik')] },
  { id: 'alergia', case: 'D', text: 'D', routing: true, service: 'alergie',
    keywords: ['alergi*', 'uczulen*', 'astm*', 'katar sienny', 'pylk*', 'inhalator*', 'wziewn*', 'antyhistamin*'],
    extras: () => [svc('alergie'), cond('Alergia — informacje', 'alergia')] },
  { id: 'infekcja', case: 'D', text: 'D', routing: true, service: 'infekcje',
    keywords: ['infekcj*', 'przezie*', 'gryp*', 'goraczk*', 'kaszel', 'kaszl*', 'katar', 'gardl*', 'zatok*', 'covid', 'antybiotyk*', 'temperatur*'],
    extras: () => [svc('infekcje')] },
  { id: 'zoladek', case: 'D', text: 'D', routing: true, service: 'zoladek',
    keywords: ['zoladk*', 'zgag*', 'refluks*', 'brzuch*', 'jelit*', 'biegunk*', 'zapar*', 'wzdec*', 'nudnosc*', 'trawien*', 'gastrolog*'],
    extras: () => [svc('zoladek'), cond('Refluks — informacje', 'refluks-zoladkowo-przelykowy')] },
  { id: 'serce', case: 'D', text: 'D', routing: true, service: 'serce',
    keywords: ['nadcisnien*', 'cisnieni*', 'serc*', 'kardiolog*', 'kolatan*', 'arytmi*', 'tetno', 'cholesterol*'],
    extras: () => [svc('serce'), cond('Nadciśnienie — informacje', 'nadcisnienie-tetnicze')] },
  { id: 'otylosc', case: 'D', text: 'D', routing: true, service: 'otylosc',
    keywords: ['otylo*', 'nadwag*', 'schudn*', 'odchudz*', 'wag*', 'kilogram*', 'bmi', 'ozempic', 'wegovy', 'mounjaro', 'saxenda', 'apetyt'],
    extras: () => [svc('otylosc'), cond('Otyłość — informacje', 'otylosc')] },
  { id: 'migrena', case: 'D', text: 'D', routing: true, service: 'wizyta',
    keywords: ['migren*', 'glowa', 'glowy', 'glowe', 'glowie', 'neurolog*', 'aura'],
    extras: () => [cond('Migrena — informacje', 'migrena')] },
  { id: 'tarczyca', case: 'D', text: 'D', routing: true, service: 'wyniki',
    keywords: ['tarczyc*', 'hashimoto', 'tsh', 'euthyrox', 'letrox', 'endokrynolog*', 'hormon*'],
    extras: () => [cond('Tarczyca — informacje', 'niedoczynnosc-tarczycy')] },
  { id: 'cukrzyca', case: 'D', text: 'D', routing: true, service: 'wizyta',
    keywords: ['cukrzyc*', 'cukier', 'cukru', 'glukoz*', 'insulin*', 'metformin*', 'glikem*'],
    extras: () => [cond('Cukrzyca — informacje', 'cukrzyca')] },
  { id: 'uklad_moczowy', case: 'D', text: 'D', routing: true, service: 'wizyta',
    keywords: ['pecherz*', 'mocz*', 'sikan*', 'pieczen*', 'cystit*', 'urolog*', 'nerk*'],
    extras: () => [cond('Układ moczowy — informacje', 'zakazenie-ukladu-moczowego')] },
  { id: 'inny_specjalista', case: 'D', text: 'D', routing: true, service: 'wizyta',
    keywords: ['laryngolog*', 'okulist*', 'pediatr*', 'ortoped*', 'stomatolog*', 'dentyst*', 'reumatolog*', 'onkolog*', 'chirurg*', 'ucho', 'uszu', 'ucha', 'oko', 'oczy', 'oczu', 'wzrok*', 'zab', 'zeby', 'zeba', 'kregoslup*', 'kolano', 'kolana', 'staw*', 'plecy', 'plecow'],
    extras: () => [] },
  // Słownik zdrowia (specyfikacja, pkt 9: SLOWNIK_ZDROWIE) — każda dolegliwość bez konkretnego tematu.
  { id: 'zdrowie', case: 'D', text: 'D', routing: true, service: 'wizyta', weight: 0.5, keywords: KEYWORDS_ZDROWIE, extras: () => [] },

  // --- I: dawka leku / opinia -----------------------------------------------------
  {
    id: 'opinia', case: 'I', text: 'I',
    keywords: ['dawk*', 'dawkowan*', 'ile tabletek', 'ile brac', 'jak brac', 'ile mg', 'miligram*', 'czy moge wziac', 'czy moge brac', 'czy moge laczyc', 'mozna laczyc', 'czy to rak', 'czy to grozne', 'czy to powazne', 'diagnoz*', 'co mi jest', 'co to moze byc', 'skutki uboczne', 'co mam brac', 'jaki lek', 'jakie leki', 'ibuprofen*', 'paracetamol*', 'apap*', 'ketonal*', 'aspiryn*', 'pyralgin*', 'nurofen*'],
    buttons: (ctx) => [BOOK_DOCTOR(), ...(ctx.topic && ctx.topic !== 'zdrowie' ? topicButton(ctx.topic) : []), BUY('recepta')],
  },

  // --- J: cennik (przyciski i tekst budowane dynamicznie) ----------------------------
  {
    id: 'cennik', case: 'J', text: 'J',
    keywords: ['cena', 'ceny', 'cenie', 'cenach', 'cennik*', 'koszt*', 'kosztuj*', 'ile placi*', 'ile zaplac*', 'zaplac*', 'platnosc*', 'oplat*', 'zl', 'zlotych', 'nfz', 'refundac*', 'darmow*'],
  },

  // --- K: jak umówić / jaki specjalista / kontakt -------------------------------------
  {
    id: 'umow', case: 'K', text: 'K', weight: 0.8,
    keywords: ['umow*', 'zapis*', 'rezerw*', 'termin*', 'wizyt*', 'konsultacj*', 'zamow*', 'formularz*'],
    buttons: () => [...tiles('wizyta', 'recepta', 'l4'), ask('Jaki specjalista?', 'Jaki specjalista?'), page('pricing', 'Cennik'), page('contact', 'Kontakt')],
  },
  {
    id: 'jak_dziala', case: 'K', text: 'K',
    keywords: ['jak to dziala', 'jak dziala', 'jak wyglada', 'przebieg*', 'wideo', 'oddzwani*', 'ile trwa', 'bezpieczn*', 'legaln*'],
    buttons: () => [...tiles('wizyta', 'recepta', 'l4'), ask('Jaki specjalista?', 'Jaki specjalista?'), page('how'), page('contact', 'Kontakt')],
  },
  {
    id: 'jaki_specjalista', case: 'K', text: 'K_SPECJALISTA',
    keywords: ['jakiego lekarza', 'jaki lekarz', 'jaki specjalist*', 'jakiego specjalist*', 'do kogo', 'ktory lekarz', 'ktorego lekarza', 'specjalist*', 'lekarz rodzinny', 'internist*'],
    buttons: () => [BOOK_DOCTOR('Lekarz'), svc('psychiatra', { main: true, label: `Psychiatra · ${SERVICES.psychiatra.price}` }), BUY('psycholog')],
  },
  {
    id: 'kontakt', case: 'K', text: 'K_KONTAKT',
    keywords: ['kontakt*', 'telefon*', 'infolini*', 'numer', 'mail*', 'email', 'godzin*', 'otwar*', 'czynne', 'zadzwon*', 'adres', 'napisz do nas'],
    buttons: () => [BOOK_DOCTOR(), page('phone'), page('contact')],
  },
  {
    id: 'dla_lekarzy', case: 'K', text: 'K_DLA_LEKARZY',
    keywords: ['praca', 'pracy', 'zatrudn*', 'wspolprac*', 'jestem lekarzem', 'dla lekarzy', 'rekrutac*'],
    buttons: () => [BOOK_DOCTOR(), page('doctors'), page('companies')],
  },
  {
    id: 'konto', case: 'K', text: 'K_KONTO',
    keywords: ['logow*', 'zaloguj*', 'konto', 'konta', 'haslo', 'hasla', 'rejestrac*', 'profil'],
    buttons: () => [BOOK_DOCTOR(), page('login'), page('phone')],
  },
  {
    id: 'prawne', case: 'K', text: 'K_PRAWNE',
    keywords: ['regulamin*', 'rodo', 'prywatnosc*', 'cookies', 'dane osobowe', 'reklamac*', 'zwrot*', 'faktur*'],
    buttons: () => [BOOK_DOCTOR(), page('terms'), page('privacy'), page('phone')],
  },

  // --- M: powitanie / podziękowanie -----------------------------------------------------
  {
    id: 'powitanie', case: 'M', text: 'M',
    keywords: ['dzien dobry', 'witam', 'czesc', 'hej', 'siema', 'halo', 'dobry wieczor', 'kim jestes', 'start'],
    buttons: () => M_BUTTONS(),
  },
  {
    id: 'podziekowanie', case: 'M', text: 'M_DZIEKUJE',
    keywords: ['dziekuj*', 'dzieki', 'thx', 'super', 'ok dzieki'],
    buttons: () => [BOOK_DOCTOR()],
  },

  // --- L: poza tematem (pogoda, polityka…) — ta sama odpowiedź co przy niejasnym pytaniu ---
  {
    id: 'offtopic', case: 'L', text: 'L',
    keywords: ['polityk*', 'wybor*', 'rzad*', 'prezydent*', 'premier*', 'sejm*', 'partia', 'partii', 'pogod*', 'deszcz*', 'mecz*', 'pilk*', 'sport*', 'przepis na', 'film*', 'serial*', 'zart*', 'dowcip*', 'bitcoin*', 'krypto*', 'gielda', 'programowa*', 'javascript', 'python', 'wiersz*', 'piosenk*', 'gra', 'gry', 'horoskop*', 'pizza', 'wojna', 'wojn*', 'dzien wolny', 'swieto'],
    buttons: () => L_BUTTONS(),
  },
];

export const INTENT_BY_ID = Object.fromEntries(INTENTS.map((i) => [i.id, i]));

// Kolejność sprawdzania przypadków (specyfikacja, sekcja 5 i 9). A i B sprawdza wcześniej
// shared/js/safety.js, tryb kryzysowy — shared/js/pipeline.js. Odstępstwa od tabeli
// w specyfikacji (opisane w docs/PLAN-ILONA.md):
//   - J (cena) przed tematami — „ile kosztuje psychiatra” ma dostać cenę (test 27), a nie kartę C;
//   - M po D — „dzień dobry, boli mnie kręgosłup” to dolegliwość, a nie powitanie.
export const CASE_ORDER = ['I', 'J', 'C', 'F', 'E', 'G', 'H', 'K', 'D', 'M', 'L'];

// --- Nadpisania z panelu sterowania -------------------------------------------
// Panel („Odpowiedzi wbudowane”) zmienia teksty z shared/js/texts.js (klucz = klucz tekstu,
// np. "D") i opcjonalnie przyciski. Teksty alarmowe (locked) nie są do nadpisania.
let OVERRIDES = {};

export function setAnswerOverrides(map) {
  OVERRIDES = map && typeof map === 'object' ? map : {};
}

function fill(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => {
    const v = {
      telefon: SITE.phone,
      godziny: SITE.hours,
      email: SITE.email,
      asystentka: SITE.assistant,
      ...vars,
    }[k];
    return v === undefined ? m : v;
  });
}

// Tekst z uwzględnieniem nadpisania z panelu (bez nadpisań dla tekstów alarmowych).
export function textOf(key, vars, { withOverrides = true } = {}) {
  const t = TEXTS[key];
  if (!t) return '';
  const o = withOverrides && !t.locked ? OVERRIDES[key] : null;
  return fill(o?.text || t.text, vars).replace(/\s+/g, ' ').trim();
}

function linksOf(key, built, withOverrides) {
  const o = withOverrides && !TEXTS[key]?.locked ? OVERRIDES[key] : null;
  return Array.isArray(o?.links) ? o.links.map((l, i) => ({ kind: 'info', ...l, ...(i === 0 ? { main: true } : {}) })) : built;
}

// Przycisk usługi tematu (np. „Dermatologia online”) — do I i J.
function topicButton(topicId) {
  const s = INTENT_BY_ID[topicId]?.service;
  return s && s !== 'wizyta' ? [svc(s, { main: true })] : [];
}

const priceSentence = (id) => `${SERVICES[id].priceName} kosztuje ${SERVICES[id].price}.`;

/**
 * Odpowiedź dla tematu (id intencji) według przypadku A–M.
 * @param {string|null} intentId  null = nic nie rozpoznano (L)
 * @param {object} [ctx]          { topic } — temat medyczny wspomniany obok (I, J)
 * @returns {{ text, links, case, intent, title? }}
 */
export function replyFor(intentId, ctx = {}, { withOverrides = true } = {}) {
  const intent = INTENT_BY_ID[intentId];
  if (!intent) {
    return { text: textOf('L', {}, { withOverrides }), links: linksOf('L', L_BUTTONS(), withOverrides), chips: [], case: 'L', intent: 'fallback' };
  }

  // J — cena: rozpoznana usługa z ceną albo 4 najczęstsze.
  if (intent.case === 'J') {
    const svcId = INTENT_BY_ID[ctx.topic]?.service;
    const priced = svcId && SERVICES[svcId]?.price ? svcId : null;
    const text = priced
      ? textOf('J', { cena: priceSentence(priced) }, { withOverrides })
      : textOf('J_OGOLNY', { ceny: TOP_PRICES.map((id) => `${SERVICES[id].priceName.toLowerCase()} ${SERVICES[id].price}`).join(', ') }, { withOverrides });
    const key = priced ? 'J' : 'J_OGOLNY';
    const buy = priced ? [BUY(priced), ...tiles(...TOP_PRICES.filter((id) => id !== priced).slice(0, 2))] : tiles(...TOP_PRICES);
    return { text, links: linksOf(key, [...buy, page('pricing', 'Zobacz cennik')], withOverrides), chips: [], case: 'J', intent: priced ? `cennik+${ctx.topic}` : 'cennik' };
  }

  let built;
  if (intent.case === 'D') built = [...D_BUTTONS(intent), ...(intent.extras ? intent.extras().filter((l) => !l.url?.includes('service=')) : [])];
  else built = intent.buttons ? intent.buttons(ctx) : [];

  const reply = {
    text: textOf(intent.text, {}, { withOverrides }),
    links: linksOf(intent.text, built, withOverrides),
    chips: [],
    case: intent.case,
    intent: intent.case === 'I' && ctx.topic ? `opinia+${ctx.topic}` : intent.id,
  };
  if (intent.title) reply.title = intent.title();
  return reply;
}

// Odpowiedź L (nic nie rozpoznano) — używana przez pipeline przy pustej wiadomości / błędzie.
export const FALLBACK_REPLY = { text: TEXTS.L.text, links: L_BUTTONS(), chips: [], case: 'L' };
// Dla serwera AI: odpowiedź na pytania nie na temat (przypadek L).
export const OFFTOPIC_REPLY = FALLBACK_REPLY;

// Teksty i przyciski alarmowe (A, B) — używa ich shared/js/safety.js.
export function alarmReply(kind, { closePerson = false, supportLine = false } = {}) {
  const card = { text: TEXTS.ALARM.text, links: [CALL_112], emergency: true, title: 'komunikat alarmowy' };
  if (kind === 'A') {
    return { ...card, case: 'A', intent: 'emergency', followup: { text: TEXTS.A2.text, links: [BOOK_DOCTOR('Umów konsultację lekarską')] } };
  }
  return { ...card, case: 'B', intent: 'crisis', followup: crisisFollowup({ closePerson, supportLine }) };
}

export function crisisFollowup({ closePerson = false, supportLine = false } = {}) {
  const text = (closePerson ? TEXTS.B2_BLISKI.text : TEXTS.B2.text) + (supportLine ? ` ${TEXTS.B_WSPARCIE.text}` : '');
  return { text, links: [CALL_112, svc('psychiatra', { price: false }), svc('psycholog', { price: false })] };
}

// Domyślna odpowiedź dla klucza tekstu (panel pokazuje ją obok pola do edycji).
export function defaultAnswer(key) {
  const t = TEXTS[key];
  if (!t) return null;
  const sample = INTENTS.find((i) => i.text === key);
  const links = sample ? replyFor(sample.id, {}, { withOverrides: false }).links : key === 'L' ? L_BUTTONS() : [];
  return { text: fill(t.text), links, case: t.case, label: t.label, locked: Boolean(t.locked) };
}

// Domyślne odpowiedzi tematów (bez nadpisań) — dla kontroli strony i promptu AI.
for (const i of INTENTS) {
  Object.defineProperty(i, 'answer', { get: () => replyFor(i.id, {}, { withOverrides: false }), enumerable: false });
}

// Zwięzły tekstowy opis strony wstawiany do promptu modelu (wariant ai).
export function knowledgeAsText() {
  const lines = [];
  lines.push(`Serwis: ${SITE.name} (${SITE.base}) — konsultacje lekarskie i terapeutyczne online (telefon/wideo).`);
  lines.push(`Infolinia: ${SITE.phone}, ${SITE.hours}. E-mail: ${SITE.email}.`);
  lines.push('Zakładki strony:');
  for (const p of Object.values(PAGES)) if (!p.url.startsWith('tel:')) lines.push(`- ${p.label}: ${p.url}`);
  lines.push('Usługi i ceny:');
  for (const s of Object.values(SERVICES)) lines.push(`- ${s.label}${s.price ? ` (${s.price})` : ''}: ${form(s.service)}`);
  lines.push('Tematy i gotowe odpowiedzi:');
  for (const i of INTENTS) {
    if (!i.routing && !['jak_dziala', 'badania_dom'].includes(i.id)) continue;
    const a = i.answer;
    const links = a.links.filter((l) => l.url && !l.url.startsWith('tel:')).map((l) => `${l.label} <${l.url}>`).join('; ');
    lines.push(`- [${i.id}] ${a.text} Linki: ${links}`);
  }
  return lines.join('\n');
}
