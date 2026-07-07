import uuid
from datetime import datetime, timezone, timedelta
from extensions import db, bcrypt


def _utcnow():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.Enum("super_admin", "admin", "student", name="user_role"),
                      nullable=False, default="student")

    # Student-specific fields (nullable for admins)
    register_number = db.Column(db.String(50), unique=True, nullable=True)
    department = db.Column(db.String(120), nullable=True)

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_email_verified = db.Column(db.Boolean, default=False, nullable=False)
    email_verification_token = db.Column(db.String(64), nullable=True)
    password_reset_token = db.Column(db.String(64), nullable=True)
    password_reset_expires = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=_utcnow)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    attendance_records = db.relationship(
        "Attendance", backref="student", lazy="dynamic",
        foreign_keys="Attendance.student_id"
    )

    def set_password(self, raw_password):
        self.password_hash = bcrypt.generate_password_hash(raw_password).decode("utf-8")

    def check_password(self, raw_password):
        return bcrypt.check_password_hash(self.password_hash, raw_password)

    def generate_verification_token(self):
        self.email_verification_token = uuid.uuid4().hex
        return self.email_verification_token

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "register_number": self.register_number,
            "department": self.department,
            "is_active": self.is_active,
            "is_email_verified": self.is_email_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Meeting(db.Model):
    __tablename__ = "meetings"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    agenda = db.Column(db.Text, nullable=True)
    venue = db.Column(db.String(200), nullable=True)

    # Date/time (Feature 2). meeting_date is the calendar date; start_time /
    # end_time are wall-clock times on that date. Kept as separate columns
    # (rather than a single datetime) so the UI can show/edit them
    # independently and so attendance-code validity has a clear end bound.
    meeting_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)

    status = db.Column(
        db.Enum("scheduled", "completed", "cancelled", name="meeting_status"),
        nullable=False, default="scheduled"
    )

    agenda_pdf_path = db.Column(db.String(300), nullable=True)
    minutes_pdf_path = db.Column(db.String(300), nullable=True)

    attendance_locked = db.Column(db.Boolean, default=False, nullable=False)

    # Meeting attendance code system (Feature 1, replaces QR).
    attendance_code = db.Column(db.String(6), unique=True, nullable=True, index=True)
    code_generated_at = db.Column(db.DateTime, nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    attendance_records = db.relationship(
        "Attendance", backref="meeting", lazy="dynamic",
        cascade="all, delete-orphan"
    )
    agenda_sections = db.relationship(
        "AgendaSection", backref="meeting", lazy="dynamic",
        cascade="all, delete-orphan", order_by="AgendaSection.order_index"
    )
    creator = db.relationship("User", foreign_keys=[created_by])

    @property
    def start_datetime(self):
        """Naive datetime combining meeting_date + start_time (same
        convention the app has always used — no timezone conversion)."""
        if not self.meeting_date or not self.start_time:
            return None
        return datetime.combine(self.meeting_date, self.start_time)

    @property
    def end_datetime(self):
        if not self.meeting_date or not self.end_time:
            return None
        end_dt = datetime.combine(self.meeting_date, self.end_time)
        # Handle a meeting that runs past midnight (end_time < start_time).
        if self.start_time and self.end_time < self.start_time:
            end_dt += timedelta(days=1)
        return end_dt

    def is_code_valid(self, now=None):
        """The attendance code is valid from the meeting's start time until
        its end time, as long as the meeting hasn't been cancelled or
        attendance hasn't been locked."""
        if not self.attendance_code:
            return False
        if self.status == "cancelled" or self.attendance_locked:
            return False
        now = now or datetime.now()
        start, end = self.start_datetime, self.end_datetime
        if not start or not end:
            return False
        return start <= now <= end

    def to_dict(self, include_attendance_summary=False, include_agenda_sections=False):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "agenda": self.agenda,
            "venue": self.venue,
            "meeting_date": self.meeting_date.isoformat() if self.meeting_date else None,
            "start_time": self.start_time.strftime("%H:%M") if self.start_time else None,
            "end_time": self.end_time.strftime("%H:%M") if self.end_time else None,
            "status": self.status,
            "agenda_pdf_path": self.agenda_pdf_path,
            "minutes_pdf_path": self.minutes_pdf_path,
            "attendance_locked": self.attendance_locked,
            "has_attendance_code": bool(self.attendance_code),
            "code_generated_at": self.code_generated_at.isoformat() if self.code_generated_at else None,
            "code_valid": self.is_code_valid(),
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_agenda_sections:
            data["agenda_sections"] = [s.to_dict() for s in self.agenda_sections.all()]
        if include_attendance_summary:
            records = self.attendance_records.all()
            total = len(records)
            present = len([r for r in records if r.status in ("present", "late")])
            data["attendance_summary"] = {
                "total_marked": total,
                "present_or_late": present,
                "percentage": round((present / total) * 100, 1) if total else None,
            }
        return data


class AgendaSection(db.Model):
    """A single admin-defined agenda section (Feature 4). Sections are
    fully dynamic — title + a list of bullet points — and render, in order,
    into the generated agenda PDF between "Purpose of Meeting" and "Open
    Discussion"."""
    __tablename__ = "agenda_sections"

    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey("meetings.id"), nullable=False)
    order_index = db.Column(db.Integer, nullable=False, default=0)
    title = db.Column(db.String(200), nullable=False)
    bullet_points = db.Column(db.JSON, nullable=False, default=list)

    created_at = db.Column(db.DateTime, default=_utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "order_index": self.order_index,
            "title": self.title,
            "bullet_points": self.bullet_points or [],
        }


class Attendance(db.Model):
    __tablename__ = "attendance"
    __table_args__ = (
        db.UniqueConstraint("meeting_id", "student_id", name="uq_meeting_student"),
    )

    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey("meetings.id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    status = db.Column(
        db.Enum("present", "absent", "late", "excused", name="attendance_status"),
        nullable=False, default="absent"
    )

    # How this record was set. Self-marks via the attendance code can never
    # overwrite an admin-set record; admins can always override either.
    # See routes/attendance_code.py.
    marked_via = db.Column(
        db.Enum("admin", "code", "system", name="attendance_marked_via"),
        nullable=False, default="admin"
    )

    marked_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    marked_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "student_id": self.student_id,
            "student_name": self.student.name if self.student else None,
            "register_number": self.student.register_number if self.student else None,
            "status": self.status,
            "marked_via": self.marked_via,
            "marked_by": self.marked_by,
            "marked_at": self.marked_at.isoformat() if self.marked_at else None,
        }
