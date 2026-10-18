// Paczka czatu do wgrania na własny serwer (np. hosting strony kliniki).
// Uruchom:  npm run paczka
// Tworzy folder paczka/aisupportbot/ z samymi plikami, które ładuje przeglądarka pacjenta
// (wszystkie trzy warianty: bot, ai, trained + uniwersalny embed.js) i plik WGRAJ.txt.
// Kod serwerów (ai/server, panel/server), panel administracyjny, dane treningowe,
// narzędzia i dokumentacja NIE trafiają do paczki.
// Folder paczka/ jest w .gitignore — nie trafia do repozytorium.
import { cpSync, rmSync, mkdirSync, writeFileSync, existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'paczka', 'aisupportbot');

// Pliki ładowane przez czat (sprawdzone po importach od embed.js i */embed.js).
const ITEMS = [
  'embed.js',
  'shared',
  'bot',
  'ai/embed.js', 'ai/ai-engine.js', 'ai/config.js', 'ai/turnstile.js', 'ai/version.js',
  'trained/embed.js', 'trained/trained-engine.js', 'trained/naive-bayes.js', 'trained/version.js', 'trained/model.json',
  // Wczytywanie ustawień (czat korzysta z tych modułów panelu) + plik ustawień.
  'panel/client.js', 'panel/config.js', 'panel/schema.js', 'panel/settings.json',
];

const missing = ITEMS.filter((i) => !existsSync(join(root, i)));
if (missing.length) {
  console.error(`Brak plików: ${missing.join(', ')} — paczka nie została utworzona.`);
  process.exit(1);
}

rmSync(join(root, 'paczka'), { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const item of ITEMS) cpSync(join(root, item), join(out, item), { recursive: true });

// Wersja wariantu z pliku */version.js (bez importu — bump.js mógł ją właśnie zmienić).
const version = (file) => /VERSION = '([^']+)'/.exec(readFileSync(join(root, file), 'utf8'))?.[1] ?? '?';

writeFileSync(
  join(out, 'WGRAJ.txt'),
  [
    `Asystent pacjenta — bot ${version('bot/version.js')}, trained ${version('trained/version.js')}, ai ${version('ai/version.js')}`,
    '',
    '1. Wgraj CAŁĄ zawartość tego folderu na serwer strony, do folderu /czat/',
    '   (tak, aby plik był pod adresem https://twoja-domena.pl/czat/embed.js),',
    '   z zachowaniem struktury folderów.',
    '2. Na stronie, przed </body>, wklej jedną linijkę, np. (bot regułowy):',
    '   <script src="/czat/bot/embed.js" defer></script>',
    '   albo uniwersalny skrypt sterowany z panelu:',
    '   <script src="/czat/embed.js" data-panel="https://…workers.dev" defer></script>',
    '   (jeśli wcześniej był adres github.io — zamień go na ten).',
    '3. Sprawdź: otwórz stronę, kliknij przycisk czatu, podaj imię, wpisz „cześć”.',
    '',
    'Aktualizacja ustawień (źródło „plik”): wgraj ponownie tylko panel/settings.json.',
    'Nowa wersja modelu trained: wgraj ponownie trained/model.json.',
    'Aktualizacja kodu: wgraj ponownie wszystko (nadpisz pliki).',
    'Ten plik (WGRAJ.txt) nie musi być na serwerze.',
    'Szczegóły: docs/WDROZENIE.md, „Własny serwer”.',
    '',
  ].join('\r\n'),
);

let files = 0;
let bytes = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else {
      files++;
      bytes += s.size;
    }
  }
})(out);
console.log(`Paczka gotowa: paczka/aisupportbot/ — ${files} plików, ${Math.round(bytes / 1024)} KB.`);
