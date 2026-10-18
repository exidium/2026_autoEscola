// Historial de intentos: análisis de la evolución, gráfico de fallos y tabla.

const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmtNum = n => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Fallos por tema de un intento, a partir de sus respuestas guardadas.
export function errorsByTema(entry, byId) {
  const out = {};
  for (const it of entry.items || []) {
    const q = byId.get(it.id);
    if (q && it.a !== q.correcta) out[q.tema] = (out[q.tema] || 0) + 1;
  }
  return out;
}

// exams: simulacros, del más reciente al más antiguo.
export function analyzeProgress(exams, { byId, temaName, seen, bankSize }) {
  if (!exams.length) {
    return {
      level: 'none',
      label: 'Sin datos todavía',
      headline: 'Haz tu primer simulacro para empezar a ver tu evolución.',
      points: [`Has visto ${seen} de ${bankSize} preguntas en los tests de práctica.`],
    };
  }

  const last5 = exams.slice(0, 5);
  const passes5 = last5.filter(e => e.passed).length;
  const rate = e => e.errors / e.total;
  const avgErr5 = avg(last5.map(e => e.errors));

  let level, label;
  if (last5.length === 5 && passes5 === 5 && avg(last5.map(rate)) <= 0.05) {
    level = 'ok'; label = 'Listo para el examen';
  } else if (passes5 / last5.length >= 0.6) {
    level = 'mid'; label = 'Casi listo';
  } else {
    level = 'ko'; label = 'Sigue practicando';
  }

  const headline = last5.length === 1
    ? `Has hecho tu primer simulacro: ${exams[0].passed ? 'APTO' : 'NO APTO'} con ${plural(exams[0].errors, 'fallo', 'fallos')}.`
    : `Has aprobado ${passes5} de tus últimos ${last5.length} simulacros, con ${fmtNum(avgErr5)} fallos de media.`;

  const points = [];

  if (exams.length >= 6) {
    const prev = exams.slice(5, 10);
    const now = avg(last5.map(rate)) * 20;
    const before = avg(prev.map(rate)) * 20;
    const diff = now - before;
    if (diff <= -0.3) points.push(`Vas a mejor: de ${fmtNum(before)} a ${fmtNum(now)} fallos por cada 20 preguntas respecto a los ${prev.length} simulacros anteriores.`);
    else if (diff >= 0.3) points.push(`Vas a peor: de ${fmtNum(before)} a ${fmtNum(now)} fallos por cada 20 preguntas respecto a los ${prev.length} simulacros anteriores.`);
    else points.push(`Te mantienes estable, en torno a ${fmtNum(now)} fallos por cada 20 preguntas.`);
  }

  let streak = 0;
  while (streak < exams.length && exams[streak].passed) streak++;
  if (streak >= 2) points.push(`Llevas ${streak} aptos seguidos.`);
  else if (!exams[0].passed) points.push(`El último simulacro fue NO APTO: ${plural(exams[0].errors, 'fallo', 'fallos')} con un máximo de ${exams[0].maxErrors}.`);

  const best = exams.reduce((b, e) => (rate(e) < rate(b) ? e : b));
  if (exams.length >= 3) points.push(`Tu mejor resultado: ${plural(best.errors, 'fallo', 'fallos')} de ${best.total} preguntas.`);

  const weak = {};
  for (const e of last5) {
    for (const [t, n] of Object.entries(errorsByTema(e, byId))) weak[t] = (weak[t] || 0) + n;
  }
  const top = Object.entries(weak).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (top.length) {
    points.push(`Donde más fallas últimamente: ${top.map(([t, n]) => `${temaName(t)} (${n})`).join(', ')}. Practica esos temas en el modo por tema.`);
  }

  points.push(`Has visto ${seen} de ${bankSize} preguntas del banco.`);
  if (level === 'ok') points.push('Para el examen real: mantén este nivel unos días y repasa las falladas antes de presentarte.');

  return { level, label, headline, points };
}

// Gráfico de barras: fallos por intento (de más antiguo a más reciente),
// con la línea del máximo de fallos permitido.
export function errorsChart(entries, maxErrors, fmtDate) {
  if (!entries.length) return '';
  const W = 640, H = 220, padL = 28, padR = 12, padT = 16, padB = 28;
  const yMax = Math.max(maxErrors + 2, ...entries.map(e => e.errors));
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const slot = plotW / entries.length;
  const barW = Math.max(4, Math.min(28, slot - 2));
  const y = v => padT + plotH - (v / yMax) * plotH;
  const step = yMax > 8 ? 2 : 1;

  const grid = [];
  for (let v = 0; v <= yMax; v += step) {
    grid.push(`<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="c-grid"/>
      <text x="${padL - 6}" y="${y(v) + 4}" class="c-axis" text-anchor="end">${v}</text>`);
  }

  const bars = entries.map((e, i) => {
    const x = padL + i * slot + (slot - barW) / 2;
    const h = Math.max(2, (e.errors / yMax) * plotH);
    const top = padT + plotH - h;
    const r = Math.min(4, barW / 2, h);
    const path = `M${x},${padT + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${padT + plotH} Z`;
    const tip = `Intento ${e.n} · ${fmtDate(e.date)} · ${plural(e.errors, 'fallo', 'fallos')} · ${e.passed ? 'APTO' : 'NO APTO'}`;
    return `<g class="c-bar ${e.passed ? 'ok' : 'ko'}" data-tip="${tip}">
      <rect x="${padL + i * slot}" y="${padT}" width="${slot}" height="${plotH}" class="c-hit"/>
      <path d="${path}"/>
    </g>`;
  }).join('');

  const every = Math.ceil(entries.length / 10);
  const xLabels = entries.map((e, i) => (i % every === 0 || i === entries.length - 1)
    ? `<text x="${padL + i * slot + slot / 2}" y="${H - 8}" class="c-axis" text-anchor="middle">${e.n}</text>` : '').join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Fallos por intento; la línea marca el máximo permitido de ${maxErrors}">
      ${grid.join('')}
      <line x1="${padL}" x2="${W - padR}" y1="${y(maxErrors + 0.5)}" y2="${y(maxErrors + 0.5)}" class="c-limit"/>
      <text x="${W - padR}" y="${y(maxErrors + 0.5) - 6}" class="c-limit-label" text-anchor="end">Límite APTO: ${maxErrors} fallos</text>
      ${bars}
      ${xLabels}
    </svg>`;
}

// Tooltip para las barras del gráfico.
export function bindChartTooltip(root) {
  const chart = root.querySelector('.chart-wrap');
  if (!chart) return;
  const tip = chart.querySelector('.c-tip');
  const show = g => {
    const box = chart.getBoundingClientRect();
    const r = g.getBoundingClientRect();
    tip.textContent = g.dataset.tip;
    tip.hidden = false;
    const left = Math.min(Math.max(r.left + r.width / 2 - box.left, 90), box.width - 90);
    tip.style.left = `${left}px`;
    tip.style.top = `${r.top - box.top}px`;
    chart.querySelectorAll('.c-bar').forEach(b => b.classList.toggle('dim', b !== g));
  };
  const hide = () => {
    tip.hidden = true;
    chart.querySelectorAll('.c-bar').forEach(b => b.classList.remove('dim'));
  };
  chart.querySelectorAll('.c-bar').forEach(g => {
    g.addEventListener('mouseenter', () => show(g));
    g.addEventListener('click', () => show(g));
  });
  chart.addEventListener('mouseleave', hide);
}
