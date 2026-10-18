# Weekly report — 2026_autoEscola

## Week of 2026-10-12

### Shipped
- First version of the motorcycle theory trainer (static HTML on GitHub Pages): practice by topic, timed simulation (20 questions / 2 errors / 20 min, plus a 30-question variant), graded review with explanations and legal references, stats and a review mode for wrong answers.
- Bank of 306 original questions in 10 topics, checked against the consolidated BOE texts (RGC, RGCond, LSV, RGV, CP), including RD 518/2026 (in force 1 Oct 2026).
- Bank validator (also runs in CI before each deploy).
### Decided
- Content in Spanish, with our own questions (not official DGT ones). Default format is the motorcycle-specific exam, since Bruno already has B.
- Project lives in ~/Projects/autoEscola (synced by Google).
### Blocked / waiting
- To confirm on dgt.es / with the driving school: the exam format for B holders, and whether the new A2 counts as "novel" for the alcohol limit.
### Next week
- Test the UI on mobile; rebalance option lengths in "prioridad" (the correct answer is often the shortest).
- Add more questions to the weaker topics.

## Week of 2026-10-12 — update (2026-10-18)

### Shipped
- 5 options per question (A–E) across all 306 questions: 612 new wrong answers, checked so none is also correct.
- New "Historial" screen: a table row per attempt (date, test, score, errors vs. limit, result, time, most-missed topic) with "Ver" to reopen any past correction; a progress summary (Listo / Casi listo / Sigue practicando, trend vs. previous 5 exams, pass streak, weak topics); a bar chart of errors per simulacro with the APTO limit line.
- White theme (dark mode removed).
- Fixed PAS-028 explanation (it was copied from PAS-027).
### Decided
- Bruno chose 5 options even though the real DGT exam uses 3 (harder practice).
### Next week
- Check on a phone: history table, chart tooltip, 5-option layout.
