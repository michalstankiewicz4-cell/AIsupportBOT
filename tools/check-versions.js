// Strażnik wersji trzech asystentów. Uruchom: npm run check
// Kończy się błędem (kod 1), gdy:
//   - <wariant>/version.js i versions.json się nie zgadzają,
//   - CHANGES.md nie ma wpisu "### <wariant> <wersja>" dla bieżącej wersji,
//   - trained/model.json zbudowano dla innej wersji lub z innych danych
//     (ktoś zmienił training.json / knowledge.js bez "npm run train").
import { VARIANTS, SEMVER, read, readVariantVersion, readVersionsJson } from './versioning.js';
import { datasetHash, withKeywords } from '../trained/naive-bayes.js';
import { cleanDataset } from '../trained/trainer.js';
import { INTENTS } from '../shared/js/knowledge.js';

const errors = [];
const versions = readVersionsJson();
const changes = read('CHANGES.md');

for (const v of VARIANTS) {
  const code = readVariantVersion(v);
  if (!code || !SEMVER.test(code)) errors.push(`${v}/version.js: niepoprawna wersja "${code}"`);
  if (versions[v] !== code) errors.push(`${v}: version.js = ${code}, versions.json = ${versions[v]}`);
  if (!changes.includes(`### ${v} ${code}`)) errors.push(`CHANGES.md: brak wpisu "### ${v} ${code}"`);
}

const model = JSON.parse(read('trained', 'model.json'));
const trainedVersion = readVariantVersion('trained');
if (model.version !== trainedVersion) {
  errors.push(`trained/model.json ma wersję ${model.version}, a trained = ${trainedVersion} → uruchom: npm run train`);
}
const { dataset: data } = cleanDataset(JSON.parse(read('trained', 'data', 'training.json')));
if (model.datasetHash !== datasetHash(withKeywords(data, INTENTS))) {
  errors.push('trained/model.json jest nieaktualny względem training.json / knowledge.js → uruchom: npm run train');
}

if (errors.length) {
  console.error('Kontrola wersji — BŁĘDY:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(`Kontrola wersji OK: ${VARIANTS.map((v) => `${v} ${versions[v]}`).join(' · ')}`);
