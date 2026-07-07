-- Migration 003: attendance-code system, meeting start/end time,
-- dynamic agenda sections; removes the QR attendance system entirely.
--
-- Apply with:
--   mysql -u <user> -p cea_db < migrations/003_meeting_code_agenda_remove_qr.sql
--
-- BACK UP YOUR DATABASE FIRST. This migration drops qr_sessions and
-- qr_scan_logs, and drops the meetings.meeting_datetime column after
-- backfilling the new date/start_time/end_time columns from it.

USE cea_db;

-- 1. New meeting scheduling columns (Feature 2) -----------------------------
ALTER TABLE meetings
    ADD COLUMN meeting_date DATE NULL AFTER venue,
    ADD COLUMN start_time TIME NULL AFTER meeting_date,
    ADD COLUMN end_time TIME NULL AFTER start_time;

-- Backfill from the old single datetime column. Existing meetings are
-- assumed to run 2 hours by default (adjust manually afterwards if needed).
UPDATE meetings
SET meeting_date = DATE(meeting_datetime),
    start_time = TIME(meeting_datetime),
    end_time = ADDTIME(TIME(meeting_datetime), '02:00:00')
WHERE meeting_date IS NULL;

ALTER TABLE meetings
    MODIFY COLUMN meeting_date DATE NOT NULL,
    MODIFY COLUMN start_time TIME NOT NULL,
    MODIFY COLUMN end_time TIME NOT NULL;

ALTER TABLE meetings
    DROP COLUMN meeting_datetime;

-- 2. Meeting attendance code (Feature 1, replaces QR) -----------------------
ALTER TABLE meetings
    ADD COLUMN attendance_code VARCHAR(6) NULL UNIQUE AFTER attendance_locked,
    ADD COLUMN code_generated_at DATETIME NULL AFTER attendance_code;

-- 3. Attendance.marked_via: drop 'qr', add 'code' ---------------------------
-- Existing QR-marked rows become 'code'-marked rows (same self-mark semantics).
ALTER TABLE attendance
    MODIFY COLUMN marked_via ENUM('admin', 'qr', 'code', 'system') NOT NULL DEFAULT 'admin';
UPDATE attendance SET marked_via = 'code' WHERE marked_via = 'qr';
ALTER TABLE attendance
    MODIFY COLUMN marked_via ENUM('admin', 'code', 'system') NOT NULL DEFAULT 'admin';

-- 4. Dynamic agenda sections (Feature 4) ------------------------------------
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

-- 5. Remove the QR attendance system entirely (Feature 1) -------------------
DROP TABLE IF EXISTS qr_scan_logs;
DROP TABLE IF EXISTS qr_sessions;
