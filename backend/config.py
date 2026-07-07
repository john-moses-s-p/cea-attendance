import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    # --- Database ---
    DB_USER = os.getenv("DB_USER", "cea_user")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "cea_password")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "cea_db")

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- Auth ---
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=14)

    # Only emails on this domain may register/log in.
    # e.g. "student.tce.edu" accepts johnmoses@student.tce.edu
    INSTITUTIONAL_EMAIL_DOMAIN = os.getenv("INSTITUTIONAL_EMAIL_DOMAIN", "student.tce.edu")

    # Comma-separated extra domains allowed to log in as admin/super_admin
    # (association may use a staff domain for admins)
    ADMIN_EMAIL_DOMAINS = os.getenv("ADMIN_EMAIL_DOMAINS", "student.tce.edu").split(",")

    # --- CORS ---
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    # --- File uploads (agenda / minutes PDFs) ---
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", os.path.join(os.getcwd(), "uploads"))
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB
