// Kontrola strony kliniki z wiersza poleceń: npm run check-site
// Sprawdza linki z odpowiedzi asystentki, fakty (ceny, telefon, godziny) i zmiany treści.
// Opcje:
//   --config plik.json   ustawienia panelu (np. wyeksportowane) — sprawdzi też linki z własnych odpowiedzi
//   --save               zapisze raport do .site-check.json (następne uruchomienie pokaże zmiany treści)
//   --json               wypisze pełny raport JSON zamiast tekstu
// Kod wyjścia 1 = są błędy linków albo brakujące fakty (GitHub Actions wyśle wtedy e-mail).
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { checkSite, formatReport } from '../panel/site-check.js';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const STATE = '.site-check.json';

const config = opt('--config') ? JSON.parse(readFileSync(opt('--config'), 'utf8')) : {};
const previous = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : null;

const report = await checkSite({ config, previous });
if (args.includes('--save')) writeFileSync(STATE, JSON.stringify(report, null, 2));
console.log(args.includes('--json') ? JSON.stringify(report, null, 2) : formatReport(report));
if (process.env.GITHUB_ACTIONS) githubOutput(report);
process.exit(report.ok ? 0 : 1);

// W GitHub Actions: adnotacje (widoczne na stronie uruchomienia) i czytelne podsumowanie (zakładka Summary).
function githubOutput(r) {
  const esc = (t) => String(t).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  const s = r.summary;
  console.log(`::notice title=Kontrola strony::Linki: ${s.links} (błędy ${s.errors}, ostrzeżenia ${s.warnings}) · fakty brakujące ${s.factsMissing}, niesprawdzone ${s.factsUnknown} · zmienione strony ${s.changed}`);
  if (s.unreachable) console.log('::error title=Brak połączenia::Żadna podstrona kliniki nie odpowiedziała.');
  for (const l of s.unreachable ? [] : r.links.filter((x) => x.level === 'error' || x.level === 'warn')) {
    console.log(`::${l.level === 'error' ? 'error' : 'warning'} title=${esc(l.url)}::${esc(`${l.problem} Używany w: ${l.where.join('; ')}`)}`);
  }
  for (const f of r.facts.filter((x) => x.state !== 'ok')) {
    console.log(`::${f.state === 'missing' ? 'error' : 'warning'} title=${esc(f.label)}::${esc(f.note)}`);
  }
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const icon = { ok: '✅', warn: '⚠️', error: '❌', info: 'ℹ️', missing: '❌', unknown: '❔' };
  const md = [
    `## Kontrola strony kliniki — ${r.ok ? '✅ OK' : '❌ wymaga uwagi'}`,
    '',
    `| Linki | Błędy | Ostrzeżenia | Fakty brakujące | Fakty niesprawdzone | Zmienione strony |`,
    `|---|---|---|---|---|---|`,
    `| ${s.links} | ${s.errors} | ${s.warnings} | ${s.factsMissing} | ${s.factsUnknown} | ${s.changed} |`,
    '',
    '### Fakty',
    ...r.facts.map((f) => `- ${icon[f.state]} ${f.label}${f.note ? ` — ${f.note}` : ''}`),
    '',
    '### Linki',
    '| Stan | Adres | Problem |',
    '|---|---|---|',
    ...r.links.map((l) => `| ${icon[l.level]} ${l.status ?? ''} | ${l.url} | ${l.problem || ''} |`),
  ];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.join('\n') + '\n');
}
