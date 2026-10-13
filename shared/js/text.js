// Text utilities shared by all three assistants (bot, ai, trained).
// Works both in the browser and in Node (pure ES module, no dependencies).

const DIACRITICS = {
  'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
  'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
};

// Lowercase, strip Polish diacritics and punctuation, collapse whitespace.
export function normalize(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => DIACRITICS[ch])
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Very light Polish "stemmer": trims common inflection endings so that
// "glowa", "glowy", "glowie" end up close to each other.
// Longest suffixes first. Words shorter than 5 chars are left untouched.
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

// Common Polish stop words that carry no routing signal.
const STOP = new Set([
  'i', 'w', 'z', 'na', 'do', 'od', 'po', 'za', 'o', 'u', 'a', 'ale', 'czy',
  'ze', 'sie', 'to', 'jest', 'jestem', 'mam', 'mi', 'mnie', 'moj', 'moja',
  'moje', 'jak', 'co', 'gdzie', 'kiedy', 'ktory', 'ktora', 'ktore', 'tak', 'nie', 'juz', 'jeszcze', 'bardzo', 'tez', 'tylko',
  'prosze', 'chce', 'chcialbym', 'chcialabym', 'moge', 'mozna', 'by', 'bym',
  'pan', 'pani', 'panstwo', 'ten', 'ta', 'te', 'tym', 'tego', 'sa', 'byc',
  'szukam', 'potrzebuje', 'problem', 'problemy', 'problemem', 'online', 'jakis', 'cos', 'czegos',
]);

// Tokenize into stemmed unigrams (stop words removed).
export function tokens(input) {
  return normalize(input)
    .split(' ')
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

// Features for the trained classifier:
//   - stemmed unigrams          ("dermatolog")
//   - 5-letter word prefixes    ("p:derma") — helps with Polish inflection
//   - bigrams                   ("bol_glow")
export function features(input) {
  const t = tokens(input);
  const out = [...t];
  for (const w of t) if (w.length > 5) out.push('p:' + w.slice(0, 5));
  for (let i = 0; i < t.length - 1; i++) out.push(t[i] + '_' + t[i + 1]);
  return out;
}

// True if any of the (already normalized) phrases occurs in the normalized text.
// Phrases are matched on word boundaries; a trailing "*" means "prefix".
export function containsAny(normText, phrases) {
  const padded = ' ' + normText + ' ';
  return phrases.some((p) => {
    if (p.endsWith('*')) return padded.includes(' ' + p.slice(0, -1));
    return padded.includes(' ' + p + ' ');
  });
}
