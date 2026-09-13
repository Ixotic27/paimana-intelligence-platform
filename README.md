# PAIMANA Intelligence — SIH 26103

An evaluator demonstration built from your **April–July 2026 PAIMANA PDFs**, using React + TypeScript, Pixel Code, FastAPI, SQLAlchemy, Scikit-learn, XGBoost and SHAP.

## What is implemented

- 7,590 project-month snapshots, 2,074 unique project IDs, four report months. Table 6 only, stable IDs, source hashes and PDF page links.
- Portfolio filters/search, project history, cost/schedule comparisons, transparent review scoring, ministry benchmarks and regional map context.
- Actual retrospective model comparison (prevalence/logistic/XGBoost), CUF feature-group ablation and additive SHAP explanations from fitted XGBoost models.
- Local API with persisted project snapshots, review creation/deduplication/resolution and audit records. SQLite locally; PostgreSQL in Docker.
- A deterministic query assistant, CSV export and an offline-capable dashboard (except the external map).

Read [the detailed execution plan](docs/EXECUTION_PLAN.md) and [the evidence and limitations](docs/EVALUATION.md).

## Run locally

Requirements: Node.js 22.23+ and Python 3.12. The current workspace environment is already prepared; use the two terminal commands below to restart it. For a fresh setup:

```powershell
npm ci
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

Open two terminals:

```powershell
# Terminal 1 — API and local database
.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

```powershell
# Terminal 2 — dashboard
npm run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173). API documentation is at http://127.0.0.1:8000/docs. Start the API before opening/reloading the dashboard so it detects persistent mode. If only the frontend is running, it uses the bundled report snapshot and review records last for the current page session only.

If npm on this Windows machine reports a certificate-chain error, use Node's system trust store for that install: `node --use-system-ca "C:/Users/HP/AppData/Roaming/npm/node_modules/npm/bin/npm-cli.js" ci`. Do not disable certificate validation.

The bundled JSON datasets, trained artifacts and source PDFs allow a demo without re-extraction. Keep the supplied originals in the workspace root to reproduce the pipeline.

## Rebuild from reports

```powershell
.venv/Scripts/python.exe -X utf8 scripts/inspect_reports.py
.venv/Scripts/python.exe -X utf8 scripts/ingest_reports.py
.venv/Scripts/python.exe -X utf8 scripts/build_dataset.py
.venv/Scripts/python.exe -X utf8 scripts/train_models.py
npm run build
```

The extractor supports the supplied April–July 2026 Table 6 layout. New layouts/months need a verified adapter update. Raw per-month extraction caches are reused only when their source hash matches; mismatches trigger fresh extraction. The source PDFs are never modified. Review rejected rows and reconcile totals before serving a newly imported dataset.

## Docker / PostgreSQL

Copy `.env.example` to `.env` and set an alphanumeric local database password. Then:

```powershell
docker compose up --build
```

Open http://127.0.0.1:8080. PostgreSQL has a persistent named volume; only the frontend is exposed on loopback. Docker configuration is included; see the validation report for whether it was exercised on this machine.

This is a single-user prototype. Authentication, ministry-scoped authorization, schema migrations and hardened deployment remain production work. Do not expose this API directly to the internet.

## Validate

```powershell
.venv/Scripts/python.exe -m pytest backend/test_app.py -q
npm test
npm run build
```

Backend tests use an isolated database. The 15 tests cover source counts/keys, a manually checked PDF row, API pagination/history, review validation/deduplication/audit, missing-label handling, SHAP reconstruction, artifact month, conflicting imports, scoring eligibility, CSV safety and network errors. See [remaining work](docs/REMAINING_WORK.md) for the updated completion checklist.

## Important interpretation

The visible 0–100 **review index is rules-based, not a probability**. The ML experiment predicts next-report **schedule/cost revisions**, not actual completion dates or final costs. Four reports do not constitute a validated twenty-year model. The first training window contains only three cost-increase positives. Logistic regression beats the XGBoost candidate on the reported schedule-ranking metric. Those results are shown honestly.

The map gives regional context only: no exact coordinates are supplied. The query assistant uses deterministic retrieval, with no Gemini/API key dependency. Static hosted mode has no shared database; the full API runs locally or through Docker.

## Font

Pixel Code is self-hosted in `public/fonts` with its original license, from https://qwerasd205.github.io/PixelCode/.
