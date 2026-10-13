// Bumps the version of one (or all) assistants and records the change.
// Usage:
//   npm run bump -- <bot|ai|trained|all> <patch|minor|major> "Opis zmiany"
// Example:
//   npm run bump -- trained minor "Dodano 20 przykładów o alergiach"
// Updates <variant>/version.js, versions.json and CHANGES.md;
// for "trained" also retrains the model so model.json carries the new version.
import { execFileSync } from 'node:child_process';
import {
  VARIANTS, read, write, path, readVariantVersion, writeVariantVersion, readVersionsJson, bumpSemver,
} from './versioning.js';

const [target, part, ...descParts] = process.argv.slice(2);
const description = descParts.join(' ').trim();

if (!target || !part || !description || (target !== 'all' && !VARIANTS.includes(target))) {
  console.error('Użycie: npm run bump -- <bot|ai|trained|all> <patch|minor|major> "Opis zmiany"');
  process.exit(1);
}

const targets = target === 'all' ? VARIANTS : [target];
const versions = readVersionsJson();
const entries = [];

for (const v of targets) {
  const next = bumpSemver(readVariantVersion(v), part);
  writeVariantVersion(v, next);
  versions[v] = next;
  entries.push(`### ${v} ${next}\n- ${description}`);
  console.log(`${v}: → ${next}`);
}
write('versions.json', JSON.stringify(versions, null, 2) + '\n');

// Insert into CHANGES.md under today's date (newest on top).
const today = new Date().toISOString().slice(0, 10);
let changes = read('CHANGES.md');
const marker = '<!-- NEW ENTRIES BELOW -->';
const block = entries.join('\n\n');
if (changes.includes(`${marker}\n\n## ${today}\n`)) {
  changes = changes.replace(`${marker}\n\n## ${today}\n`, `${marker}\n\n## ${today}\n\n${block}\n`);
} else {
  changes = changes.replace(marker, `${marker}\n\n## ${today}\n\n${block}\n`);
}
write('CHANGES.md', changes);

if (targets.includes('trained')) {
  execFileSync(process.execPath, [path('trained', 'train.js')], { stdio: 'inherit' });
}
console.log('Zaktualizowano CHANGES.md. Sprawdź: npm run check');
