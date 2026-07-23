const pool = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // 1. Attendance trends (line chart - last N days)
    const [trendData] = await pool.query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(CASE WHEN status = 'IN' THEN 1 END) as check_ins,
        COUNT(CASE WHEN status = 'OUT' THEN 1 END) as check_outs,
        COUNT(DISTINCT user_id) as unique_employees
      FROM attendance_logs
      WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `, [parseInt(days)]);

    // 2. Department comparison (bar chart)
    const [departmentData] = await pool.query(`
      SELECT 
        u.role as department,
        COUNT(DISTINCT u.id) as total_employees,
        COUNT(DISTINCT CASE WHEN al.status = 'IN' AND DATE(al.timestamp) = CURDATE() THEN u.id END) as checked_in_today,
        COUNT(al.id) as total_attendance
      FROM users u
      LEFT JOIN attendance_logs al ON u.id = al.user_id AND al.timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY u.role
      ORDER BY total_attendance DESC
    `, [parseInt(days)]);

    // 3. Attendance breakdown (pie chart - today's status)
    const [breakdownData] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'IN' THEN 1 END) as checked_in,
        COUNT(CASE WHEN status = 'OUT' THEN 1 END) as checked_out,
        COUNT(DISTINCT user_id) as total_employees,
        (COUNT(DISTINCT user_id) - COUNT(CASE WHEN status = 'IN' THEN 1 END)) as not_checked_in
      FROM attendance_logs
      WHERE DATE(timestamp) = CURDATE()
    `);

    // Get total employees for accurate breakdown
    const [totalEmployees] = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalEmpCount = totalEmployees[0].count;

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
      trends: trendData,
      departments: departmentData,
      breakdown: {
        checked_in: breakdownData[0]?.checked_in || 0,
        checked_out: breakdownData[0]?.checked_out || 0,
        not_checked_in: totalEmpCount - (breakdownData[0]?.checked_in || 0),
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

module.exports = {
  getDashboardStats
};
