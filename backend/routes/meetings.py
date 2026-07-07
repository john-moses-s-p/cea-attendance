from datetime import datetime, date, time as time_cls

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import Meeting, AgendaSection
from utils import roles_required, generate_unique_attendance_code

meetings_bp = Blueprint("meetings", __name__, url_prefix="/api/meetings")


def _parse_date(value):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def _parse_time(value):
    """Accepts 'HH:MM' or 'HH:MM:SS'."""
    if not value:
        return None
    try:
        parts = [int(p) for p in value.split(":")]
        while len(parts) < 3:
            parts.append(0)
        return time_cls(parts[0], parts[1], parts[2])
    except (TypeError, ValueError, IndexError):
        return None


def _apply_agenda_sections(meeting, sections_data):
    """Replace all agenda sections for this meeting with the given list.
    Each entry: { "title": str, "bullet_points": [str, ...] }
    """
    AgendaSection.query.filter_by(meeting_id=meeting.id).delete()
    for index, section in enumerate(sections_data or []):
        title = (section.get("title") or "").strip()
        if not title:
            continue
        bullets = [b.strip() for b in (section.get("bullet_points") or []) if b and b.strip()]
        db.session.add(AgendaSection(
            meeting_id=meeting.id,
            order_index=index,
            title=title,
            bullet_points=bullets,
        ))


@meetings_bp.route("", methods=["GET"])
@jwt_required()
def list_meetings():
    """All logged-in users (admin or student) can view meetings."""
    status_filter = request.args.get("status")
    query = Meeting.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    meetings = query.order_by(Meeting.meeting_date.desc(), Meeting.start_time.desc()).all()
    return jsonify({"meetings": [m.to_dict() for m in meetings]}), 200


