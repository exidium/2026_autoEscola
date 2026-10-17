// Persistencia local: estadísticas por pregunta e historial de tests.
const KEY = 'autoescola.v1';

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
  s.history = s.history.slice(0, 100);
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
