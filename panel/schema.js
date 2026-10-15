// Ustawienia panelu sterowania — format, wartości domyślne i walidacja.
// Ten sam plik używają: widżet (panel/client.js), panel administratora
// (panel/admin/) i serwer panelu (panel/server/worker.js), więc zasady
// są jednakowe wszędzie, a serwer i tak sprawdza wszystko ponownie.
import { anonymize } from '../shared/js/privacy.js';
import { SERVICES, BUTTONS } from '../shared/js/knowledge.js';
import { TEXTS } from '../shared/js/texts.js';

// Poziomy rejestracji rozmów.
export const LOG_LEVELS = [
  {
    id: 0,
    name: 'Wyłączona',
    short: 'Nic nie jest zapisywane.',
  },
  {
    id: 1,
    name: 'Statystyki',
    short: 'Tylko temat pytania (np. „Dermatologia”, „L4”), wariant, wersja i godzina. Bez treści rozmów.',
  },
  {
    id: 2,
    name: 'Treść pytań za zgodą',
    short: 'Jak „Statystyki” + treść pytań pacjentów, którzy zaznaczą zgodę. Numery i e-maile są automatycznie wycinane.',
  },
  {
    id: 3,
    name: 'Pełne rozmowy za zgodą',
    short: 'Jak wyżej + odpowiedzi asystentki, czyli cała rozmowa (za zgodą pacjenta).',
  },
];

// Silniki, z których składa się tryb pracy (kolejność ma znaczenie).
export const ENGINES = ['bot', 'trained', 'ai'];

// Gotowe tryby pracy do wyboru w panelu. Łańcuch działa tak: odpowiada pierwszy
// silnik; jeśli nie rozpozna pytania albo jest niedostępny — pytanie przejmuje następny.
export const MODE_PRESETS = [
  { chain: ['bot'], name: 'Tylko bot regułowy', short: 'Darmowy, przewidywalny, rozumie tylko wpisane słowa kluczowe.' },
  { chain: ['trained'], name: 'Tylko nasz model', short: 'Darmowy, uczy się z przykładów, działa bez serwera AI.' },
  { chain: ['ai'], name: 'Tylko AI', short: 'Najlepiej rozumie pytania, płatny za każdą wiadomość. Gdy AI jest niedostępne — odpowiada bot.' },
  { chain: ['trained', 'ai'], name: 'Nasz model, a AI gdy nie rozpozna', short: 'Zalecane z AI: większość pytań obsłuży darmowy model, za AI płacisz tylko przy trudnych.' },
  { chain: ['bot', 'ai'], name: 'Bot, a AI gdy nie rozpozna', short: 'Jak wyżej, ale pierwszy odpowiada bot regułowy.' },
  { chain: ['ai', 'trained'], name: 'AI, a nasz model gdy AI niedostępne', short: 'Najlepsza jakość; przy awarii lub limicie AI odpowiada nasz model zamiast bota.' },
  { chain: ['trained', 'bot'], name: 'Nasz model, a bot gdy nie rozpozna', short: 'Bez kosztów; bot łapie pytania, których model nie jest pewny.' },
];

export const LIMITS = {
  rules: 200,
  phrasesPerRule: 40,
  phraseLength: 80,
  textLength: 1200,
  links: 4,
  labelLength: 60,
  urlLength: 500,
  retentionMin: 1,
  retentionMax: 365,
};

export const DEFAULT_CONFIG = Object.freeze({
  engine: { chain: ['bot'] },
  logging: { level: 0, retentionDays: 90 },
  // Linia z telefonem wsparcia (116 123 / 116 111) w komunikacie B — decyzja właściciela,
  // domyślnie wyłączona (specyfikacja czatu, sekcja 11 pkt 1).
  safety: { supportLine: false },
  // Usługi (nazwa, cena, kolor, obrys, nazwa w formularzu) i przyciski pod odpowiedziami —
  // tylko ZMIANY względem wartości domyślnych ze specyfikacji (shared/js/knowledge.js).
  services: {},
  buttons: {},
  rules: [],
  overrides: {},
  updatedAt: null,
});