@meetings_bp.route("/<int:meeting_id>", methods=["GET"])
@jwt_required()
def get_meeting(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    return jsonify({
        "meeting": meeting.to_dict(include_attendance_summary=True, include_agenda_sections=True)
    }), 200


@meetings_bp.route("", methods=["POST"])
@roles_required("admin", "super_admin")
def create_meeting():
    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    meeting_date = _parse_date(data.get("meeting_date"))
    start_time = _parse_time(data.get("start_time"))
    end_time = _parse_time(data.get("end_time"))

    if not title or not meeting_date or not start_time or not end_time:
        return jsonify({
            "error": "title, meeting_date (YYYY-MM-DD), start_time and end_time (HH:MM) are required"
        }), 400

    if end_time <= start_time:
        return jsonify({"error": "end_time must be after start_time"}), 400

    meeting = Meeting(
        title=title,
        description=data.get("description"),
        agenda=data.get("agenda"),
        venue=data.get("venue"),
        meeting_date=meeting_date,
        start_time=start_time,
        end_time=end_time,
        created_by=int(get_jwt_identity()),
    )
    db.session.add(meeting)
    db.session.flush()  # assign meeting.id before attaching agenda sections

    if "agenda_sections" in data:
        _apply_agenda_sections(meeting, data["agenda_sections"])

    db.session.commit()
    return jsonify({
        "message": "Meeting created",
        "meeting": meeting.to_dict(include_agenda_sections=True),
    }), 201


@meetings_bp.route("/<int:meeting_id>", methods=["PUT"])
@roles_required("admin", "super_admin")
def update_meeting(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    data = request.get_json(force=True) or {}

    if meeting.attendance_locked and data.get("force") is not True:
        return jsonify({"error": "Meeting attendance is finalized; details are locked"}), 409

    for field in ("title", "description", "agenda", "venue"):
        if field in data:
            setattr(meeting, field, data[field])

    new_date = meeting.meeting_date
    new_start = meeting.start_time
    new_end = meeting.end_time

    if "meeting_date" in data:
        parsed = _parse_date(data["meeting_date"])
        if not parsed:
            return jsonify({"error": "Invalid meeting_date format (use YYYY-MM-DD)"}), 400
        new_date = parsed

    if "start_time" in data:
        parsed = _parse_time(data["start_time"])
        if not parsed:
            return jsonify({"error": "Invalid start_time format (use HH:MM)"}), 400
        new_start = parsed

    if "end_time" in data:
        parsed = _parse_time(data["end_time"])
        if not parsed:
            return jsonify({"error": "Invalid end_time format (use HH:MM)"}), 400
        new_end = parsed

    if new_end <= new_start:
        return jsonify({"error": "end_time must be after start_time"}), 400

    meeting.meeting_date = new_date
    meeting.start_time = new_start
    meeting.end_time = new_end

    if "agenda_sections" in data:
        _apply_agenda_sections(meeting, data["agenda_sections"])

    db.session.commit()
    return jsonify({
        "message": "Meeting updated",
        "meeting": meeting.to_dict(include_agenda_sections=True),
    }), 200


@meetings_bp.route("/<int:meeting_id>/cancel", methods=["POST"])
@roles_required("admin", "super_admin")
def cancel_meeting(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    meeting.status = "cancelled"
    db.session.commit()
    return jsonify({"message": "Meeting cancelled", "meeting": meeting.to_dict()}), 200


@meetings_bp.route("/<int:meeting_id>/complete", methods=["POST"])
@roles_required("admin", "super_admin")
def complete_meeting(meeting_id):
    """Mark a meeting completed, optionally attaching minutes text/path."""
    meeting = Meeting.query.get_or_404(meeting_id)
    data = request.get_json(force=True) or {}
    meeting.status = "completed"
    if data.get("minutes_pdf_path"):
        meeting.minutes_pdf_path = data["minutes_pdf_path"]
    db.session.commit()
    return jsonify({"message": "Meeting marked completed", "meeting": meeting.to_dict()}), 200


@meetings_bp.route("/<int:meeting_id>", methods=["DELETE"])
@roles_required("super_admin")
def delete_meeting(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    db.session.delete(meeting)
    db.session.commit()
    return jsonify({"message": "Meeting deleted"}), 200


# ---------------------------------------------------------------------------
# Attendance code system (Feature 1)
# ---------------------------------------------------------------------------

@meetings_bp.route("/<int:meeting_id>/generate-code", methods=["POST"])
@roles_required("admin", "super_admin")
def generate_code(meeting_id):
    """Generate (or regenerate) this meeting's 6-digit attendance code.
    Regenerating immediately invalidates the previous code, since only the
    current value of attendance_code is ever checked.
    """
    meeting = Meeting.query.get_or_404(meeting_id)

    if meeting.status == "cancelled":
        return jsonify({"error": "Cannot generate a code for a cancelled meeting"}), 409
    if meeting.attendance_locked:
        return jsonify({"error": "Attendance for this meeting is already locked"}), 409

    meeting.attendance_code = generate_unique_attendance_code(Meeting)
    meeting.code_generated_at = datetime.now()
    db.session.commit()

    return jsonify({
        "message": "Attendance code generated",
        "attendance_code": meeting.attendance_code,
        "meeting": meeting.to_dict(),
    }), 201


@meetings_bp.route("/<int:meeting_id>/code", methods=["GET"])
@roles_required("admin", "super_admin")
def get_code(meeting_id):
    """Admin-only view of the current code (students never see this
    endpoint — they only submit a code, never retrieve one)."""
    meeting = Meeting.query.get_or_404(meeting_id)
    return jsonify({
        "attendance_code": meeting.attendance_code,
        "code_generated_at": meeting.code_generated_at.isoformat() if meeting.code_generated_at else None,
        "code_valid": meeting.is_code_valid(),
        "start_time": meeting.start_time.strftime("%H:%M") if meeting.start_time else None,
        "end_time": meeting.end_time.strftime("%H:%M") if meeting.end_time else None,
    }), 200
