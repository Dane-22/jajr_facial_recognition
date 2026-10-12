async function migrateSalary(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS employee_salary_rates (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, daily_rate DECIMAL(12,2) NOT NULL,
    effective_from DATE NOT NULL, created_by INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY salary_employee_date (user_id, effective_from),
    FOREIGN KEY (user_id) REFERENCES users(id)) ENGINE=InnoDB`);
  await pool.query(`CREATE TABLE IF NOT EXISTS employee_salary_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, role VARCHAR(255) NOT NULL,
    effective_from DATE NOT NULL, UNIQUE KEY schedule_employee_date (user_id, effective_from),
    FOREIGN KEY (user_id) REFERENCES users(id)) ENGINE=InnoDB`);
  // Existing role is a reviewed baseline; later role edits are effective-dated.
  await pool.query(`INSERT INTO employee_salary_schedules (user_id, role, effective_from)
    SELECT u.id, u.role, '2000-01-01' FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM employee_salary_schedules s WHERE s.user_id = u.id)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS payroll_runs (
    id INT AUTO_INCREMENT PRIMARY KEY, start_date DATE NOT NULL, end_date DATE NOT NULL,
    status ENUM('DRAFT','FINALIZED') NOT NULL DEFAULT 'DRAFT', source_hash CHAR(64) NOT NULL,
    snapshot LONGTEXT NOT NULL, created_by INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finalized_by INT NULL, finalized_at DATETIME NULL,
    UNIQUE KEY payroll_period (start_date, end_date)) ENGINE=InnoDB`);
}
module.exports = { migrateSalary };
