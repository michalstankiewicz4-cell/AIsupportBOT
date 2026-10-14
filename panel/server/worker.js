// Serwer panelu sterowania — Cloudflare Worker z bazą Cloudflare D1.
//
// Publicznie (dla widżetu na stronie kliniki) dostępne są tylko dwie rzeczy:
//   GET  /config  — aktualne ustawienia: tryb pracy, własne odpowiedzi, poziom rejestracji
//   POST /log     — zapis jednej wymiany do rejestru (przycinany według poziomu i zgody)
//
// Część administracyjna (/admin/...) jest niedostępna z zewnątrz:
//   - wymaga hasła (sekret ADMIN_PASSWORD, nagłówek Authorization: Bearer ...),
//   - opcjonalnie tylko z wybranych adresów IP (ADMIN_IPS) — dla innych zwraca 404,
//     jakby nie istniała,
//   - przeglądarka może ją wywołać tylko z panelu uruchomionego lokalnie (ADMIN_ORIGINS),
//   - po 10 błędnych hasłach z jednego IP blokada na 15 minut.
// Na produkcji zalecamy dodatkowo Cloudflare Access na ścieżce /admin/* (patrz docs/PANEL.md).
//
// Codziennie (cron) serwer usuwa stare wpisy rejestru i sprawdza stronę kliniki
// (linki z odpowiedzi, ceny, telefon, zmiany treści) — wynik widać w panelu w zakładce „Kontrola strony”.
//
// Zmienne (wrangler.toml / sekrety):
//   DB               baza D1 (binding)
//   ADMIN_PASSWORD   sekret, wymagany do części administracyjnej
//   ALLOWED_ORIGINS  strony, z których widżet może wysyłać wpisy do rejestru
//   ADMIN_ORIGINS    skąd może działać panel (domyślnie tylko localhost:5050)
//   ADMIN_IPS        opcjonalnie: lista IP, z których wolno wejść do /admin
import { sanitizeConfig, publicConfig, filterLogEntry, DEFAULT_CONFIG } from '../schema.js';
import { checkSite } from '../site-check.js';

const LOG_RATE_LIMIT = 60; // wpisów na minutę z jednego IP
const MAX_BODY = 8 * 1024; // maks. rozmiar wpisu
const MAX_CONFIG_BODY = 512 * 1024; // maks. rozmiar ustawień
const ADMIN_FAIL_LIMIT = 10; // błędnych haseł w oknie czasowym
const ADMIN_FAIL_WINDOW = 15 * 60 * 1000;
const DEFAULT_ADMIN_ORIGINS = 'http://localhost:5050,http://127.0.0.1:5050';
const LOGS_MAX_ROWS = 5000;

const logHits = new Map();
const adminFails = new Map();
let schemaReady = false;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    try {
      await ensureSchema(env.DB);

      if (path.startsWith('/admin')) return await handleAdmin(request, env, url, path, ip);

      const cors = publicCors(request, env);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

      if (path === '/config' && request.method === 'GET') {
        const cfg = publicConfig(await readConfig(env.DB));
        return json(cfg, 200, { ...cors, 'Cache-Control': 'public, max-age=60' });
      }

      if (path === '/log' && request.method === 'POST') {
        if (!originAllowed(request, env.ALLOWED_ORIGINS)) return json({ error: 'forbidden_origin' }, 403, cors);
        if (limited(logHits, ip, LOG_RATE_LIMIT, 60_000)) return json({ error: 'rate_limited' }, 429, cors);
        const body = await readBody(request, MAX_BODY);
        if (body === null) return json({ error: 'bad_request' }, 400, cors);
        const entry = filterLogEntry(body, await readConfig(env.DB));
        if (entry) await insertLog(env.DB, entry);
        return new Response(null, { status: 204, headers: cors });
      }

      return json({ error: 'not_found' }, 404, cors);
    } catch (err) {
      console.error('panel error', err);
      return json({ error: 'server_error' }, 500, publicCors(request, env));
    }
  },

  // Codziennie: usuwa wpisy starsze niż czas przechowywania i sprawdza stronę kliniki.
  async scheduled(_event, env, ctx) {
    await ensureSchema(env.DB);
    await purgeOld(env.DB);
    const run = runSiteCheck(env.DB).catch((err) => console.error('site-check', err));
    if (ctx?.waitUntil) ctx.waitUntil(run);
    else await run;
  },
};

// --- Część administracyjna --------------------------------------------------------

