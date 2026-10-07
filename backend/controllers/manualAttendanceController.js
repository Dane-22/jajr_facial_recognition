const pool = require('../config/db');
const { recordManualAttendance, transferOpenSession, AttendanceError } = require('../services/manualAttendance');

const failure = (res, error) => {
  if (!(error instanceof AttendanceError)) console.error('Manual attendance failed:', error);
  return res.status(error.status || 500).json({ error: error.status ? error.message : 'Manual attendance could not be saved.' });
};

const withUtcConnection = async work => {
  await pool.ready;
  const connection = await pool.getConnection();
  try {
    await connection.query("SET time_zone = '+00:00'");
    return await work(connection);
  } finally { connection.release(); }
};

async function listEmployees(_req, res) {
  try {
    const result = await withUtcConnection(async connection => {
      const [employees] = await connection.query('SELECT id, name, role FROM users ORDER BY name, id');
      const [sites] = await connection.query(`SELECT es.user_id, s.id, s.name FROM employee_sites es
        JOIN sites s ON s.id = es.site_id WHERE s.active = 1 ORDER BY s.name`);
      const [sessions] = await connection.query(`SELECT ss.user_id, ss.site_id, ss.in_log_id, s.name AS site_name,
        CONCAT(DATE_FORMAT(l.timestamp, '%Y-%m-%dT%H:%i:%s'), 'Z') AS started_at
        FROM employee_site_sessions ss JOIN attendance_logs l ON l.id = ss.in_log_id
        JOIN sites s ON s.id = ss.site_id`);
      return employees.map(employee => ({ ...employee,
        sites: sites.filter(site => site.user_id === employee.id).map(({ id, name }) => ({ id, name })),
        session: sessions.find(session => session.user_id === employee.id) || null }));
    });
    res.json({ employees: result, maxAgeDays: Number(process.env.MANUAL_ATTENDANCE_MAX_AGE_DAYS) || 30,
      timezone: 'Asia/Manila' });
  } catch (error) { failure(res, error); }
}

async function employeeHistory(req, res) {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ error: 'Invalid employee.' });
  try {
    const result = await withUtcConnection(async connection => {
      const [employees] = await connection.query('SELECT id, name FROM users WHERE id = ?', [userId]);
      if (!employees.length) throw new AttendanceError(404, 'Employee not found.');
      const [logs] = await connection.query(`SELECT l.id, l.status, l.site_id, s.name AS site_name,
        CONCAT(DATE_FORMAT(l.timestamp, '%Y-%m-%dT%H:%i:%s'), 'Z') AS timestamp,
        CASE WHEN m.attendance_log_id IS NULL THEN 'scanner' ELSE 'manual' END AS source,
        m.reason, m.operation_id, COALESCE(a.username, m.admin_username) AS created_by,
        CONCAT(DATE_FORMAT(m.created_at_utc, '%Y-%m-%dT%H:%i:%s'), 'Z') AS created_at
        FROM attendance_logs l LEFT JOIN sites s ON s.id = l.site_id
        LEFT JOIN manual_attendance_details m ON m.attendance_log_id = l.id
        LEFT JOIN admins a ON a.id = m.admin_id
        WHERE l.user_id = ? ORDER BY l.timestamp DESC, l.id DESC LIMIT 20`, [userId]);
      const [transfers] = await connection.query(`SELECT t.id, t.in_log_id,
        t.from_site_id, t.from_site_name, t.to_site_id, t.to_site_name,
        CONCAT(LEFT(DATE_FORMAT(t.effective_at_utc, '%Y-%m-%dT%H:%i:%s.%f'), 23), 'Z') AS timestamp,
        CONCAT(LEFT(DATE_FORMAT(t.created_at_utc, '%Y-%m-%dT%H:%i:%s.%f'), 23), 'Z') AS created_at,
        COALESCE(a.username, t.admin_username) AS created_by, t.reason
        FROM employee_site_transfers t LEFT JOIN admins a ON a.id = t.admin_id
        WHERE t.user_id = ? ORDER BY t.effective_at_utc DESC, t.id DESC LIMIT 20`, [userId]);
      const history = [
        ...logs.map(log => ({ ...log, kind: 'attendance' })),
        ...transfers.map(transfer => ({ ...transfer, kind: 'transfer' }))
      ].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp) || b.id - a.id).slice(0, 20);
      return { employee: employees[0], logs: history };
    });
    res.json(result);
  } catch (error) { failure(res, error); }
}

async function createManualAttendance(req, res) {
  try {
    await pool.ready;
    const result = await recordManualAttendance({
      adminId: req.user.id, userId: req.params.userId,
      mode: req.body?.mode, at: req.body?.at, outAt: req.body?.outAt,
      siteId: req.body?.siteId, reason: req.body?.reason,
      ip: req.ip || req.connection.remoteAddress, userAgent: req.get('user-agent') || null
    });
    const io = req.app.get('io');
    for (const log of result.logs) io?.to('admin-room').emit('attendance:new', log);
    res.status(201).json(result);
  } catch (error) { failure(res, error); }
}

async function createSiteTransfer(req, res) {
  try {
    await pool.ready;
    const result = await transferOpenSession({
      adminId: req.user.id, userId: req.params.userId,
      fromSiteId: req.body?.fromSiteId, toSiteId: req.body?.toSiteId, reason: req.body?.reason,
      ip: req.ip || req.connection.remoteAddress, userAgent: req.get('user-agent') || null
    });
    req.app.get('io')?.to('admin-room').emit('attendance:site-transfer', result.transfer);
    res.status(201).json(result);
  } catch (error) { failure(res, error); }
}

module.exports = { listEmployees, employeeHistory, createManualAttendance, createSiteTransfer };
