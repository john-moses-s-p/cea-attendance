# Deploying CEA (Render + Vercel)

## Backend — Render

**Root directory:** `backend`

**Build command:**
```
pip install -r requirements.txt
```

**Start command:**
```
gunicorn wsgi:app
```
(`wsgi.py` exposes a plain module-level `app`, which is more reliable on Render
than the `gunicorn app:create_app()` factory syntax.)

**Environment variables** (Render → your service → Environment):

```
SECRET_KEY=<64+ char random string>
JWT_SECRET_KEY=<64+ char random string>

DB_HOST=<your MySQL host>
DB_PORT=3306
DB_USER=<your MySQL user>
DB_PASSWORD=<your MySQL password>
DB_NAME=cea_db

FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app

INSTITUTIONAL_EMAIL_DOMAIN=student.tce.edu
ADMIN_EMAIL_DOMAINS=student.tce.edu
```

Generate strong secrets locally, don't reuse the placeholders above, e.g.:
```
python -c "import secrets; print(secrets.token_hex(32))"
```

## Database migration (this update)

This update **removes the QR attendance system** and replaces it with a
6-digit meeting attendance code, adds `meeting_date` / `start_time` /
`end_time` in place of the old single `meeting_datetime`, and adds a new
`agenda_sections` table for the dynamic agenda builder.

**Back up your database first.** Then, against an **existing** database:

```bash
mysql -u <user> -p cea_db < backend/migrations/003_meeting_code_agenda_remove_qr.sql
```

This backfills `meeting_date` / `start_time` / `end_time` from the old
`meeting_datetime` column (assuming a 2-hour duration for past meetings —
adjust manually if needed), converts any existing QR-marked attendance
records to `marked_via = 'code'`, creates `agenda_sections`, and drops the
now-unused `qr_sessions` / `qr_scan_logs` tables and `meeting_datetime`
column.

For a **fresh install**, just run `backend/schema.sql` — it already reflects
the final post-migration schema, no need to also run the migration file.

If your MySQL is managed by Render/PlanetScale/etc. and gives you a single
connection string instead, set `DATABASE_URL` directly (it overrides the
`DB_*` vars — see `config.py`).

## Frontend — Vercel

**Root directory:** `frontend`

**Build command:** `npm run build`
**Output directory:** `dist`

**Environment variable:**
```
VITE_API_URL=https://your-backend.onrender.com
```

The frontend already reads this via `import.meta.env.VITE_API_URL` in
`src/api/client.js` — no code changes needed.

## Logo files (this update)

The redesigned frontend references `/cea-tce.jpg` and `/tce-logo.webp`,
served from `frontend/public/`. **Placeholder badge images are included**
so the app renders correctly out of the box — replace
`frontend/public/cea-tce.jpg` and `frontend/public/tce-logo.webp` with your
actual CEA and TCE logo artwork before going live (same filenames, any
reasonable image size — square works best since they're rendered as
circular badges).

## After both are live

1. Confirm `FRONTEND_ORIGIN` on Render exactly matches your Vercel URL
   (including `https://`, no trailing slash) — mismatches break CORS.
2. Hit `https://your-backend.onrender.com/api/health` — should return
   `{"status": "ok", ...}`.
3. Log in as an admin/super_admin and confirm `/admin/analytics` loads and
   "Export to Excel" downloads a `.xlsx` file.
4. Log in as a student and confirm `/admin/analytics` redirects away
   (role-restricted).
5. As an admin, create a meeting (date + start/end time), add a couple of
   agenda sections, generate an attendance code, and confirm:
   - "Generate meeting agenda PDF" downloads a matching PDF.
   - "Download attendance Excel" / "Download attendance PDF" both work.
6. As a student, confirm the meeting shows a code-entry box during the
   meeting's time window, and that entering the code marks you present.
7. On a phone (or narrow browser window), confirm the student dashboard
   shows a bottom navigation bar and there's no horizontal scrolling.
