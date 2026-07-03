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

QR_WINDOW_BEFORE_MINUTES=15
QR_WINDOW_AFTER_MINUTES=180
```

Generate strong secrets locally, don't reuse the placeholders above, e.g.:
```
python -c "import secrets; print(secrets.token_hex(32))"
```

The database itself is untouched — point `DB_*` at your existing MySQL instance;
no migration is needed for the analytics feature (it only reads `users`,
`meetings`, `attendance`).

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

## After both are live

1. Confirm `FRONTEND_ORIGIN` on Render exactly matches your Vercel URL
   (including `https://`, no trailing slash) — mismatches break CORS.
2. Hit `https://your-backend.onrender.com/api/health` — should return
   `{"status": "ok", ...}`.
3. Log in as an admin/super_admin and confirm `/admin/analytics` loads and
   "Export to Excel" downloads a `.xlsx` file.
4. Log in as a student and confirm `/admin/analytics` redirects away
   (role-restricted).
