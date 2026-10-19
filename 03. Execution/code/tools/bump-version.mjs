// Sube el número de versión (?v=N) en todas las referencias para que los
// navegadores descarguen los archivos nuevos: node tools/bump-version.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['index.html', 'scripts/app.js', 'scripts/sync.js'];
const current = Number(readFileSync(join(root, 'index.html'), 'utf8').match(/\?v=(\d+)/)[1]);
const next = current + 1;
for (const f of files) {
  const p = join(root, f);
  writeFileSync(p, readFileSync(p, 'utf8').replace(/\?v=\d+/g, `?v=${next}`));
}
console.log(`versión ${current} → ${next}`);
