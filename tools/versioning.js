// Wspólne funkcje narzędzi wersjonowania (check-versions.js, bump.js, lokalny serwer panelu).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const VARIANTS = ['bot', 'ai', 'trained'];
export const SEMVER = /^\d+\.\d+\.\d+$/;

export const path = (...p) => join(ROOT, ...p);
export const read = (...p) => readFileSync(path(...p), 'utf8');
export const write = (p, content) => writeFileSync(path(p), content);

export function readVariantVersion(v) {
  const m = read(v, 'version.js').match(/VERSION = '([^']+)'/);
  return m ? m[1] : null;
}

export function writeVariantVersion(v, version) {
  const file = read(v, 'version.js').replace(/VERSION = '[^']+'/, `VERSION = '${version}'`);
  write(`${v}/version.js`, file);
}

export function readVersionsJson() {
  return JSON.parse(read('versions.json'));
}

export function bumpSemver(version, part) {
  const [ma, mi, pa] = version.split('.').map(Number);
  if (part === 'major') return `${ma + 1}.0.0`;
  if (part === 'minor') return `${ma}.${mi + 1}.0`;
  if (part === 'patch') return `${ma}.${mi}.${pa + 1}`;
  throw new Error(`Nieznany typ podbicia: ${part} (użyj: major | minor | patch)`);
}

/**
 * Podbija wersję wariantów i dopisuje wpis do CHANGES.md pod dzisiejszą datą (najnowsze na górze).
 * Nie trenuje modelu — robi to wywołujący (bump.js albo panel → „Nauka”).
 * Zwraca { wariant: nowa wersja }.
 */
export function bumpVariants(targets, part, description) {
  const versions = readVersionsJson();
  const entries = [];
  const result = {};
  for (const v of targets) {
    const next = bumpSemver(readVariantVersion(v), part);
    writeVariantVersion(v, next);
    versions[v] = next;
    result[v] = next;
    entries.push(`### ${v} ${next}\n- ${description}`);
  }
  write('versions.json', JSON.stringify(versions, null, 2) + '\n');

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
  return result;
}
