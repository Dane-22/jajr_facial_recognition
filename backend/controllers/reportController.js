const pool = require('../config/db');
const manilaDate = date => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila',
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const attendanceDay = expression => `DATE(DATE_ADD(${expression}, INTERVAL 8 HOUR))`;

/**
 * Generate daily attendance report
 */
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date || manilaDate(new Date());

    const [report] = await pool.query(
      `SELECT 
        users.id,
        users.name,
        users.role,
        COUNT(DISTINCT CASE WHEN attendance_logs.status = 'IN' THEN ${attendanceDay('attendance_logs.timestamp')} END) as days_present,
        COUNT(CASE WHEN attendance_logs.status = 'IN' THEN 1 END) as check_ins,
        COUNT(CASE WHEN attendance_logs.status = 'OUT' THEN 1 END) as check_outs,
        MIN(CASE WHEN attendance_logs.status = 'IN' THEN attendance_logs.timestamp END) as first_check_in,
        MAX(CASE WHEN attendance_logs.status = 'OUT' THEN attendance_logs.timestamp END) as last_check_out
       FROM users
       LEFT JOIN attendance_logs ON users.id = attendance_logs.user_id 
         AND ${attendanceDay('attendance_logs.timestamp')} = ?
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
    const start = startDate || manilaDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
    const end = endDate || manilaDate(new Date());

    const [report] = await pool.query(
      `SELECT 
        users.id,
        users.name,
        users.role,
        COUNT(DISTINCT CASE WHEN attendance_logs.status = 'IN' THEN ${attendanceDay('attendance_logs.timestamp')} END) as days_present,
        COUNT(CASE WHEN attendance_logs.status = 'IN' THEN 1 END) as total_check_ins,
        COUNT(CASE WHEN attendance_logs.status = 'OUT' THEN 1 END) as total_check_outs
       FROM users
       LEFT JOIN attendance_logs ON users.id = attendance_logs.user_id 
         AND ${attendanceDay('attendance_logs.timestamp')} BETWEEN ? AND ?
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
    
    const todayInManila = manilaDate(new Date());
    const currentYear = Number(year || todayInManila.slice(0, 4));
    const currentMonth = Number(month || todayInManila.slice(5, 7));
    if (!Number.isInteger(currentYear) || currentYear < 2000 || currentYear > 2100 ||
        !Number.isInteger(currentMonth) || currentMonth < 1 || currentMonth > 12) {
      return res.status(400).json({ error: 'Invalid report year or month' });
    }
    
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const nextMonthDate = new Date(Date.UTC(currentYear, currentMonth, 1)).toISOString().slice(0, 10);
    const endDate = new Date(Date.UTC(currentYear, currentMonth, 0)).toISOString().slice(0, 10);

    const [report] = await pool.query(
      `SELECT 
        users.id,
        users.name,
        users.role,
        COUNT(DISTINCT CASE WHEN attendance_logs.status = 'IN' THEN ${attendanceDay('attendance_logs.timestamp')} END) as days_present,
        COUNT(CASE WHEN attendance_logs.status = 'IN' THEN 1 END) as total_check_ins,
        COUNT(CASE WHEN attendance_logs.status = 'OUT' THEN 1 END) as total_check_outs,
        MIN(CASE WHEN attendance_logs.status = 'IN' THEN attendance_logs.timestamp END) as first_check_in_month,
        MAX(CASE WHEN attendance_logs.status = 'OUT' THEN attendance_logs.timestamp END) as last_check_out_month
       FROM users
       LEFT JOIN attendance_logs ON users.id = attendance_logs.user_id 
         AND ${attendanceDay('attendance_logs.timestamp')} >= ?
         AND ${attendanceDay('attendance_logs.timestamp')} < ?
       GROUP BY users.id, users.name, users.role
       ORDER BY users.name`,
      [startDate, nextMonthDate]
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
        startDate = endDate = manilaDate(now);
        break;
      case 'week':
        startDate = manilaDate(new Date(now - 7 * 24 * 60 * 60 * 1000));
        endDate = manilaDate(now);
        break;
      case 'month':
        startDate = `${manilaDate(now).slice(0, 7)}-01`;
        endDate = manilaDate(now);
        break;
      default:
        startDate = manilaDate(new Date(now - 7 * 24 * 60 * 60 * 1000));
        endDate = manilaDate(now);
    }

    const [stats] = await pool.query(
      `SELECT 
        COUNT(DISTINCT user_id) as unique_employees,
        COUNT(CASE WHEN status = 'IN' THEN 1 END) as total_check_ins,
        COUNT(CASE WHEN status = 'OUT' THEN 1 END) as total_check_outs,
        COUNT(DISTINCT ${attendanceDay('timestamp')}) as days_with_activity
       FROM attendance_logs
       WHERE ${attendanceDay('timestamp')} BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const [employeeStats] = await pool.query(
      `SELECT 
        users.id,
        users.name,
        COUNT(DISTINCT ${attendanceDay('attendance_logs.timestamp')}) as days_present
       FROM users
       LEFT JOIN attendance_logs ON users.id = attendance_logs.user_id 
         AND ${attendanceDay('attendance_logs.timestamp')} BETWEEN ? AND ?
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
