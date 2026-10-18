// Valida data/questions.json: node tools/validate.mjs
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMAS = ['permisos', 'vehiculo', 'equipamiento', 'tecnica', 'pasajero', 'velocidad', 'prioridad', 'senales', 'alcohol', 'accidentes'];
const MIN_PER_TEMA = 20;
const N_OPTS = 5;

const bank = JSON.parse(readFileSync(join(root, 'data/questions.json'), 'utf8'));
const errors = [];
const ids = new Set();
const texts = new Map();
const counts = Object.fromEntries(TEMAS.map(t => [t, 0]));
const positions = new Array(N_OPTS).fill(0);

for (const q of bank) {
  const where = q.id || JSON.stringify(q).slice(0, 60);
  if (!q.id) errors.push(`${where}: sin id`);
  else if (ids.has(q.id)) errors.push(`${q.id}: id duplicado`);
  ids.add(q.id);
  if (!TEMAS.includes(q.tema)) errors.push(`${where}: tema desconocido "${q.tema}"`);
  else counts[q.tema]++;
  for (const f of ['pregunta', 'explicacion', 'referencia']) {
    if (typeof q[f] !== 'string' || q[f].trim().length < 5) errors.push(`${where}: falta "${f}"`);
  }
  if (!Array.isArray(q.opciones) || q.opciones.length !== N_OPTS) errors.push(`${where}: debe tener ${N_OPTS} opciones`);
  else {
    if (new Set(q.opciones.map(o => o.trim().toLowerCase())).size !== N_OPTS) errors.push(`${where}: opciones repetidas`);
    if (q.opciones.some(o => typeof o !== 'string' || !o.trim())) errors.push(`${where}: opción vacía`);
  }
  if (!Number.isInteger(q.correcta) || q.correcta < 0 || q.correcta >= N_OPTS) errors.push(`${where}: "correcta" debe ser de 0 a ${N_OPTS - 1}`);
  else positions[q.correcta]++;
  if (q.imagen !== null && q.imagen !== undefined) {
    if (!existsSync(join(root, q.imagen))) errors.push(`${where}: imagen no existe (${q.imagen})`);
  }
  const key = (q.pregunta || '').trim().toLowerCase();
  if (texts.has(key) && !q.imagen) errors.push(`${where}: pregunta duplicada de ${texts.get(key)}`);
  texts.set(key, q.id);
}
for (const [t, n] of Object.entries(counts)) {
  if (n < MIN_PER_TEMA) errors.push(`tema ${t}: solo ${n} preguntas (mínimo ${MIN_PER_TEMA})`);
}

console.log(`Preguntas: ${bank.length}`);
console.log(Object.entries(counts).map(([t, n]) => `  ${t.padEnd(13)} ${n}`).join('\n'));
console.log(`Posición de la correcta (A–E, en los datos; la app baraja): ${positions.join(' / ')}`);

// Pista involuntaria: la correcta no debería ser casi siempre la opción más larga.
const longest = bank.filter(q => Array.isArray(q.opciones) &&
  q.opciones[q.correcta]?.length > Math.max(...q.opciones.filter((_, i) => i !== q.correcta).map(o => o.length)) * 1.25);
const pctLongest = Math.round((longest.length / bank.length) * 100);
console.log(`Correcta claramente más larga (>25%): ${longest.length} (${pctLongest}%)`);
if (process.argv.includes('--lengths')) longest.forEach(q => console.log(`  ${q.id}`));
const shortest = bank.filter(q => Array.isArray(q.opciones) &&
  q.opciones[q.correcta]?.length < Math.min(...q.opciones.filter((_, i) => i !== q.correcta).map(o => o.length)));
const pctShortest = Math.round((shortest.length / bank.length) * 100);
console.log(`Correcta estrictamente la más corta: ${shortest.length} (${pctShortest}%)`);
if (pctShortest > 35) errors.push(`la correcta es la más corta en el ${pctShortest}% de las preguntas (máx. 35%)`);
if (pctLongest > 25) errors.push(`la correcta es claramente la más larga en el ${pctLongest}% de las preguntas (máx. 25%)`);
if (errors.length) {
  console.error(`\n${errors.length} errores:\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log('OK');
