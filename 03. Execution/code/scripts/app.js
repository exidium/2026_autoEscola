import * as quiz from './quiz.js';
import * as store from './storage.js';

export const TEMAS = [
  { id: 'permisos', nombre: 'Permisos y documentación' },
  { id: 'vehiculo', nombre: 'La motocicleta' },
  { id: 'equipamiento', nombre: 'Casco y equipamiento' },
  { id: 'tecnica', nombre: 'Técnica de conducción' },
  { id: 'pasajero', nombre: 'Pasajero y carga' },
  { id: 'velocidad', nombre: 'Velocidad y distancias' },
  { id: 'prioridad', nombre: 'Normas de circulación' },
  { id: 'senales', nombre: 'Señales' },
  { id: 'alcohol', nombre: 'Alcohol, drogas y fatiga' },
  { id: 'accidentes', nombre: 'Accidentes y primeros auxilios' },
];
const temaName = id => TEMAS.find(t => t.id === id)?.nombre ?? id;

const EXAMS = {
  especifico: { nombre: 'Simulacro examen moto', n: 20, maxErrors: 2, minutes: 20 },
  largo: { nombre: 'Simulacro largo', n: 30, maxErrors: 3, minutes: 30 },
};
const LETTERS = ['A', 'B', 'C'];

const app = document.getElementById('app');
let bank = [];
let session = null;
let timerId = null;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

// ---------- modal (sustituye a confirm()) ----------
function confirmDialog(title, body, okText = 'Aceptar') {
  const modal = document.getElementById('modal');
  modal.querySelector('#modal-title').textContent = title;
  modal.querySelector('#modal-body').textContent = body;
  modal.querySelector('[data-modal="ok"]').textContent = okText;
  modal.hidden = false;
  modal.querySelector('[data-modal="ok"]').focus();
  return new Promise(resolve => {
    const close = val => {
      modal.hidden = true;
      modal.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      resolve(val);
    };
    const onClick = e => {
      if (e.target === modal || e.target.dataset.modal === 'cancel') close(false);
      else if (e.target.dataset.modal === 'ok') close(true);
    };
    const onKey = e => { if (e.key === 'Escape') close(false); };
    modal.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
  });
}

// ---------- navegación ----------
async function go(screen) {
  if (session && !session.finished && screen !== 'session') {
    const ok = await confirmDialog('¿Salir del test?', 'Perderás el progreso de este test.', 'Salir');
    if (!ok) return;
    endSession();
  }
  if (screen === 'home') renderHome();
  else if (screen === 'stats') renderStats();
  window.scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const target = e.target.closest('[data-go]');
  if (target) go(target.dataset.go);
});

