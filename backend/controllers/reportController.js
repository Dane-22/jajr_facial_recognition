const pool = require('../config/db');

/**
 * Generate daily attendance report
 */
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0];

    const [report] = await pool.query(
      `SELECT 
        users.id,
        users.name,
        users.role,
        COUNT(CASE WHEN attendance_logs.status = 'IN' THEN 1 END) as check_ins,
        COUNT(CASE WHEN attendance_logs.status = 'OUT' THEN 1 END) as check_outs,
        MIN(CASE WHEN attendance_logs.status = 'IN' THEN attendance_logs.timestamp END) as first_check_in,
        MAX(CASE WHEN attendance_logs.status = 'OUT' THEN attendance_logs.timestamp END) as last_check_out
       FROM users
       LEFT JOIN attendance_logs ON users.id = attendance_logs.user_id 
         AND DATE(attendance_logs.timestamp) = ?
       GROUP BY users.id, users.name, users.role
       ORDER BY users.name`,
      [queryDate]
    );

    res.status(200).json({
      date: queryDate,
      report
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate weekly attendance report
 */
const getWeeklyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 7 days if not provided
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const [report] = await pool.query(
      `SELECT 
        users.id,
        users.name,
        users.role,
        COUNT(DISTINCT DATE(attendance_logs.timestamp)) as days_present,
        COUNT(CASE WHEN attendance_logs.status = 'IN' THEN 1 END) as total_check_ins,
        COUNT(CASE WHEN attendance_logs.status = 'OUT' THEN 1 END) as total_check_outs
       FROM users
       LEFT JOIN attendance_logs ON users.id = attendance_logs.user_id 
         AND DATE(attendance_logs.timestamp) BETWEEN ? AND ?
       GROUP BY users.id, users.name, users.role
       ORDER BY users.name`,
      [start, end]
    );

    res.status(200).json({
      startDate: start,
      endDate: end,
      report
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate monthly attendance report
 */
const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;
    
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

    const [report] = await pool.query(
      `SELECT 
        users.id,
        users.name,
        users.role,
        COUNT(DISTINCT DATE(attendance_logs.timestamp)) as days_present,
        COUNT(CASE WHEN attendance_logs.status = 'IN' THEN 1 END) as total_check_ins,
        COUNT(CASE WHEN attendance_logs.status = 'OUT' THEN 1 END) as total_check_outs,
        MIN(CASE WHEN attendance_logs.status = 'IN' THEN attendance_logs.timestamp END) as first_check_in_month,
        MAX(CASE WHEN attendance_logs.status = 'OUT' THEN attendance_logs.timestamp END) as last_check_out_month
       FROM users
       LEFT JOIN attendance_logs ON users.id = attendance_logs.user_id 
         AND DATE(attendance_logs.timestamp) BETWEEN ? AND ?
       GROUP BY users.id, users.name, users.role
       ORDER BY users.name`,
      [startDate, endDate]
    );

    res.status(200).json({
      year: currentYear,
      month: currentMonth,
      startDate,
      endDate,
      report
    });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get attendance statistics for dashboard
 */
const getAttendanceStats = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'day':
        startDate = endDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'month':
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        endDate = now.toISOString().split('T')[0];
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
    }

    const [stats] = await pool.query(
      `SELECT 
        COUNT(DISTINCT user_id) as unique_employees,
        COUNT(CASE WHEN status = 'IN' THEN 1 END) as total_check_ins,
        COUNT(CASE WHEN status = 'OUT' THEN 1 END) as total_check_outs,
        COUNT(DISTINCT DATE(timestamp)) as days_with_activity
       FROM attendance_logs
       WHERE DATE(timestamp) BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const [employeeStats] = await pool.query(
      `SELECT 
        users.id,
        users.name,
        COUNT(DISTINCT DATE(attendance_logs.timestamp)) as days_present
       FROM users
       LEFT JOIN attendance_logs ON users.id = attendance_logs.user_id 
         AND DATE(attendance_logs.timestamp) BETWEEN ? AND ?
       GROUP BY users.id, users.name
       ORDER BY days_present DESC
       LIMIT 10`,
      [startDate, endDate]
    );

    res.status(200).json({
      period,
      startDate,
      endDate,
      stats: stats[0],
      topEmployees: employeeStats
    });
  } catch (error) {
    console.error('Error generating attendance stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getAttendanceStats
};
