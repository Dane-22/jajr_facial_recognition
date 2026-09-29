require('dotenv').config();
const mysql = require('mysql2/promise');

async function seedGoogleSheets() {
  const webhookUrlWeekly = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  const webhookUrlUser = process.env.GOOGLE_SHEET_USER_WEBHOOK_URL;
  
  if (!webhookUrlWeekly && !webhookUrlUser) {
    console.error('Error: Neither GOOGLE_SHEET_WEBHOOK_URL nor GOOGLE_SHEET_USER_WEBHOOK_URL is set in .env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('Fetching attendance logs...');
  const [logs] = await connection.query(`
    SELECT 
      attendance_logs.user_id, 
      attendance_logs.status, 
      attendance_logs.timestamp, 
      users.name, 
      users.role
    FROM attendance_logs
    INNER JOIN users ON attendance_logs.user_id = users.id
    ORDER BY attendance_logs.timestamp ASC
  `);

  console.log(`Found ${logs.length} attendance records. Starting seed process...`);

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const dateObj = new Date(log.timestamp);
    const formattedTimestamp = dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const payload = {
      userId: log.user_id,
      name: log.name,
      role: log.role,
      status: log.status,
      timestamp: formattedTimestamp
    };

    try {
      if (webhookUrlWeekly) {
        const response1 = await fetch(webhookUrlWeekly, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response1.ok && response1.type !== 'opaqueredirect') {
          console.warn(`[${i + 1}/${logs.length}] Weekly Webhook: Sent log for ${log.name}, but received status: ${response1.status}`);
        }
      }

      if (webhookUrlUser) {
        const response2 = await fetch(webhookUrlUser, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response2.ok && response2.type !== 'opaqueredirect') {
          console.warn(`[${i + 1}/${logs.length}] User Webhook: Sent log for ${log.name}, but received status: ${response2.status}`);
        }
      }

      console.log(`[${i + 1}/${logs.length}] Seeded log for ${log.name} (${log.status})`);
    } catch (err) {
      console.error(`[${i + 1}/${logs.length}] Network error seeding log for ${log.name}:`, err.message);
    }

    // Delay 1 second to avoid Google Apps Script rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('Seeding complete!');
  await connection.end();
  process.exit(0);
}

seedGoogleSheets();
