# CEA — Meeting & Member Management (Phase 1 MVP)

Civil Engineering Association portal covering **authentication, meeting management, and
attendance** for Admin and Student roles, on React + Tailwind + Flask + MySQL.

This is Phase 1 of the full spec. Not yet built: QR/geolocation attendance, notifications,
document repository, events, certificates, reports/analytics export, audit logs, PWA. The
schema and API are structured so those can be added without reworking what's here — see
"Extending this" at the bottom.

## What's included

- **Auth**: institutional-email-only registration, email verification, login (JWT access +
  refresh tokens), forgot/reset password, change password, role-based access control
  (`super_admin`, `admin`, `student`).
- **Meetings**: create, edit, cancel, mark completed, view (admin: full CRUD; student: read-only).
- **Attendance**: mark per-student or in bulk, 4 statuses (present/absent/late/excused),
  lock/finalize a meeting's attendance, per-student attendance history + percentage.
- **Student roster**: admin can add students and toggle active/inactive (bulk Excel import is
  not yet built — see below).

## Project structure

```
cea-app/
├── backend/            Flask API (MySQL via SQLAlchemy)
│   ├── app.py          App factory + blueprint registration
│   ├── config.py       Env-driven settings (DB, JWT, allowed email domains)
│   ├── models.py       User, Meeting, Attendance
│   ├── routes/         auth.py, meetings.py, attendance.py, students.py
│   ├── schema.sql       Hand-written DDL matching models.py
│   └── seed.py          Create the first super admin
└── frontend/           React + Vite + Tailwind
    └── src/
        ├── pages/       Login, Register, dashboards, Meetings, MeetingDetail, etc.
        ├── components/  Navbar, ProtectedRoute
        ├── context/     AuthContext (JWT storage, login/logout)
        └── api/         Axios client with auto token refresh
```

# CEA — Meeting & Member Management

Civil Engineering Association portal covering **authentication, meeting management,
attendance, and QR-based check-in** for Admin and Student roles, on React + Tailwind +
Flask + MySQL.

Not yet built: geolocation verification, notifications, document repository, events,
certificates, reports/analytics export, general audit logs, PWA. The schema and API are
structured so those can be added without reworking what's here.

## What's included

**Phase 1 — Auth, meetings, attendance**
- Institutional-email-only registration, email verification, login (JWT access + refresh),
  forgot/reset/change password, role-based access control (`super_admin`, `admin`, `student`).
- Meetings: create, edit, cancel, mark completed (admin CRUD; student read-only).
- Attendance: mark per-student or in bulk, 4 statuses, lock/finalize, per-student history.
- Student roster: add/edit, activate/deactivate.

**Phase 2 — QR-based attendance**
- Admin generates a time-boxed QR code per meeting (`qr_sessions` table); only one is active
  per meeting at a time, and regenerating one revokes the last.
- QR is only generatable/scannable within a configurable window around the meeting's
  scheduled time (default: 15 min before → 3 hrs after), independent of the QR's own expiry.
- Students scan via camera (`html5-qrcode`) or manual code entry, hitting
  `POST /api/attendance/qr/scan`, which self-marks them `present`.
- **Duplicate prevention**: re-scanning an already-self-marked record is idempotent (returns
  "already marked", doesn't create a new row — the DB unique constraint on
  `(meeting_id, student_id)` backs this up regardless).
- **Admin override always wins**: a record with `marked_via = 'admin'` can never be
  overwritten by a student's QR scan; admins can still override a QR-set record at any time
  before locking.
- **Locking**: once a meeting's attendance is locked, QR generation and scanning are both
  rejected, same as manual marking.
- **Security**: per-student scan rate limiting (5 attempts / 60s by default), every scan
  attempt (success or failure) logged to `qr_scan_logs` with a reason and IP, tokens generated
  with `secrets.token_urlsafe(32)`.

## Project structure

