const pool = require('../config/db');
const { manualLog } = require('../middleware/audit');
const crypto = require('crypto');

const batchSync = async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Payload must contain an array of records' });
    }

    // Require kiosk privileges
    if (req.userType !== 'kiosk') {
      return res.status(403).json({ error: 'Batch sync is restricted to kiosks' });
    }

    const expectedApiKey = process.env.KIOSK_API_KEY || 'kiosk_dev_secret_key_2026';
    const connection = await pool.getConnection();
    const results = { successful: 0, failed: 0, errors: [] };
    
    // We emit io event for live update
    const io = req.app.get('io');

    try {
      await connection.beginTransaction();

      for (const record of records) {
        const { userId, status, timestamp, signature } = record;
        
        if (!userId || !status || !timestamp || !signature) {
          results.failed++;
          results.errors.push({ userId, error: 'Missing required fields' });
          continue;
        }

        // Validate HMAC signature (bypassing 5-minute replay window for offline sync)
        const payload = `${userId}:${status}:${timestamp}`;
        const expectedSignature = crypto.createHmac('sha256', expectedApiKey).update(payload).digest('hex');
        
        if (signature !== expectedSignature) {
          results.failed++;
          results.errors.push({ userId, error: 'Invalid security signature' });
          continue;
        }

        // Resolve userId (string name or ID)
        let actualUserId;
        if (isNaN(userId)) {
          const [users] = await connection.query('SELECT id FROM users WHERE name = ? AND is_active = 1', [userId]);
          if (users.length === 0) {
            results.failed++;
            results.errors.push({ userId, error: 'User not found' });
            continue;
          }
          actualUserId = users[0].id;
        } else {
          actualUserId = parseInt(userId);
        }

        const [eligibleUsers] = await connection.query(
          'SELECT is_active FROM users WHERE id = ? FOR UPDATE', [actualUserId]
        );
        if (!eligibleUsers.length || Number(eligibleUsers[0].is_active) === 0) {
          results.failed++;
          results.errors.push({ userId, error: 'Employee is not active' });
          continue;
        }

        // Check if exact record exists to avoid duplication
        const [existing] = await connection.query(
          `SELECT id FROM attendance_logs 
           WHERE user_id = ? AND status = ? AND timestamp = ?`,
          [actualUserId, status, new Date(timestamp)]
        );

        if (existing.length > 0) {
          results.successful++; // Already synced, treat as successful
          continue;
        }

        // Determine method (Face Recognition for kiosk)
        const method = 'Face Recognition';

        // Insert log
        const insertQuery = `
          INSERT INTO attendance_logs (user_id, status, timestamp, method, location)
          VALUES (?, ?, ?, ?, ?)
        `;
        const [insertResult] = await connection.query(insertQuery, [
          actualUserId, 
          status, 
          new Date(timestamp), 
          method, 
          'Kiosk'
        ]);

        results.successful++;
        
        // Manual audit log
        manualLog('attendance_logs', insertResult.insertId, 'CREATE', {
          user_id: actualUserId,
          status,
          method,
          is_offline_sync: true
        });
        
        // Broadcast via Socket.IO
        if (io) {
           // We might need user info
           const [userInfo] = await connection.query('SELECT name FROM users WHERE id = ?', [actualUserId]);
           io.emit('attendance_update', {
             id: insertResult.insertId,
             user_id: actualUserId,
             name: userInfo[0] ? userInfo[0].name : userId,
             status,
             method,
             location: 'Kiosk',
             timestamp: new Date(timestamp),
             syncedOffline: true
           });
        }
      }

      await connection.commit();
      res.status(200).json({ message: 'Batch sync complete', results });
      
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Batch sync error:', error);
    res.status(500).json({ error: 'Failed to process batch sync' });
  }
};

module.exports = {
  batchSync
};