// ---------- inicio ----------
function renderHome() {
  const { qstats } = store.getStats();
  const failed = quiz.failedPool(bank, qstats).length;
  const settings = store.getSettings();

  const temaCards = TEMAS.map(t => {
    const qs = bank.filter(q => q.tema === t.id);
    if (!qs.length) return '';
    const seen = qs.filter(q => qstats[q.id]);
    const acc = accuracy(seen.map(q => qstats[q.id]));
    return `
      <button class="tema-card" data-tema="${t.id}">
        <span class="tema-name">${esc(t.nombre)}</span>
        <span class="tema-meta">${qs.length} preguntas · ${seen.length ? `${acc}% aciertos` : 'sin empezar'}</span>
        <span class="bar"><span style="width:${(seen.length / qs.length) * 100}%"></span></span>
      </button>`;
  }).join('');

  app.innerHTML = `
    <section class="hero">
      <h1>Aprueba el teórico de moto</h1>
      <p>Examen específico de la DGT para los permisos A1 y A2: <strong>20 preguntas</strong>, <strong>máximo 2 fallos</strong>. ${bank.length} preguntas en el banco.</p>
    </section>

    <section class="modes">
      <button class="mode-card primary" data-exam="especifico">
        <span class="mode-kicker">Como el examen real</span>
        <span class="mode-title">Simulacro</span>
        <span class="mode-meta">20 preguntas · 20 min · máx. 2 fallos</span>
      </button>
      <button class="mode-card" data-exam="largo">
        <span class="mode-kicker">Más preguntas</span>
        <span class="mode-title">Simulacro largo</span>
        <span class="mode-meta">30 preguntas · 30 min · máx. 3 fallos</span>
      </button>
      <button class="mode-card ${failed ? 'warn' : ''}" data-review ${failed ? '' : 'disabled'}>
        <span class="mode-kicker">Tus errores</span>
        <span class="mode-title">Repasar falladas</span>
        <span class="mode-meta">${failed ? `${failed} pendientes` : 'Nada pendiente todavía'}</span>
      </button>
    </section>

    <section>
      <div class="section-head">
        <h2>Practicar por tema</h2>
        <label class="switch">
          <input type="checkbox" id="feedback" ${settings.feedback ? 'checked' : ''}>
          <span>Corrección inmediata</span>
        </label>
      </div>
      <div class="count-pick" role="radiogroup" aria-label="Número de preguntas">
        ${[10, 20, 0].map((n, i) => `
          <label><input type="radio" name="count" value="${n}" ${i === 0 ? 'checked' : ''}>
          <span>${n || 'Todas'}</span></label>`).join('')}
      </div>
      <div class="temas">
        <button class="tema-card all" data-tema="">
          <span class="tema-name">Todos los temas</span>
          <span class="tema-meta">Preguntas aleatorias de todo el banco</span>
        </button>
        ${temaCards}
      </div>
    </section>

    <p class="disclaimer">Preguntas propias redactadas a partir del Reglamento General de Circulación, el Reglamento General de Conductores y la Ley de Tráfico. No son las preguntas oficiales de la DGT. Comprueba siempre la normativa vigente.</p>
  `;

  app.querySelector('#feedback').addEventListener('change', e => store.setSetting('feedback', e.target.checked));
  app.querySelectorAll('[data-exam]').forEach(b => b.addEventListener('click', () => startExam(b.dataset.exam)));
  app.querySelector('[data-review]').addEventListener('click', () => {
    const qs = quiz.drawFailed(bank, store.getStats().qstats, 20);
    if (qs.length) startSession({ mode: 'review', title: 'Repaso de falladas', questions: qs, feedback: true });
  });
  app.querySelectorAll('[data-tema]').forEach(b => b.addEventListener('click', () => {
    const n = Number(app.querySelector('input[name="count"]:checked').value) || Infinity;
    const tema = b.dataset.tema;
    startSession({
      mode: 'practice',
      tema,
      title: tema ? temaName(tema) : 'Todos los temas',
      questions: quiz.drawByTema(bank, tema, n),
      feedback: store.getSettings().feedback,
    });
  }));
}

function accuracy(stats) {
  const seen = stats.reduce((a, s) => a + s.seen, 0);
  const wrong = stats.reduce((a, s) => a + s.wrong, 0);
  return seen ? Math.round(((seen - wrong) / seen) * 100) : 0;
}

// ---------- sesión ----------
function startExam(kind) {
  const cfg = EXAMS[kind];
  startSession({
    mode: 'exam',
    kind,
    title: cfg.nombre,
    questions: quiz.drawExam(bank, cfg.n),
    maxErrors: cfg.maxErrors,
    limitSec: cfg.minutes * 60,
    feedback: false,
  });
}

function startSession(opts) {
  session = {
    ...opts,
    answers: new Array(opts.questions.length).fill(null),
    revealed: new Array(opts.questions.length).fill(false),
    idx: 0,
    startedAt: Date.now(),
    finished: false,
  };
  if (session.limitSec) {
    timerId = setInterval(tick, 1000);
  }
  renderQuestion();
  window.scrollTo(0, 0);
}

function endSession() {
  clearInterval(timerId);
  timerId = null;
  session = null;
}

function elapsed() {
  return Math.floor((Date.now() - session.startedAt) / 1000);
}

function tick() {
  const left = session.limitSec - elapsed();
  const el = document.getElementById('timer');
  if (el) {
    el.textContent = fmtTime(Math.max(0, left));
    el.classList.toggle('low', left <= 120);
  }
  if (left <= 0) finish(true);
}

