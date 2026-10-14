// Narzędzia tekstowe wspólne dla trzech asystentów (bot, ai, trained).
// Działa w przeglądarce i w Node (czysty moduł ES, bez zależności).

const DIACRITICS = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
};

// Małe litery, usunięcie polskich znaków i interpunkcji, zwinięcie powtórzeń
// (3 i więcej tych samych znaków: „boooli” → „boli”, „!!!” → „!”), scalenie spacji.
export function normalize(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/(.)\1{2,}/g, '$1')
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

// --- Dopasowanie fraz z tolerancją literówek (specyfikacja, pkt 8.5) ---------------
// Słowo pasuje do słowa kluczowego, gdy:
//   - jest identyczne (albo zaczyna się od niego, gdy klucz kończy się "*"),
//   - albo różni się o 1 literę (dodana, brakująca, zamieniona) — tylko dla słów kluczowych
//     od 5 liter (od 6 dla początków słów „xxx*”, żeby np. „zapalenie” nie dawało „zawał*”).
const FUZZY_MIN = 5;
const FUZZY_MIN_PREFIX = 6;

// Odległość Levenshteina, przerywana po przekroczeniu `max` (szybko dla krótkich słów).
export function editDistance(a, b, max = 1) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function wordMatches(token, word, prefix, fuzzy) {
  if (prefix ? token.startsWith(word) : token === word) return true;
  if (!fuzzy) return false;
  if (prefix) {
    if (word.length < FUZZY_MIN_PREFIX || token.length < word.length - 1) return false;
    for (let k = word.length - 1; k <= word.length + 1; k++) {
      if (k <= token.length && editDistance(token.slice(0, k), word) <= 1) return true;
    }
    return false;
  }
  return word.length >= FUZZY_MIN && token.length >= FUZZY_MIN && editDistance(token, word) <= 1;
}

/**
 * true, jeśli fraza (np. "nie moge oddychac", "dermatolog*") występuje w znormalizowanym tekście.
 * Frazy wielowyrazowe dopasowujemy słowo po słowie, każde z tolerancją literówki.
 * @param {string} normText  tekst po normalize()
 * @param {string} phrase    fraza bez polskich znaków; "*" na końcu = początek słowa; "=" na początku = bez literówek
 */
export function matchesPhrase(normText, phrase, { fuzzy = true } = {}) {
  const words = (Array.isArray(normText) ? normText : normText.split(' ')).filter(Boolean);
  // "=" na początku frazy = bez tolerancji literówek (gdy literówka zmienia sens, np. „połknąć”).
  if (phrase.startsWith('=')) {
    phrase = phrase.slice(1);
    fuzzy = false;
  }
  const prefix = phrase.endsWith('*');
  const parts = (prefix ? phrase.slice(0, -1) : phrase).split(' ').filter(Boolean);
  if (!parts.length) return false;
  outer: for (let i = 0; i + parts.length <= words.length; i++) {
    for (let j = 0; j < parts.length; j++) {
      const last = j === parts.length - 1;
      if (!wordMatches(words[i + j], parts[j], prefix && last, fuzzy)) continue outer;
    }
    return true;
  }
  return false;
}

// Jak containsAny, ale z tolerancją literówek.
export function matchesAny(normText, phrases, opts) {
  const words = normText.split(' ').filter(Boolean);
  return phrases.some((p) => matchesPhrase(words, p, opts));
}
