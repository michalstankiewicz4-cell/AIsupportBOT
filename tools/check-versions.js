// Version guard for the three assistants. Run: npm run check
// Fails (exit code 1) when:
//   - <variant>/version.js and versions.json disagree,
//   - CHANGES.md has no "### <variant> <version>" entry for the current version,
//   - trained/model.json was built for another version or from other data
//     (someone edited training.json / knowledge.js without "npm run train").
import { VARIANTS, SEMVER, read, readVariantVersion, readVersionsJson } from './versioning.js';
import { datasetHash, withKeywords } from '../trained/naive-bayes.js';
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
const data = JSON.parse(read('trained', 'data', 'training.json'));
if (model.datasetHash !== datasetHash(withKeywords(data, INTENTS))) {
  errors.push('trained/model.json jest nieaktualny względem training.json / knowledge.js → uruchom: npm run train');
}

if (errors.length) {
  console.error('Kontrola wersji — BŁĘDY:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(`Kontrola wersji OK: ${VARIANTS.map((v) => `${v} ${versions[v]}`).join(' · ')}`);
