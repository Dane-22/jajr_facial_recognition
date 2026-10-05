const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jajr_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Adding google_sheets_synced column...');
    await pool.query('ALTER TABLE attendance_logs ADD COLUMN google_sheets_synced BOOLEAN DEFAULT FALSE;');
    console.log('Column added successfully.');
    
    console.log('Marking all existing records as synced...');
    await pool.query('UPDATE attendance_logs SET google_sheets_synced = TRUE;');
    console.log('Existing records marked as synced.');
    
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column google_sheets_synced already exists, marking all existing as synced just in case...');
      await pool.query('UPDATE attendance_logs SET google_sheets_synced = TRUE;');
      process.exit(0);
    } else {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  }
}

migrate();
