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
  'Nie oceniam objawów ani nie udzielam porad medycznych — robi to lekarz, dlatego najlepszym krokiem jest konsultacja online.';

// ---------------------------------------------------------------------------
// USŁUGI — domyślne wartości ze specyfikacji czatu v1.1 (sekcja 4 i 7).
// Wszystko poniżej (nazwa, cena, kolor, obrys, nazwa usługi w formularzu) można zmienić
// w panelu: zakładka „Usługi i przyciski” — bez programisty. Tu są tylko wartości domyślne.
//   service — nazwa usługi w formularzu (?service=…), sprawdzona na stronie 14.10.2026
//   color   — kolor przycisku; outline = sam obrys (wariant / uzupełnienie tej samej grupy)
//   priceName — początek zdania z ceną w odpowiedzi J („… kosztuje 259 zł.”)
// ---------------------------------------------------------------------------
export const SERVICES = {
  wizyta: { label: 'Konsultacja lekarska', service: '', price: 'od 79 zł', priceName: 'Konsultacja lekarska (wizyta lekarska)', color: '#2F7D5A' },
  wyniki: { label: 'Omówienie wyników badań', service: 'Omówienie wyników badań', price: 'od 79 zł', priceName: 'Omówienie wyników badań', color: '#3558C9' },
  skierowanie: { label: 'Skierowanie na badania', service: 'Skierowanie na badania', price: 'od 79 zł', priceName: 'Skierowanie', color: '#D98A1F' },
  recepta: { label: 'e-Recepta online', service: 'e-Recepta online', price: 'od 59 zł', priceName: 'E-recepta online', color: '#B8468B' },
  kontynuacja: { label: 'Kontynuacja leczenia', service: 'Kontynuacja leczenia', price: 'od 59 zł', priceName: 'Kontynuacja leczenia', color: '#B8468B', outline: true },
  l4: { label: 'L4 online', service: 'L4 online', price: 'od 79 zł', priceName: 'L4 online', color: '#1B8FB5' },
  dzien_po: { label: 'Tabletka „dzień po”', service: 'Tabletka dzień po', price: 'od 45 zł', priceName: 'Konsultacja „tabletka dzień po”', color: '#E0702B' },
  antykoncepcja: { label: 'Antykoncepcja', service: 'Antykoncepcja', price: 'od 59 zł', priceName: 'Antykoncepcja', color: '#8E3F9E' },
  trt: { label: 'TRT', service: 'TRT Testosteron', price: 'od 199 zł', priceName: 'TRT (terapia testosteronem)', color: '#44546A' },
  otylosc: { label: 'Leczenie otyłości', service: 'Leczenie otyłości', price: '129 zł', priceName: 'Leczenie otyłości', color: '#7D8F2A' },
  psychiatra: { label: 'Psychiatra online', service: 'Psychiatra Online', price: '259 zł', priceName: 'Konsultacja z psychiatrą online', color: '#6A4FD6' },
  leki_psych: { label: 'Leki psychiatryczne', service: 'Leki psychiatryczne', price: '', priceName: 'Leki psychiatryczne', color: '#6A4FD6', outline: true },
  psycholog: { label: 'Psycholog', service: 'Psycholog / Terapeuta', price: '169 zł', priceName: 'Konsultacja z psychologiem / terapeutą', color: '#2F8478' },
  terapeuta: { label: 'Terapeuta', service: 'Psycholog / Terapeuta', price: '169 zł', priceName: 'Konsultacja z terapeutą', color: '#2F8478', outline: true },
  dermatologia: { label: 'Dermatologia online', service: 'Dermatologia online', price: '', priceName: 'Dermatologia online', color: '#5F6B7A', outline: true },
  ginekologia: { label: 'Ginekologia online', service: 'Ginekologia online', price: '', priceName: 'Ginekologia online', color: '#5F6B7A', outline: true },
  alergie: { label: 'Alergie i astma', service: 'Alergie i astma', price: '', priceName: 'Alergie i astma', color: '#5F6B7A', outline: true },
  zoladek: { label: 'Problemy żołądkowe', service: 'Problemy żołądkowe', price: '', priceName: 'Problemy żołądkowe', color: '#5F6B7A', outline: true },
  serce: { label: 'Nadciśnienie i serce', service: 'Nadciśnienie i serce', price: '', priceName: 'Nadciśnienie i serce', color: '#5F6B7A', outline: true },
  infekcje: { label: 'Infekcje i przeziębienia', service: 'Infekcje i przeziębienia', price: '', priceName: 'Infekcje i przeziębienia', color: '#5F6B7A', outline: true },
};

