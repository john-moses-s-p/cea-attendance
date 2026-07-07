from functools import wraps
import secrets

from flask import jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def roles_required(*allowed_roles):
    """Decorator restricting an endpoint to specific user roles.
    Usage: @roles_required("admin", "super_admin")
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in allowed_roles:
                return jsonify({"error": "Forbidden: insufficient role"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def is_valid_institutional_email(email, allowed_domains):
    if "@" not in email:
        return False
    domain = email.rsplit("@", 1)[-1].lower()
    return domain in [d.strip().lower() for d in allowed_domains]


def get_client_ip(request):
    """Best-effort client IP, respecting a reverse proxy's X-Forwarded-For."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


def generate_unique_attendance_code(model_cls, max_attempts=25):
    """Generate a 6-digit numeric code (e.g. '483921') not currently used by
    any other meeting. Zero-padded so it's always exactly 6 digits.
    """
    for _ in range(max_attempts):
        candidate = f"{secrets.randbelow(1_000_000):06d}"
        if not model_cls.query.filter_by(attendance_code=candidate).first():
            return candidate
    raise RuntimeError("Could not generate a unique attendance code; please retry.")