function renderQuestion() {
  const s = session;
  const q = s.questions[s.idx];
  const ans = s.answers[s.idx];
  const revealed = s.feedback && s.revealed[s.idx];
  const answeredCount = s.answers.filter(a => a !== null).length;
  const isLast = s.idx === s.questions.length - 1;

  const options = q.opts.map((o, i) => {
    let cls = '';
    if (revealed) {
      if (i === q.correct) cls = 'correct';
      else if (i === ans) cls = 'wrong';
    } else if (i === ans) cls = 'selected';
    return `
      <button class="option ${cls}" data-opt="${i}" ${revealed ? 'disabled' : ''}>
        <span class="letter">${LETTERS[i]}</span><span>${esc(o)}</span>
      </button>`;
  }).join('');

  const nav = s.mode === 'exam' ? `
    <div class="qgrid" aria-label="Ir a pregunta">
      ${s.questions.map((_, i) => `
        <button class="${i === s.idx ? 'current' : ''} ${s.answers[i] !== null ? 'answered' : ''}" data-jump="${i}">${i + 1}</button>`).join('')}
    </div>` : '';

  const feedbackBox = revealed ? `
    <div class="feedback ${ans === q.correct ? 'ok' : 'ko'}">
      <strong>${ans === q.correct ? '¡Correcto!' : `Incorrecto. La respuesta correcta es la ${LETTERS[q.correct]}.`}</strong>
      <p>${esc(q.explicacion)}</p>
      <p class="ref">${esc(q.referencia)}</p>
    </div>` : '';

  let primary;
  if (s.feedback && !revealed) {
    primary = `<button class="btn primary" data-act="check" ${ans === null ? 'disabled' : ''}>Comprobar</button>`;
  } else if (isLast) {
    primary = `<button class="btn primary" data-act="finish">${s.mode === 'exam' ? 'Corregir examen' : 'Ver resultados'}</button>`;
  } else {
    primary = `<button class="btn primary" data-act="next">Siguiente</button>`;
  }

  app.innerHTML = `
    <section class="session">
      <div class="session-head">
        <div>
          <span class="session-title">${esc(s.title)}</span>
          <span class="session-progress">Pregunta ${s.idx + 1} de ${s.questions.length} · ${answeredCount} contestadas</span>
        </div>
        ${s.limitSec ? `<span id="timer" class="timer">${fmtTime(Math.max(0, s.limitSec - elapsed()))}</span>` : ''}
      </div>
      <div class="progress"><span style="width:${((s.idx + 1) / s.questions.length) * 100}%"></span></div>

      <article class="question">
        <span class="q-tema">${esc(temaName(q.tema))}</span>
        ${q.imagen ? `<img class="q-img" src="${esc(q.imagen)}" alt="Señal de la pregunta">` : ''}
        <h2>${esc(q.pregunta)}</h2>
        <div class="options">${options}</div>
        ${feedbackBox}
      </article>

      <div class="session-actions">
        <button class="btn ghost" data-act="prev" ${s.idx === 0 ? 'disabled' : ''}>Anterior</button>
        ${s.mode === 'exam' && !isLast ? `<button class="btn ghost" data-act="finish">Corregir</button>` : ''}
        ${primary}
      </div>
      ${nav}
      <button class="link quit" data-go="home">Abandonar test</button>
    </section>`;

  app.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => choose(Number(b.dataset.opt))));
  app.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', () => { s.idx = Number(b.dataset.jump); renderQuestion(); }));
  app.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.act)));
}

function choose(i) {
  const s = session;
  if (s.feedback && s.revealed[s.idx]) return;
  s.answers[s.idx] = i;
  renderQuestion();
}

function act(a) {
  const s = session;
  if (a === 'prev' && s.idx > 0) s.idx--;
  else if (a === 'next' && s.idx < s.questions.length - 1) s.idx++;
  else if (a === 'check' && s.answers[s.idx] !== null) s.revealed[s.idx] = true;
  else if (a === 'finish') return finish(false);
  renderQuestion();
}

async function finish(timeout) {
  const s = session;
  if (!timeout) {
    const blank = s.answers.filter(x => x === null).length;
    if (blank) {
      const ok = await confirmDialog(
        'Hay preguntas sin contestar',
        `Te quedan ${blank} sin responder. En el examen real cuentan como fallo. ¿Corregir igualmente?`,
        'Corregir');
      if (!ok) return;
    }
  }
  clearInterval(timerId);
  s.finished = true;
  const result = quiz.grade(s.questions, s.answers);
  const duration = Math.min(elapsed(), s.limitSec ?? Infinity);
  const passed = s.mode === 'exam' ? result.errors <= s.maxErrors : null;

  store.recordAnswers(result.items
    .filter(x => x.answer !== null || s.mode === 'exam')
    .map(x => ({ id: x.q.id, correct: x.correct })));
  store.recordTest({
    mode: s.mode,
    kind: s.kind ?? s.tema ?? null,
    title: s.title,
    total: result.total,
    errors: result.errors,
    passed,
    duration,
  });
  renderResults(result, { passed, duration, timeout });
}

