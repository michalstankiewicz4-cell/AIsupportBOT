// Podbija wersję jednego (lub wszystkich) asystentów i zapisuje zmianę.
// Użycie:
//   npm run bump -- <bot|ai|trained|all> <patch|minor|major> "Opis zmiany"
// Przykład:
//   npm run bump -- trained minor "Dodano 20 przykładów o alergiach"
// Aktualizuje <wariant>/version.js, versions.json i CHANGES.md;
// dla "trained" dodatkowo trenuje model, żeby model.json miał nową wersję.
import { execFileSync } from 'node:child_process';
import { VARIANTS, path, bumpVariants } from './versioning.js';

const [target, part, ...descParts] = process.argv.slice(2);
const description = descParts.join(' ').trim();

if (!target || !part || !description || (target !== 'all' && !VARIANTS.includes(target))) {
  console.error('Użycie: npm run bump -- <bot|ai|trained|all> <patch|minor|major> "Opis zmiany"');
  process.exit(1);
}

const targets = target === 'all' ? VARIANTS : [target];
const result = bumpVariants(targets, part, description);
for (const [v, next] of Object.entries(result)) console.log(`${v}: → ${next}`);

if (targets.includes('trained')) {
  execFileSync(process.execPath, [path('trained', 'train.js')], { stdio: 'inherit' });
}
console.log('Zaktualizowano CHANGES.md. Sprawdź: npm run check');
