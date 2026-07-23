-- ============================================================
-- Phase 3.3: Database Optimization — Additional Indexes
-- Run once against facial_attendance_db
-- ============================================================

-- 1. Composite index for anti-spam query in attendanceController:
--    WHERE user_id = ? AND status = ? AND timestamp > DATE_SUB(NOW(), INTERVAL 60 SECOND)
--    Also speeds up report queries that GROUP BY user_id + status
ALTER TABLE `attendance_logs`
  ADD INDEX `idx_attendance_user_status_ts` (`user_id`, `status`, `timestamp`);

-- 2. Composite index for audit_logs:
--    WHERE action = ? AND timestamp BETWEEN ? AND ?
ALTER TABLE `audit_logs`
  ADD INDEX `idx_audit_action_ts` (`action`, `timestamp`);

-- 3. Upgrade MyISAM tables to InnoDB for row-level locking & crash safety
ALTER TABLE `audit_logs` ENGINE = InnoDB;
ALTER TABLE `notifications` ENGINE = InnoDB;
ALTER TABLE `notification_preferences` ENGINE = InnoDB;

-- ============================================================
-- Verification — run after migration to confirm indexes exist:
-- SHOW INDEX FROM attendance_logs WHERE Key_name = 'idx_attendance_user_status_ts';
-- SHOW INDEX FROM audit_logs WHERE Key_name = 'idx_audit_action_ts';
-- ============================================================
