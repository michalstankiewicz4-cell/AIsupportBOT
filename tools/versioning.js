// Shared helpers for version tooling (check-versions.js, bump.js).
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