async function handleAdmin(request, env, url, path, ip) {
  // Spoza dozwolonych IP — udajemy, że nic tu nie ma.
  const ips = list(env.ADMIN_IPS);
  if (ips.length && !ips.includes(ip)) return new Response('Not found', { status: 404 });

  const cors = adminCors(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (!env.ADMIN_PASSWORD) return new Response('Not found', { status: 404 });

  if (isBlocked(ip)) return json({ error: 'too_many_attempts' }, 429, cors);
  if (!(await passwordOk(request, env.ADMIN_PASSWORD))) {
    registerFail(ip);
    return json({ error: 'unauthorized' }, 401, cors);
  }
  adminFails.delete(ip);

  if (path === '/admin/config' && request.method === 'GET') {
    return json(await readConfig(env.DB), 200, cors);
  }
  if (path === '/admin/config' && request.method === 'PUT') {
    const body = await readBody(request, MAX_CONFIG_BODY);
    if (body === null) return json({ error: 'bad_request' }, 400, cors);
    const cfg = sanitizeConfig({ ...body, updatedAt: new Date().toISOString() });
    await writeConfig(env.DB, cfg);
    await purgeOld(env.DB); // krótszy czas przechowywania działa od razu
    return json(cfg, 200, cors);
  }
  if (path === '/admin/logs' && request.method === 'GET') {
    const days = clampInt(url.searchParams.get('days'), 1, 365, 30);
    const from = Date.now() - days * 86400000;
    const { results } = await env.DB
      .prepare('SELECT id, ts, session, variant, version, intent, source, degraded, consent, question, answer FROM logs WHERE ts >= ? ORDER BY ts DESC LIMIT ?')
      .bind(from, LOGS_MAX_ROWS)
      .all();
    return json({ logs: results.map((r) => ({ ...r, consent: Boolean(r.consent) })), days, max: LOGS_MAX_ROWS }, 200, cors);
  }
  if (path === '/admin/site-check' && request.method === 'GET') {
    return json((await readSetting(env.DB, 'sitecheck')) || null, 200, cors);
  }
  if (path === '/admin/site-check' && request.method === 'POST') {
    return json(await runSiteCheck(env.DB), 200, cors);
  }
  if (path === '/admin/logs' && request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM logs').run();
    return json({ ok: true }, 200, cors);
  }
  return json({ error: 'not_found' }, 404, cors);
}

// Porównanie hasła w stałym czasie (przez skróty SHA-256), żeby nie dało się go zgadywać po czasie odpowiedzi.
async function passwordOk(request, expected) {
  const auth = request.headers.get('Authorization') || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!given) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function isBlocked(ip) {
  const f = adminFails.get(ip);
  return Boolean(f && f.count >= ADMIN_FAIL_LIMIT && Date.now() - f.since < ADMIN_FAIL_WINDOW);
}
function registerFail(ip) {
  const f = adminFails.get(ip);
  if (!f || Date.now() - f.since > ADMIN_FAIL_WINDOW) adminFails.set(ip, { count: 1, since: Date.now() });
  else f.count++;
}

// --- Baza danych ------------------------------------------------------------------

async function ensureSchema(db) {
  if (schemaReady) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)').run();
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, session TEXT, variant TEXT, version TEXT, intent TEXT, source TEXT, degraded TEXT, consent INTEGER NOT NULL DEFAULT 0, question TEXT, answer TEXT)',
    )
    .run();
  await db.prepare('CREATE INDEX IF NOT EXISTS logs_ts ON logs(ts)').run();
  schemaReady = true;
}

async function readSetting(db, key) {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  try {
    return row ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}

async function writeSetting(db, key, value) {
  await db
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key, JSON.stringify(value), Date.now())
    .run();
}

// Kontrola strony: porównuje z poprzednim raportem i zapisuje nowy.
async function runSiteCheck(db) {
  const previous = await readSetting(db, 'sitecheck');
  const report = await checkSite({ config: await readConfig(db), previous });
  await writeSetting(db, 'sitecheck', report);
  return report;
}

async function readConfig(db) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'config'").first();
  if (!row) return sanitizeConfig(DEFAULT_CONFIG);
  try {
    return sanitizeConfig(JSON.parse(row.value));
  } catch {
    return sanitizeConfig(DEFAULT_CONFIG);
  }
}

async function writeConfig(db, cfg) {
  await db
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES ('config', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(JSON.stringify(cfg), Date.now())
    .run();
}

async function insertLog(db, e) {
  await db
    .prepare('INSERT INTO logs (ts, session, variant, version, intent, source, degraded, consent, question, answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(Date.now(), e.session, e.variant, e.version, e.intent, e.source, e.degraded, e.consent ? 1 : 0, e.question, e.answer)
    .run();
}

async function purgeOld(db) {
  const cfg = await readConfig(db);
  const minTs = Date.now() - cfg.logging.retentionDays * 86400000;
  await db.prepare('DELETE FROM logs WHERE ts < ?').bind(minTs).run();
}

// --- Funkcje pomocnicze --------------------------------------------------------------

function list(value) {
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function originAllowed(request, allowed) {
  const origins = list(allowed);
  if (!origins.length) return true;
  return origins.includes(request.headers.get('Origin') || '');
}

function publicCors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const origins = list(env.ALLOWED_ORIGINS);
  return {
    'Access-Control-Allow-Origin': !origins.length ? '*' : origins.includes(origin) ? origin : origins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function adminCors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const origins = list(env.ADMIN_ORIGINS || DEFAULT_ADMIN_ORIGINS);
  return {
    'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

function limited(map, key, max, windowMs) {
  const now = Date.now();
  const recent = (map.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  map.set(key, recent);
  return recent.length > max;
}

async function readBody(request, max) {
  const text = await request.text();
  if (!text || text.length > max) return null;
  try {
    const data = JSON.parse(text);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function json(obj, status, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// Tylko do testów: zeruje pamięć podręczną schematu i liczniki.
export function _resetForTests() {
  schemaReady = false;
  logHits.clear();
  adminFails.clear();
}
