// Selección de preguntas, barajado y corrección.

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Baraja las opciones y recalcula el índice correcto.
export function prepare(q) {
  const order = shuffle([0, 1, 2].slice(0, q.opciones.length));
  return {
    ...q,
    opts: order.map(i => q.opciones[i]),
    correct: order.indexOf(q.correcta),
  };
}

export function drawByTema(bank, tema, n) {
  const pool = tema ? bank.filter(q => q.tema === tema) : bank;
  return shuffle(pool).slice(0, n).map(prepare);
}

// Simulacro: reparto proporcional al tamaño de cada tema, completado al azar.
export function drawExam(bank, n) {
  const byTema = {};
  for (const q of bank) (byTema[q.tema] ||= []).push(q);
  const picked = [];
  for (const qs of Object.values(byTema)) {
    const k = Math.floor((qs.length / bank.length) * n);
    picked.push(...shuffle(qs).slice(0, k));
  }
  const used = new Set(picked.map(q => q.id));
  const rest = shuffle(bank.filter(q => !used.has(q.id)));
  picked.push(...rest.slice(0, n - picked.length));
  return shuffle(picked).map(prepare);
}

// Repaso: preguntas falladas que aún no se han acertado 2 veces seguidas,
// ponderadas por número de fallos (muestreo sin reemplazo).
export function failedPool(bank, qstats) {
  return bank.filter(q => {
    const st = qstats[q.id];
    return st && st.wrong > 0 && (st.streak || 0) < 2;
  });
}

export function drawFailed(bank, qstats, n) {
  const pool = failedPool(bank, qstats).map(q => ({
    q,
    key: Math.random() ** (1 / (1 + qstats[q.id].wrong)),
  }));
  pool.sort((a, b) => b.key - a.key);
  return pool.slice(0, n).map(x => prepare(x.q));
}

// Las preguntas sin contestar cuentan como fallo, igual que en el examen real.
export function grade(questions, answers) {
  const items = questions.map((q, i) => ({
    q,
    answer: answers[i],
    correct: answers[i] === q.correct,
  }));
  const errors = items.filter(x => !x.correct).length;
  return { items, errors, total: questions.length };
}