// Kolory stałe: czerwony — WYŁĄCZNIE alarm i 112; szary — informacje (cennik, kontakt…).
export const ALARM_COLOR = '#C0392B';
export const INFO_COLOR = '#5F6B7A';

// ---------------------------------------------------------------------------
// KATALOG PRZYCISKÓW — z tych identyfikatorów układa się przyciski pod odpowiedziami
// (domyślnie CASE_BUTTONS niżej, zmiana w panelu → „Usługi i przyciski”).
//   svc   — usługa (kafelek w kolorze usługi, z ceną) — prowadzi prosto do formularza
//   page  — mały szary link do zakładki strony
//   ask   — mały przycisk, który zadaje pytanie w czacie
// ---------------------------------------------------------------------------
const cond = (slug) => `${B}/conditions/${slug}`;
export const BUTTONS = {
  wizyta: { svc: 'wizyta' },
  wizyta_umow: { svc: 'wizyta', label: 'Umów konsultację lekarską' },
  umow_wizyte: { svc: 'wizyta', label: 'Umów wizytę', outline: true, price: false },
  lekarz: { svc: 'wizyta', label: 'Lekarz' },
  wyniki: { svc: 'wyniki' },
  skierowanie: { svc: 'skierowanie' },
  recepta: { svc: 'recepta' },
  kontynuacja: { svc: 'kontynuacja' },
  l4: { svc: 'l4' },
  l4_umow: { svc: 'l4', label: 'Umów konsultację — L4 online' },
  dzien_po: { svc: 'dzien_po' },
  antykoncepcja: { svc: 'antykoncepcja' },
  trt: { svc: 'trt' },
  otylosc: { svc: 'otylosc' },
  psychiatra: { svc: 'psychiatra' },
  psycholog: { svc: 'psycholog' },
  psycholog_terapeuta: { svc: 'psycholog', label: 'Psycholog / Terapeuta' },
  terapeuta: { svc: 'terapeuta' },
  leki_psych: { svc: 'leki_psych' },
  dermatologia: { svc: 'dermatologia' },
  ginekologia: { svc: 'ginekologia' },
  alergie: { svc: 'alergie' },
  zoladek: { svc: 'zoladek' },
  serce: { svc: 'serce' },
  infekcje: { svc: 'infekcje' },
  // małe linki informacyjne
  cennik: { page: 'pricing', label: 'Cennik' },
  pelny_cennik: { page: 'pricing', label: 'Pełny cennik' },
  kontakt: { page: 'contact' },
  jak_dziala: { page: 'how' },
  badania_dom: { page: 'homeTests' },
  telefon: { page: 'phone' },
  logowanie: { page: 'login' },
  regulamin: { page: 'terms' },
  prywatnosc: { page: 'privacy' },
  dla_lekarzy: { page: 'doctors' },
  dla_firm: { page: 'companies' },
  info_depresja: { url: cond('depresja-i-zaburzenia-lekowe'), label: 'Depresja i lęk — informacje' },
  info_bezsennosc: { url: cond('bezsennosc'), label: 'Bezsenność — informacje' },
  info_tradzik: { url: cond('tradzik'), label: 'Trądzik — informacje' },
  info_alergia: { url: cond('alergia'), label: 'Alergia — informacje' },
  info_refluks: { url: cond('refluks-zoladkowo-przelykowy'), label: 'Refluks — informacje' },
  info_nadcisnienie: { url: cond('nadcisnienie-tetnicze'), label: 'Nadciśnienie — informacje' },
  info_otylosc: { url: cond('otylosc'), label: 'Otyłość — informacje' },
  info_migrena: { url: cond('migrena'), label: 'Migrena — informacje' },
  info_tarczyca: { url: cond('niedoczynnosc-tarczycy'), label: 'Tarczyca — informacje' },
  info_cukrzyca: { url: cond('cukrzyca'), label: 'Cukrzyca — informacje' },
  info_uklad_moczowy: { url: cond('zakazenie-ukladu-moczowego'), label: 'Układ moczowy — informacje' },
  // pytania w czacie
  ask_specjalista: { ask: 'Jaki specjalista?', label: 'Jaki specjalista?' },
  ask_jak_umowic: { ask: 'Jak umówić wizytę?', label: 'Jak umówić wizytę?' },
};

