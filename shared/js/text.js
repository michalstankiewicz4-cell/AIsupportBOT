// Narzędzia tekstowe wspólne dla trzech asystentów (bot, ai, trained).
// Działa w przeglądarce i w Node (czysty moduł ES, bez zależności).

const DIACRITICS = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
};

// Małe litery, usunięcie polskich znaków i interpunkcji, scalenie spacji.
export function normalize(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => DIACRITICS[ch])
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Bardzo prosty polski "stemmer": obcina typowe końcówki fleksyjne, żeby
// "glowa", "glowy", "glowie" dawały podobny rdzeń.
// Najpierw najdłuższe końcówki. Słowa krótsze niż 5 znaków zostają bez zmian.
const SUFFIXES = [
  'owania', 'owanie', 'ami', 'ach', 'owi', 'ego', 'emu', 'ymi', 'imi',
  'ych', 'ich', 'iem', 'om', 'ow', 'ie', 'ia', 'iu', 'ej', 'em',
  'a', 'e', 'i', 'o', 'u', 'y',
];

export function stem(word) {
  if (word.length < 5) return word;
  for (const s of SUFFIXES) {
    if (word.endsWith(s) && word.length - s.length >= 4) {
      return word.slice(0, -s.length);
    }
  }
  return word;
}

// Popularne polskie słowa nieistotne dla kierowania (stop words).
const STOP = new Set([
  'i', 'w', 'z', 'na', 'do', 'od', 'po', 'za', 'o', 'u', 'a', 'ale', 'czy',
  'ze', 'sie', 'to', 'jest', 'jestem', 'mam', 'mi', 'mnie', 'moj', 'moja',
  'moje', 'jak', 'co', 'gdzie', 'kiedy', 'ktory', 'ktora', 'ktore', 'tak', 'nie', 'juz', 'jeszcze', 'bardzo', 'tez', 'tylko',
  'prosze', 'chce', 'chcialbym', 'chcialabym', 'moge', 'mozna', 'by', 'bym',
  'pan', 'pani', 'panstwo', 'ten', 'ta', 'te', 'tym', 'tego', 'sa', 'byc',
  'szukam', 'potrzebuje', 'problem', 'problemy', 'problemem', 'online', 'jakis', 'cos', 'czegos',
]);

// Podział na słowa (rdzenie), bez stop words.
export function tokens(input) {
  return normalize(input)
    .split(' ')
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

// Cechy dla klasyfikatora trained:
//   - rdzenie słów                ("dermatolog")
//   - 5-literowe początki słów  ("p:derma") — pomagają przy polskiej odmianie
//   - pary sąsiednich słów       ("bol_glow")
export function features(input) {
  const t = tokens(input);
  const out = [...t];
  for (const w of t) if (w.length > 5) out.push('p:' + w.slice(0, 5));
  for (let i = 0; i < t.length - 1; i++) out.push(t[i] + '_' + t[i + 1]);
  return out;
}

// true, jeśli którakolwiek (znormalizowana) fraza występuje w znormalizowanym tekście.
// Frazy dopasowujemy na granicach słów; "*" na końcu oznacza "początek słowa".
export function containsAny(normText, phrases) {
  const padded = ' ' + normText + ' ';
  return phrases.some((p) => {
    if (p.endsWith('*')) return padded.includes(' ' + p.slice(0, -1));
    return padded.includes(' ' + p + ' ');
  });
}
