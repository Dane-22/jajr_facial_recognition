const pool = require('../config/db');

async function syncPendingRecords() {
  const webhookUrlWeekly = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  const webhookUrlUser = process.env.GOOGLE_SHEET_USER_WEBHOOK_URL;

  if (!webhookUrlWeekly && !webhookUrlUser) return;

  try {
    // Select unsynced records
    const [unsyncedLogs] = await pool.query(
      `SELECT attendance_logs.id, attendance_logs.status, attendance_logs.timestamp, users.name, users.role, users.id as user_id 
       FROM attendance_logs 
       INNER JOIN users ON attendance_logs.user_id = users.id 
       WHERE attendance_logs.google_sheets_synced = FALSE 
       ORDER BY attendance_logs.timestamp ASC 
       LIMIT 50` // Limit batch size to avoid overwhelming Google Apps Script limits
    );

    if (unsyncedLogs.length === 0) return;

    console.log(`[Google Sheets Sync] Found ${unsyncedLogs.length} unsynced records. Attempting to sync...`);

    let successCount = 0;

    for (const log of unsyncedLogs) {
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

      let successWeekly = true;
      let successUser = true;

      if (webhookUrlWeekly) {
        try {
          const resWeekly = await fetch(webhookUrlWeekly, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!resWeekly.ok && resWeekly.type !== 'opaqueredirect') successWeekly = false;
        } catch (e) {
          successWeekly = false;
        }
      }

      if (webhookUrlUser) {
        try {
          const resUser = await fetch(webhookUrlUser, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!resUser.ok && resUser.type !== 'opaqueredirect') successUser = false;
        } catch (e) {
          successUser = false;
        }
      }

      if (successWeekly && successUser) {
        await pool.query('UPDATE attendance_logs SET google_sheets_synced = TRUE WHERE id = ?', [log.id]);
        successCount++;
      } else {
        // If it fails, we break the loop to prevent spamming webhooks while internet is still down
        console.warn(`[Google Sheets Sync] Network error or Google Sheets error. Stopping batch early.`);
        break;
      }

      // Small delay to prevent hitting rate limits on Google's side
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (successCount > 0) {
      console.log(`[Google Sheets Sync] Successfully synced ${successCount} records.`);
    }
  } catch (error) {
    console.error('[Google Sheets Sync] Error processing batch:', error.message);
  }
}

function startSyncService() {
  console.log('[Google Sheets Sync] Service started (Checking every 5 minutes)');
  
  // Run immediately on start
  syncPendingRecords();

  // Run every 5 minutes (300,000 ms)
  setInterval(syncPendingRecords, 5 * 60 * 1000);
}

module.exports = {
  startSyncService,
  syncPendingRecords
};
