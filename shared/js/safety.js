// Warstwa bezpieczeństwa — działa PRZED każdym silnikiem (bot, ai, trained).
// Wykrywanie stanów nagłych celowo opiera się na regułach i nigdy nie jest oddawane
// modelowi: przeoczony stan nagły to najgorszy możliwy błąd tego asystenta.
import { normalize, containsAny } from './text.js';
import { EMERGENCY_REPLY, CRISIS_REPLY } from './knowledge.js';

// Sygnały myśli samobójczych / samookaleczenia -> telefony kryzysowe + 112.
const CRISIS = [
  'zabic sie', 'zabije sie', 'odebrac sobie zycie', 'odebrac zycie', 'samoboj*',
  'nie chce zyc', 'nie chce juz zyc', 'nie chce dluzej zyc', 'skonczyc ze soba', 'skoncze ze soba',
  'skrzywdzic sie', 'skrzywdze sie', 'okalecz*', 'samookalecz*', 'tne sie', 'ciac sie',
  'powiesic sie', 'skoczyc z mostu', 'nie ma sensu zyc', 'lepiej gdyby mnie nie bylo',
];

// Ostre stany nagłe -> 112 / SOR.
const EMERGENCY = [
  'bol w klatce', 'boli w klatce', 'boli mnie w klatce', 'bol klatki', 'bola mnie klatka', 'ucisk w klatce', 'zawal*',
  'dusze sie', 'dusi mnie', 'nie moge oddychac', 'brak tchu', 'nie moge zlapac oddechu', 'dusznosc*',
  'udar*', 'opadniety kacik', 'opadl kacik', 'belkocze', 'belkotliw*', 'niedowlad*', 'nie czuje reki', 'nie czuje nogi',
  'stracil przytomnosc', 'stracila przytomnosc', 'utrata przytomnosci', 'nieprzytomn*', 'zemdlal*',
  'drgawk*', 'atak padaczki',
  'silne krwawienie', 'krwotok*', 'wymiotuje krwia', 'kaszle krwia',
  'przedawkow*', 'zatrucie grzyb*', 'zatrucie lek*', 'zatrucie czad*', 'czadem', 'polknal', 'polknela',
  'obrzek gardla', 'puchnie gardlo', 'puchnie jezyk', 'wstrzas anafilakt*', 'anafilaks*',
  'najgorszy bol glowy', 'nagly silny bol glowy',
  'potracil*', 'potracony', 'potracona',
];

// Zwraca gotową odpowiedź, jeśli wiadomość wymaga pilnej reakcji,
// w przeciwnym razie null.
export function checkSafety(message) {
  const t = normalize(message);
  if (containsAny(t, CRISIS)) return { ...CRISIS_REPLY, intent: 'crisis' };
  if (containsAny(t, EMERGENCY)) return { ...EMERGENCY_REPLY, intent: 'emergency' };
  return null;
}

// Podstawowe czyszczenie wejścia, wspólne dla wszystkich silników.
export const MAX_INPUT_CHARS = 500;
export function cleanInput(message) {
  return String(message || '').replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT_CHARS);
}
