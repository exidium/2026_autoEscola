# 2026_autoEscola — Teórico Moto A1/A2

A static web app for training for the Spanish DGT motorcycle theory exam (permisos A1/A2, specific exam: 20 questions, max 2 errors).

- **Practice by topic:** random questions from 10 topics, with optional instant feedback
- **Simulacro:** the real format, 20 questions, 20 minutes, APTO with at most 2 errors. A 30-question variant is also available.
- **Corrección:** shows APTO/NO APTO, your answer next to the correct one, why it's right, and the legal reference
- **Stats:** accuracy per topic, exam history, and a review mode for questions you got wrong (stored in the browser's localStorage)

## Structure
- `03. Execution/code/`: the app (served by GitHub Pages from the `main` branch; the root `index.html` redirects here)
  - `data/questions.json`: question bank
  - `images/signs/`: simplified SVG traffic signs
  - `tools/validate.mjs`: bank checks: run before every push

## Run locally
```sh
cd "03. Execution/code"
python3 -m http.server 8000   # open http://localhost:8000
node tools/validate.mjs
```

The questions are original, written from the RGC, RGCond and Ley de Tráfico. They are not official DGT questions.