// Przyciski pod odpowiedziami — domyślnie według specyfikacji v1.1 (klucz = klucz tekstu z texts.js).
// Wpis to id z BUTTONS, opcjonalnie z własną etykietą: "wizyta|Umów się do lekarza".
export const CASE_BUTTONS = {
  A2: ['wizyta_umow'],
  B2: ['psychiatra', 'psycholog', 'terapeuta'],
  B2_BLISKI: ['psychiatra', 'psycholog', 'terapeuta'],
  C: ['psychiatra', 'psycholog_terapeuta', 'leki_psych', 'info_depresja', 'wizyta'],
  D: ['wizyta_umow', 'wyniki', 'skierowanie'],
  E: ['wizyta_umow', 'recepta', 'kontynuacja'],
  F: ['wizyta_umow', 'l4_umow'],
  G: ['wyniki', 'skierowanie', 'badania_dom'],
  H: ['dzien_po', 'antykoncepcja', 'trt'],
  I: ['wizyta_umow'],
  J_OGOLNY: ['wizyta', 'recepta', 'l4', 'psychiatra', 'pelny_cennik'],
  K: ['umow_wizyte', 'ask_specjalista', 'cennik', 'kontakt'],
  K_SPECJALISTA: ['lekarz', 'psychiatra', 'psycholog', 'terapeuta'],
  K_KONTAKT: ['telefon', 'kontakt', 'wizyta'],
  K_DLA_LEKARZY: ['dla_lekarzy', 'dla_firm', 'wizyta'],
  K_KONTO: ['logowanie', 'telefon', 'wizyta'],
  K_PRAWNE: ['regulamin', 'prywatnosc', 'telefon', 'wizyta'],
  L: ['umow_wizyte', 'wizyta', 'recepta', 'kontynuacja', 'l4', 'dzien_po', 'ask_specjalista', 'ask_jak_umowic', 'cennik'],
  M: ['wizyta', 'recepta', 'kontynuacja', 'l4', 'wyniki', 'skierowanie', 'psychiatra', 'psycholog_terapeuta', 'dzien_po', 'antykoncepcja', 'trt', 'otylosc', 'umow_wizyte', 'ask_specjalista', 'cennik'],
  M_DZIEKUJE: ['umow_wizyte'],
};
// J z rozpoznaną usługą: cena usługi + usługa pokrewna (np. psychiatra → psycholog / terapeuta).
const PRICE_PAIR = { psychiatra: 'psycholog', psycholog: 'psychiatra', terapeuta: 'psychiatra', recepta: 'kontynuacja', kontynuacja: 'recepta', l4: 'wizyta', wyniki: 'skierowanie', skierowanie: 'wyniki', dzien_po: 'antykoncepcja', antykoncepcja: 'dzien_po', trt: 'wizyta', otylosc: 'wizyta', wizyta: 'recepta' };
const PAIR_BUTTON = { psycholog: 'psycholog_terapeuta' };
// 4 najczęstsze usługi do J bez rozpoznanej usługi (specyfikacja, karta J).
const TOP_PRICES = ['wizyta', 'recepta', 'l4', 'psychiatra'];

// --- Ustawienia z panelu (usługi i przyciski) -------------------------------------
let DESIGN = { services: {}, buttons: {} };
export function setDesignOverrides(d) {
  DESIGN = { services: d?.services || {}, buttons: d?.buttons || {} };
}
export function serviceOf(id) {
  const base = SERVICES[id];
  if (!base) return null;
  return { ...base, ...(DESIGN.services[id] || {}) };
}
export function caseButtons(key, { withOverrides = true } = {}) {
  const o = withOverrides ? DESIGN.buttons[key] : null;
  return Array.isArray(o) ? o : CASE_BUTTONS[key] || [];
}

/** Zamienia wpis katalogu ("id" albo "id|etykieta") na przycisk dla widżetu. */
export function resolveButton(entry, { withOverrides = true, noPrice = false } = {}) {
  const [id, customLabel] = String(entry).split('|');
  const b = BUTTONS[id];
  if (!b) return null;
  if (b.svc) {
    const s = withOverrides ? serviceOf(b.svc) : SERVICES[b.svc];
    const label = customLabel || b.label || s.label;
    const price = b.price === false || noPrice ? '' : s.price;
    return { id, label: price ? `${label} · ${price}` : label, url: form(s.service), color: s.color, outline: Boolean(b.outline ?? s.outline), tile: true, kind: 'service' };
  }
  if (b.ask) return { id, label: customLabel || b.label, ask: b.ask, color: INFO_COLOR, kind: 'info' };
  const url = b.page ? PAGES[b.page].url : b.url;
  return { id, label: customLabel || b.label || PAGES[b.page].label, url, color: INFO_COLOR, kind: 'info' };
}
const resolveAll = (entries, opts) => entries.map((e) => resolveButton(e, opts)).filter(Boolean);

