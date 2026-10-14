// Kontrola strony kliniki — sprawdza, czy to, co mówi asystentka, nadal zgadza się ze stroną:
//   1. linki w odpowiedziach: czy strona istnieje (błędy 404/500), czy nie przekierowuje
//      gdzie indziej, czy istnieje sekcja z linku (np. #cennik),
//   2. fakty: czy na stronie są nadal te same ceny, numer infolinii, godziny (SITE_FACTS),
//   3. zmiany: czy treść stron zmieniła się od poprzedniego sprawdzenia.
//
// Moduł używa tylko fetch(), więc działa wszędzie: w serwerze panelu (Cloudflare Worker,
// codziennie automatycznie), w lokalnym serwerze panelu (npm run panel), w poleceniu
// npm run check-site i w codziennym workflow GitHub Actions.
import { PAGES, INTENTS, SITE, SITE_FACTS, defaultAnswer } from '../shared/js/knowledge.js';
import { sanitizeConfig } from './schema.js';
import { INTENT_LABELS } from './labels.js';

const MAX_PAGES = 45; // limit pobrań na jedno sprawdzenie (Cloudflare Workers: maks. 50 podzapytań)
const MAX_HTML = 2_000_000;
const MIN_TEXT = 400; // mniej tekstu = strona prawdopodobnie generowana w przeglądarce (nie da się ocenić treści)

// --- Zbieranie linków ze wszystkich odpowiedzi ------------------------------------------

/** Zwraca [{ url, where: ['Zakładka: Cennik', 'Odpowiedź: L4', ...] }] — tylko adresy http(s). */
export function collectLinks(config = {}) {
  const cfg = sanitizeConfig(config);
  const map = new Map();
  const add = (url, where) => {
    if (!/^https?:\/\//i.test(url || '')) return;
    if (!map.has(url)) map.set(url, new Set());
    map.get(url).add(where);
  };
  for (const p of Object.values(PAGES)) add(p.url, `Zakładka: ${p.label}`);
  for (const i of INTENTS) for (const l of i.answer.links || []) add(l.url, `Odpowiedź: ${INTENT_LABELS[i.id] || i.id}`);
  for (const l of defaultAnswer('fallback').links || []) add(l.url, 'Odpowiedź: gdy nie rozpozna pytania');
  for (const [id, o] of Object.entries(cfg.overrides)) {
    for (const l of o.links || []) add(l.url, `Zmieniona odpowiedź: ${INTENT_LABELS[id] || id}`);
  }
  for (const r of cfg.rules) for (const l of r.links) add(l.url, `Własna odpowiedź: ${r.name || r.phrases[0]}`);
  return [...map].map(([url, where]) => ({ url, where: [...where] }));
}

// Adres strony bez parametrów i kotwicy — kilka linków do tej samej strony pobieramy raz.
function pageKey(url) {
  const u = new URL(url);
  return `${u.origin}${u.pathname}`;
}

// --- Analiza HTML -------------------------------------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', oacute: 'ó' };

export function htmlToText(html) {
  return String(html)
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/[\s ]+/g, ' ')
    .trim();
}

function pageTitle(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? htmlToText(m[1]).slice(0, 120) : '';
}

function pageIds(html) {
  const ids = new Set();
  for (const m of String(html).matchAll(/\s(?:id|name)\s*=\s*["']([^"']+)["']/gi)) ids.add(m[1]);
  return ids;
}

function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function samePage(a, b) {
  const norm = (u) => {
    const x = new URL(u);
    return `${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/+$/, '')}`;
  };
  try {
    return norm(a) === norm(b);
  } catch {
    return false;
  }
}

// --- Pobieranie ---------------------------------------------------------------------

async function fetchPage(url, fetchImpl, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'LTChat-SiteCheck/1.0 (+kontrola linkow asystentki)', Accept: 'text/html,*/*' },
    });
    const type = res.headers.get('content-type') || '';
    let html = '';
    if (/html|text/i.test(type)) html = (await res.text()).slice(0, MAX_HTML);
    return { status: res.status, finalUrl: res.url || url, html };
  } catch (err) {
    return { status: 0, finalUrl: url, html: '', error: err.name === 'AbortError' ? 'przekroczony czas' : 'brak połączenia' };
  } finally {
    clearTimeout(timer);
  }
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

// --- Główna funkcja -------------------------------------------------------------------

/**
 * @param {object} opts
 * @param {object} [opts.config]    ustawienia panelu (własne odpowiedzi i nadpisania też mają linki)
 * @param {object} [opts.previous]  poprzedni raport — do wykrywania zmian treści
 * @param {Function} [opts.fetchImpl]
 * @returns {Promise<object>} raport
 */
