// Persistencia local: estadísticas por pregunta e historial de tests.
const KEY = 'autoescola.v1';
const MAX_HISTORY = 500;
const listeners = [];

function empty() {
  return { qstats: {}, history: [], settings: { feedback: true } };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Sin almacenamiento (modo privado, etc.): la app sigue funcionando sin guardar.
  }
  listeners.forEach(fn => fn(state));
}

// Avisa cada vez que cambian los datos (para guardar también en archivo).
export function subscribe(fn) {
  listeners.push(fn);
}

export function getSettings() {
  return load().settings;
}

export function setSetting(key, value) {
  const s = load();
  s.settings[key] = value;
  save(s);
}

// results: [{ id, correct: bool }]
export function recordAnswers(results) {
  const s = load();
  const now = Date.now();
  for (const { id, correct } of results) {
    const st = s.qstats[id] || { seen: 0, wrong: 0, streak: 0 };
    st.seen++;
    st.last = now;
    if (correct) {
      st.streak = (st.streak || 0) + 1;
    } else {
      st.wrong++;
      st.streak = 0;
      st.lastWrong = now;
    }
    s.qstats[id] = st;
  }
  save(s);
}

export function recordTest(entry) {
  const s = load();
  s.history.unshift({ date: Date.now(), ...entry });
  s.history = s.history.slice(0, MAX_HISTORY);
  save(s);
}

export function getStats() {
  const s = load();
  return { qstats: s.qstats, history: s.history };
}

export function reset() {
  const settings = load().settings;
  save({ ...empty(), settings });
}

// ---------- copia de seguridad ----------
export function exportData() {
  const { qstats, history } = load();
  return { app: 'teorico-moto', version: 1, savedAt: Date.now(), qstats, history };
}

export function isBackup(data) {
  return data && data.app === 'teorico-moto' && Array.isArray(data.history) && typeof data.qstats === 'object';
}

// Une una copia con los datos locales sin perder nada de ninguno de los dos:
// historial sin duplicados (por fecha) y, por pregunta, la estadística más completa.
export function importData(data) {
  if (!isBackup(data)) throw new Error('El archivo no es una copia de Teórico Moto.');
  const s = load();
  const seen = new Set(s.history.map(h => h.date));
  const added = data.history.filter(h => !seen.has(h.date));
  s.history = [...s.history, ...added].sort((a, b) => b.date - a.date).slice(0, MAX_HISTORY);
  for (const [id, st] of Object.entries(data.qstats)) {
    const mine = s.qstats[id];
    if (!mine || st.seen > mine.seen || (st.seen === mine.seen && (st.last || 0) > (mine.last || 0))) {
      s.qstats[id] = st;
    }
  }
  save(s);
  return added.length;
}