export const CALL_112 = { label: 'Zadzwoń 112 →', url: 'tel:112', kind: 'alarm', color: ALARM_COLOR, main: true };

// ---------------------------------------------------------------------------
// Tematy (intencje). Każdy temat należy do przypadku A–M ze specyfikacji:
//   id        — stały identyfikator (model trained, testy, rejestr rozmów)
//   case      — przypadek ze specyfikacji
//   text      — klucz tekstu w shared/js/texts.js (i przycisków w CASE_BUTTONS)
//   keywords  — słowa kluczowe bota (bez polskich znaków; "*" = początek słowa)
//   service   — usługa tematu (cena w J)
//   lead      — przycisk usługi tematu dodawany na początku (np. „Ginekologia online”)
//   extras    — dodatkowe przyciski tematu (specjalista, informacje) — doklejane na końcu
//   title     — nagłówek „Ilona · L4 online · od 79 zł”
//   routing   — temat medyczny
// Słowniki to startowa lista ze specyfikacji — rozbudowywać na podstawie rejestru rozmów.
// ---------------------------------------------------------------------------

const KEYWORDS_ZDROWIE = ['bol', 'bul', 'bola', 'boli', 'bolal*', 'bolec', 'bolesn*', 'bolow', 'bolu', 'bolem', 'chory', 'chora', 'chore', 'chorzy', 'choroba', 'chorob*', 'choruj*', 'objaw*', 'zle sie czuje', 'slabo mi', 'oslabien*', 'oslabion*', 'zawrot*', 'krec* mi sie', 'goraczk*', 'temperatur*', 'dreszcz*', 'wymiot*', 'nudnos*', 'mdli', 'mdlosc*', 'puchn*', 'spuchn*', 'opuchl*', 'obrzek*', 'swedz*', 'piecze', 'kluje', 'klucie', 'dretw*', 'mrowi*', 'krwawi*', 'uraz*', 'zlaman*', 'skrecon*', 'skrecil*', 'stluczon*', 'rana', 'rany', 'oparzen*', 'zapalen*', 'dolegliwo*', 'zdrow*', 'cialo', 'ciala', 'lekarz*', 'leczen*', 'przeziebi*', 'noga', 'nogi', 'noge', 'nodze', 'nog', 'reka', 'reki', 'reke', 'rece', 'dlon*', 'ramie', 'ramien*', 'bark*', 'szyj*', 'kark*', 'plecy', 'plecow', 'plecach', 'kregoslup*', 'kolan*', 'biodr*', 'stopa', 'stopy', 'stope', 'stopie', 'kostk*', 'palec', 'palca', 'palce', 'palcach', 'klatk*', 'zebr*', 'brzuch*', 'glowa', 'glowy', 'glowe', 'glowie', 'gardlo', 'gardla', 'gardle', 'ucho', 'ucha', 'uszy', 'uszu', 'oko', 'oka', 'oczy', 'oczu', 'nos', 'nosa', 'zab', 'zeby', 'zeba', 'serce', 'serca', 'pluc*', 'watrob*', 'nerk*', 'skora', 'skory', 'skorze'];

