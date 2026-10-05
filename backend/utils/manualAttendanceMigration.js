async function migrateManualAttendance(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS manual_attendance_details (
    attendance_log_id INT NOT NULL PRIMARY KEY,
    admin_id INT NULL,
    admin_username VARCHAR(255) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    operation_id CHAR(36) NOT NULL,
    created_at_utc DATETIME NOT NULL,
    INDEX idx_manual_operation (operation_id),
    FOREIGN KEY (attendance_log_id) REFERENCES attendance_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

module.exports = { migrateManualAttendance };