// ---------- resultados ----------
function renderResults(result, { passed, duration, timeout }) {
  const s = session;
  const okCount = result.total - result.errors;
  const pct = Math.round((okCount / result.total) * 100);
  const isExam = s.mode === 'exam';

  const verdict = isExam
    ? `<div class="verdict ${passed ? 'pass' : 'fail'}">
        <span class="verdict-word">${passed ? 'APTO' : 'NO APTO'}</span>
        <span>${result.errors} ${result.errors === 1 ? 'fallo' : 'fallos'} de un máximo de ${s.maxErrors}</span>
      </div>`
    : `<div class="verdict ${pct >= 90 ? 'pass' : pct >= 70 ? 'mid' : 'fail'}">
        <span class="verdict-word">${pct}%</span>
        <span>${okCount} de ${result.total} correctas</span>
      </div>`;

  const byTema = {};
  for (const x of result.items) {
    const t = (byTema[x.q.tema] ||= { ok: 0, n: 0 });
    t.n++;
    if (x.correct) t.ok++;
  }
  const temaRows = Object.entries(byTema)
    .sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)
    .map(([t, v]) => `<li><span>${esc(temaName(t))}</span><span class="${v.ok < v.n ? 'ko' : 'ok'}">${v.ok}/${v.n}</span></li>`)
    .join('');

  const cards = result.items.map((x, i) => {
    const { q, answer, correct } = x;
    const yours = answer === null
      ? '<span class="ko">Sin contestar</span>'
      : `<span class="${correct ? 'ok' : 'ko'}">${LETTERS[answer]}) ${esc(q.opts[answer])}</span>`;
    return `
      <article class="review ${correct ? 'is-ok' : 'is-ko'}">
        <header><span class="review-num">${i + 1}</span><span class="q-tema">${esc(temaName(q.tema))}</span>
          <span class="badge ${correct ? 'ok' : 'ko'}">${correct ? 'Acierto' : 'Fallo'}</span></header>
        ${q.imagen ? `<img class="q-img small" src="${esc(q.imagen)}" alt="Señal de la pregunta">` : ''}
        <h3>${esc(q.pregunta)}</h3>
        ${correct ? '' : `<p class="yours">Tu respuesta: ${yours}</p>`}
        <p class="right">Respuesta correcta: <strong>${LETTERS[q.correct]}) ${esc(q.opts[q.correct])}</strong></p>
        <div class="why"><strong>Por qué</strong><p>${esc(q.explicacion)}</p><p class="ref">${esc(q.referencia)}</p></div>
      </article>`;
  }).join('');

  const wrongIds = result.items.filter(x => !x.correct).map(x => x.q);

  app.innerHTML = `
    <section class="results">
      ${timeout ? '<p class="notice">Se acabó el tiempo. El examen se ha corregido automáticamente.</p>' : ''}
      ${verdict}
      <div class="result-meta">
        <span>${esc(s.title)}</span>
        <span>Tiempo: ${fmtTime(duration)}</span>
      </div>

      <div class="result-actions">
        ${wrongIds.length ? '<button class="btn primary" data-res="retry-wrong">Repetir las falladas</button>' : ''}
        <button class="btn ${wrongIds.length ? 'ghost' : 'primary'}" data-res="again">${isExam ? 'Nuevo simulacro' : 'Otra ronda'}</button>
        <button class="btn ghost" data-go="home">Inicio</button>
      </div>

      <details class="by-tema" ${Object.keys(byTema).length > 1 ? 'open' : ''}>
        <summary>Resultado por tema</summary>
        <ul>${temaRows}</ul>
      </details>

      <div class="section-head">
        <h2>Corrección</h2>
        <div class="filter" role="tablist">
          <button class="${wrongIds.length ? '' : 'active'}" data-filter="all">Todas</button>
          <button class="${wrongIds.length ? 'active' : ''}" data-filter="ko">Falladas (${wrongIds.length})</button>
        </div>
      </div>
      <div class="reviews ${wrongIds.length ? 'only-ko' : ''}">${cards}</div>
    </section>`;

  app.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    app.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('active', x === b));
    app.querySelector('.reviews').classList.toggle('only-ko', b.dataset.filter === 'ko');
  }));
  const prev = s;
  app.querySelector('[data-res="again"]').addEventListener('click', () => {
    endSession();
    if (prev.mode === 'exam') startExam(prev.kind);
    else if (prev.mode === 'review') {
      const qs = quiz.drawFailed(bank, store.getStats().qstats, 20);
      if (qs.length) startSession({ ...prev, questions: qs });
      else renderHome();
    } else startSession({ ...prev, questions: quiz.drawByTema(bank, prev.tema, prev.questions.length) });
  });
  app.querySelector('[data-res="retry-wrong"]')?.addEventListener('click', () => {
    endSession();
    startSession({ mode: 'review', title: 'Repetir falladas', questions: wrongIds.map(quiz.prepare), feedback: true });
  });
  window.scrollTo(0, 0);
}

