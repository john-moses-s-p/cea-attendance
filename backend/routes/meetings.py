from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from extensions import db
from models import Meeting
from utils import roles_required

meetings_bp = Blueprint("meetings", __name__, url_prefix="/api/meetings")


def _parse_datetime(value):
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


@meetings_bp.route("", methods=["GET"])
@jwt_required()
def list_meetings():
    """All logged-in users (admin or student) can view meetings."""
    status_filter = request.args.get("status")
    query = Meeting.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    meetings = query.order_by(Meeting.meeting_datetime.desc()).all()
    return jsonify({"meetings": [m.to_dict() for m in meetings]}), 200


@meetings_bp.route("/<int:meeting_id>", methods=["GET"])
@jwt_required()
def get_meeting(meeting_id):
    meeting = Meeting.query.get_or_404(meeting_id)
    return jsonify({"meeting": meeting.to_dict(include_attendance_summary=True)}), 200


@meetings_bp.route("", methods=["POST"])
@roles_required("admin", "super_admin")
def create_meeting():
    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    meeting_datetime = _parse_datetime(data.get("meeting_datetime"))

    if not title or not meeting_datetime:
        return jsonify({"error": "title and meeting_datetime (ISO 8601) are required"}), 400

    meeting = Meeting(
        title=title,
        description=data.get("description"),
        agenda=data.get("agenda"),
        venue=data.get("venue"),
        meeting_datetime=meeting_datetime,
        created_by=int(get_jwt_identity()),
    )
    db.session.add(meeting)
    db.session.commit()
    return jsonify({"message": "Meeting created", "meeting": meeting.to_dict()}), 201


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

    if "meeting_datetime" in data:
        parsed = _parse_datetime(data["meeting_datetime"])
        if not parsed:
            return jsonify({"error": "Invalid meeting_datetime format"}), 400
        meeting.meeting_datetime = parsed

    db.session.commit()
    return jsonify({"message": "Meeting updated", "meeting": meeting.to_dict()}), 200


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