export const INTENTS = [
  // --- C: zdrowie psychiczne ---
  { id: 'psychiatra', case: 'C', text: 'C', routing: true, service: 'psychiatra',
    keywords: ['depresj*', 'mam lek', 'czuje lek', 'napady leku', 'atak leku', 'ataki leku', 'boje sie', 'strach*', 'lekam sie', 'lekowe', 'lekowy', 'lekowa', 'lekam', 'panik*', 'psychiatr*', 'psychiczn*', 'antydepres*', 'nerwic*', 'adhd', 'zaburzen*', 'smutek', 'smutn*', 'apati*', 'obnizony nastroj', 'nastroj*', 'obsesj*', 'natrectw*', 'chad', 'dwubiegunow*'] },
  { id: 'psycholog', case: 'C', text: 'C', routing: true, service: 'psycholog',
    keywords: ['psycholog*', 'terapeut*', 'terapi*', 'psychoterap*', 'stres*', 'wypalen*', 'rozstan*', 'zaloba', 'samotn*', 'porozmawiac z kims', 'kryzys', 'relacj*', 'zwiazek', 'zwiazku', 'wsparci*'] },
  { id: 'bezsennosc', case: 'C', text: 'C', routing: true, service: 'psychiatra', extras: ['info_bezsennosc'],
    keywords: ['bezsenn*', 'spac', 'sen', 'snu', 'zasnac', 'zasypia*', 'budze', 'wybudza*', 'nasenn*'] },

  // --- F: L4 ---
  { id: 'l4', case: 'F', text: 'F', routing: true, service: 'l4', title: true,
    keywords: ['l4', 'zwolnien*', 'chorobow*', 'zus', 'nie moge isc do pracy'] },

  // --- E: recepta ---
  { id: 'recepta', case: 'E', text: 'E', routing: true, service: 'recepta', title: true,
    keywords: ['recept*', 'erecept*', 'e recept*', 'przepisa*', 'wypisa*'] },
  { id: 'kontynuacja', case: 'E', text: 'E', routing: true, service: 'kontynuacja', title: true,
    keywords: ['kontynuac*', 'przedluz*', 'stale leki', 'leki na stale', 'skonczyly', 'koncza mi sie', 'koncza sie'] },

  // --- G: wyniki badań i skierowania ---
  { id: 'wyniki', case: 'G', text: 'G', routing: true, service: 'wyniki', 
    keywords: ['wynik*', 'morfologi*', 'badani* krwi', 'badan*', 'analiz*', 'interpret*'] },
  { id: 'skierowanie', case: 'G', text: 'G', routing: true, service: 'skierowanie', 
    keywords: ['skierowan*'] },
  { id: 'badania_dom', case: 'G', text: 'G', service: 'wyniki', 
    keywords: ['badania w domu', 'badan w domu', 'pobranie krwi', 'pielegniar*', 'dojazd*'] },

  // --- H: kobiety i mężczyźni ---
  { id: 'dzien_po', case: 'H', text: 'H', routing: true, service: 'dzien_po', 
    keywords: ['dzien po', 'dniu po', 'antykoncepcja awaryjna', 'awaryjn*', 'ellaone', 'escapelle', 'peklo*', 'pekla'] },
  { id: 'antykoncepcja', case: 'H', text: 'H', routing: true, service: 'antykoncepcja', 
    keywords: ['antykoncep*', 'tabletki antykoncepcyjne', 'pigulk*', 'plastr*', 'krazek'] },
  { id: 'trt', case: 'H', text: 'H', routing: true, service: 'trt', 
    keywords: ['testosteron*', 'trt', 'androlog*', 'libido', 'potencj*', 'erekcj*'] },
  { id: 'ginekologia', case: 'H', text: 'H', routing: true, service: 'ginekologia', lead: 'ginekologia',
    keywords: ['ginekolog*', 'okres', 'miesiaczk*', 'menstruac*', 'ciaz*', 'menopauz*', 'uplaw*', 'pochw*', 'infekcja intymna'] },

  // --- D: dolegliwości — domyślnie konsultacja lekarska (+ specjalista jako dodatek) ---
  { id: 'skora', case: 'D', text: 'D', routing: true, service: 'dermatologia', extras: ['dermatologia', 'info_tradzik'],
    keywords: ['skora', 'skory', 'skorze', 'skore', 'skorn*', 'tradzik*', 'wysypk*', 'pryszcz*', 'dermatolog*', 'luszczyc*', 'egzem*', 'atopow*', 'swedz*', 'swiad', 'swiadu', 'znamie', 'pieprzyk*', 'wlos*', 'paznok*'] },
  { id: 'alergia', case: 'D', text: 'D', routing: true, service: 'alergie', extras: ['alergie', 'info_alergia'],
    keywords: ['alergi*', 'uczulen*', 'astm*', 'katar sienny', 'pylk*', 'inhalator*', 'wziewn*', 'antyhistamin*'] },
  { id: 'infekcja', case: 'D', text: 'D', routing: true, service: 'infekcje', extras: ['infekcje'],
    keywords: ['infekcj*', 'przezie*', 'gryp*', 'goraczk*', 'kaszel', 'kaszl*', 'katar', 'gardl*', 'zatok*', 'covid', 'antybiotyk*', 'temperatur*'] },
  { id: 'zoladek', case: 'D', text: 'D', routing: true, service: 'zoladek', extras: ['zoladek', 'info_refluks'],
    keywords: ['zoladk*', 'zgag*', 'refluks*', 'brzuch*', 'jelit*', 'biegunk*', 'zapar*', 'wzdec*', 'nudnosc*', 'trawien*', 'gastrolog*'] },
  { id: 'serce', case: 'D', text: 'D', routing: true, service: 'serce', extras: ['serce', 'info_nadcisnienie'],
    keywords: ['nadcisnien*', 'cisnieni*', 'serc*', 'kardiolog*', 'kolatan*', 'arytmi*', 'tetno', 'cholesterol*'] },
  { id: 'otylosc', case: 'D', text: 'D', routing: true, service: 'otylosc', extras: ['otylosc', 'info_otylosc'],
    keywords: ['otylo*', 'nadwag*', 'schudn*', 'odchudz*', 'wag*', 'kilogram*', 'bmi', 'ozempic', 'wegovy', 'mounjaro', 'saxenda', 'apetyt'] },
  { id: 'migrena', case: 'D', text: 'D', routing: true, service: 'wizyta', extras: ['info_migrena'],
    keywords: ['migren*', 'glowa', 'glowy', 'glowe', 'glowie', 'neurolog*', 'aura'] },
  { id: 'tarczyca', case: 'D', text: 'D', routing: true, service: 'wizyta', extras: ['info_tarczyca'],
    keywords: ['tarczyc*', 'hashimoto', 'tsh', 'euthyrox', 'letrox', 'endokrynolog*', 'hormon*'] },
  { id: 'cukrzyca', case: 'D', text: 'D', routing: true, service: 'wizyta', extras: ['info_cukrzyca'],
    keywords: ['cukrzyc*', 'cukier', 'cukru', 'glukoz*', 'insulin*', 'metformin*', 'glikem*'] },
  { id: 'uklad_moczowy', case: 'D', text: 'D', routing: true, service: 'wizyta', extras: ['info_uklad_moczowy'],
    keywords: ['pecherz*', 'mocz*', 'sikan*', 'pieczen*', 'cystit*', 'urolog*', 'nerk*'] },
  { id: 'inny_specjalista', case: 'D', text: 'D', routing: true, service: 'wizyta',
    keywords: ['laryngolog*', 'okulist*', 'pediatr*', 'ortoped*', 'stomatolog*', 'dentyst*', 'reumatolog*', 'onkolog*', 'chirurg*', 'ucho', 'uszu', 'ucha', 'oko', 'oczy', 'oczu', 'wzrok*', 'zab', 'zeby', 'zeba', 'kregoslup*', 'kolano', 'kolana', 'staw*', 'plecy', 'plecow'] },

  // --- D: słownik zdrowia (specyfikacja, pkt 9: SLOWNIK_ZDROWIE) — każda dolegliwość bez konkretnego tematu ---
  { id: 'zdrowie', case: 'D', text: 'D', routing: true, service: 'wizyta', weight: 0.5,
    keywords: KEYWORDS_ZDROWIE },

  // --- I: dawka leku / opinia ---
  { id: 'opinia', case: 'I', text: 'I',
    keywords: ['dawk*', 'dawkowan*', 'ile tabletek', 'ile brac', 'jak brac', 'ile mg', 'miligram*', 'czy moge wziac', 'czy moge brac', 'czy moge laczyc', 'mozna laczyc', 'czy to rak', 'czy to grozne', 'czy to powazne', 'diagnoz*', 'co mi jest', 'co to moze byc', 'skutki uboczne', 'co mam brac', 'jaki lek', 'jakie leki', 'ibuprofen*', 'paracetamol*', 'apap*', 'ketonal*', 'aspiryn*', 'pyralgin*', 'nurofen*'] },

  // --- J: cena (tekst i przyciski budowane z tabeli usług) ---
  { id: 'cennik', case: 'J', text: 'J',
    keywords: ['cena', 'ceny', 'cenie', 'cenach', 'cennik*', 'koszt*', 'kosztuj*', 'ile placi*', 'ile zaplac*', 'zaplac*', 'platnosc*', 'oplat*', 'zl', 'zlotych', 'nfz', 'refundac*', 'darmow*'] },

  // --- K: jak umówić / jaki specjalista / kontakt ---
  { id: 'umow', case: 'K', text: 'K', weight: 0.8,
    keywords: ['umow*', 'zapis*', 'rezerw*', 'termin*', 'wizyt*', 'konsultacj*', 'zamow*', 'formularz*'] },
  { id: 'jak_dziala', case: 'K', text: 'K',
    keywords: ['jak to dziala', 'jak dziala', 'jak wyglada', 'przebieg*', 'wideo', 'oddzwani*', 'ile trwa', 'bezpieczn*', 'legaln*'] },
  { id: 'jaki_specjalista', case: 'K', text: 'K_SPECJALISTA',
    keywords: ['jakiego lekarza', 'jaki lekarz', 'jaki specjalist*', 'jakiego specjalist*', 'do kogo', 'ktory lekarz', 'ktorego lekarza', 'specjalist*', 'lekarz rodzinny', 'internist*'] },
  { id: 'kontakt', case: 'K', text: 'K_KONTAKT',
    keywords: ['kontakt*', 'telefon*', 'infolini*', 'numer', 'mail*', 'email', 'godzin*', 'otwar*', 'czynne', 'zadzwon*', 'adres', 'napisz do nas'] },
  { id: 'dla_lekarzy', case: 'K', text: 'K_DLA_LEKARZY',
    keywords: ['praca', 'pracy', 'zatrudn*', 'wspolprac*', 'jestem lekarzem', 'dla lekarzy', 'rekrutac*'] },
  { id: 'konto', case: 'K', text: 'K_KONTO',
    keywords: ['logow*', 'zaloguj*', 'konto', 'konta', 'haslo', 'hasla', 'rejestrac*', 'profil'] },
  { id: 'prawne', case: 'K', text: 'K_PRAWNE',
    keywords: ['regulamin*', 'rodo', 'prywatnosc*', 'cookies', 'dane osobowe', 'reklamac*', 'zwrot*', 'faktur*'] },

  // --- M: powitanie / podziękowanie ---
  { id: 'powitanie', case: 'M', text: 'M',
    keywords: ['dzien dobry', 'witam', 'czesc', 'hej', 'siema', 'halo', 'dobry wieczor', 'kim jestes', 'start'] },
  { id: 'podziekowanie', case: 'M', text: 'M_DZIEKUJE',
    keywords: ['dziekuj*', 'dzieki', 'thx', 'super', 'ok dzieki'] },

  // --- L: poza tematem (pogoda, polityka…) — ta sama odpowiedź co przy niejasnym pytaniu ---
  { id: 'offtopic', case: 'L', text: 'L',
    keywords: ['polityk*', 'wybor*', 'rzad*', 'prezydent*', 'premier*', 'sejm*', 'partia', 'partii', 'pogod*', 'deszcz*', 'mecz*', 'pilk*', 'sport*', 'przepis na', 'film*', 'serial*', 'zart*', 'dowcip*', 'bitcoin*', 'krypto*', 'gielda', 'programowa*', 'javascript', 'python', 'wiersz*', 'piosenk*', 'gra', 'gry', 'horoskop*', 'pizza', 'wojna', 'wojn*', 'dzien wolny', 'swieto'] },
];

