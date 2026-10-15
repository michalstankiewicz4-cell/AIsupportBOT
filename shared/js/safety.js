// Warstwa bezpieczeństwa — przypadki A i B ze specyfikacji. Działa PRZED każdym silnikiem
// (bot, ai, trained) i przed własnymi odpowiedziami z panelu, na KAŻDEJ wiadomości.
// Wykrywanie celowo opiera się na regułach i nigdy nie jest oddawane modelowi:
// przeoczony stan nagły to najgorszy możliwy błąd. Lepiej uruchomić alarm za często niż za rzadko.
// Wystarczy jedno trafienie frazy — bez analizy kontekstu. Frazy są dopasowywane z tolerancją
// literówek (shared/js/text.js). Listy do zatwierdzenia przez lekarza (specyfikacja, sekcja 11).
// Panel może dopisać frazy albo wyłączyć domyślne (setAlarmPhrases) — zmiany też zatwierdza lekarz.
import { normalize, matchesAny } from './text.js';
import { alarmReply } from './knowledge.js';

// B — kryzys psychiczny / myśli samobójcze (także o kimś bliskim).
export const CRISIS = [
  'zabic sie', 'sie zabic', 'zabije sie', 'sie zabije', 'zabil bym sie', 'zabilabym sie', 'zabilbym sie',
  'odebrac sobie zycie', 'odebrac zycie', 'samoboj*',
  'nie chce zyc', 'nie chce juz zyc', 'nie chce dluzej zyc', 'chce umrzec', 'chcialbym umrzec', 'chcialabym umrzec', 'wolal* umrzec',
  'nie mam po co zyc', 'nie ma po co zyc', 'po co zyc', 'mam dosc zycia', 'nie ma sensu zyc', 'zycie nie ma sensu', 'lepiej gdyby mnie nie bylo',
  'skonczyc ze soba', 'skoncze ze soba', 'skonczyc z tym wszystkim',
  'skrzywdzic sie', 'sie skrzywdzic', 'skrzywdze sie', 'okalecz*', 'samookalecz*', 'tne sie', 'sie tne', 'ciac sie', 'pocielam sie', 'pocialem sie',
  'powiesic sie', 'skoczyc z mostu', 'rzucic sie pod',
  // uzupełnienia po audycie (15.10.2026) — do zatwierdzenia przez lekarza
  'zrobie sobie krzywde', 'zrobic sobie krzywde', 'zrobilam sobie krzywde', 'zrobilem sobie krzywde',
  'nie widze sensu zycia', 'nie widze sensu zyc', 'nie widze sensu dalej zyc', 'nie chce sie obudzic',
  'skoczyc z okna', 'skocze z okna', 'wyskocz* z okna', 'skoczyc z dachu', 'skocze z mostu',
  'ze soba skonczyc', 'skonczyc z zyciem', 'gdybym umarl*', 'gdybym nie zyl*', 'lepiej gdybym umarl*',
  'zegnajcie', 'zegnam was', 'pociac sie', 'sie pociac', 'potne sie', 'sie potne', 'pocne sie',
];

// A — zagrożenie życia, objawy fizyczne.
export const EMERGENCY = [
  // ból w klatce piersiowej
  'bol w klatce', 'bolu w klatce', 'boli w klatce', 'boli mnie w klatce', 'bola mnie w klatce', 'w klatce piersiowej boli', 'klatka piersiowa boli', 'klatke piersiowa boli', 'bol klatki', 'bola mnie klatka', 'boli mnie klatka', 'ucisk w klatce', 'kluje w klatce', 'piecze w klatce', 'zawal*',
  // duszność
  'dusze sie', 'dusi mnie', 'dusi sie', 'nie moge oddychac', 'nie mam czym oddychac', 'brak tchu', 'brakuje mi tchu', 'nie moge zlapac oddechu', 'nie moge zlapac tchu', 'sie dusi', 'dusznosc*', 'dusznosci',
  // serce
  'boli mnie serce', 'bol serca', 'bol w sercu', 'kluje mnie serce', 'dretwieje lewa reka', 'dretwieje mi lewa reka', 'dretwienie lewej reki',
  // udar („=nie moge mowic” — bez literówek, bo „nie mogę umówić” to nie objaw udaru)
  'udar*', 'opadniety kacik', 'opadl kacik', 'opada kacik', 'kacik ust', 'belkocze', 'belkotliw*', 'niedowlad*', 'nie czuje reki', 'nie czuje nogi', 'zaburzenia mowy', '=nie moge mowic',
  'twarz mi opadla', 'opadla mi twarz', 'opadla twarz', 'opadniet* twarz', 'krzywa twarz', 'wykrzywila sie twarz',
  // utrata przytomności, drgawki
  'stracil przytomnosc', 'stracila przytomnosc', 'stracilem przytomnosc', 'stracilam przytomnosc', 'utrata przytomnosci', 'nieprzytomn*', 'zemdlal*', 'omdlen*', 'mdleje',
  'drgawk*', 'atak padaczki',
  // krwawienie
  'silne krwawienie', 'mocno krwawi', 'mocno krwawie', 'krwawie mocno', 'krwawi mocno', 'silnie krwawi*', 'nie moge zatamowac', 'krwotok*', 'wymiotuje krwia', 'kaszle krwia',
  // zatrucie / przedawkowanie
  // „=” przy zatrul*/zatruci* — bez literówek, bo „zatrudnienie” to nie zatrucie
  'przedawkow*', 'zatrucie', '=zatrul*', '=zatruci*', 'czadem', '=polknal*', '=polknel*', 'za duzo tabletek', 'za duzo lekow', 'za duzo leku', 'za duzo pigulek',
  'za duzo narkotyk*', 'za duzo dopalacz*', 'za duzo amfetamin*', 'za duzo kokain*', 'za duzo heroin*', 'za duzo alkoholu i tabletek', 'za duzo alkoholu i lekow', 'przecpal*',
  'nalykal*',
  // ciężka reakcja alergiczna
  'obrzek gardla', 'obrzek jezyka', 'puchnie gardlo', 'puchnie jezyk', 'spuchl jezyk', 'spuchlo gardlo', 'wstrzas anafilakt*', 'anafilaks*',
  'puchnie mi twarz', 'puchnie twarz', 'spuchla mi twarz', 'spuchla twarz', 'obrzek twarzy',
  // gorączka u niemowlęcia
  'goraczka u niemowl*', 'niemowle ma goraczk*', 'niemowlak ma goraczk*', 'niemowle goraczkuje',
  // nagły, „najgorszy w życiu” ból głowy
  'najgorszy bol glowy', 'nagly silny bol glowy', 'nagly bol glowy', 'najgorszy w zyciu bol',
  // wypadek („=” — bez literówek, bo „potrącono mi pieniądze” to nie wypadek)
  '=potracil*', '=potracony', '=potracona', 'wypadek samochodow*', 'wypadku samochodow*', 'wypadek drogow*', 'wypadku drogow*',
  'spadl* z wysokosci', 'spadl* z dachu', 'spadl* z drabiny', 'spadl* ze schodow',
];

