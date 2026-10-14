// Lokalny serwer plików — uruchamia panel sterowania i stronę demo na Twoim komputerze.
// Użycie: npm run panel     (albo: node tools/serve-local.js [port])
// Nasłuchuje WYŁĄCZNIE na 127.0.0.1, więc nikt z sieci (ani z internetu) nie ma do niego dostępu.
// Bez zależności — tylko wbudowane moduły Node.
import { createServer } from 'node:http';
import { readFile, stat, writeFile, rename, mkdir, readdir, unlink, copyFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSite } from '../panel/site-check.js';
import { wrapSettings, unwrapSettings, DEFAULT_CONFIG } from '../panel/schema.js';
import { cleanDataset, buildModel, evaluate, describeChanges, countExamples } from '../trained/trainer.js';
import { bumpVariants, readVariantVersion } from './versioning.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HOST = '127.0.0.1';
const PORT = Number(process.argv[2] || process.env.PORT || 5050);
// Ścieżki można zmienić zmiennymi środowiskowymi (używane w testach).
const SETTINGS_FILE = process.env.LT_SETTINGS_FILE || join(ROOT, 'panel', 'settings.json');
const BACKUP_DIR = process.env.LT_BACKUP_DIR || join(ROOT, 'panel', 'backups');
const BACKUPS_KEEP = 30;
const TRAINING_FILE = process.env.LT_TRAINING_FILE || join(ROOT, 'trained', 'data', 'training.json');
const MODEL_FILE = process.env.LT_MODEL_FILE || join(ROOT, 'trained', 'model.json');
const SKIP_BUMP = process.env.LT_SKIP_BUMP === '1'; // tylko testy: bez zmiany wersji i CHANGES.md

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
};

// Kontrola strony (przycisk „Sprawdź teraz” w panelu w trybie lokalnym).
// Przeglądarka nie może sama pobrać strony kliniki (blokada CORS), więc robi to ten serwer.
// Przyjmujemy tylko zapytania z samego panelu (Host i Origin = localhost), żeby żadna
// inna strona otwarta w przeglądarce nie mogła tego wywołać.
// Zapytanie z samego panelu? Host musi być lokalny (ochrona przed „DNS rebinding”),
// a przy zapisie także Origin (żadna inna strona otwarta w przeglądarce nie może zapisać).
function isLocalRequest(req, requireOrigin) {
  const local = [`localhost:${PORT}`, `127.0.0.1:${PORT}`];
  if (!local.includes(req.headers.host)) return false;
  if (!requireOrigin) return true;
  return local.some((h) => (req.headers.origin || '') === `http://${h}`);
}

async function readJsonBody(req, max = 1_000_000) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > max) throw Object.assign(new Error('too large'), { status: 413 });
  }
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw Object.assign(new Error('bad json'), { status: 400 });
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function handleSiteCheck(req, res) {
  if (!isLocalRequest(req, true)) return send(res, 403, 'Forbidden');
  const input = await readJsonBody(req);
  sendJson(res, 200, await checkSite({ config: input.config, previous: input.previous }));
}

// Kopia zapasowa pliku przed nadpisaniem (ostatnie BACKUPS_KEEP kopii danego rodzaju).
async function backup(file, prefix) {
  await mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await copyFile(file, join(BACKUP_DIR, `${prefix}-${stamp}.json`)).catch(() => {});
  const old = (await readdir(BACKUP_DIR)).filter((f) => f.startsWith(`${prefix}-`)).sort();
  await Promise.all(old.slice(0, Math.max(0, old.length - BACKUPS_KEEP)).map((f) => unlink(join(BACKUP_DIR, f))));
}

// Zapis „atomowy”: najpierw plik tymczasowy, potem podmiana — plik nigdy nie zostanie uszkodzony w połowie.
async function writeAtomic(file, text) {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, text);
  await rename(tmp, file);
}