export const INTENT_BY_ID = Object.fromEntries(INTENTS.map((i) => [i.id, i]));

// Kolejność sprawdzania przypadków (specyfikacja, sekcja 5 i 9). A i B sprawdza wcześniej
// shared/js/safety.js, tryb kryzysowy — shared/js/pipeline.js. Odstępstwa od tabeli
// w specyfikacji (opisane w docs/PLAN-ILONA.md):
//   - J (cena) przed tematami — „ile kosztuje psychiatra” ma dostać cenę (test 27), a nie kartę C;
//   - M po D — „dzień dobry, boli mnie kręgosłup” to dolegliwość, a nie powitanie.
export const CASE_ORDER = ['I', 'J', 'C', 'F', 'E', 'G', 'H', 'K', 'D', 'M', 'L'];

// --- Nadpisania tekstów z panelu („Odpowiedzi wbudowane”) ---------------------------
// Klucz = klucz tekstu z texts.js; teksty alarmowe (locked) nie są do nadpisania.
let OVERRIDES = {};

export function setAnswerOverrides(map) {
  OVERRIDES = map && typeof map === 'object' ? map : {};
}

function fill(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => {
    const v = { telefon: SITE.phone, godziny: SITE.hours, email: SITE.email, asystentka: SITE.assistant, ...vars }[k];
    return v === undefined ? m : v;
  });
}

