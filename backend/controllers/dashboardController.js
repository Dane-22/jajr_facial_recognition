const pool = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    const requestedDays = Number(req.query.days);
    const days = [7, 14, 30].includes(requestedDays) ? requestedDays : 7;
    const [dateRows] = await pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today");
    const today = dateRows[0].today;

    // 1. Attendance trends (line chart - last N days)
    const [trendData] = await pool.query(`
      SELECT 
        DATE_FORMAT(timestamp, '%Y-%m-%d') as date,
        COUNT(CASE WHEN status = 'IN' THEN 1 END) as check_ins,
        COUNT(CASE WHEN status = 'OUT' THEN 1 END) as check_outs,
        COUNT(DISTINCT user_id) as unique_employees
      FROM attendance_logs
      WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND timestamp < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d')
      ORDER BY date ASC
    `, [days - 1]);

    const trendByDate = new Map(trendData.map(row => [row.date, row]));
    const trends = Array.from({ length: days }, (_, index) => {
      const date = new Date(`${today}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - (days - 1 - index));
      const dateKey = date.toISOString().slice(0, 10);
      return trendByDate.get(dateKey) || {
        date: dateKey, check_ins: 0, check_outs: 0, unique_employees: 0
      };
    });

    // 2. Employee comparison (bar chart)
    const [employeeData] = await pool.query(`
      SELECT 
        u.name as employee_name,
        COUNT(al.id) as total_attendance,
        CASE WHEN current_status.status = 'IN' THEN 1 ELSE 0 END as checked_in_today
      FROM users u
      LEFT JOIN attendance_logs al ON u.id = al.user_id
        AND al.timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND al.timestamp < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      LEFT JOIN (
        SELECT user_id, status FROM (
          SELECT user_id, status, ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY timestamp DESC, id DESC
          ) AS row_num
          FROM attendance_logs
          WHERE timestamp >= CURDATE()
            AND timestamp < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        ) ranked WHERE row_num = 1
      ) current_status ON current_status.user_id = u.id
      GROUP BY u.id, u.name, current_status.status
      ORDER BY total_attendance DESC
      LIMIT 10
    `, [days - 1]);

    // 3. Attendance breakdown (pie chart - today's status)
    const [breakdownData] = await pool.query(`
      SELECT 
        COALESCE(SUM(status = 'IN'), 0) as checked_in,
        COALESCE(SUM(status = 'OUT'), 0) as checked_out
      FROM (
        SELECT status, ROW_NUMBER() OVER (
          PARTITION BY user_id ORDER BY timestamp DESC, id DESC
        ) AS row_num
        FROM attendance_logs
        WHERE timestamp >= CURDATE()
          AND timestamp < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      ) latest
      WHERE row_num = 1
    `);

    // Get total employees for accurate breakdown
    const [totalEmployees] = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalEmpCount = Number(totalEmployees[0].count);
    const checkedIn = Number(breakdownData[0]?.checked_in || 0);
    const checkedOut = Number(breakdownData[0]?.checked_out || 0);

    // 4. Heat map data (time-based patterns - hourly check-ins for last 7 days)
    const [heatMapData] = await pool.query(`
      SELECT 
        DAYOFWEEK(timestamp) as day_num,
        HOUR(timestamp) as hour,
        COUNT(CASE WHEN status = 'IN' THEN 1 END) as check_ins
      FROM attendance_logs
      WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DAYOFWEEK(timestamp), HOUR(timestamp)
      ORDER BY day_num, hour
    `);

    // Map day numbers to day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const heatMapWithNames = heatMapData.map(row => ({
      ...row,
      day: dayNames[row.day_num - 1]
    }));

    // 5. Summary stats
    const [todayStats] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'IN' THEN 1 END) as today_check_ins,
        COUNT(CASE WHEN status = 'OUT' THEN 1 END) as today_check_outs,
        COUNT(CASE WHEN DATE(timestamp) = CURDATE() THEN 1 END) as today_total
      FROM attendance_logs
      WHERE DATE(timestamp) = CURDATE()
    `);

    res.status(200).json({
      trends,
      employees: employeeData,
      breakdown: {
        checked_in: checkedIn,
        checked_out: checkedOut,
        not_checked_in: Math.max(0, totalEmpCount - checkedIn - checkedOut),
        total_employees: totalEmpCount
      },
      heatMap: heatMapWithNames,
      summary: {
        total_employees: totalEmpCount,
        today_check_ins: todayStats[0]?.today_check_ins || 0,
        today_check_outs: todayStats[0]?.today_check_outs || 0,
        today_total: todayStats[0]?.today_total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCalendarActivity = async (req, res) => {
  try {
    const { year, month } = req.query; // month is 1-12
    if (!year || !month) return res.status(400).json({ error: 'Year and month are required' });

    const y = parseInt(year);
    const m = parseInt(month);
    
    const [rows] = await pool.query(`
      SELECT DISTINCT DATE_FORMAT(timestamp, '%Y-%m-%d') as active_date
      FROM attendance_logs
      WHERE status = 'IN' 
        AND YEAR(timestamp) = ? 
        AND MONTH(timestamp) = ?
    `, [y, m]);

    const activeDates = rows.map(r => r.active_date);
    
    res.status(200).json({ activeDates });
  } catch (error) {
    console.error('Error fetching calendar stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getDashboardStats,
  getCalendarActivity
};
