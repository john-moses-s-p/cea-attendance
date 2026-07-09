from flask import Blueprint, jsonify

from models import Meeting, Attendance, User
from utils import roles_required

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@analytics_bp.route("/attendance", methods=["GET"])
@roles_required("admin", "super_admin")
def attendance_analytics():
    """Per-student attendance analytics, admin/super_admin only.

    Reads only from existing tables (users, meetings, attendance) — no
    schema changes and no writes. For each student:

      meetings_attended  = records marked present or late
      meetings_excused   = records marked excused (excluded from the
                            denominator so they don't count for or against
                            the student)
      meetings_absent    = every other countable meeting (explicit 'absent'
                            records AND meetings with no record at all,
                            since an unmarked meeting is still a miss)
      attendance_percentage = attended / (total completed meetings - excused)

    Only *completed* meetings count. A meeting that's merely scheduled
    hasn't happened yet, so it must never count as an absence against
    anyone — it simply isn't part of the denominator until an admin marks
    it completed.
    """
    # Only meetings that have actually happened count toward attendance —
    # scheduled (future/in-progress) and cancelled meetings are excluded.
    countable_meetings = Meeting.query.filter(Meeting.status == "completed").all()
    total_meetings = len(countable_meetings)
    countable_ids = {m.id for m in countable_meetings}

    students = User.query.filter_by(role="student").order_by(User.name).all()

    # Pull all attendance records for countable meetings in one query rather
    # than one query per student.
    records = (
        Attendance.query.filter(Attendance.meeting_id.in_(countable_ids)).all()
        if countable_ids else []
    )
    by_student = {}
    for r in records:
        by_student.setdefault(r.student_id, []).append(r)

    rows = []
    for student in students:
        student_records = by_student.get(student.id, [])
        attended = sum(1 for r in student_records if r.status in ("present", "late"))
        excused = sum(1 for r in student_records if r.status == "excused")

        effective_total = total_meetings - excused
        absent = max(effective_total - attended, 0)
        percentage = round((attended / effective_total) * 100, 1) if effective_total > 0 else None

        rows.append({
            "student_id": student.id,
            "name": student.name,
            "email": student.email,
            "register_number": student.register_number,
            "department": student.department,
            "is_active": student.is_active,
            "meetings_attended": attended,
            "meetings_absent": absent,
            "meetings_excused": excused,
            "total_meetings": effective_total,
            "attendance_percentage": percentage,
        })

    return jsonify({
        "students": rows,
        "total_meetings_overall": total_meetings,
    }), 200
