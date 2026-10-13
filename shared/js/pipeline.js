// Wspólna ścieżka obsługi pytania, używana przez widżet i testy:
//   1. czyszczenie tekstu  2. kontrola bezpieczeństwa (stan nagły / kryzys)  3. engine.ask()
// Każdy silnik zwraca { text, links, chips, intent }.
import { checkSafety, cleanInput } from './safety.js';
import { FALLBACK_REPLY } from './knowledge.js';

export async function respond(engine, rawMessage, history = []) {
  const message = cleanInput(rawMessage);
  if (!message) return { ...FALLBACK_REPLY, intent: 'empty' };

  const urgent = checkSafety(message);
  if (urgent) return urgent;

  try {
    const reply = await engine.ask(message, history);
    return { links: [], chips: [], ...reply };
  } catch (err) {
    // Nigdy nie zostawiamy pacjenta bez odpowiedzi — w razie błędu odsyłamy do infolinii.
    console.error(`[${engine.name}] error:`, err);
    return { ...FALLBACK_REPLY, intent: 'error' };
  }
}
