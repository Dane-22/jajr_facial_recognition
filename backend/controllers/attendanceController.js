const pool = require('../config/db');

const logAttendance = async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!userId || !status) {
      return res.status(400).json({ error: 'User ID and status are required' });
    }

    if (status !== 'IN' && status !== 'OUT') {
      return res.status(400).json({ error: 'Status must be either IN or OUT' });
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

    const [result] = await pool.query(
      'INSERT INTO attendance_logs (user_id, status, timestamp) VALUES (?, ?, NOW())',
      [actualUserId, status]
    );

    res.status(201).json({
      message: 'Attendance logged successfully',
      logId: result.insertId,
      userId: actualUserId,
      status
    });
  } catch (error) {
    console.error('Error logging attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDailyLogs = async (req, res) => {
  try {
    const { date } = req.query;
    
    const selectedDate = date || new Date().toISOString().split('T')[0];
    
    const [logs] = await pool.query(
      `SELECT attendance_logs.id, attendance_logs.status, attendance_logs.timestamp, users.name, users.role
       FROM attendance_logs
       INNER JOIN users ON attendance_logs.user_id = users.id
       WHERE DATE(attendance_logs.timestamp) = ?
       ORDER BY attendance_logs.timestamp DESC`,
      [selectedDate]
    );

    res.status(200).json({
      date: selectedDate,
      logs
    });
  } catch (error) {
    console.error('Error fetching daily logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllLogs = async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT attendance_logs.id, attendance_logs.user_id, attendance_logs.status, attendance_logs.timestamp, users.name, users.role
       FROM attendance_logs
       INNER JOIN users ON attendance_logs.user_id = users.id
       ORDER BY attendance_logs.timestamp DESC`
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
  logAttendance,
  getDailyLogs,
  getAllLogs,
  getLastAttendance
};
