-- Migration 002: QR-based attendance
-- Safe to run against an existing Phase-1 database. Does not modify any
-- existing rows; only adds a new column (with a safe default) and two new
-- tables.
--
-- Apply with:
--   mysql -u <user> -p cea_db < migrations/002_add_qr_attendance.sql

USE cea_db;

-- 1. Track how each attendance record was set, so a student's own QR scan
--    can never silently overwrite an admin's manual entry.
ALTER TABLE attendance
    ADD COLUMN marked_via ENUM('admin', 'qr', 'system') NOT NULL DEFAULT 'admin'
    AFTER status;

-- Backfill: anything marked before this migration was necessarily set by an
-- admin (QR marking didn't exist yet), so the DEFAULT above is already correct
-- for existing rows — no UPDATE needed.

-- 2. One QR "session" per active code. Generating a new one for a meeting
--    should deactivate any prior session (handled in application code).
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

-- 3. Audit trail of every scan attempt (success or failure), also used for
--    simple per-student rate limiting.
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
