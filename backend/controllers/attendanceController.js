const pool = require('../config/db');
const { manualLog } = require('../middleware/audit');
const crypto = require('crypto');
const { validCoordinates, attendanceSiteDecision } = require('../utils/siteRules');
const manilaDate = date => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getPublicSettings = async (req, res) => {
  try {
    await pool.ready;
    res.json({ geofencing_enabled: true });
  } catch (error) {
    console.error('[AttendanceSettings] Failed to read settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const logAttendance = async (req, res) => {
  let connection;
  try {
    const { userId, status, timestamp, signature, latitude, longitude } = req.body;

    if (!userId || !status) {
      return res.status(400).json({ error: 'User ID and status are required' });
    }

    if (status !== 'IN' && status !== 'OUT') {
      return res.status(400).json({ error: 'Status must be either IN or OUT' });
    }

    // Security enhancement: Require HMAC signature for Kiosk requests
    if (req.userType === 'kiosk') {
      if (!timestamp || !signature) {
        return res.status(400).json({ error: 'Missing security signature or timestamp' });
      }
      
      const now = Date.now();
      const reqTime = new Date(timestamp).getTime();
      
      // Prevent replay attacks (5 minute window)
      if (isNaN(reqTime) || Math.abs(now - reqTime) > 5 * 60 * 1000) {
        return res.status(400).json({ error: 'Request expired or invalid timestamp' });
      }
      
      const expectedApiKey = process.env.KIOSK_API_KEY || 'kiosk_dev_secret_key_2026';
      const payload = `${userId}:${status}:${timestamp}`;
      const expectedSignature = crypto.createHmac('sha256', expectedApiKey).update(payload).digest('hex');
      
      if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid security signature' });
      }
    }

    // Check if userId is a name (string) or numeric ID
    let actualUserId;
    if (isNaN(userId)) {
      // It's a name, look up the user ID
      const [users] = await pool.query(
        'SELECT id FROM users WHERE name = ? AND is_active = 1',
        [userId]
      );
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      actualUserId = users[0].id;
    } else {
      // It's already a numeric ID
      actualUserId = parseInt(userId);
    }

    await pool.ready;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const reject = async (code, error, details = {}) => {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(code).json({ error, ...details });
    };
    const [lockedUser] = await connection.query('SELECT id, is_active FROM users WHERE id = ? FOR UPDATE', [actualUserId]);
    if (!lockedUser.length) return reject(404, 'Employee not found.');
    if (Number(lockedUser[0].is_active) === 0) return reject(409, 'This employee is archived and cannot record attendance.');
    const antiSpamCheck = await connection.query(
      `SELECT * FROM attendance_logs 
       WHERE user_id = ? 
       AND status = ? 
       AND timestamp > DATE_SUB(NOW(), INTERVAL 60 SECOND)`,
      [actualUserId, status]
    );

    if (antiSpamCheck[0].length > 0) {
      return reject(429, 'Please wait at least 60 seconds before logging again with the same status.');
    }

    if (!validCoordinates(latitude, longitude)) {
      return reject(400, 'Current location is required for attendance. Enable precise location and try again.');
    }
    const [assignedSites] = await connection.query(`SELECT s.id, s.name, s.latitude, s.longitude, s.radius_meters
      FROM sites s JOIN employee_sites es ON es.site_id = s.id
      WHERE es.user_id = ? AND s.active = 1`, [actualUserId]);
    const [sessions] = await connection.query(`SELECT ss.site_id AS id, ss.site_id, s.name, s.latitude, s.longitude, s.radius_meters
      FROM employee_site_sessions ss JOIN sites s ON s.id = ss.site_id WHERE ss.user_id = ?`, [actualUserId]);
    const decision = attendanceSiteDecision(assignedSites, sessions[0], status, latitude, longitude);
    if (decision.error) return reject(decision.code, decision.error, decision.reason === 'outside_site_boundary'
      ? {
          reason: decision.reason,
          siteName: decision.siteName,
          distanceMeters: decision.distanceMeters,
          allowedRadiusMeters: decision.allowedRadiusMeters
        }
      : {});
    const { site } = decision;
    const [result] = await connection.query(
      'INSERT INTO attendance_logs (user_id, status, timestamp, latitude, longitude, site_id) VALUES (?, ?, NOW(), ?, ?, ?)',
      [actualUserId, status, Number(latitude), Number(longitude), site.id]
    );
    if (status === 'IN') {
      await connection.query(`INSERT INTO employee_site_sessions (user_id, site_id, in_log_id, started_at)
        VALUES (?, ?, ?, NOW())`, [actualUserId, site.id, result.insertId]);
    } else {
      await connection.query('DELETE FROM employee_site_sessions WHERE user_id = ?', [actualUserId]);
    }
    await connection.commit();
    connection.release();
    connection = null;

    // Log attendance action
    await manualLog(
      actualUserId,
      'employee',
      status === 'IN' ? 'CHECK_IN' : 'CHECK_OUT',
      'attendance',
      result.insertId,
      null,
      { userId: actualUserId, status, siteId: site.id, timestamp: new Date() },
      req.ip || req.connection.remoteAddress,
      req.get('user-agent') || null
    );

    // ── Real-time broadcast ────────────────────────────────────────────────
    // Fetch user name for the socket payload
    const [userRows] = await pool.query('SELECT name, role FROM users WHERE id = ?', [actualUserId]);
    const userName = userRows[0]?.name || String(actualUserId);
    const userRole = userRows[0]?.role || '';

    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('attendance:new', {
        id: result.insertId,
        user_id: actualUserId,
        name: userName,
        role: userRole,
        status,
        site_id: site.id,
        site_name: site.name,
        timestamp: new Date().toISOString()
      });
    }

    // ── Google Sheets Webhook Integration ──────────────────────────────────
    const webhookUrlWeekly = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    const webhookUrlUser = process.env.GOOGLE_SHEET_USER_WEBHOOK_URL;
    
    if (webhookUrlWeekly || webhookUrlUser) {
      try {
        const dateObj = new Date();
        const formattedTimestamp = dateObj.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        const payload = {
          userId: actualUserId,
          name: userName,
          role: userRole,
          status,
          timestamp: formattedTimestamp
        };
        
        // Run webhooks asynchronously so it doesn't block the API response
        (async () => {
          try {
            let successWeekly = true;
            let successUser = true;

            // Send to weekly sheets
            if (webhookUrlWeekly) {
              const resWeekly = await fetch(webhookUrlWeekly, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              if (!resWeekly.ok && resWeekly.type !== 'opaqueredirect') successWeekly = false;
            }

            // Send to individual user sheets
            if (webhookUrlUser) {
              const resUser = await fetch(webhookUrlUser, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              if (!resUser.ok && resUser.type !== 'opaqueredirect') successUser = false;
            }

            // If all configured webhooks succeeded, mark as synced
            if (successWeekly && successUser) {
              await pool.query('UPDATE attendance_logs SET google_sheets_synced = TRUE WHERE id = ?', [result.insertId]);
            }
          } catch (webhookError) {
            console.error('Webhook error during live check-in (will retry later):', webhookError.message);
          }
        })();
      } catch (prepareError) {
        console.error('Error preparing webhook payload:', prepareError);
      }
    }

    res.status(201).json({
      message: 'Attendance logged successfully',
      logId: result.insertId,
      userId: actualUserId,
      name: userName,
      status,
      siteId: site.id,
      siteName: site.name
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
      connection.release();
    }
    console.error('Error logging attendance:', error);
    res.status(500).json({ error: 'Unable to record attendance. Please try again.' });
  }
};

const getDailyLogs = async (req, res) => {
  try {
    const { date, userId, status, sortBy = 'timestamp', sortOrder = 'DESC' } = req.query;
    
    const selectedDate = date || manilaDate(new Date());
    
    let query = `SELECT attendance_logs.id, attendance_logs.status, attendance_logs.timestamp, attendance_logs.latitude, attendance_logs.longitude, attendance_logs.site_id, sites.name AS site_name, users.name, users.role, users.id as user_id,
       CASE WHEN manual.attendance_log_id IS NULL THEN 'scanner' ELSE 'manual' END AS source,
       manual.reason, manual.operation_id, manual.created_at_utc AS created_at,
       COALESCE(actor.username, manual.admin_username) AS created_by
       FROM attendance_logs
       INNER JOIN users ON attendance_logs.user_id = users.id
       LEFT JOIN sites ON sites.id = attendance_logs.site_id
       LEFT JOIN manual_attendance_details manual ON manual.attendance_log_id = attendance_logs.id
       LEFT JOIN admins actor ON actor.id = manual.admin_id
       WHERE DATE(DATE_ADD(attendance_logs.timestamp, INTERVAL 8 HOUR)) = ?`;
    const params = [selectedDate];
    
    // Filter by employee
    if (userId) {
      query += ' AND users.id = ?';
      params.push(userId);
    }
    
    // Filter by status
    if (status && (status === 'IN' || status === 'OUT')) {
      query += ' AND attendance_logs.status = ?';
      params.push(status);
    }
    
    // Sort
    const allowedSortFields = ['timestamp', 'name', 'status', 'id'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'timestamp';
    const allowedSortOrders = ['ASC', 'DESC'];
    const sortDirection = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortDirection}`;
    
    const [logs] = await pool.query(query, params);

    res.status(200).json({
      date: selectedDate,
      logs,
      filters: { userId, status, sortBy, sortOrder }
    });
  } catch (error) {
    console.error('Error fetching daily logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllLogs = async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT attendance_logs.id, attendance_logs.user_id, attendance_logs.status, attendance_logs.timestamp, attendance_logs.latitude, attendance_logs.longitude, attendance_logs.site_id, sites.name AS site_name, users.name, users.role,
       CASE WHEN manual.attendance_log_id IS NULL THEN 'scanner' ELSE 'manual' END AS source,
       manual.reason, manual.operation_id, manual.created_at_utc AS created_at,
       COALESCE(actor.username, manual.admin_username) AS created_by
       FROM attendance_logs
       INNER JOIN users ON attendance_logs.user_id = users.id
       LEFT JOIN sites ON sites.id = attendance_logs.site_id
       LEFT JOIN manual_attendance_details manual ON manual.attendance_log_id = attendance_logs.id
       LEFT JOIN admins actor ON actor.id = manual.admin_id
       ORDER BY attendance_logs.timestamp DESC
       LIMIT 1000`
    );

    res.status(200).json({
      logs
    });
  } catch (error) {
    console.error('Error fetching all logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getLastAttendance = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if userId is a name (string) or numeric ID
    let actualUserId;
    if (isNaN(userId)) {
      // It's a name, look up the user ID
      const [users] = await pool.query(
        'SELECT id FROM users WHERE name = ? AND is_active = 1',
        [userId]
      );
      if (users.length === 0) {
        return res.json({ status: null, timestamp: null, userId: null });
      }
      actualUserId = users[0].id;
    } else {
      // It's already a numeric ID
      actualUserId = parseInt(userId);
    }

    const [result] = await pool.query(
      `SELECT * FROM attendance_logs 
       WHERE user_id = ? 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [actualUserId]
    );

    if (result.length === 0) {
      return res.json({ status: null, timestamp: null, userId: actualUserId });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching last attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPublicSettings,
  logAttendance,
  getDailyLogs,
  getAllLogs,
  getLastAttendance
};
