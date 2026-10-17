# Plan — 2026_autoEscola: DGT motorcycle theory trainer (Permiso A1/A2)

## Context
Bruno wants a static HTML app on GitHub Pages to train for the Spanish DGT motorcycle theory exam (A1/A2). It needs:
- random questions per topic
- realistic exam simulations
- a graded review that shows the correct answer and explains why

Decisions so far:
- Personal project, stored on the Drive path.
- Content in Spanish.
- Original question bank written from the regulations, not AI-generated live.
- Bruno already holds permiso B.

**Exam format with B (to verify):** sources disagree. Driving-school blogs say B holders skip the *común* test but take the **específico de moto: 20 questions, max 2 errors**. Some say this depends on how long you've held B. I'll confirm on dgt.es before coding. The app will support both formats:
- **Específico** (default): 20 questions, 2 errors allowed
- **Común** (optional): 30 questions, 3 errors allowed, 30 minutes

## Scaffolding (per CLAUDE.md)
Path: `/Users/brunoboeger/Google Drive/Other computers/Work/Personal/Projects/2026/2026_autoEscola/`
- First, check `Personal/Projects/**` and `AnalogDevices/Projects/**` for similar names. Drive access was blocked from the sandbox, so this needs permission. If anything looks close, ask Bruno.
- Create the standard folders: `01. Planning`, `02. SupportingDocs`, `03. Execution/code/…`, `04. Reports/weekly_report.md` (template, week of 2026-10-12).
- `git init`, then `gh repo create exidium/2026_autoEscola --private --source=. --remote=origin --push`.
- **GitHub Pages:** Pages can only serve from the repo root or `/docs`, so a GitHub Actions workflow (`.github/workflows/pages.yml`) will deploy `03. Execution/code/` as the Pages artifact.
- **Repo visibility:** Pages on a private repo needs GitHub Pro. If Bruno's plan doesn't have it, make the repo public (ask at that point).

## App layout (vanilla HTML/CSS/JS, no build step)
```
03. Execution/code/
  index.html
  css/styles.css
  scripts/app.js        # routing between screens (home, practice, exam, results, stats)
  scripts/quiz.js       # question drawing, shuffling, timer, grading
  scripts/storage.js    # localStorage: history, per-question stats, failed list
  data/questions.json   # the bank
  images/signs/*.svg    # traffic signs as hand-drawn SVGs, used in questions
  tools/validate.mjs    # bank checker (node), not loaded by the app
```

## Question schema
```json
{ "id": "VEL-012", "tema": "velocidad", "pregunta": "...", "imagen": "signs/r301.svg|null",
  "opciones": ["A","B","C"], "correcta": 1,
  "explicacion": "Why the right answer is right and why the others are wrong",
  "referencia": "RGC art. 48.1" }
```
Each question has 3 options, like the real exam.

## Topics (temas), about 300+ questions total
1. Permisos y documentación (A1/A2/A limits, power/weight ratio, ITV, seguro)
2. El vehículo: moto (components, tyres, brakes, ABS/CBS, maintenance)
3. Equipamiento y protección (casco homologado, ropa, airbag)
4. Técnica de conducción (posture, braking, curves, countersteering, low grip)
5. Pasajero y carga (minimum age 12 or 7 with conditions, carrying loads)
6. Velocidad y distancias (limits by road type, safety distance)
7. Prioridad, adelantamiento, posición en la vía (moto-specific: lane splitting, use of lanes)
8. Señales y marcas viales
9. Alcohol, drogas, fatiga, medicamentos (0.25 / 0.15 for novice drivers)
10. Seguridad vial, accidentes y PAS (protect, alert, help), including not removing a rider's helmet

**Writing and checking content:** Subagents draft topics in parallel, using the BOE texts (RGC RD 1428/2003, RGCond RD 818/2009, LSV) as sources. I then review every fact against those texts. `validate.mjs` checks for:
- unique ids
- exactly 3 options
- a valid correct-answer index
- an explanation and a reference on every question
- a minimum count per topic

## Features
- **Home:** pick a mode, plus a summary of progress.
- **Practice by topic:** choose a topic and a question count (10/20/all). Questions are drawn randomly without repeats and answers are shuffled. An option shows immediate feedback after each answer.
- **Simulation:** uses the real format (20 questions for Específico or 30 for Común), drawn across topics in proportion to their size. It has a countdown timer, lets you go back and change answers, and grades nothing until you submit.
- **Results:** shows APTO/NO APTO based on the error limit, the score, and the time used. It lists every question with your answer next to the correct one, the explanation, and the legal reference. A filter shows only the questions you got wrong.
- **Stats:** accuracy per topic, weakest topics, and exam history.
- **"Repasar falladas":** a review mode built from questions you got wrong earlier, weighted by how often you missed them.
- Mobile-first layout and dark mode. All stats are stored only in localStorage.

## Verification
1. `node tools/validate.mjs` passes on the bank.
2. Serve the code folder locally with `python3 -m http.server` and drive it with Chrome automation:
   - run a full simulation, deliberately answering 3 wrong in Específico, and check it shows NO APTO
   - run a topic practice session and check the shuffle and the feedback
   - check that stats persist after reloading the page
3. Push to GitHub, confirm the Actions deploy succeeds, then open the Pages URL.
4. Spot-check about 20 random questions against BOE articles.
5. Update `04. Reports/weekly_report.md` with what shipped.
