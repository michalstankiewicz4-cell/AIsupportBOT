// Wspólna ścieżka obsługi pytania, używana przez widżet i testy:
//   1. czyszczenie tekstu
//   2. kontrola bezpieczeństwa (stan nagły / kryzys) — zawsze pierwsza, nie da się jej wyłączyć z panelu
//   3. własne odpowiedzi na frazy z panelu sterowania
//   4. engine.ask() — bot, trained, ai albo ich kombinacja (router)
// Każda odpowiedź ma { text, links, chips, intent, source }.
import { checkSafety, cleanInput } from './safety.js';
import { FALLBACK_REPLY } from './knowledge.js';
import { matchRule } from '../../panel/client.js';

export async function respond(engine, rawMessage, history = []) {
  const message = cleanInput(rawMessage);
  if (!message) return { ...FALLBACK_REPLY, intent: 'empty', source: 'engine' };

  const urgent = checkSafety(message);
  if (urgent) return { ...urgent, source: 'safety' };

  const custom = matchRule(message);
  if (custom) return custom;

  try {
    const reply = await engine.ask(message, history);
    return { links: [], chips: [], source: 'engine', engine: engine.name, engineVersion: engine.version, ...reply };
  } catch (err) {
    // Nigdy nie zostawiamy pacjenta bez odpowiedzi — w razie błędu odsyłamy do infolinii.
    console.error(`[${engine.name}] error:`, err);
    return { ...FALLBACK_REPLY, intent: 'error', source: 'engine' };
  }
}
