import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy.exc import SQLAlchemyError

from config import Config
from extensions import db, jwt, bcrypt, migrate

from routes.auth import auth_bp
from routes.meetings import meetings_bp
from routes.attendance import attendance_bp
from routes.students import students_bp
from routes.analytics import analytics_bp
from routes.exports import exports_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    migrate.init_app(app, db)

    CORS(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}},
         supports_credentials=True, expose_headers=["Content-Disposition"])

    app.register_blueprint(auth_bp)
    app.register_blueprint(meetings_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(students_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(exports_bp)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "CEA Meeting & Attendance API"}), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(SQLAlchemyError)
    def db_error(e):
        # Always roll back so a failed statement can't poison the next
        # request's transaction, then log the *real* error server-side —
        # the previous bare "Internal server error" was hiding exactly the
        # kind of thing that shows up right after a schema change (e.g. a
        # column the ORM expects that a not-yet-migrated database doesn't
        # have yet).
        db.session.rollback()
        app.logger.exception("Database error handling request")
        message = "A database error occurred."
        if app.config.get("DEBUG") or os.getenv("FLASK_DEBUG") == "1":
            message += f" ({e.__class__.__name__}: {str(e.orig) if hasattr(e, 'orig') else str(e)})"
        else:
            message += (
                " If this just started happening after an update, the database schema "
                "may be out of date — check that all migrations have been applied."
            )
        return jsonify({"error": message}), 500

    @app.errorhandler(500)
    def server_error(e):
        app.logger.exception("Unhandled error")
        return jsonify({"error": "Internal server error"}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
