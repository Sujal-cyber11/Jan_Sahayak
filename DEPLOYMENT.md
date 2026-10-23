# Deployment Notes

Brief, prototype-level guidance. Nothing here is a requirement; the app
runs fine locally with SQLite and `uvicorn`.

## Frontend on Vercel

1. Push the repo to GitHub, import it in Vercel.
2. Framework preset: **Vite**. Root directory: `frontend`.
3. Build command: `npm run build` (Vercel default works). Output: `dist`.
4. Environment variable (Project → Settings → Environment Variables):

   ```
   VITE_API_URL = https://your-backend-host.example
   ```

5. The frontend is a static SPA with no server routes — no extra config.
   All API calls go to `VITE_API_URL`, so CORS on the backend must allow
   the Vercel origin (see below).

## Backend host (Render / Railway / Fly.io / any Docker host)

1. Install a production server, e.g. add `gunicorn` (or keep `uvicorn`):

   ```powershell
   pip install gunicorn
   gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 2
   ```

2. Environment variables:

   ```
   GROQ_API_KEY = <your Groq key>
   DATABASE_URL = postgresql+psycopg2://user:pass@host:5432/dbname
   ```

3. Update CORS in `backend/app/main.py` to include the deployed frontend
   origin (it currently allows only `localhost:5173` for development).

## SQLite → PostgreSQL / Supabase

The ORM models are database-agnostic; only the connection changes:

1. `pip install psycopg2-binary` (or `psycopg[binary]`).
2. Set `DATABASE_URL` to a PostgreSQL URL, e.g. for Supabase use the
   **Session pooler** connection string:

   ```
   postgresql+psycopg2://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

3. On first start, `Base.metadata.create_all` creates all tables
   (including the new `target_groups` column) and the app auto-seeds
   `seed/schemes.json` when the schemes table is empty.
4. Notes:
   - SQLite's `check_same_thread` flag is only applied for SQLite URLs
     (`app/database.py`) — no change needed for Postgres.
   - Supabase pooler + SQLAlchemy needs `?sslmode=require` in some setups.
   - For real deployments, replace `create_all` with Alembic migrations.

## Safety notes for any host

- Never commit `.env` files; keep keys in the host's secret settings.
- All seed scheme records are `verified: false` — the data stays flagged
  as "Needs rechecking" until a human verifies it against official portals.
