const pool = require('../config/db');
const { manualLog } = require('../middleware/audit');
const { validCoordinates } = require('../utils/siteRules');
const { recordManualAttendance, AttendanceError } = require('../services/manualAttendance');

const audit = (req, action, entityType, entityId, before, after) => manualLog(
  req.user.id, 'admin', action, entityType, entityId, before, after,
  req.ip || req.connection.remoteAddress, req.get('user-agent') || null
);

const getSites = async (_req, res) => {
  try {
    await pool.ready;
    const [sites] = await pool.query('SELECT id, name, latitude, longitude, radius_meters, active FROM sites ORDER BY id');
    const [employees] = await pool.query(`SELECT u.id, u.name, GROUP_CONCAT(es.site_id ORDER BY es.site_id) AS site_ids
      FROM users u LEFT JOIN employee_sites es ON es.user_id = u.id
      WHERE u.is_active = 1 GROUP BY u.id, u.name ORDER BY u.name`);
    const [sessions] = await pool.query(`SELECT ss.user_id, u.name AS employee_name, ss.site_id, s.name AS site_name,
      ss.started_at, ss.in_log_id FROM employee_site_sessions ss
      JOIN users u ON u.id = ss.user_id JOIN sites s ON s.id = ss.site_id ORDER BY ss.started_at`);
    res.json({ sites, employees: employees.map(employee => ({ ...employee,
      site_ids: employee.site_ids ? employee.site_ids.split(',').map(Number) : [] })), sessions });
  } catch (error) {
    console.error('Failed to load sites:', error);
    res.status(500).json({ error: 'Failed to load sites.' });
  }
};

const saveSite = async (req, res) => {
  try {
    const { name, latitude, longitude, radius_meters, active } = req.body || {};
    const radius = Number(radius_meters);
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
        !validCoordinates(latitude, longitude) || !Number.isInteger(radius) || radius < 10 || radius > 1000 ||
        ![true, false].includes(active)) {
      return res.status(400).json({ error: 'Enter a site name, valid coordinates, and a radius from 10 to 1000 m.' });
    }
    const id = req.params.id ? Number(req.params.id) : null;
    if (id !== null && (!Number.isInteger(id) || id < 1)) return res.status(400).json({ error: 'Invalid site.' });
    const [existing] = id ? await pool.query('SELECT * FROM sites WHERE id = ?', [id]) : [[]];
    if (id && !existing.length) return res.status(404).json({ error: 'Site not found.' });
    if (id) {
      const [open] = await pool.query('SELECT user_id FROM employee_site_sessions WHERE site_id = ? LIMIT 1', [id]);
      if (open.length && (!active || Number(existing[0].latitude) !== Number(latitude) ||
          Number(existing[0].longitude) !== Number(longitude) || Number(existing[0].radius_meters) !== radius)) {
        return res.status(409).json({ error: 'This site has an open time-in. Close it before changing the boundary or deactivating the site.' });
      }
    }
    const duplicateSql = id ? 'SELECT id FROM sites WHERE name = ? AND id <> ?' : 'SELECT id FROM sites WHERE name = ?';
    const [duplicate] = await pool.query(duplicateSql, id ? [name.trim(), id] : [name.trim()]);
    if (duplicate.length) return res.status(409).json({ error: 'A site with that name already exists.' });
    let savedId = id;
    if (id) {
      await pool.query(`UPDATE sites SET name = ?, latitude = ?, longitude = ?, radius_meters = ?, active = ? WHERE id = ?`,
        [name.trim(), Number(latitude), Number(longitude), radius, active ? 1 : 0, id]);
    } else {
      const [result] = await pool.query(`INSERT INTO sites (name, latitude, longitude, radius_meters, active)
        VALUES (?, ?, ?, ?, ?)`, [name.trim(), Number(latitude), Number(longitude), radius, active ? 1 : 0]);
      savedId = result.insertId;
    }
    await audit(req, id ? 'UPDATE' : 'CREATE', 'site', savedId, existing[0] || null,
      { name: name.trim(), latitude, longitude, radius_meters: radius, active });
    res.json({ id: savedId });
  } catch (error) {
    console.error('Failed to save site:', error);
    res.status(500).json({ error: 'Failed to save site.' });
  }
};

const saveAssignments = async (req, res) => {
  let connection;
  try {
    const userId = Number(req.params.userId);
    const siteIds = req.body?.siteIds;
    if (!Number.isInteger(userId) || userId < 1 || !Array.isArray(siteIds) || !siteIds.length ||
        siteIds.some(id => !Number.isInteger(id) || id < 1) || new Set(siteIds).size !== siteIds.length) {
      return res.status(400).json({ error: 'Select at least one valid site.' });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [users] = await connection.query('SELECT id, is_active FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!users.length) { await connection.rollback(); return res.status(404).json({ error: 'Employee not found.' }); }
    if (Number(users[0].is_active) === 0) { await connection.rollback(); return res.status(409).json({ error: 'Restore this employee before changing assignments.' }); }
    const [sites] = await connection.query('SELECT id FROM sites WHERE id IN (?) AND active = 1', [siteIds]);
    if (sites.length !== siteIds.length) { await connection.rollback(); return res.status(400).json({ error: 'Assignments must use active sites.' }); }
    const [open] = await connection.query('SELECT site_id FROM employee_site_sessions WHERE user_id = ?', [userId]);
    if (open.length && !siteIds.includes(open[0].site_id)) {
      await connection.rollback();
      return res.status(409).json({ error: 'Close the open time-in before removing its site assignment.' });
    }
    const [before] = await connection.query('SELECT site_id FROM employee_sites WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM employee_sites WHERE user_id = ?', [userId]);
    for (const siteId of siteIds) await connection.query('INSERT INTO employee_sites (user_id, site_id) VALUES (?, ?)', [userId, siteId]);
    await connection.commit();
    await audit(req, 'UPDATE', 'employee_sites', userId, before.map(row => row.site_id), siteIds);
    res.json({ userId, siteIds });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('Failed to save site assignments:', error);
    res.status(500).json({ error: 'Failed to save site assignments.' });
  } finally {
    connection?.release();
  }
};

const correctTimeOut = async (req, res) => {
  try {
    const correctedAt = new Date(req.body?.correctedAt);
    if (typeof req.body?.correctedAt !== 'string' || !Number.isFinite(correctedAt.getTime())) {
      throw new AttendanceError(400, 'Enter a valid Asia/Manila time-out.');
    }
    const at = new Date(correctedAt.getTime() + 8 * 3600000).toISOString().slice(0, 19) + '+08:00';
    await pool.ready;
    const result = await recordManualAttendance({ adminId: req.user.id, userId: req.params.userId,
      mode: 'OUT', at, reason: req.body?.reason, ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent') || null });
    req.app.get('io')?.to('admin-room').emit('attendance:new', result.logs[0]);
    res.json({ logId: result.logs[0].id });
  } catch (error) {
    if (!(error instanceof AttendanceError)) console.error('Failed to correct time-out:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to correct time-out.' });
  }
};

module.exports = { getSites, saveSite, saveAssignments, correctTimeOut };
