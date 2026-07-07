from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from extensions import db
from models import Meeting, Attendance, User
from utils import roles_required

attendance_bp = Blueprint("attendance", __name__, url_prefix="/api/attendance")

VALID_STATUSES = {"present", "absent", "late", "excused"}


@attendance_bp.route("/meeting/<int:meeting_id>", methods=["GET"])
@jwt_required()
def get_meeting_attendance(meeting_id):
    """Admins see the full roster; students see only their own record."""
    claims = get_jwt()
    meeting = Meeting.query.get_or_404(meeting_id)

    if claims.get("role") == "student":
        record = Attendance.query.filter_by(
            meeting_id=meeting_id, student_id=int(get_jwt_identity())
        ).first()
        return jsonify({"attendance": record.to_dict() if record else None}), 200

    records = meeting.attendance_records.all()
    return jsonify({"attendance": [r.to_dict() for r in records]}), 200


@attendance_bp.route("/meeting/<int:meeting_id>/mark", methods=["POST"])
@roles_required("admin", "super_admin")
def mark_attendance(meeting_id):
    """Mark or update attendance for a single student."""
    meeting = Meeting.query.get_or_404(meeting_id)
    if meeting.attendance_locked:
        return jsonify({"error": "Attendance for this meeting is locked"}), 409

    data = request.get_json(force=True) or {}
    student_id = data.get("student_id")
    status = data.get("status")

    if status not in VALID_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400

    student = User.query.filter_by(id=student_id, role="student").first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    record = Attendance.query.filter_by(meeting_id=meeting_id, student_id=student_id).first()
    if record:
        record.status = status
        record.marked_via = "admin"
        record.marked_by = int(get_jwt_identity())
    else:
        record = Attendance(
            meeting_id=meeting_id, student_id=student_id, status=status,
            marked_via="admin", marked_by=int(get_jwt_identity())
        )
        db.session.add(record)

    db.session.commit()
    return jsonify({"message": "Attendance marked", "attendance": record.to_dict()}), 200


@attendance_bp.route("/meeting/<int:meeting_id>/bulk", methods=["POST"])
@roles_required("admin", "super_admin")
def bulk_mark_attendance(meeting_id):
    """Bulk mark: { "records": [{ "student_id": 1, "status": "present" }, ...] }"""
    meeting = Meeting.query.get_or_404(meeting_id)
    if meeting.attendance_locked:
        return jsonify({"error": "Attendance for this meeting is locked"}), 409

    data = request.get_json(force=True) or {}
    records = data.get("records") or []
    marker_id = int(get_jwt_identity())

    updated = []
    errors = []
    for entry in records:
        student_id = entry.get("student_id")
        status = entry.get("status")
        if status not in VALID_STATUSES:
            errors.append({"student_id": student_id, "error": "invalid status"})
            continue

        existing = Attendance.query.filter_by(
            meeting_id=meeting_id, student_id=student_id
        ).first()
        if existing:
            existing.status = status
            existing.marked_via = "admin"
            existing.marked_by = marker_id
            updated.append(existing)
        else:
            new_record = Attendance(
                meeting_id=meeting_id, student_id=student_id,
                status=status, marked_via="admin", marked_by=marker_id
            )
            db.session.add(new_record)
            updated.append(new_record)

    db.session.commit()
    return jsonify({
        "message": f"{len(updated)} attendance records saved",
        "attendance": [r.to_dict() for r in updated],
        "errors": errors,
    }), 200


@attendance_bp.route("/meeting/<int:meeting_id>/lock", methods=["POST"])
@roles_required("admin", "super_admin")
def lock_attendance(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    meeting.attendance_locked = True
    db.session.commit()
    return jsonify({"message": "Attendance finalized and locked"}), 200


@attendance_bp.route("/student/<int:student_id>", methods=["GET"])
@jwt_required()
def get_student_attendance(student_id):
    """A student may view their own record; admins may view any student's."""
    claims = get_jwt()
    requester_id = int(get_jwt_identity())
    if claims.get("role") == "student" and requester_id != student_id:
        return jsonify({"error": "Forbidden"}), 403

    records = (
        Attendance.query.filter_by(student_id=student_id)
        .join(Meeting)
        .order_by(Meeting.meeting_date.desc(), Meeting.start_time.desc())
        .all()
    )
    total = len(records)
    present = len([r for r in records if r.status in ("present", "late")])
    percentage = round((present / total) * 100, 1) if total else None

    return jsonify({
        "records": [r.to_dict() for r in records],
        "summary": {
            "total_meetings": total,
            "present_or_late": present,
            "attendance_percentage": percentage,
        },
    }), 200


# ---------------------------------------------------------------------------
# Attendance code self-marking (Feature 1 — replaces QR scanning)
# ---------------------------------------------------------------------------

@attendance_bp.route("/code/submit", methods=["POST"])
@roles_required("student")
def submit_attendance_code():
    """A student enters the 6-digit code shown/announced by the admin.
    Attendance is marked automatically for whichever meeting currently has
    that code active. Duplicate/admin-set records are protected exactly
    like the old QR flow: an admin-set record can never be overwritten by
    a student's own code entry.
    """
    student_id = int(get_jwt_identity())
    data = request.get_json(force=True) or {}
    code = (data.get("code") or "").strip()

    if not code or not code.isdigit() or len(code) != 6:
        return jsonify({"error": "Enter the 6-digit attendance code"}), 400

    student = User.query.get(student_id)
    if not student or not student.is_active:
        return jsonify({"error": "Your account is not active. Contact an admin."}), 403

    meeting = Meeting.query.filter_by(attendance_code=code).first()
    if not meeting:
        return jsonify({"error": "Invalid attendance code"}), 404

    if meeting.status == "cancelled":
        return jsonify({"error": "This meeting has been cancelled"}), 409
    if meeting.attendance_locked:
        return jsonify({"error": "Attendance for this meeting has been finalized"}), 409
    if not meeting.is_code_valid(datetime.now()):
        return jsonify({"error": "This code is not currently active for any meeting"}), 400

    existing = Attendance.query.filter_by(meeting_id=meeting.id, student_id=student_id).first()
    if existing:
        if existing.marked_via == "admin":
            return jsonify({
                "error": "Your attendance was already recorded by an admin and can't be changed here.",
                "attendance": existing.to_dict(),
            }), 409
        # Already self-marked earlier in this same window — idempotent, not an error.
        return jsonify({
            "message": "You're already marked present for this meeting.",
            "attendance": existing.to_dict(),
        }), 200

    record = Attendance(
        meeting_id=meeting.id,
        student_id=student_id,
        status="present",
        marked_via="code",
        marked_by=student_id,
    )
    db.session.add(record)
    db.session.commit()

    return jsonify({
        "message": f"Attendance marked for {meeting.title}",
        "attendance": record.to_dict(),
    }), 201
