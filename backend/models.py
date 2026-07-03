import uuid
from datetime import datetime, timezone
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
    meeting_datetime = db.Column(db.DateTime, nullable=False)

    status = db.Column(
        db.Enum("scheduled", "completed", "cancelled", name="meeting_status"),
        nullable=False, default="scheduled"
    )

    agenda_pdf_path = db.Column(db.String(300), nullable=True)
    minutes_pdf_path = db.Column(db.String(300), nullable=True)

    attendance_locked = db.Column(db.Boolean, default=False, nullable=False)

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow)
    updated_at = db.Column(db.DateTime, default=_utcnow, onupdate=_utcnow)

    attendance_records = db.relationship(
        "Attendance", backref="meeting", lazy="dynamic",
        cascade="all, delete-orphan"
    )
    creator = db.relationship("User", foreign_keys=[created_by])

    def to_dict(self, include_attendance_summary=False):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "agenda": self.agenda,
            "venue": self.venue,
            "meeting_datetime": self.meeting_datetime.isoformat(),
            "status": self.status,
            "agenda_pdf_path": self.agenda_pdf_path,
            "minutes_pdf_path": self.minutes_pdf_path,
            "attendance_locked": self.attendance_locked,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
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

    # How this record was set. QR self-scans can never overwrite an admin-set
    # record; admins can always override either. See routes/qr_attendance.py.
    marked_via = db.Column(
        db.Enum("admin", "qr", "system", name="attendance_marked_via"),
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


class QRSession(db.Model):
    """A time-boxed QR code that students can scan to self-mark attendance
    for one meeting. Only one session should be active per meeting at a
    time; generating a new one deactivates the previous.
    """
    __tablename__ = "qr_sessions"

    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey("meetings.id"), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)

    generated_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    created_at = db.Column(db.DateTime, default=_utcnow)

    meeting = db.relationship("Meeting", foreign_keys=[meeting_id])

    def is_valid(self, now=None):
        now = now or _utcnow()
        expires = self.expires_at if self.expires_at.tzinfo else self.expires_at.replace(tzinfo=timezone.utc)
        return self.is_active and now <= expires

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "token": self.token,
            "generated_by": self.generated_by,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class QRScanLog(db.Model):
    """Audit trail of every scan attempt (successful or not), used for
    security review and simple per-student rate limiting.
    """
    __tablename__ = "qr_scan_logs"

    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey("meetings.id"), nullable=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    token_attempted = db.Column(db.String(64), nullable=True)

    result = db.Column(
        db.Enum(
            "success", "duplicate", "expired", "invalid_token",
            "outside_window", "locked", "rate_limited", "error",
            name="qr_scan_result"
        ),
        nullable=False
    )
    detail = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.String(64), nullable=True)

    created_at = db.Column(db.DateTime, default=_utcnow)

    student = db.relationship("User", foreign_keys=[student_id])

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "student_id": self.student_id,
            "student_name": self.student.name if self.student else None,
            "result": self.result,
            "detail": self.detail,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
