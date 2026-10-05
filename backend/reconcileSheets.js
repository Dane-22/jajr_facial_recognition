const mysql = require('mysql2/promise');
require('dotenv').config();

async function reconcile() {
  const webhookUrlUser = process.env.GOOGLE_SHEET_USER_WEBHOOK_URL;
  if (!webhookUrlUser) {
    console.error('Error: GOOGLE_SHEET_USER_WEBHOOK_URL is not set.');
    process.exit(1);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jajr_db'
  });

  try {
    console.log('Fetching existing records from Google Sheets...');
    
    // Because doGet redirects, fetch normally follows it
    const response = await fetch(webhookUrlUser, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Google Sheets HTTP Error: ${response.status}`);
    }

    const gsData = await response.json();
    console.log(`Successfully fetched ${gsData.length} records from Google Sheets.`);

    console.log('Fetching records from local MySQL database...');
    const [dbLogs] = await pool.query(
      `SELECT attendance_logs.id, attendance_logs.timestamp, users.name 
       FROM attendance_logs 
       INNER JOIN users ON attendance_logs.user_id = users.id`
    );
    console.log(`Found ${dbLogs.length} records in local database.`);

    let missingCount = 0;

    for (const dbLog of dbLogs) {
      const dbTime = new Date(dbLog.timestamp).getTime();
      const dbName = dbLog.name.toUpperCase();

      // Find if this record exists in Google Sheets
      const foundInGs = gsData.some(gsRecord => {
        const gsName = gsRecord.name ? gsRecord.name.toUpperCase() : '';
        const gsTime = new Date(gsRecord.timestamp).getTime();
        
        // Match name exactly, and allow a 60-second tolerance for the timestamp
        return gsName === dbName && Math.abs(gsTime - dbTime) < 60000;
      });

      if (!foundInGs) {
        // It's missing in Google Sheets, flag it for sync
        await pool.query('UPDATE attendance_logs SET google_sheets_synced = FALSE WHERE id = ?', [dbLog.id]);
        missingCount++;
        console.log(`Flagged missing record for sync: ${dbLog.name} at ${dbLog.timestamp}`);
      }
    }

    console.log(`\nReconciliation Complete!`);
    console.log(`Found ${missingCount} missing records.`);
    if (missingCount > 0) {
      console.log(`The background watchdog will automatically sync these ${missingCount} records in the next 5 minutes.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Reconciliation failed:', error);
    process.exit(1);
  }
}

reconcile();
