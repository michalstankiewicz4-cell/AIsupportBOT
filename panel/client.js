// Połączenie widżetu z panelem sterowania.
// - Przy starcie pobiera ustawienia z serwera panelu (GET /config).
// - Stosuje własne odpowiedzi na frazy i nadpisania odpowiedzi wbudowanych.
// - Wysyła wpisy do rejestru rozmów (POST /log) zgodnie z poziomem rejestracji.
//
// Skąd czat bierze ustawienia (pierwsze dostępne wygrywa):
//   1. serwer panelu (baza) — gdy podano adres (data-panel albo panel/config.js),
//   2. tryb lokalny (demo) — gdy w tej przeglądarce wybrano w panelu „Tryb lokalny”
//      (ustawienia i rozmowy w localStorage; działa tylko w tej przeglądarce),
//   3. plik panel/settings.json — leży obok skryptów czatu na hostingu,
//   4. ustawienia domyślne (bot, rejestracja wyłączona).
import { DEFAULT_CONFIG, sanitizeConfig, publicConfig, filterLogEntry, unwrapSettings } from './schema.js';
import { normalize, containsAny } from '../shared/js/text.js';
import { setAnswerOverrides, setDesignOverrides } from '../shared/js/knowledge.js';

export const LOCAL_CONFIG_KEY = 'lt-panel:config';
export const LOCAL_LOGS_KEY = 'lt-panel:logs';
// Które źródło wybrano ostatnio w panelu w tej przeglądarce: 'local' (demo), 'file' albo 'server'.
export const SOURCE_KEY = 'lt-panel:source';
export const SETTINGS_FILE_URL = new URL('./settings.json', import.meta.url).href;
const LOCAL_LOGS_MAX = 1000;

let config = sanitizeConfig(DEFAULT_CONFIG);
let endpoint = '';
let localMode = false;
let source = 'default';

// Ustawia konfigurację (używane przy starcie, przez panel do testów i w testach Node).
export function setPanelConfig(cfg) {
  config = publicConfig(cfg);
  setAnswerOverrides(config.overrides);
  setDesignOverrides({ services: config.services, buttons: config.buttons });
  return config;
}

export function getPanelConfig() {
  return config;
}

export function panelStatus() {
  return { endpoint, localMode, source };
}

/**
 * Wczytuje ustawienia. Nie rzuca błędów — w razie problemu zostają ustawienia domyślne.
 * @param {{ endpoint?: string, timeoutMs?: number }} opts
 */
export async function initPanel(opts = {}) {
  endpoint = String(opts.endpoint || '').replace(/\/+$/, '');
  localMode = false;
  source = 'default';
  setPanelConfig(DEFAULT_CONFIG); // każde wczytanie zaczyna od ustawień domyślnych
  const timeoutMs = opts.timeoutMs || 4000;

  // 1. Serwer panelu (baza).
  if (endpoint) {
    try {
      const res = await fetchWithTimeout(`${endpoint}/config`, {}, timeoutMs);
      if (res.ok) {
        setPanelConfig(await res.json());
        source = 'server';
      }
    } catch (err) {
      console.warn('[LTChat] panel: nie udało się pobrać ustawień z serwera, używam domyślnych.', err);
    }
    return config;
  }

  // 2. Tryb lokalny (demo) wybrany w panelu w tej przeglądarce.
  const local = readLocal(LOCAL_CONFIG_KEY);
  const chosen = readLocal(SOURCE_KEY);
  if (local && (chosen === 'local' || chosen === null)) {
    localMode = true;
    source = 'local';
    setPanelConfig(local);
    return config;
  }

  // 3. Plik panel/settings.json obok skryptów czatu.
  try {
    const res = await fetchWithTimeout(opts.settingsUrl || SETTINGS_FILE_URL, { cache: 'no-cache' }, timeoutMs);
    if (res.ok) {
      setPanelConfig(unwrapSettings(await res.json()));
      source = 'file';
    }
  } catch {
    /* brak pliku albo błędny plik — zostają ustawienia domyślne */
  }
  return config;
}

async function fetchWithTimeout(url, init, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
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
    case: reply?.case || '',
    button: reply?.button || '',
    source: reply?.source || 'engine',
    degraded: reply?.degraded || '',
    question,
    answer: [reply?.text, reply?.alarm?.text].filter(Boolean).join('\n\n'),
  };
  const entry = filterLogEntry(raw, config);
  if (!entry) return;
  sendLog(entry);
}

// Kliknięcie przycisku pod odpowiedzią (specyfikacja, pkt 8.13 i 8.20) — zapisujemy tylko
// etykietę przycisku i przypadek A–M, bez treści rozmowy.
export function logClick({ session, consent, variant, version, button, caseId }) {
  const entry = filterLogEntry(
    { session, consent, variant, version, intent: 'click', case: caseId || '', button, source: 'click', degraded: '', question: null, answer: null },
    config,
  );
  if (entry) sendLog(entry);
}

function sendLog(entry) {
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
