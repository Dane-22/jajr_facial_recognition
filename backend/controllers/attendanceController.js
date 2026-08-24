const pool = require('../config/db');
const { manualLog } = require('../middleware/audit');
const crypto = require('crypto');

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in m
}

const getPublicSettings = async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM system_settings WHERE setting_key = "geofencing_enabled"');
    const isEnabled = settings.length > 0 && settings[0].setting_value === 'true';
    res.json({ geofencing_enabled: isEnabled });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const logAttendance = async (req, res) => {
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
        'SELECT id FROM users WHERE name = ?',
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

    const antiSpamCheck = await pool.query(
      `SELECT * FROM attendance_logs 
       WHERE user_id = ? 
       AND status = ? 
       AND timestamp > DATE_SUB(NOW(), INTERVAL 60 SECOND)`,
      [actualUserId, status]
    );

    if (antiSpamCheck[0].length > 0) {
      return res.status(429).json({ 
        error: 'Please wait at least 60 seconds before logging again with the same status' 
      });
    }

    // Check geofencing
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settingsMap = settings.reduce((acc, row) => ({ ...acc, [row.setting_key]: row.setting_value }), {});
    
    if (settingsMap.geofencing_enabled === 'true') {
      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Location (latitude and longitude) is required when geofencing is enabled.' });
      }
      const distance = getDistanceFromLatLonInM(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(settingsMap.office_latitude),
        parseFloat(settingsMap.office_longitude)
      );
      if (distance > parseFloat(settingsMap.geofence_radius_meters)) {
        return res.status(403).json({ error: `Check-in failed. You are ${Math.round(distance)}m away from the office, which exceeds the allowed ${settingsMap.geofence_radius_meters}m radius.` });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO attendance_logs (user_id, status, timestamp, latitude, longitude) VALUES (?, ?, NOW(), ?, ?)',
      [actualUserId, status, latitude || null, longitude || null]
    );

    // Log attendance action
    await manualLog(
      actualUserId,
      'employee',
      status === 'IN' ? 'CHECK_IN' : 'CHECK_OUT',
      'attendance',
      result.insertId,
      null,
      { userId: actualUserId, status, timestamp: new Date() },
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
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      message: 'Attendance logged successfully',
      logId: result.insertId,
      userId: actualUserId,
      status
    });
  } catch (error) {
    console.error('Error logging attendance:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

const getDailyLogs = async (req, res) => {
  try {
    const { date, userId, status, sortBy = 'timestamp', sortOrder = 'DESC' } = req.query;
    
    const selectedDate = date || new Date().toISOString().split('T')[0];
    
    let query = `SELECT attendance_logs.id, attendance_logs.status, attendance_logs.timestamp, attendance_logs.latitude, attendance_logs.longitude, users.name, users.role, users.id as user_id
       FROM attendance_logs
       INNER JOIN users ON attendance_logs.user_id = users.id
       WHERE DATE(attendance_logs.timestamp) = ?`;
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
      `SELECT attendance_logs.id, attendance_logs.user_id, attendance_logs.status, attendance_logs.timestamp, attendance_logs.latitude, attendance_logs.longitude, users.name, users.role
       FROM attendance_logs
       INNER JOIN users ON attendance_logs.user_id = users.id
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
        'SELECT id FROM users WHERE name = ?',
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
