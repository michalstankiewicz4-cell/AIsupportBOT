// Kontrola strony kliniki z wiersza poleceń: npm run check-site
// Sprawdza linki z odpowiedzi asystentki, fakty (ceny, telefon, godziny) i zmiany treści.
// Opcje:
//   --config plik.json   ustawienia panelu (np. wyeksportowane) — sprawdzi też linki z własnych odpowiedzi
//   --save               zapisze raport do .site-check.json (następne uruchomienie pokaże zmiany treści)
//   --json               wypisze pełny raport JSON zamiast tekstu
// Kod wyjścia 1 = są błędy linków albo brakujące fakty (GitHub Actions wyśle wtedy e-mail).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
process.exit(report.ok ? 0 : 1);