export function textOf(key, vars, { withOverrides = true } = {}) {
  const t = TEXTS[key];
  if (!t) return '';
  const o = withOverrides && !t.locked ? OVERRIDES[key] : null;
  return fill(o?.text || t.text, vars).replace(/\s+/g, ' ').trim();
}

// Przyciski dla klucza tekstu: z panelu albo domyślne; stare nadpisanie „links” ma pierwszeństwo.
function buttonsOf(key, opts = {}) {
  const o = opts.withOverrides !== false && !TEXTS[key]?.locked ? OVERRIDES[key] : null;
  if (Array.isArray(o?.links)) return o.links.map((l) => ({ ...l, color: INFO_COLOR, kind: 'info' }));
  return resolveAll(caseButtons(key, opts), opts);
}

const priceSentence = (id, opts) => {
  const s = opts.withOverrides === false ? SERVICES[id] : serviceOf(id);
  return `${s.priceName} kosztuje ${s.price}.`;
};

/**
 * Odpowiedź dla tematu (id intencji) według przypadku A–M.
 * @param {string|null} intentId  null = nic nie rozpoznano (L)
 * @param {object} [ctx]          { topic } — temat medyczny wspomniany obok (J)
 * @returns {{ text, links, case, intent, title? }}
 */
export function replyFor(intentId, ctx = {}, opts = {}) {
  const svcOf = (id) => (opts.withOverrides === false ? SERVICES[id] : serviceOf(id));
  const intent = INTENT_BY_ID[intentId];
  if (!intent) return { text: textOf('L', {}, opts), links: buttonsOf('L', opts), chips: [], case: 'L', intent: 'fallback' };

  // J — od razu cena i kolorowe linki do usług (bez „Zobacz cennik” zamiast ceny).
  if (intent.case === 'J') {
    const svcId = INTENT_BY_ID[ctx.topic]?.service;
    const priced = svcId && svcOf(svcId)?.price ? svcId : null;
    if (priced) {
      const pair = PRICE_PAIR[priced];
      const pairText = pair && svcOf(pair)?.price ? ` ${svcOf(pair).priceName} — ${svcOf(pair).price}.` : '';
      const ids = [priced === 'psycholog' ? 'psycholog_terapeuta' : priced, ...(pair ? [PAIR_BUTTON[pair] || pair] : [])];
      return { text: textOf('J', { cena: priceSentence(priced, opts) + pairText }, opts), links: resolveAll(ids, opts), chips: [], case: 'J', intent: `cennik+${ctx.topic}` };
    }
    const ceny = TOP_PRICES.map((id) => `${svcOf(id).priceName.toLowerCase()} ${svcOf(id).price}`).join(', ');
    return { text: textOf('J_OGOLNY', { ceny }, opts), links: buttonsOf('J_OGOLNY', opts), chips: [], case: 'J', intent: 'cennik' };
  }

  let links = buttonsOf(intent.text, opts);
  // Przycisk usługi tematu na początku (np. „Ginekologia online” w H).
  if (intent.lead) {
    const lead = links.find((l) => l.id === intent.lead) || resolveButton(intent.lead, opts);
    if (lead) links = [lead, ...links.filter((l) => l !== lead && l.id !== intent.lead)];
  }
  if (intent.extras) links = [...links, ...resolveAll(intent.extras, opts).filter((x) => !links.some((l) => l.id === x.id))];

  const reply = { text: textOf(intent.text, {}, opts), links, chips: [], case: intent.case, intent: intent.id };
  if (intent.title) {
    const s = svcOf(intent.service);
    reply.title = s.price ? `${s.label} · ${s.price}` : s.label;
  }
  return reply;
}

