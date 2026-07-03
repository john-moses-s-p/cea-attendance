-- CEA Meeting & Member Management — core schema (Phase 1: auth, meetings, attendance)
-- Run this manually, or let Flask-Migrate generate it from models.py via `flask db upgrade`.

CREATE DATABASE IF NOT EXISTS cea_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cea_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(120) NOT NULL,
    role ENUM('super_admin', 'admin', 'student') NOT NULL DEFAULT 'student',
    register_number VARCHAR(50) UNIQUE NULL,
    department VARCHAR(120) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(64) NULL,
    password_reset_token VARCHAR(64) NULL,
    password_reset_expires DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meetings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    agenda TEXT NULL,
    venue VARCHAR(200) NULL,
    meeting_datetime DATETIME NOT NULL,
    status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    agenda_pdf_path VARCHAR(300) NULL,
    minutes_pdf_path VARCHAR(300) NULL,
    attendance_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_meetings_datetime (meeting_datetime)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    student_id INT NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'absent',
    marked_via ENUM('admin', 'qr', 'system') NOT NULL DEFAULT 'admin',
    marked_by INT NULL,
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (marked_by) REFERENCES users(id),
    UNIQUE KEY uq_meeting_student (meeting_id, student_id)
) ENGINE=InnoDB;

-- QR attendance (Phase 2) --------------------------------------------------

CREATE TABLE IF NOT EXISTS qr_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    generated_by INT NOT NULL,
    expires_at DATETIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id),
    INDEX idx_qr_sessions_meeting (meeting_id),
    INDEX idx_qr_sessions_token (token)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS qr_scan_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NULL,
    student_id INT NULL,
    token_attempted VARCHAR(64) NULL,
    result ENUM(
        'success', 'duplicate', 'expired', 'invalid_token',
        'outside_window', 'locked', 'rate_limited', 'error'
    ) NOT NULL,
    detail VARCHAR(255) NULL,
    ip_address VARCHAR(64) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE SET NULL,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_qr_scan_logs_meeting (meeting_id),
    INDEX idx_qr_scan_logs_student_time (student_id, created_at)
) ENGINE=InnoDB;

-- Seed a super admin (password: ChangeMe@123 — change immediately after first login).
-- Password hash below is a placeholder; generate a real one with:
--   python -c "from flask_bcrypt import Bcrypt; print(Bcrypt().generate_password_hash('ChangeMe@123').decode())"
-- INSERT INTO users (email, password_hash, name, role, is_active, is_email_verified)
-- VALUES ('admin@student.tce.edu', '<paste-generated-hash>', 'Association Super Admin', 'super_admin', TRUE, TRUE);
