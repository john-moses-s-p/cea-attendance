import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from extensions import db
from models import Meeting, Attendance, QRSession, QRScanLog, User
from utils import roles_required, get_client_ip

qr_bp = Blueprint("qr_attendance", __name__, url_prefix="/api/attendance/qr")


def _now():
    return datetime.now(timezone.utc)


def _aware(dt):
    """SQLite/MySQL may hand back naive datetimes; treat them as UTC."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _meeting_window(meeting):
    """The [start, end] window during which QR generation/scanning is
    allowed for this meeting, derived from its scheduled start time."""
    cfg = current_app.config
    start = _aware(meeting.meeting_datetime) - timedelta(minutes=cfg["QR_WINDOW_BEFORE_MINUTES"])
    end = _aware(meeting.meeting_datetime) + timedelta(minutes=cfg["QR_WINDOW_AFTER_MINUTES"])
    return start, end


def _log(meeting_id, student_id, token, result, detail=None):
    entry = QRScanLog(
        meeting_id=meeting_id,
        student_id=student_id,
        token_attempted=token,
        result=result,
        detail=detail,
        ip_address=get_client_ip(request),
    )
    db.session.add(entry)
    db.session.commit()
    return entry


# ---------------------------------------------------------------------------
# Admin: generate / view / revoke a meeting's QR session
# ---------------------------------------------------------------------------

@qr_bp.route("/generate/<int:meeting_id>", methods=["POST"])
@roles_required("admin", "super_admin")
def generate_qr(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)

    if meeting.status != "scheduled":
        return jsonify({"error": "QR attendance can only be generated for a scheduled meeting"}), 409
    if meeting.attendance_locked:
        return jsonify({"error": "Attendance for this meeting is already locked"}), 409

    window_start, window_end = _meeting_window(meeting)
    now = _now()
    if not (window_start <= now <= window_end):
        return jsonify({
            "error": "QR codes can only be generated within the meeting's active window",
            "window_start": window_start.isoformat(),
            "window_end": window_end.isoformat(),
        }), 400

    data = request.get_json(silent=True) or {}
    requested_minutes = data.get("expiry_minutes", current_app.config["QR_DEFAULT_EXPIRY_MINUTES"])
    try:
        requested_minutes = int(requested_minutes)
    except (TypeError, ValueError):
        return jsonify({"error": "expiry_minutes must be a number"}), 400
    expiry_minutes = max(1, min(requested_minutes, current_app.config["QR_MAX_EXPIRY_MINUTES"]))

    # Only one active session per meeting: deactivate any existing one.
    QRSession.query.filter_by(meeting_id=meeting_id, is_active=True).update({"is_active": False})

    session = QRSession(
        meeting_id=meeting_id,
        token=secrets.token_urlsafe(32),
        generated_by=int(get_jwt_identity()),
        expires_at=now + timedelta(minutes=expiry_minutes),
        is_active=True,
    )
    db.session.add(session)
    db.session.commit()

    return jsonify({"message": "QR code generated", "session": session.to_dict()}), 201


@qr_bp.route("/active/<int:meeting_id>", methods=["GET"])
@roles_required("admin", "super_admin")
def get_active_qr(meeting_id):
    session = QRSession.query.filter_by(meeting_id=meeting_id, is_active=True).order_by(
        QRSession.created_at.desc()
    ).first()

    if not session:
        return jsonify({"session": None}), 200

    if not session.is_valid():
        session.is_active = False
        db.session.commit()
        return jsonify({"session": None}), 200

    return jsonify({"session": session.to_dict()}), 200


@qr_bp.route("/revoke/<int:meeting_id>", methods=["POST"])
@roles_required("admin", "super_admin")
def revoke_qr(meeting_id):
    updated = QRSession.query.filter_by(meeting_id=meeting_id, is_active=True).update({"is_active": False})
    db.session.commit()
    if not updated:
        return jsonify({"message": "No active QR code to revoke"}), 200
    return jsonify({"message": "QR code revoked"}), 200


@qr_bp.route("/logs/<int:meeting_id>", methods=["GET"])
@roles_required("admin", "super_admin")
def scan_logs(meeting_id):
    logs = (
        QRScanLog.query.filter_by(meeting_id=meeting_id)
        .order_by(QRScanLog.created_at.desc())
        .limit(100)
        .all()
    )
    return jsonify({"logs": [l.to_dict() for l in logs]}), 200


# ---------------------------------------------------------------------------
# Student: scan a QR code to self-mark attendance
# ---------------------------------------------------------------------------

@qr_bp.route("/scan", methods=["POST"])
@roles_required("student")
def scan_qr():
    student_id = int(get_jwt_identity())
    data = request.get_json(force=True) or {}
    token = (data.get("token") or "").strip()

    if not token:
        return jsonify({"error": "token is required"}), 400

    cfg = current_app.config

    # --- Rate limit: blunt scripted/repeated scan attempts per student ---
    window_start = _now() - timedelta(seconds=cfg["QR_SCAN_RATE_LIMIT_WINDOW_SECONDS"])
    recent_attempts = QRScanLog.query.filter(
        QRScanLog.student_id == student_id,
        QRScanLog.created_at >= window_start,
    ).count()
    if recent_attempts >= cfg["QR_SCAN_RATE_LIMIT_ATTEMPTS"]:
        _log(None, student_id, token, "rate_limited", "Too many recent scan attempts")
        return jsonify({"error": "Too many attempts. Please wait a moment and try again."}), 429

    # --- Student account must be active ---
    student = User.query.get(student_id)
    if not student or not student.is_active:
        _log(None, student_id, token, "error", "Inactive or missing student account")
        return jsonify({"error": "Your account is not active. Contact an admin."}), 403

    # --- Token must map to a session ---
    session = QRSession.query.filter_by(token=token).first()
    if not session:
        _log(None, student_id, token, "invalid_token", "Token not found")
        return jsonify({"error": "Invalid QR code"}), 404

    meeting = Meeting.query.get(session.meeting_id)
    if not meeting:
        _log(session.meeting_id, student_id, token, "error", "Meeting not found for session")
        return jsonify({"error": "Meeting not found"}), 404

    # --- Session must still be active and unexpired ---
    if not session.is_valid():
        if session.is_active:
            session.is_active = False
            db.session.commit()
        _log(meeting.id, student_id, token, "expired", "QR session expired or revoked")
        return jsonify({"error": "This QR code has expired. Ask an admin to generate a new one."}), 400

    # --- Meeting must not be cancelled/completed or locked ---
    if meeting.status != "scheduled":
        _log(meeting.id, student_id, token, "outside_window", f"Meeting status is {meeting.status}")
        return jsonify({"error": "This meeting is not currently accepting attendance"}), 409

    if meeting.attendance_locked:
        _log(meeting.id, student_id, token, "locked", "Attendance already finalized")
        return jsonify({"error": "Attendance for this meeting has been finalized"}), 409

    # --- Defense in depth: re-check the meeting time window independent of
    #     the QR session's own expiry, in case the session TTL was set long ---
    window_start_m, window_end_m = _meeting_window(meeting)
    now = _now()
    if not (window_start_m <= now <= window_end_m):
        _log(meeting.id, student_id, token, "outside_window", "Outside meeting time window")
        return jsonify({"error": "Attendance can only be marked during the meeting's time window"}), 400

    # --- Duplicate / override handling ---
    existing = Attendance.query.filter_by(meeting_id=meeting.id, student_id=student_id).first()
    if existing:
        if existing.marked_via == "admin":
            _log(meeting.id, student_id, token, "duplicate", "Already marked by admin")
            return jsonify({
                "error": "Your attendance was already recorded by an admin and can't be changed by scanning.",
                "attendance": existing.to_dict(),
            }), 409
        # Already self-marked via QR earlier in this same window — idempotent, not an error.
        _log(meeting.id, student_id, token, "duplicate", "Already self-marked via QR")
        return jsonify({
            "message": "You're already marked present for this meeting.",
            "attendance": existing.to_dict(),
        }), 200

    record = Attendance(
        meeting_id=meeting.id,
        student_id=student_id,
        status="present",
        marked_via="qr",
        marked_by=student_id,
    )
    db.session.add(record)
    db.session.commit()

    _log(meeting.id, student_id, token, "success", "Marked present via QR")

    return jsonify({
        "message": f"Attendance marked for {meeting.title}",
        "attendance": record.to_dict(),
    }), 201