// Odpowiedź L (nic nie rozpoznano) — pipeline przy pustej wiadomości / błędzie; serwer AI — pytania nie na temat.
export const FALLBACK_REPLY = { text: TEXTS.L.text, get links() { return buttonsOf('L'); }, chips: [], case: 'L' };
export const OFFTOPIC_REPLY = FALLBACK_REPLY;

/**
 * Odpowiedź alarmowa (A, B) — specyfikacja v1.1: U GÓRY zielona odpowiedź z kierunkiem pomocy,
 * NA DOLE (zawsze ostatnia) czerwona karta z przyciskiem 112 — pole `alarm`.
 */
export function alarmReply(kind, { closePerson = false, supportLine = false } = {}) {
  const alarm = { text: TEXTS.ALARM.text, links: [CALL_112] };
  // Przy alarmie bez cen (specyfikacja: „nie pokazywać cennika”).
  const opts = { noPrice: true };
  if (kind === 'A') return { text: TEXTS.A2.text, links: buttonsOf('A2', opts), case: 'A', intent: 'emergency', emergency: true, alarm };
  const key = closePerson ? 'B2_BLISKI' : 'B2';
  const text = TEXTS[key].text + (supportLine ? ` ${TEXTS.B_WSPARCIE.text}` : '');
  return { text, links: buttonsOf(key, opts), case: 'B', intent: 'crisis', emergency: true, alarm };
}

// Domyślna odpowiedź dla klucza tekstu (panel pokazuje ją obok pola do edycji).
export function defaultAnswer(key) {
  const t = TEXTS[key];
  if (!t) return null;
  return { text: fill(t.text), links: resolveAll(CASE_BUTTONS[key] || [], { withOverrides: false }), case: t.case, label: t.label, locked: Boolean(t.locked) };
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
