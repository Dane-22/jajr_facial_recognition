const pool = require('./config/db');

async function migrate() {
  try {
    console.log('Adding latitude and longitude to attendance_logs...');
    try {
      await pool.query('ALTER TABLE attendance_logs ADD COLUMN latitude DECIMAL(10, 8), ADD COLUMN longitude DECIMAL(11, 8)');
      console.log('Columns added successfully.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Columns already exist.');
      } else {
        throw e;
      }
    }

    console.log('Creating app_settings table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        setting_key VARCHAR(100) UNIQUE,
        setting_value TEXT
      )
    `);

    console.log('Inserting default settings...');
    await pool.query(`
      INSERT INTO app_settings (setting_key, setting_value) VALUES 
      ('geofencing_enabled', 'false'),
      ('office_latitude', '16.614897727493535'),
      ('office_longitude', '120.35392215651272'),
      ('geofence_radius_meters', '100')
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `);
    
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
