# JanSahayak AI

Scheme eligibility assistant for Indian government welfare schemes.
Hindi + English. Eligibility is decided **only** by deterministic Python
rules (criterion + operator + threshold) — never by an LLM.

## Structure

```
backend/   FastAPI + SQLAlchemy + SQLite
  app/       main.py (entrypoint), models.py, engine.py (rules engine),
             routers.py (API), seed.py, database.py, config.py, schemas.py
  seed/      schemes.json (10 real schemes, all verified=false with TODOs)
  tests/     pytest tests (engine + endpoints)
frontend/  React + TypeScript + Vite + Tailwind CSS
  src/
    api/       client.ts (typed fetch + friendly error codes)
    components/ Wizard, Results, SchemeCard, LanguagePicker
    i18n/      en.json / hi.json translation files
```

### Database (PROPOSAL.md section 9)

- `schemes` — name, category, state/region, benefits, eligibility summary,
  application steps, target groups, official URL, last_verified, verified flag.
- `eligibility_rules` — criterion, operator, threshold, PASS/FAIL
  explanations per rule.
- `required_documents` — document name + instructions per scheme.
- `source_records` — source URL, last verification date, version.
- `user_profiles` — minimal wizard fields + extras as JSON.
- `saved_progress` — per user per scheme document statuses and checklist %.

The proposal targets PostgreSQL/Supabase in production; the prototype uses
SQLite as agreed for now (same SQLAlchemy models, swap the connection URL
later).

## Backend setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env        # fill GROQ_API_KEY later (Stage 6)
python -m app.seed            # optional; auto-seeds on startup if DB empty
uvicorn app.main:app --reload
```

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health
- SQLite file `jansahayak.db` is created automatically.
- If `python` resolves to a non-Windows Python (e.g. MSYS2), create the
  venv with the Windows launcher instead: `py -3.14 -m venv .venv`.

### Environment variables (backend, `.env`)

| Variable      | Purpose                                             |
| ------------- | --------------------------------------------------- |
| `GROQ_API_KEY`| Groq key for the AI assistant; empty = assistant off |
| `DATABASE_URL`| SQLAlchemy URL; defaults to `sqlite:///./jansahayak.db` |

### API endpoints

| Endpoint                                    | Purpose                                                    |
| ------------------------------------------- | ---------------------------------------------------------- |
| `GET /health`                               | status, scheme count, `groq_configured`                    |
| `POST /profile`                             | store a minimal profile, returns `profile_id`              |
| `POST /match`                               | run the rules engine for every scheme                      |
| `GET /schemes/{id}`                         | full record: rules, documents, sources, steps              |
| `GET /action-plan/{profile_id}`             | priority schemes, common documents, uncertain schemes      |
| `GET /schemes/{id}/details?profile_id=`     | details page data: per-user criteria, deadline, status     |
| `PUT /applications/{profile_id}/{scheme_id}`| set SELF-REPORTED status (NOT_APPLIED..REJECTED)           |
| `GET /applications/{profile_id}?status=`    | list rows; `applied` / `not_applied` / exact status        |

Application statuses are what the user tells us — the app never checks
government systems. Scheme records with `verified: false` carry an
"unverified data" flag; no eligibility decision is ever made by an LLM.

## Frontend setup

```powershell
cd frontend
npm install
copy .env.example .env.local  # VITE_API_URL=http://localhost:8000
npm run dev                   # http://localhost:5173
```

## Tests

```powershell
cd backend
.venv\Scripts\activate
pytest -v
```

Frontend build (type-check + production bundle):

```powershell
cd frontend
npm run build
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel (frontend), a backend host,
and the SQLite → PostgreSQL/Supabase switch.

## Hard rules baked into the design

1. Eligibility = deterministic Python rules only (criterion, operator,
   threshold); the LLM never decides eligibility.
2. Each criterion returns PASS / FAIL / INFO_REQUIRED with a plain
   explanation; overall result is ELIGIBLE / INELIGIBLE / UNCERTAIN.
3. The AI assistant answers only from retrieved scheme records, cites
   source URL + `last_verified`, and says it is unsure when data is missing.
4. Document completion % = checklist progress, not approval chance.
5. Official portals only; the app never claims to submit applications.
6. Seed data is never invented: every scheme in `seed/schemes.json` is real,
   marked `"verified": false`, with a TODO wherever a rule is uncertain.
7. No hardcoded API keys — use `.env` (backend) / `.env.local` (frontend);
   templates provided as `.env.example`.

## Status

Working prototype (no backend for the AI assistant yet — that is the RAG
stage): scaffold + DB models, deterministic eligibility engine with income
bands and INFO_REQUIRED handling, profile wizard, results dashboard with
per-criterion explanations, target-group filter, stale-data flags, friendly
error handling, Hindi + English. Still basic: document checklist, what-if
simulator, and the RAG assistant.