// Zakładka „Nauka”: odczyt danych treningowych oraz zapis + trening modelu.
// Po zapisie: kopia poprzednich danych w panel/backups/, nowa wersja „trained” (patch)
// z wpisem w CHANGES.md i nowy trained/model.json — wersjonowanie pilnuje się samo.
async function handleTraining(req, res) {
  if (req.method === 'GET') {
    if (!isLocalRequest(req, false)) return send(res, 403, 'Forbidden');
    const raw = JSON.parse(await readFile(TRAINING_FILE, 'utf8'));
    return sendJson(res, 200, { dataset: cleanDataset(raw).dataset, version: readVariantVersion('trained') });
  }
  if (req.method === 'PUT') {
    if (!isLocalRequest(req, true)) return send(res, 403, 'Forbidden');
    const body = await readJsonBody(req, 3_000_000);
    const { dataset, unknown } = cleanDataset(body.dataset);
    if (unknown.length) return sendJson(res, 400, { error: `Nieznane tematy: ${unknown.join(', ')}` });
    if (countExamples(dataset) === 0) return sendJson(res, 400, { error: 'Brak przykładów — model nie może się uczyć z pustych danych.' });
    const before = cleanDataset(JSON.parse(await readFile(TRAINING_FILE, 'utf8'))).dataset;
    const change = describeChanges(before, dataset);
    await backup(TRAINING_FILE, 'training');
    await writeAtomic(TRAINING_FILE, JSON.stringify(dataset, null, 2) + '\n');
    if (!SKIP_BUMP) bumpVariants(['trained'], 'patch', `Nauka w panelu: ${change.text}.`);
    const version = SKIP_BUMP ? 'test' : readVariantVersion('trained');
    await writeAtomic(MODEL_FILE, JSON.stringify(buildModel(dataset, version)));
    const ev = evaluate(dataset);
    return sendJson(res, 200, { version, accuracy: ev.accuracy, correct: ev.correct, total: ev.total, examples: countExamples(dataset), added: change.added, removed: change.removed });
  }
  return send(res, 405, 'Method not allowed');
}

// Źródło „plik”: panel czyta i zapisuje panel/settings.json na dysku.
// Przed każdym zapisem poprzednia wersja trafia do panel/backups/ (ostatnie 30 kopii).
async function handleSettings(req, res) {
  if (req.method === 'GET') {
    if (!isLocalRequest(req, false)) return send(res, 403, 'Forbidden');
    try {
      return sendJson(res, 200, JSON.parse(await readFile(SETTINGS_FILE, 'utf8')));
    } catch {
      return sendJson(res, 200, wrapSettings(DEFAULT_CONFIG)); // brak pliku = ustawienia domyślne
    }
  }
  if (req.method === 'PUT') {
    if (!isLocalRequest(req, true)) return send(res, 403, 'Forbidden');
    let config;
    try {
      config = unwrapSettings(await readJsonBody(req));
    } catch (err) {
      return sendJson(res, err.status || 400, { error: err.message });
    }
    config.updatedAt = new Date().toISOString();
    const data = wrapSettings(config);
    await mkdir(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await copyFile(SETTINGS_FILE, join(BACKUP_DIR, `settings-${stamp}.json`)).catch(() => {});
    const old = (await readdir(BACKUP_DIR)).filter((f) => f.startsWith('settings-')).sort();
    await Promise.all(old.slice(0, Math.max(0, old.length - BACKUPS_KEEP)).map((f) => unlink(join(BACKUP_DIR, f))));
    // Zapis „atomowy”: najpierw plik tymczasowy, potem podmiana — plik nigdy nie zostanie uszkodzony w połowie.
    const tmp = `${SETTINGS_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2) + '\n');
    await rename(tmp, SETTINGS_FILE);
    return sendJson(res, 200, data);
  }
  return send(res, 405, 'Method not allowed');
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}`);
    if (url.pathname === '/api/site-check' && req.method === 'POST') return await handleSiteCheck(req, res);
    if (url.pathname === '/api/settings') return await handleSettings(req, res);
    if (url.pathname === '/api/training') return await handleTraining(req, res);
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    // Ochrona przed wyjściem poza katalog projektu i przed plikami ukrytymi (.git itp.).
    if (path.split(/[/\\]/).some((part) => part.startsWith('.'))) return send(res, 404, 'Not found');
    let file = join(ROOT, path);
    if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep) && file !== ROOT) return send(res, 404, 'Not found');
    const info = await stat(file).catch(() => null);
    if (info?.isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(301, { Location: url.pathname + '/' });
        return res.end();
      }
      file = join(file, 'index.html');
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (err) {
    if (err?.status) return send(res, err.status, err.message);
    send(res, 404, 'Not found');
  }
});

function send(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

server.listen(PORT, HOST, () => {
  console.log('');
  console.log(`  Panel sterowania:   http://localhost:${PORT}/panel/admin/`);
  console.log(`  Porównanie czatów:  http://localhost:${PORT}/`);
  console.log(`  Czat na stronie:    http://localhost:${PORT}/demo/floating.html?variant=auto`);
  console.log(`  Plik ustawień:      ${SETTINGS_FILE}`);
  console.log('');
  console.log('  Serwer działa tylko na tym komputerze (127.0.0.1). Zatrzymanie: Ctrl+C');
});
