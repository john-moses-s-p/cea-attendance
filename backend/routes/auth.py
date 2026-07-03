import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt
)

from extensions import db
from models import User
from utils import is_valid_institutional_email

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """Self-registration for students using their institutional email.
    Admin/super_admin accounts are created separately by a super admin
    via /api/students (student-management endpoints), not here.
    """
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or "").strip()
    register_number = (data.get("register_number") or "").strip()
    department = (data.get("department") or "").strip()

    if not email or not password or not name:
        return jsonify({"error": "email, password and name are required"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    allowed_domains = current_app.config["ADMIN_EMAIL_DOMAINS"]
    if not is_valid_institutional_email(email, allowed_domains):
        return jsonify({"error": "Please use your institutional email address"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(
        email=email,
        name=name,
        role="student",
        register_number=register_number or None,
        department=department or None,
    )
    user.set_password(password)
    token = user.generate_verification_token()
    db.session.add(user)
    db.session.commit()

    # NOTE: In production, send `token` via an email service (SES/SendGrid/etc.)
    # instead of returning it in the response. Returned here for local/dev testing.
    return jsonify({
        "message": "Registration successful. Please verify your email.",
        "dev_verification_token": token,
        "user": user.to_dict(),
    }), 201


@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    data = request.get_json(force=True) or {}
    token = data.get("token")
    if not token:
        return jsonify({"error": "token is required"}), 400

    user = User.query.filter_by(email_verification_token=token).first()
    if not user:
        return jsonify({"error": "Invalid or expired verification token"}), 400

    user.is_email_verified = True
    user.email_verification_token = None
    db.session.commit()
    return jsonify({"message": "Email verified successfully"}), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "This account has been deactivated. Contact an admin."}), 403

    if not user.is_email_verified:
        return jsonify({"error": "Please verify your email before logging in"}), 403

    additional_claims = {"role": user.role, "name": user.name}
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    claims = get_jwt()
    additional_claims = {"role": claims.get("role"), "name": claims.get("name")}
    new_access_token = create_access_token(identity=identity, additional_claims=additional_claims)
    return jsonify({"access_token": new_access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    data = request.get_json(force=True) or {}
    old_password = data.get("old_password") or ""
    new_password = data.get("new_password") or ""

    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400

    user = User.query.get(int(get_jwt_identity()))
    if not user or not user.check_password(old_password):
        return jsonify({"error": "Current password is incorrect"}), 401

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "Password changed successfully"}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()

    # Always return 200 to avoid leaking which emails are registered.
    if not user:
        return jsonify({"message": "If that account exists, a reset link has been sent."}), 200

    token = uuid.uuid4().hex
    user.password_reset_token = token
    user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.session.commit()

    # NOTE: send `token` by email in production instead of returning it here.
    return jsonify({
        "message": "If that account exists, a reset link has been sent.",
        "dev_reset_token": token,
    }), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(force=True) or {}
    token = data.get("token")
    new_password = data.get("new_password") or ""

    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400

    user = User.query.filter_by(password_reset_token=token).first()
    if not user or not user.password_reset_expires:
        return jsonify({"error": "Invalid or expired reset token"}), 400

    expires = user.password_reset_expires
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        return jsonify({"error": "Reset token has expired"}), 400

    user.set_password(new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.session.commit()
    return jsonify({"message": "Password reset successfully"}), 200
