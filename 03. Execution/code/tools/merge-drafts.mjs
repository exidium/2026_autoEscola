// Une los borradores por tema en data/questions.json: node tools/merge-drafts.mjs <dir-borradores>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];
const TEMAS = ['permisos', 'vehiculo', 'equipamiento', 'tecnica', 'pasajero', 'velocidad', 'prioridad', 'senales', 'alcohol', 'accidentes'];
const all = [];
for (const t of TEMAS) {
  const f = join(dir, `${t}.json`);
  if (!existsSync(f)) { console.warn(`falta ${t}.json`); continue; }
  all.push(...JSON.parse(readFileSync(f, 'utf8')));
}
writeFileSync(join(root, 'data/questions.json'), JSON.stringify(all, null, 1) + '\n');
console.log(`${all.length} preguntas escritas`);
