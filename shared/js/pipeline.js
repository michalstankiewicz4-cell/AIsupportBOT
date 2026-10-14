// Wspólna ścieżka obsługi pytania, używana przez widżet i testy (specyfikacja, sekcja 9):
//   1. czyszczenie tekstu
//   2. A / B — stan nagły / kryzys (shared/js/safety.js) — zawsze pierwsze, na każdej wiadomości,
//      nie da się ich wyłączyć z panelu
//   3. tryb kryzysowy sesji — po B wiadomości bez konkretnej intencji dostają ponownie komunikat B
//   4. własne odpowiedzi na frazy z panelu sterowania
//   5. engine.ask() — bot, trained, ai albo ich kombinacja (router); kolejność przypadków C–L w silniku
//   6. po dwóch niezrozumiałych wiadomościach z rzędu — przycisk „Napisz do nas”
// Każda odpowiedź ma { text, links, chips, intent, case, source } i opcjonalnie followup
// (drugi komunikat po karcie alarmowej).
//
// session — mały obiekt stanu rozmowy przechowywany przez widżet ({ crisis, unclear });
// pipeline go aktualizuje. Nie zawiera treści ani danych osobowych.
import { checkSafety, cleanInput } from './safety.js';
import { FALLBACK_REPLY, crisisFollowup, PAGES } from './knowledge.js';
import { UI_TEXTS } from './texts.js';
import { matchRule, getPanelConfig } from '../../panel/client.js';

// Odpowiedź „nie rozpoznano” (przypadek L): niejasne pytanie albo poza tematem.
const UNCLEAR = (r) => r.case === 'L' || r.intent === 'fallback' || r.intent === 'offtopic';

export async function respond(engine, rawMessage, history = [], session = {}) {
  const message = cleanInput(rawMessage);
  if (!message) return { ...FALLBACK_REPLY, intent: 'empty', source: 'engine' };

  const urgent = checkSafety(message, { supportLine: getPanelConfig().safety?.supportLine });
  if (urgent) {
    if (urgent.case === 'B') session.crisis = true;
    session.unclear = 0;
    return { ...urgent, source: 'safety' };
  }

  const custom = matchRule(message);
  if (custom) {
    session.unclear = 0;
    return { case: 'custom', ...custom };
  }

  let reply;
  try {
    reply = await engine.ask(message, history);
    reply = { links: [], chips: [], source: 'engine', engine: engine.name, engineVersion: engine.version, ...reply };
  } catch (err) {
    // Nigdy nie zostawiamy pacjenta bez odpowiedzi.
    console.error(`[${engine.name}] error:`, err);
    reply = { ...FALLBACK_REPLY, intent: 'error', source: 'engine' };
  }

  if (UNCLEAR(reply)) {
    // Tryb kryzysowy: zamiast „Nie jestem pewna…” ponownie komunikat B + 112 (bez karty).
    if (session.crisis) {
      const f = crisisFollowup({ supportLine: getPanelConfig().safety?.supportLine });
      return { ...reply, text: f.text, links: f.links, case: 'B', intent: 'crisis-followup', source: 'safety' };
    }
    session.unclear = (session.unclear || 0) + 1;
    // Po dwóch niezrozumiałych wiadomościach z rzędu — przekazanie do człowieka.
    if (session.unclear >= 2 && !reply.links.some((l) => l.label === UI_TEXTS.writeToUs)) {
      reply = { ...reply, links: [...reply.links, { label: UI_TEXTS.writeToUs, url: PAGES.contact.url, kind: 'info' }] };
    }
  } else {
    session.unclear = 0;
  }
  return reply;
}