// Bezpieczne adresy linków: tylko https, http, tel i mailto (żadnego javascript:).
export function isSafeUrl(url) {
  return /^(https?:\/\/|tel:|mailto:)/i.test(String(url || '').trim());
}

function cleanText(value, max) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
}

function cleanLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .map((l) => ({ label: cleanText(l?.label, LIMITS.labelLength), url: cleanText(l?.url, LIMITS.urlLength) }))
    .filter((l) => l.label && isSafeUrl(l.url))
    .slice(0, LIMITS.links);
}

function cleanRule(rule, index) {
  const phrases = (Array.isArray(rule?.phrases) ? rule.phrases : [])
    .map((p) => cleanText(p, LIMITS.phraseLength))
    .filter(Boolean)
    .slice(0, LIMITS.phrasesPerRule);
  const text = cleanText(rule?.text, LIMITS.textLength);
  if (!phrases.length || !text) return null;
  return {
    id: cleanText(rule?.id, 40).replace(/[^\w-]/g, '') || `r${index + 1}`,
    name: cleanText(rule?.name, 80),
    phrases,
    text,
    links: cleanLinks(rule?.links),
    active: rule?.active !== false,
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

// Zmiany usług: tylko znane usługi i poprawne wartości; pole pominięte = wartość domyślna.
function cleanServices(input) {
  const out = {};
  for (const [id, v] of Object.entries(input && typeof input === 'object' ? input : {})) {
    if (!SERVICES[id] || !v || typeof v !== 'object') continue;
    const e = {};
    if (typeof v.label === 'string' && v.label.trim()) e.label = cleanText(v.label, 60);
    if (typeof v.price === 'string') e.price = cleanText(v.price, 20);
    if (typeof v.priceName === 'string' && v.priceName.trim()) e.priceName = cleanText(v.priceName, 80);
    if (typeof v.service === 'string') e.service = cleanText(v.service, 80);
    if (HEX.test(v.color || '')) e.color = v.color.toUpperCase();
    if (typeof v.outline === 'boolean') e.outline = v.outline;
    if (Object.keys(e).length) out[id] = e;
  }
  return out;
}

// Przyciski pod odpowiedziami: klucz tekstu → lista "id" albo "id|etykieta" (id z katalogu BUTTONS).
function cleanButtons(input) {
  const out = {};
  for (const [key, list] of Object.entries(input && typeof input === 'object' ? input : {})) {
    // J (cena rozpoznanej usługi) jest budowane automatycznie; teksty alarmowe (A, B) — bez zmian.
    if (!TEXTS[key] || key === 'J' || TEXTS[key].locked || !Array.isArray(list)) continue;
    out[key] = list
      .map((x) => String(x || ''))
      .map((x) => {
        const [id, label] = x.split('|');
        if (!BUTTONS[id]) return null;
        const l = label ? cleanText(label, 60).replace(/\|/g, '') : '';
        return l ? `${id}|${l}` : id;
      })
      .filter(Boolean)
      .slice(0, 20);
  }
  return out;
}

// Zwraca poprawny obiekt ustawień — nieznane pola i błędne wartości są odrzucane.
export function sanitizeConfig(input) {
  const src = input && typeof input === 'object' ? input : {};
  const level = Number(src.logging?.level);
  const days = Math.round(Number(src.logging?.retentionDays));

  const rules = (Array.isArray(src.rules) ? src.rules : [])
    .slice(0, LIMITS.rules)
    .map(cleanRule)
    .filter(Boolean);
  // Unikalne id reguł.
  const seen = new Set();
  rules.forEach((r, i) => {
    while (seen.has(r.id)) r.id = `${r.id}-${i + 1}`;
    seen.add(r.id);
  });

  const overrides = {};
  for (const [id, o] of Object.entries(src.overrides && typeof src.overrides === 'object' ? src.overrides : {})) {
    const key = cleanText(id, 40).replace(/[^\w-]/g, '');
    const text = cleanText(o?.text, LIMITS.textLength);
    if (!key || !text) continue;
    const entry = { text };
    if (Array.isArray(o?.links)) entry.links = cleanLinks(o.links);
    overrides[key] = entry;
  }

  // Tryb pracy: 1–3 różne silniki z listy ENGINES.
  const chain = [...new Set((Array.isArray(src.engine?.chain) ? src.engine.chain : []).map(String))]
    .filter((e) => ENGINES.includes(e))
    .slice(0, ENGINES.length);

  return {
    engine: { chain: chain.length ? chain : [...DEFAULT_CONFIG.engine.chain] },
    logging: {
      level: [0, 1, 2, 3].includes(level) ? level : 0,
      retentionDays: Number.isFinite(days)
        ? Math.min(LIMITS.retentionMax, Math.max(LIMITS.retentionMin, days))
        : DEFAULT_CONFIG.logging.retentionDays,
    },
    safety: { supportLine: src.safety?.supportLine === true },
    services: cleanServices(src.services),
    buttons: cleanButtons(src.buttons),
    rules,
    overrides,
    updatedAt: typeof src.updatedAt === 'string' ? src.updatedAt.slice(0, 40) : null,
  };
}

// --- Plik ustawień (eksport / import / źródło „plik”) ---------------------------
// Ten sam format ma plik z eksportu w panelu i plik panel/settings.json, który czyta
// czat — wyeksportowany plik można więc po prostu podmienić ręcznie.
export const SETTINGS_FORMAT = 'lt-asystent-ustawienia';

export function wrapSettings(config) {
  return {
    _info: 'Ustawienia asystentki Ilony (panel sterowania). Ten plik można zaimportować w panelu albo wgrać jako panel/settings.json.',
    format: SETTINGS_FORMAT,
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    config: sanitizeConfig(config),
  };
}

// Przyjmuje plik w formacie eksportu albo „gołe” ustawienia. Rzuca błąd, gdy to nie są ustawienia.
export function unwrapSettings(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('To nie jest plik ustawień (oczekiwano obiektu JSON).');
  const cfg = data.format === SETTINGS_FORMAT || data.config ? data.config : data;
  if (!cfg || typeof cfg !== 'object') throw new Error('W pliku brakuje ustawień.');
  const known = ['engine', 'logging', 'rules', 'overrides', 'services', 'buttons'];
  if (!known.some((k) => k in cfg)) throw new Error('Plik nie zawiera ustawień asystentki (brak pól engine / logging / rules / overrides).');
  return sanitizeConfig(cfg);
}

// Część ustawień udostępniana publicznie widżetowi (bez wyłączonych reguł).
export function publicConfig(config) {
  const c = sanitizeConfig(config);
  return { ...c, rules: c.rules.filter((r) => r.active) };
}

// Przycina wpis rejestru do tego, na co pozwala poziom i zgoda pacjenta.
// Zwraca null, gdy przy danym poziomie nic nie zapisujemy.
export function filterLogEntry(entry, config) {
  const level = sanitizeConfig(config).logging.level;
  if (level === 0) return null;
  const consent = entry?.consent === true;
  const out = {
    session: cleanText(entry?.session, 40).replace(/[^\w-]/g, ''),
    variant: cleanText(entry?.variant, 20),
    version: cleanText(entry?.version, 20),
    intent: cleanText(entry?.intent, 60),
    // Przypadek ze specyfikacji (A–M) i kliknięty przycisk — bez danych identyfikujących.
    case: /^[A-M]$|^custom$/.test(String(entry?.case || '')) ? entry.case : '',
    button: cleanText(entry?.button, 80),
    source: cleanText(entry?.source, 20),
    degraded: cleanText(entry?.degraded, 20),
    consent: level >= 2 && consent,
    question: null,
    answer: null,
  };
  // Treści wiadomości kryzysowych (przypadek B) nie zapisujemy wcale — RODO, specyfikacja sekcja 11 pkt 5.
  const crisis = out.case === 'B';
  if (level >= 2 && consent && !crisis) out.question = anonymize(entry?.question) || null;
  if (level >= 3 && consent && !crisis) out.answer = anonymize(entry?.answer, 1200) || null;
  return out;
}
