// Połączenie widżetu z panelem sterowania.
// - Przy starcie pobiera ustawienia z serwera panelu (GET /config).
// - Stosuje własne odpowiedzi na frazy i nadpisania odpowiedzi wbudowanych.
// - Wysyła wpisy do rejestru rozmów (POST /log) zgodnie z poziomem rejestracji.
//
// Tryb lokalny (demo): gdy nie podano adresu serwera, ustawienia i rejestr są
// czytane z localStorage tej przeglądarki — to tam zapisuje je panel uruchomiony
// lokalnie (npm run panel). Na stronie kliniki localStorage jest pusty, więc
// bez serwera panelu widżet działa po prostu z ustawieniami domyślnymi.
import { DEFAULT_CONFIG, sanitizeConfig, publicConfig, filterLogEntry } from './schema.js';
import { normalize, containsAny } from '../shared/js/text.js';
import { setAnswerOverrides } from '../shared/js/knowledge.js';

export const LOCAL_CONFIG_KEY = 'lt-panel:config';
export const LOCAL_LOGS_KEY = 'lt-panel:logs';
const LOCAL_LOGS_MAX = 1000;

let config = sanitizeConfig(DEFAULT_CONFIG);
let endpoint = '';
let localMode = false;

// Ustawia konfigurację (używane przy starcie, przez panel do testów i w testach Node).
export function setPanelConfig(cfg) {
  config = publicConfig(cfg);
  setAnswerOverrides(config.overrides);
  return config;
}

export function getPanelConfig() {
  return config;
}

export function panelStatus() {
  return { endpoint, localMode };
}

/**
 * Wczytuje ustawienia. Nie rzuca błędów — w razie problemu zostają ustawienia domyślne.
 * @param {{ endpoint?: string, timeoutMs?: number }} opts
 */
export async function initPanel(opts = {}) {
  endpoint = String(opts.endpoint || '').replace(/\/+$/, '');
  localMode = false;
  if (endpoint) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || 4000);
      const res = await fetch(`${endpoint}/config`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) setPanelConfig(await res.json());
    } catch (err) {
      console.warn('[LTChat] panel: nie udało się pobrać ustawień, używam domyślnych.', err);
    }
    return config;
  }
  const local = readLocal(LOCAL_CONFIG_KEY);
  if (local) {
    localMode = true;
    setPanelConfig(local);
  }
  return config;
}

// --- Własne odpowiedzi na frazy -------------------------------------------------

// Fraza z panelu: polskie znaki i wielkość liter nie mają znaczenia,
// "*" na końcu = dowolna końcówka (np. "sobot*" łapie „sobota”, „sobotę”).
function normalizePhrase(p) {
  const star = p.trim().endsWith('*');
  const n = normalize(p.replace(/\*+$/, ''));
  return n ? n + (star ? '*' : '') : '';
}

// Zwraca odpowiedź z pierwszej pasującej reguły (najdłuższa trafiona fraza wygrywa) albo null.
export function matchRule(message, rules = config.rules) {
  const text = normalize(message);
  let best = null;
  for (const rule of rules) {
    if (rule.active === false) continue;
    for (const phrase of rule.phrases) {
      const p = normalizePhrase(phrase);
      if (p && containsAny(text, [p]) && (!best || p.length > best.len)) best = { rule, len: p.length, phrase };
    }
  }
  if (!best) return null;
  return {
    text: best.rule.text,
    links: best.rule.links || [],
    chips: [],
    intent: `custom:${best.rule.id}`,
    source: 'custom',
    matched: best.phrase,
  };
}

// --- Rejestr rozmów -------------------------------------------------------------

/**
 * Zapisuje jedną wymianę (pytanie + odpowiedź). Niczego nie blokuje i nie rzuca błędów.
 * Zawartość wpisu przycina filterLogEntry() zgodnie z poziomem i zgodą pacjenta;
 * serwer panelu przycina go ponownie według własnych ustawień.
 */
export function logTurn({ session, consent, variant, version, question, reply }) {
  const raw = {
    session,
    consent: consent === true,
    variant: reply?.engine || variant,
    version: reply?.engineVersion || version,
    intent: reply?.intent,
    source: reply?.source || 'engine',
    degraded: reply?.degraded || '',
    question,
    answer: reply?.text,
  };
  const entry = filterLogEntry(raw, config);
  if (!entry) return;

  if (endpoint) {
    try {
      const body = JSON.stringify(entry);
      // sendBeacon nie blokuje strony i działa nawet przy przejściu na inną zakładkę.
      if (navigator.sendBeacon?.(`${endpoint}/log`, new Blob([body], { type: 'text/plain' }))) return;
      fetch(`${endpoint}/log`, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
    } catch { /* rejestr nigdy nie psuje czatu */ }
    return;
  }
  if (localMode) {
    // Tryb lokalny też pilnuje czasu przechowywania.
    const minTs = Date.now() - config.logging.retentionDays * 86400000;
    const logs = (readLocal(LOCAL_LOGS_KEY) || []).filter((l) => l.ts >= minTs);
    logs.push({ id: Date.now() + Math.random(), ts: Date.now(), ...entry });
    writeLocal(LOCAL_LOGS_KEY, logs.slice(-LOCAL_LOGS_MAX));
  }
}

// Losowy identyfikator rozmowy — nie zawiera żadnych danych pacjenta.
export function newSessionId() {
  try {
    return crypto.randomUUID().slice(0, 18);
  } catch {
    return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  }
}

function readLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* pomijamy */ }
}