```
cea-app/
├── backend/
│   ├── app.py                 App factory + blueprint registration
│   ├── config.py              Env-driven settings (DB, JWT, email domains, QR window/rate limit)
│   ├── models.py              User, Meeting, Attendance, QRSession, QRScanLog
│   ├── routes/                auth.py, meetings.py, attendance.py, students.py, qr_attendance.py
│   ├── migrations/
│   │   └── 002_add_qr_attendance.sql   Additive migration for an existing Phase-1 DB
│   ├── schema.sql             Full fresh-install schema (Phase 1 + 2)
│   └── seed.py                 Create the first super admin
└── frontend/
    └── src/
        ├── pages/
        │   ├── MeetingDetail.jsx     Now includes the QR panel (admin) / scan link (student)
        │   └── ScanAttendance.jsx    Student camera-scan page
        ├── components/
        │   ├── QRCodeGenerator.jsx   Admin: generate/regenerate/revoke, live countdown + scan log
        │   └── QRScanner.jsx         Student: camera scan with manual-entry fallback
        └── ...
```

## API reference — QR attendance

| Method | Endpoint | Role | Purpose |
|---|---|---|---|
| POST | `/api/attendance/qr/generate/<meeting_id>` | admin | Create a new QR session (`expiry_minutes` optional, default 10, max 60) |
| GET | `/api/attendance/qr/active/<meeting_id>` | admin | Fetch the current active session, if any |
| POST | `/api/attendance/qr/revoke/<meeting_id>` | admin | Deactivate the active session early |
| GET | `/api/attendance/qr/logs/<meeting_id>` | admin | Last 100 scan attempts (success + failure) |
| POST | `/api/attendance/qr/scan` | student | `{ "token": "..." }` → self-marks present |

## Local setup

### 1. Database

**Fresh install:**
```bash
mysql -u root -p < backend/schema.sql
```

**Upgrading an existing Phase-1 database:**
```bash
mysql -u root -p cea_db < backend/migrations/002_add_qr_attendance.sql
```
This only adds the `marked_via` column (safe default `'admin'`, so existing rows are
correctly attributed) and the two new QR tables — it doesn't touch existing data.

Or, if you're using Flask-Migrate instead of raw SQL:
```bash
cd backend
flask db init      # first time only
flask db migrate -m "add qr attendance"
flask db upgrade
```

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit DB credentials, INSTITUTIONAL_EMAIL_DOMAIN, and QR_* settings if needed
python seed.py admin@student.tce.edu "Association Super Admin" ChangeMe@123
python app.py           # runs on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev              # runs on http://localhost:5173
```

Camera access for scanning requires **HTTPS** (or `localhost`) in the browser — this is a
browser security requirement, not something the app controls. When deploying, make sure the
frontend is served over HTTPS.

## Email delivery (currently stubbed)

`register` and `forgot-password` currently return the verification/reset token directly in the
API response (`dev_verification_token` / `dev_reset_token`) instead of emailing it, so the app
is testable without SMTP configured. Wire these into a real email provider before production use.

## Known scope cuts

- **Bulk Excel import/export** of students — not yet built.
- **Geolocation verification** for QR scans — not yet built; the QR system currently relies on
  the time window + token secrecy + rate limiting rather than location, so a screenshot of the
  QR code shared outside the room would still work within the validity window. Add a
  `latitude`/`longitude` check against the meeting venue in `qr_attendance.py`'s `scan_qr()` if
  you need this — the request already carries a JSON body that can take extra fields.
- **Notifications, document repository, events, certificates, reports/analytics, general
  audit logs (beyond QR scan logs), PWA** — not started.

## Deployment notes

- Set real, unique `SECRET_KEY` and `JWT_SECRET_KEY` values in production.
- Put Flask behind Gunicorn + Nginx; `app.run(debug=True)` is dev-only.
- Restrict CORS (`FRONTEND_ORIGIN`) to your real frontend domain in production.
- Serve the frontend over HTTPS (required for camera access on the scan page).
- Tune `QR_WINDOW_BEFORE_MINUTES` / `QR_WINDOW_AFTER_MINUTES` / `QR_DEFAULT_EXPIRY_MINUTES` /
  `QR_SCAN_RATE_LIMIT_*` in `.env` to match how your meetings actually run.

