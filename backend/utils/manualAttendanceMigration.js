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
  const [adminUsernameColumns] = await pool.query("SHOW COLUMNS FROM manual_attendance_details LIKE 'admin_username'");
  if (!adminUsernameColumns.length) {
    try {
      await pool.query(`ALTER TABLE manual_attendance_details
        ADD COLUMN admin_username VARCHAR(255) NOT NULL DEFAULT ''`);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }
  await pool.query(`UPDATE manual_attendance_details m LEFT JOIN admins a ON a.id = m.admin_id
    SET m.admin_username = COALESCE(a.username, 'Unknown admin') WHERE m.admin_username = ''`);
  await pool.query(`CREATE TABLE IF NOT EXISTS employee_site_transfers (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    in_log_id INT NOT NULL,
    from_site_id INT NOT NULL,
    from_site_name VARCHAR(100) NOT NULL,
    to_site_id INT NOT NULL,
    to_site_name VARCHAR(100) NOT NULL,
    admin_id INT NULL,
    admin_username VARCHAR(255) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    effective_at_utc DATETIME(6) NOT NULL,
    created_at_utc DATETIME(6) NOT NULL,
    INDEX idx_site_transfer_user_time (user_id, effective_at_utc),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (in_log_id) REFERENCES attendance_logs(id),
    FOREIGN KEY (from_site_id) REFERENCES sites(id),
    FOREIGN KEY (to_site_id) REFERENCES sites(id),
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  for (const [column, siteColumn] of [['from_site_name', 'from_site_id'], ['to_site_name', 'to_site_id']]) {
    const [columns] = await pool.query(`SHOW COLUMNS FROM employee_site_transfers LIKE '${column}'`);
    if (!columns.length) {
      try {
        await pool.query(`ALTER TABLE employee_site_transfers
          ADD COLUMN ${column} VARCHAR(100) NOT NULL DEFAULT ''`);
      } catch (error) {
        if (error.code !== 'ER_DUP_FIELDNAME') throw error;
      }
    }
    await pool.query(`UPDATE employee_site_transfers t JOIN sites s ON s.id = t.${siteColumn}
      SET t.${column} = s.name WHERE t.${column} = ''`);
  }
}

module.exports = { migrateManualAttendance };
