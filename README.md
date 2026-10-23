# JanSahayak AI

Scheme eligibility assistant for Indian government welfare schemes.
Hindi + English. Eligibility is decided **only** by deterministic Python
rules (criterion + operator + threshold) — never by an LLM.

## Structure

```
backend/   FastAPI + SQLAlchemy + SQLite
  app/       main.py (entrypoint), models.py, seed.py, database.py, config.py
  seed/      schemes.json (10 real schemes, all verified=false with TODOs)
  tests/     pytest smoke tests
frontend/  React + TypeScript + Vite + Tailwind CSS
  src/i18n/  en.json / hi.json translation files
```

### Database (PROPOSAL.md section 9)

- `schemes` — name, category, state/region, benefits, eligibility summary,
  application steps, official URL, last_verified, verified flag.
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
pytest
```

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

Stage 1: scaffold, DB models, seed loader. Later stages add the
eligibility engine, profile wizard, document checklist, what-if simulator,
and the RAG assistant.
