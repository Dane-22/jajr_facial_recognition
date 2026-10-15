const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyAdminToken } = require('../middleware/authMiddleware');

// Get today's quick system metrics for the assistant matching facial_attendance_db schema
router.get('/summary', verifyAdminToken, async (req, res) => {
  try {
    // 1. Total registered users count
    const [totalRes] = await pool.query('SELECT COUNT(*) as total FROM users WHERE is_active = 1');
    const totalEmployees = Number(totalRes[0]?.total || 0);

    // 2. Today's check-ins and check-outs
    const [todayRes] = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN status = 'IN' THEN user_id END) as checked_in,
        COUNT(DISTINCT CASE WHEN status = 'OUT' THEN user_id END) as checked_out
      FROM attendance_logs
      JOIN users active_users ON active_users.id = attendance_logs.user_id AND active_users.is_active = 1
      WHERE DATE(DATE_ADD(timestamp, INTERVAL 8 HOUR)) = DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))
    `);

    const checkedIn = Number(todayRes[0]?.checked_in || 0);
    const checkedOut = Number(todayRes[0]?.checked_out || 0);
    const absent = Math.max(0, totalEmployees - checkedIn);

    // Late flags are not enabled; never infer a policy from a hard-coded UTC hour.

    // 4. Recent system audit logs
    const [auditRes] = await pool.query(`
      SELECT action, user_type, entity_type, timestamp 
      FROM audit_logs 
      ORDER BY timestamp DESC 
      LIMIT 3
    `);

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        checkedIn,
        checkedOut,
        absent,
        attendanceRate: totalEmployees > 0 ? Math.round((checkedIn / totalEmployees) * 100) : 0,
        lateCount: null,
        lateAvailable: false,
        lateEmployees: [],
        recentAudits: auditRes
      }
    });
  } catch (error) {
    console.error('[Assistant API] Error fetching summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assistant summary' });
  }
});

// Search employee by name or role in users table
router.get('/search', verifyAdminToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query parameter q is required' });
    }

    const [employees] = await pool.query(`
      SELECT id, name as full_name, role as employee_id, created_at
      FROM users
      WHERE is_active = 1 AND (name LIKE ? OR role LIKE ?)
      LIMIT 5
    `, [`%${q}%`, `%${q}%`]);

    res.status(200).json({ success: true, employees });
  } catch (error) {
    console.error('[Assistant API] Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

module.exports = router;
