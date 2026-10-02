const { validCoordinates } = require('./siteRules');

async function migrateSites(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS sites (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    site_key VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    radius_meters INT NOT NULL DEFAULT 100,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS employee_sites (
    user_id INT NOT NULL,
    site_id INT NOT NULL,
    PRIMARY KEY (user_id, site_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS employee_site_sessions (
    user_id INT NOT NULL PRIMARY KEY,
    site_id INT NOT NULL,
    in_log_id INT NOT NULL,
    started_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id),
    FOREIGN KEY (in_log_id) REFERENCES attendance_logs(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [columns] = await pool.query("SHOW COLUMNS FROM attendance_logs LIKE 'site_id'");
  if (!columns.length) await pool.query('ALTER TABLE attendance_logs ADD COLUMN site_id INT NULL');
  const [oldSettings] = await pool.query(`SELECT setting_key, setting_value FROM system_settings
    WHERE setting_key IN ('office_latitude', 'office_longitude')`);
  const office = Object.fromEntries(oldSettings.map(row => [row.setting_key, row.setting_value]));
  const officeLatitude = validCoordinates(office.office_latitude, office.office_longitude)
    ? Number(office.office_latitude) : 16.6148977;
  const officeLongitude = validCoordinates(office.office_latitude, office.office_longitude)
    ? Number(office.office_longitude) : 120.3539222;
  await pool.query(`INSERT IGNORE INTO sites (site_key, name, latitude, longitude, radius_meters) VALUES
    ('MAIN_OFFICE', 'Main Office', ?, ?, 100),
    ('PANICSICAN', 'PANICSICAN', 16.6625838, 120.3322232, 100),
    ('YARD', 'YARD', 16.6137584, 120.3430499, 100)`, [officeLatitude, officeLongitude]);
  await pool.query(`CREATE TABLE IF NOT EXISTS site_migration_state (
    migration_key VARCHAR(100) PRIMARY KEY
  ) ENGINE=InnoDB`);
  const [seeded] = await pool.query("SELECT migration_key FROM site_migration_state WHERE migration_key = 'initial_main_office_assignments'");
  if (!seeded.length) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(`INSERT IGNORE INTO employee_sites (user_id, site_id)
        SELECT users.id, sites.id FROM users JOIN sites ON sites.site_key = 'MAIN_OFFICE'`);
      await connection.query("INSERT IGNORE INTO site_migration_state (migration_key) VALUES ('initial_main_office_assignments')");
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = { migrateSites };
