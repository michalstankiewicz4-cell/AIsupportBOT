// Lokalny serwer plików — uruchamia panel sterowania i stronę demo na Twoim komputerze.
// Użycie: npm run panel     (albo: node tools/serve-local.js [port])
// Nasłuchuje WYŁĄCZNIE na 127.0.0.1, więc nikt z sieci (ani z internetu) nie ma do niego dostępu.
// Bez zależności — tylko wbudowane moduły Node.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSite } from '../panel/site-check.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HOST = '127.0.0.1';
const PORT = Number(process.argv[2] || process.env.PORT || 5050);

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
async function handleSiteCheck(req, res) {
  const local = [`localhost:${PORT}`, `127.0.0.1:${PORT}`];
  const origin = req.headers.origin || '';
  if (!local.includes(req.headers.host) || !local.some((h) => origin === `http://${h}`)) return send(res, 403, 'Forbidden');
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) return send(res, 413, 'Too large');
  }
  let input = {};
  try {
    input = JSON.parse(body || '{}');
  } catch {
    return send(res, 400, 'Bad JSON');
  }
  const report = await checkSite({ config: input.config, previous: input.previous });
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(report));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}`);
    if (url.pathname === '/api/site-check' && req.method === 'POST') return await handleSiteCheck(req, res);
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
  } catch {
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
  console.log('');
  console.log('  Serwer działa tylko na tym komputerze (127.0.0.1). Zatrzymanie: Ctrl+C');
});
