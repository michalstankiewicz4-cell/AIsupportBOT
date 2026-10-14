// Wariant 3: "trained" — nasz własny model, uczony na naszych przykładach.
// Klasyfikator Naive Bayes (trained/naive-bayes.js) uczy się z
// trained/data/training.json (+ słów kluczowych z knowledge.js).
// Model tylko WYBIERA, którą gotową odpowiedź pokazać — nigdy sam nie pisze
// treści medycznych, więc nie może „zmyślić” porady.
import { predict } from './naive-bayes.js';
import { replyFor, INTENT_BY_ID } from '../shared/js/knowledge.js';
import { VERSION } from './version.js';

// Progi pewności (dostrajaj po dodaniu danych treningowych).
const ACCEPT = 0.5; // najlepsza intencja co najmniej tak prawdopodobna...
const MARGIN = 3; // ...albo co najmniej 3x bardziej prawdopodobna niż druga
const OPINION_MIX = 0.15; // próg drugiej intencji do połączenia "opinia + temat"

let modelPromise = null;

// Wczytuje model.json obok tego pliku (działa na GitHub Pages i lokalnie).
export function loadModel(url = new URL('./model.json', import.meta.url)) {
  if (!modelPromise) {
    modelPromise = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`model.json: HTTP ${r.status}`);
      return r.json();
    });
  }
  return modelPromise;
}

// Czysta funkcja decyzyjna — eksportowana dla testów (w Node model przekazujemy z zewnątrz).
export function decide(model, message) {
  const { ranked, knownFeatures } = predict(model, message);
  const top = ranked[0];

  // Nic znanego -> pytanie niejasne / nie na temat (przypadek L).
  if (knownFeatures === 0) return { ...replyFor('offtopic'), confidence: 0 };

  // Prośba o opinię połączona z tematem medycznym -> odmowa + wskazanie zakładki.
  const isRouting = (id) => INTENT_BY_ID[id]?.routing;
  const opinion = ranked.find((r) => r.id === 'opinia');
  const topic = ranked.slice(0, 3).find((r) => isRouting(r.id) && r.p >= OPINION_MIX);
  if (opinion && topic && (top.id === 'opinia' || opinion.p >= OPINION_MIX)) {
    return { ...replyFor('opinia', { topic: topic.id }), confidence: top.p };
  }

  const confident = top.p >= ACCEPT || top.p >= MARGIN * (ranked[1]?.p || 0);
  if (!confident) return { ...replyFor(null), confidence: top.p, candidates: ranked.slice(0, 3) };
  // Cennik z tematem („ile kosztuje psychiatra”) -> cena tej usługi (przypadek J).
  return { ...replyFor(top.id, { topic: topic?.id || null }), confidence: top.p };
}

export const trainedEngine = {
  name: 'trained',
  label: 'Asystent (nasz wyuczony model)',
  version: VERSION,

  async ask(message) {
    const model = await loadModel();
    return decide(model, message);
  },
};

export default trainedEngine;