// Wiele tabletek naraz, np. „wzięłam 20 tabletek” (wzięłam/łyknęłam/połknęłam/zażyłam + liczba 10 lub więcej).
// Sama liczba nie wystarcza — „recepta na 30 tabletek” to zwykłe pytanie.
const MANY_PILLS = /(^| )(wzi[ae]l\w*|lykn\w*|polkn\w*|zazyl\w*|nalykal\w*) ([1-9]\d+) (tabletek|tabletki|tabl|pigulek|pastylek|kapsulek|lekow)( |$)/;

// Wariant B „o osobie bliskiej” — wiadomość mówi o kimś innym (specyfikacja, karta B).
const CLOSE_PERSON = [
  'syn', 'syna', 'synowi', 'corka', 'corki', 'corce', 'maz', 'meza', 'mezowi', 'zona', 'zony', 'zonie', 'partner*', 'chlopak', 'dziewczyna',
  'przyjaciel*', 'kolega', 'kolegi', 'kolezank*', 'brat', 'brata', 'siostr*', 'mama', 'mamy', 'mamie', 'tata', 'taty', 'tacie', 'ojciec', 'ojca', 'matka', 'matki',
  'dziecko', 'dziecka', 'dzieci', 'babcia', 'dziadek', 'znajom*', 'sasiad*', 'mowi ze', 'mowi', 'twierdzi', 'grozi ze', 'pisze ze',
];

// Zmiany z panelu (zakładka „Tematy” → „Słowa alarmowe”): { A: { add, remove }, B: { add, remove } }.
// Domyślne listy powyżej zostają nietknięte — aktywne listy liczymy od nowa przy każdej zmianie.
export const DEFAULT_ALARM_PHRASES = Object.freeze({ A: EMERGENCY, B: CRISIS });
let active = { A: EMERGENCY, B: CRISIS };
export function setAlarmPhrases(cfg = {}) {
  const build = (key) => {
    const c = cfg?.[key] || {};
    const remove = new Set(Array.isArray(c.remove) ? c.remove : []);
    const add = Array.isArray(c.add) ? c.add : [];
    return [...DEFAULT_ALARM_PHRASES[key].filter((p) => !remove.has(p)), ...add.filter((p) => !DEFAULT_ALARM_PHRASES[key].includes(p))];
  };
  active = { A: build('A'), B: build('B') };
}
export function alarmPhrases(key) {
  return active[key];
}

/**
 * Zwraca gotową odpowiedź (karta alarmowa + komunikat 2), jeśli wiadomość wymaga pilnej reakcji,
 * w przeciwnym razie null. B ma pierwszeństwo przed A.
 * @param {string} message
 * @param {object} [opts] { supportLine } — linia z telefonem wsparcia w B (decyzja właściciela, panel)
 */
export function checkSafety(message, opts = {}) {
  const t = normalize(message);
  if (matchesAny(t, active.B)) {
    return alarmReply('B', { closePerson: matchesAny(t, CLOSE_PERSON, { fuzzy: false }), supportLine: Boolean(opts.supportLine) });
  }
  if (matchesAny(t, active.A) || MANY_PILLS.test(t)) return alarmReply('A');
  return null;
}

// Podstawowe czyszczenie wejścia, wspólne dla wszystkich silników.
export const MAX_INPUT_CHARS = 500;
export function cleanInput(message) {
  return String(message || '').replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT_CHARS);
}
