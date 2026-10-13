// Common request pipeline used by the widget and by tests:
//   1. clean input  2. safety check (emergency / crisis)  3. engine.ask()
// Every engine returns { text, links, chips, intent }.
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
    // Never leave the user without an answer — fall back to the hotline.
    console.error(`[${engine.name}] error:`, err);
    return { ...FALLBACK_REPLY, intent: 'error' };
  }
}
