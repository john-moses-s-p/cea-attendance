from flask import Blueprint, request, jsonify

from extensions import db
from models import User
from utils import roles_required, is_valid_institutional_email
from flask import current_app

students_bp = Blueprint("students", __name__, url_prefix="/api/students")


@students_bp.route("", methods=["GET"])
@roles_required("admin", "super_admin")
def list_students():
    active_only = request.args.get("active_only", "false").lower() == "true"
    query = User.query.filter_by(role="student")
    if active_only:
        query = query.filter_by(is_active=True)
    students = query.order_by(User.name).all()
    return jsonify({"students": [s.to_dict() for s in students]}), 200


@students_bp.route("", methods=["POST"])
@roles_required("admin", "super_admin")
def add_student():
    """Admin-created student account (pre-verified, temp password)."""
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    name = (data.get("name") or "").strip()
    temp_password = data.get("temp_password") or "Welcome@123"

    if not email or not name:
        return jsonify({"error": "email and name are required"}), 400

    allowed_domains = current_app.config["ADMIN_EMAIL_DOMAINS"]
    if not is_valid_institutional_email(email, allowed_domains):
        return jsonify({"error": "Email must be an institutional address"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "A user with this email already exists"}), 409

    student = User(
        email=email,
        name=name,
        role="student",
        register_number=data.get("register_number"),
        department=data.get("department"),
        is_email_verified=True,  # admin-created accounts are pre-verified
    )
    student.set_password(temp_password)
    db.session.add(student)
    db.session.commit()
    return jsonify({"message": "Student added", "student": student.to_dict()}), 201


@students_bp.route("/<int:student_id>", methods=["PUT"])
@roles_required("admin", "super_admin")
def update_student(student_id):
    student = User.query.filter_by(id=student_id, role="student").first_or_404()
    data = request.get_json(force=True) or {}
    for field in ("name", "register_number", "department"):
        if field in data:
            setattr(student, field, data[field])
    db.session.commit()
    return jsonify({"message": "Student updated", "student": student.to_dict()}), 200


@students_bp.route("/<int:student_id>/toggle-active", methods=["POST"])
@roles_required("admin", "super_admin")
def toggle_active(student_id):
    student = User.query.filter_by(id=student_id, role="student").first_or_404()
    student.is_active = not student.is_active
    db.session.commit()
    return jsonify({"message": "Status updated", "student": student.to_dict()}), 200