export async function checkSite({ config = {}, previous = null, fetchImpl = fetch, concurrency = 5, timeoutMs = 15000 } = {}) {
  const links = collectLinks(config);
  const factPages = SITE_FACTS.map((f) => f.url);
  const keys = [...new Set([...links.map((l) => pageKey(l.url)), ...factPages.map(pageKey)])];
  const toFetch = keys.slice(0, MAX_PAGES);
  const skipped = keys.slice(MAX_PAGES);

  const fetched = await pool(toFetch, concurrency, (key) => fetchPage(key, fetchImpl, timeoutMs));
  const pages = {};
  toFetch.forEach((key, i) => {
    const r = fetched[i];
    const text = htmlToText(r.html);
    pages[key] = {
      status: r.status,
      finalUrl: r.finalUrl,
      error: r.error || '',
      title: pageTitle(r.html),
      hash: text.length >= MIN_TEXT ? hash(text) : '',
      readable: text.length >= MIN_TEXT,
      _text: text,
      _ids: pageIds(r.html),
    };
  });

  // 1. Linki
  const linkResults = links.map((l) => {
    const key = pageKey(l.url);
    const p = pages[key];
    const res = { url: l.url, where: l.where, level: 'ok', problem: '' };
    if (!p) return { ...res, level: 'info', problem: 'Nie sprawdzono (limit stron na jedno sprawdzenie).' };
    res.status = p.status;
    if (p.error) return { ...res, level: 'error', problem: `Strona nie odpowiada (${p.error}).` };
    if (p.status >= 400) return { ...res, level: 'error', problem: `Błąd ${p.status} — strona nie istnieje lub nie działa.` };
    if (!samePage(p.finalUrl, key)) {
      res.level = 'warn';
      res.problem = `Przekierowuje na inną stronę: ${p.finalUrl}`;
    }
    const hashPart = new URL(l.url).hash.slice(1);
    if (hashPart && p.readable && !p._ids.has(decodeURIComponent(hashPart))) {
      res.level = res.level === 'ok' ? 'warn' : res.level;
      res.problem = [res.problem, `Na stronie nie ma już sekcji „#${hashPart}” — link otworzy górę strony.`].filter(Boolean).join(' ');
    }
    return res;
  });

  // 2. Fakty
  const facts = SITE_FACTS.map((f) => {
    const p = pages[pageKey(f.url)];
    if (!p || p.error || p.status >= 400) return { label: f.label, url: f.url, state: 'unknown', note: 'Nie udało się pobrać strony.' };
    if (!p.readable) return { label: f.label, url: f.url, state: 'unknown', note: 'Strona jest generowana w przeglądarce — treści nie da się sprawdzić automatycznie.' };
    const found = new RegExp(f.pattern, 'i').test(p._text);
    return { label: f.label, url: f.url, state: found ? 'ok' : 'missing', note: found ? '' : 'Nie znaleziono na stronie — sprawdź, czy się nie zmieniło, i popraw odpowiedzi.' };
  });

  // 3. Zmiany treści od poprzedniego sprawdzenia (tylko strony kliniki)
  const host = new URL(SITE.base).hostname;
  const changes = [];
  for (const [key, p] of Object.entries(pages)) {
    const before = previous?.pages?.[key];
    if (!before?.hash || !p.hash || !key.includes(host)) continue;
    if (before.hash !== p.hash) changes.push({ url: key, title: p.title || key, since: previous.checkedAt });
  }

  // Raport bez dużych pól roboczych.
  const cleanPages = Object.fromEntries(
    Object.entries(pages).map(([k, p]) => [k, { status: p.status, finalUrl: p.finalUrl, error: p.error, title: p.title, hash: p.hash, readable: p.readable }]),
  );
  // Gdy żadna strona kliniki nie odpowiedziała — to problem z połączeniem albo cała strona nie działa.
  const host0 = new URL(SITE.base).hostname;
  const clinicPages = Object.entries(pages).filter(([k]) => k.includes(host0));
  const unreachable = clinicPages.length > 0 && clinicPages.every(([, p]) => p.error);

  const summary = {
    unreachable,
    links: linkResults.length,
    errors: linkResults.filter((l) => l.level === 'error').length,
    warnings: linkResults.filter((l) => l.level === 'warn').length,
    factsMissing: facts.filter((f) => f.state === 'missing').length,
    factsUnknown: facts.filter((f) => f.state === 'unknown').length,
    changed: changes.length,
    pages: toFetch.length,
    skipped: skipped.length,
  };
  return {
    checkedAt: new Date().toISOString(),
    ok: summary.errors === 0 && summary.factsMissing === 0,
    summary,
    links: linkResults,
    facts,
    changes,
    pages: cleanPages,
  };
}

// Krótki raport tekstowy (do konsoli i GitHub Actions).
export function formatReport(r) {
  const s = r.summary;
  const out = [];
  out.push(`Kontrola strony ${SITE.base} — ${new Date(r.checkedAt).toLocaleString('pl-PL')}`);
  if (s.unreachable) {
    out.push('', 'Nie udało się połączyć ze stroną kliniki — żadna podstrona nie odpowiedziała.', 'Sprawdź połączenie z internetem albo czy strona działa (może być chwilowo wyłączona).', '', 'Wynik: WYMAGA UWAGI');
    return out.join('\n');
  }
  out.push(`Linki: ${s.links} (błędy: ${s.errors}, ostrzeżenia: ${s.warnings}) · Fakty brakujące: ${s.factsMissing}, niesprawdzone: ${s.factsUnknown} · Zmienione strony: ${s.changed}`);
  const bad = r.links.filter((l) => l.level === 'error' || l.level === 'warn');
  if (bad.length) {
    out.push('', 'Problemy z linkami:');
    for (const l of bad) out.push(`  [${l.level === 'error' ? 'BŁĄD' : 'UWAGA'}] ${l.url}\n      ${l.problem}\n      Używany w: ${l.where.join('; ')}`);
  }
  const facts = r.facts.filter((f) => f.state !== 'ok');
  if (facts.length) {
    out.push('', 'Fakty:');
    for (const f of facts) out.push(`  [${f.state === 'missing' ? 'BRAK' : '?'}] ${f.label} — ${f.note}`);
  }
  if (r.changes.length) {
    out.push('', 'Strony zmienione od poprzedniego sprawdzenia:');
    for (const c of r.changes) out.push(`  ${c.title} — ${c.url}`);
  }
  out.push('', r.ok ? 'Wynik: OK' : 'Wynik: WYMAGA UWAGI');
  return out.join('\n');
}
