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
