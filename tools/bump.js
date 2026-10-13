// Podbija wersję jednego (lub wszystkich) asystentów i zapisuje zmianę.
// Użycie:
//   npm run bump -- <bot|ai|trained|all> <patch|minor|major> "Opis zmiany"
// Przykład:
//   npm run bump -- trained minor "Dodano 20 przykładów o alergiach"
// Aktualizuje <wariant>/version.js, versions.json i CHANGES.md;
// dla "trained" dodatkowo trenuje model, żeby model.json miał nową wersję.
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

// Wstawia wpis do CHANGES.md pod dzisiejszą datą (najnowsze na górze).
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