// ---------- estadísticas ----------
function renderStats() {
  const { qstats, history } = store.getStats();
  const rows = TEMAS.map(t => {
    const qs = bank.filter(q => q.tema === t.id);
    if (!qs.length) return '';
    const seenQs = qs.filter(q => qstats[q.id]);
    const acc = accuracy(seenQs.map(q => qstats[q.id]));
    return { t, total: qs.length, seen: seenQs.length, acc };
  }).filter(Boolean);
  const weak = rows.filter(r => r.seen >= 5).sort((a, b) => a.acc - b.acc).slice(0, 3);
  const exams = history.filter(h => h.mode === 'exam');
  const passRate = exams.length ? Math.round((exams.filter(h => h.passed).length / exams.length) * 100) : null;
  const last10 = exams.slice(0, 10);

  app.innerHTML = `
    <section class="stats">
      <h1>Tu progreso</h1>
      <div class="kpis">
        <div class="kpi"><span class="kpi-num">${Object.keys(qstats).length}<small>/${bank.length}</small></span><span>preguntas vistas</span></div>
        <div class="kpi"><span class="kpi-num">${exams.length}</span><span>simulacros</span></div>
        <div class="kpi"><span class="kpi-num">${passRate === null ? '–' : passRate + '%'}</span><span>simulacros aptos</span></div>
        <div class="kpi"><span class="kpi-num">${last10.length ? (last10.reduce((a, h) => a + h.errors, 0) / last10.length).toFixed(1) : '–'}</span><span>fallos de media (últimos 10)</span></div>
      </div>

      ${weak.length ? `<div class="weak"><strong>Temas a reforzar:</strong> ${weak.map(r => `${esc(r.t.nombre)} (${r.acc}%)`).join(', ')}</div>` : ''}

      <h2>Aciertos por tema</h2>
      <ul class="tema-stats">
        ${rows.map(r => `
          <li>
            <div class="ts-head"><span>${esc(r.t.nombre)}</span><span>${r.seen ? r.acc + '%' : '–'}</span></div>
            <span class="bar ${r.acc < 70 ? 'ko' : r.acc < 90 ? 'mid' : 'ok'}"><span style="width:${r.seen ? r.acc : 0}%"></span></span>
            <small>${r.seen} de ${r.total} preguntas vistas</small>
          </li>`).join('')}
      </ul>

      <h2>Historial</h2>
      ${history.length ? `<ul class="history">
        ${history.slice(0, 30).map(h => `
          <li>
            <span class="h-date">${new Date(h.date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <span class="h-title">${esc(h.title)}</span>
            <span class="h-score ${h.passed === true ? 'ok' : h.passed === false ? 'ko' : ''}">
              ${h.passed === true ? 'APTO' : h.passed === false ? 'NO APTO' : ''} ${h.total - h.errors}/${h.total}
            </span>
          </li>`).join('')}
      </ul>` : '<p class="muted">Todavía no has hecho ningún test.</p>'}

      <button class="link danger" id="reset">Borrar todo el progreso</button>
    </section>`;

  app.querySelector('#reset').addEventListener('click', async () => {
    if (await confirmDialog('¿Borrar el progreso?', 'Se eliminarán las estadísticas y el historial de este navegador.', 'Borrar')) {
      store.reset();
      renderStats();
    }
  });
}

// ---------- teclado ----------
document.addEventListener('keydown', e => {
  if (!session || session.finished || !document.getElementById('modal').hidden) return;
  if (e.target.closest('input, textarea')) return;
  const k = e.key.toLowerCase();
  const map = { a: 0, b: 1, c: 2, 1: 0, 2: 1, 3: 2 };
  if (k in map) choose(map[k]);
  else if (e.key === 'ArrowRight') act('next');
  else if (e.key === 'ArrowLeft') act('prev');
  else if (e.key === 'Enter' && session.feedback && !session.revealed[session.idx]) act('check');
  else if (e.key === 'Enter' && session.feedback) act(session.idx === session.questions.length - 1 ? 'finish' : 'next');
});

// ---------- arranque ----------
fetch('data/questions.json')
  .then(r => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  })
  .then(data => {
    bank = data;
    renderHome();
  })
  .catch(() => {
    app.innerHTML = '<p class="loading">No se pudieron cargar las preguntas. Si abres el archivo en local, sírvelo con <code>python3 -m http.server</code>.</p>';
  });
