-- CEA Meeting & Member Management — core schema (fresh install)
-- Reflects the schema AFTER migration 003 (attendance-code system, meeting
-- start/end time, dynamic agenda sections; QR attendance removed).
-- Run this manually, or let Flask-Migrate generate it from models.py via
-- `flask db upgrade`. For an existing Phase-1/2 database, use
-- migrations/003_meeting_code_agenda_remove_qr.sql instead of this file.

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
    meeting_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    agenda_pdf_path VARCHAR(300) NULL,
    minutes_pdf_path VARCHAR(300) NULL,
    attendance_locked BOOLEAN NOT NULL DEFAULT FALSE,
    attendance_code VARCHAR(6) NULL UNIQUE,
    code_generated_at DATETIME NULL,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_meetings_date (meeting_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agenda_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    title VARCHAR(200) NOT NULL,
    bullet_points JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    INDEX idx_agenda_sections_meeting (meeting_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meeting_id INT NOT NULL,
    student_id INT NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'absent',
    marked_via ENUM('admin', 'code', 'system') NOT NULL DEFAULT 'admin',
    marked_by INT NULL,
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (marked_by) REFERENCES users(id),
    UNIQUE KEY uq_meeting_student (meeting_id, student_id)
) ENGINE=InnoDB;

-- Seed a super admin (password: ChangeMe@123 — change immediately after first login).
-- Password hash below is a placeholder; generate a real one with:
--   python -c "from flask_bcrypt import Bcrypt; print(Bcrypt().generate_password_hash('ChangeMe@123').decode())"
-- INSERT INTO users (email, password_hash, name, role, is_active, is_email_verified)
-- VALUES ('admin@student.tce.edu', '<paste-generated-hash>', 'Association Super Admin', 'super_admin', TRUE, TRUE);
