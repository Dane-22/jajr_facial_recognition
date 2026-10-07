const crypto = require('crypto');
const pool = require('../config/db');

const maxAgeDays = () => {
  const configured = Number(process.env.MANUAL_ATTENDANCE_MAX_AGE_DAYS ?? 30);
  return Number.isFinite(configured) && configured > 0 ? configured : 30;
};

class AttendanceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function parseManilaTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?\+08:00$/.test(value)) {
    throw new AttendanceError(400, 'Enter a valid Asia/Manila date and time.');
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new AttendanceError(400, 'Enter a valid Asia/Manila date and time.');
  }
  // Date.parse normalizes invalid days (for example February 30); compare the Manila wall clock.
  const precision = value.length === 25 ? 19 : 16;
  const wall = new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, precision);
  if (wall !== value.slice(0, precision)) throw new AttendanceError(400, 'Enter a valid Asia/Manila date and time.');
  const age = Date.now() - date.getTime();
  if (age < 0) throw new AttendanceError(400, 'Future attendance times are not allowed.');
  if (age > maxAgeDays() * 86400000) throw new AttendanceError(400, `Attendance must be within the last ${maxAgeDays()} days.`);
  return date;
}

const utcSql = date => date.toISOString().slice(0, 19).replace('T', ' ');
const utcDate = value => new Date(`${value.replace(' ', 'T').replace(/Z$/, '')}Z`);

function checkSequence(rows, mode, start, end, hasOpenSession) {
  const events = rows.map(row => ({ ...row, time: utcDate(row.at_utc).getTime() }));
  const startMs = start.getTime();
  const endMs = end?.getTime();
  if (events.some(event => event.time === startMs || (end && event.time === endMs))) {
    throw new AttendanceError(409, 'An attendance record already exists at that time.');
  }
  const before = events.filter(event => event.time < startMs).at(-1);
  const after = events.find(event => event.time > (endMs ?? startMs));
  if (mode === 'PAIR') {
    if (events.some(event => event.time > startMs && event.time < endMs) ||
        (before && before.status !== 'OUT') || (after && after.status !== 'IN')) {
      throw new AttendanceError(409, 'This shift overlaps or conflicts with existing attendance. Choose an empty interval.');
    }
  } else if (mode === 'IN') {
    if (hasOpenSession) throw new AttendanceError(409, 'This employee already has an open time-in.');
    if (after) throw new AttendanceError(409, 'Later attendance exists. Use a paired correction for a missed historical shift.');
    if (before && before.status !== 'OUT') throw new AttendanceError(409, 'The previous attendance record is already a time-in.');
  } else if (mode === 'OUT') {
    if (!hasOpenSession) throw new AttendanceError(409, 'No open time-in was found.');
    if (after) throw new AttendanceError(409, 'The time-out conflicts with later attendance.');
  }
}

async function recordManualAttendance({ adminId, userId, mode, at, outAt, siteId, reason, ip, userAgent }) {
  const employeeId = Number(userId);
  if (!Number.isInteger(employeeId) || employeeId < 1 || !['IN', 'OUT', 'PAIR'].includes(mode)) {
    throw new AttendanceError(400, 'Choose a valid employee and attendance action.');
  }
  if (typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 500) {
    throw new AttendanceError(400, 'Enter a reason of 10 to 500 characters.');
  }
  const start = parseManilaTime(at);
  const end = mode === 'PAIR' ? parseManilaTime(outAt) : null;
  if (end && end <= start) throw new AttendanceError(400, 'Time-out must be after time-in.');
  const requestedSiteId = Number(siteId);
  if (mode !== 'OUT' && (!Number.isInteger(requestedSiteId) || requestedSiteId < 1)) {
    throw new AttendanceError(400, 'Choose an assigned site.');
  }
  const connection = await pool.getConnection();
  let committed = false;
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.beginTransaction();
    const [admins] = await connection.query('SELECT position, username FROM admins WHERE id = ? FOR UPDATE', [adminId]);
    if (admins[0]?.position !== 'Superadmin') throw new AttendanceError(403, 'Superadmin access required.');
    const [users] = await connection.query('SELECT id, name, role FROM users WHERE id = ? FOR UPDATE', [employeeId]);
    if (!users.length) throw new AttendanceError(404, 'Employee not found.');
    const [sessions] = await connection.query('SELECT user_id, site_id, in_log_id FROM employee_site_sessions WHERE user_id = ?', [employeeId]);
    const session = sessions[0];
    const [rows] = await connection.query(`SELECT id, status,
      DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') AS at_utc
      FROM attendance_logs WHERE user_id = ? ORDER BY timestamp, id FOR UPDATE`, [employeeId]);
    checkSequence(rows, mode, start, end, Boolean(session));
    if (mode === 'OUT') {
      const inLog = rows.find(row => row.id === session?.in_log_id);
      if (!inLog || start <= utcDate(inLog.at_utc)) throw new AttendanceError(409, 'Time-out must be after the open time-in.');
      const [lastTransfers] = await connection.query(`SELECT
        DATE_FORMAT(effective_at_utc, '%Y-%m-%d %H:%i:%s') AS at_utc
        FROM employee_site_transfers WHERE user_id = ? AND in_log_id = ?
        ORDER BY effective_at_utc DESC, id DESC LIMIT 1`, [employeeId, session.in_log_id]);
      // Attendance timestamps have second precision. A time-out in the same
      // second cannot be proven to have happened after the transfer.
      if (lastTransfers.length && start <= utcDate(lastTransfers[0].at_utc)) {
        throw new AttendanceError(409, 'Time-out must be after the latest site transfer.');
      }
    }
    const effectiveSiteId = mode === 'OUT' ? session.site_id : requestedSiteId;
    const [sites] = mode === 'OUT'
      ? await connection.query('SELECT id, name FROM sites WHERE id = ?', [effectiveSiteId])
      : await connection.query(`SELECT s.id, s.name FROM employee_sites es
          JOIN sites s ON s.id = es.site_id WHERE es.user_id = ? AND s.id = ? AND s.active = 1`,
        [employeeId, effectiveSiteId]);
    if (!sites.length) throw new AttendanceError(409, 'The employee needs an active assigned site.');
    const operationId = crypto.randomUUID();
    const changes = mode === 'PAIR' ? [{ status: 'IN', time: start }, { status: 'OUT', time: end }]
      : [{ status: mode, time: start }];
    const logs = [];
    for (const change of changes) {
      const [insert] = await connection.query(
        'INSERT INTO attendance_logs (user_id, status, timestamp, site_id) VALUES (?, ?, ?, ?)',
        [employeeId, change.status, utcSql(change.time), effectiveSiteId]);
      await connection.query(`INSERT INTO manual_attendance_details
        (attendance_log_id, admin_id, admin_username, reason, operation_id, created_at_utc)
        VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [insert.insertId, adminId, admins[0].username, reason.trim(), operationId]);
      await connection.query(`INSERT INTO audit_logs
        (user_id, user_type, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
        VALUES (?, 'admin', ?, 'attendance', ?, NULL, ?, ?, ?)`, [adminId,
        change.status === 'IN' ? 'MANUAL_TIME_IN' : 'MANUAL_TIME_OUT', insert.insertId,
        JSON.stringify({ employeeId, siteId: effectiveSiteId, effectiveAt: change.time.toISOString(),
          createdAt: new Date().toISOString(), reason: reason.trim(), operationId }), ip || null, userAgent || null]);
      logs.push({ id: insert.insertId, user_id: employeeId, name: users[0].name,
        role: users[0].role, status: change.status, site_id: effectiveSiteId,
        site_name: sites[0].name, timestamp: change.time.toISOString(), source: 'manual' });
    }
    if (mode === 'IN') {
      await connection.query(`INSERT INTO employee_site_sessions (user_id, site_id, in_log_id, started_at)
        VALUES (?, ?, ?, ?)`, [employeeId, effectiveSiteId, logs[0].id, utcSql(start)]);
    } else if (mode === 'OUT') {
      await connection.query('DELETE FROM employee_site_sessions WHERE user_id = ?', [employeeId]);
    }
    await connection.commit();
    committed = true;
    return { operationId, logs };
  } catch (error) {
    if (!committed) await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

async function transferOpenSession({ adminId, userId, fromSiteId, toSiteId, reason, ip, userAgent }) {
  const employeeId = Number(userId);
  const expectedOriginId = Number(fromSiteId);
  const destinationId = Number(toSiteId);
  if (!Number.isInteger(employeeId) || employeeId < 1 ||
      !Number.isInteger(expectedOriginId) || expectedOriginId < 1 ||
      !Number.isInteger(destinationId) || destinationId < 1) {
    throw new AttendanceError(400, 'Choose a valid employee, current site, and destination site.');
  }
  if (typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 500) {
    throw new AttendanceError(400, 'Enter a reason of 10 to 500 characters.');
  }
  const connection = await pool.getConnection();
  let committed = false;
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.beginTransaction();
    const [admins] = await connection.query('SELECT position, username FROM admins WHERE id = ? FOR UPDATE', [adminId]);
    if (admins[0]?.position !== 'Superadmin') throw new AttendanceError(403, 'Superadmin access required.');
    const [users] = await connection.query('SELECT id, name, role FROM users WHERE id = ? FOR UPDATE', [employeeId]);
    if (!users.length) throw new AttendanceError(404, 'Employee not found.');
    const [sessions] = await connection.query(`SELECT ss.site_id, ss.in_log_id, s.name AS from_site_name,
      DATE_FORMAT(l.timestamp, '%Y-%m-%d %H:%i:%s') AS started_at_utc
      FROM employee_site_sessions ss JOIN sites s ON s.id = ss.site_id
      JOIN attendance_logs l ON l.id = ss.in_log_id
      WHERE ss.user_id = ? AND l.user_id = ? AND l.status = 'IN'`, [employeeId, employeeId]);
    const session = sessions[0];
    if (!session) throw new AttendanceError(409, 'This employee has no open time-in to transfer.');
    if (session.site_id !== expectedOriginId) throw new AttendanceError(409, 'The current site changed. Reload and review the transfer again.');
    if (session.site_id === destinationId) throw new AttendanceError(409, 'The employee is already at that site.');
    const [latest] = await connection.query(`SELECT id, status FROM attendance_logs
      WHERE user_id = ? ORDER BY timestamp DESC, id DESC LIMIT 1`, [employeeId]);
    if (latest[0]?.id !== session.in_log_id || latest[0]?.status !== 'IN') {
      throw new AttendanceError(409, 'The open time-in conflicts with later attendance.');
    }
    const [sites] = await connection.query(`SELECT s.id, s.name FROM employee_sites es
      JOIN sites s ON s.id = es.site_id WHERE es.user_id = ? AND s.id = ? AND s.active = 1`,
    [employeeId, destinationId]);
    if (!sites.length) throw new AttendanceError(409, 'Choose an active site assigned to this employee.');
    const [clock] = await connection.query("SELECT DATE_FORMAT(UTC_TIMESTAMP(6), '%Y-%m-%d %H:%i:%s.%f') AS now_utc");
    const effectiveAtSql = clock[0].now_utc;
    const effectiveAt = `${effectiveAtSql.replace(' ', 'T').slice(0, 23)}Z`;
    if (new Date(effectiveAt) <= utcDate(session.started_at_utc)) {
      throw new AttendanceError(409, 'The transfer must occur after the open time-in.');
    }
    const [update] = await connection.query(`UPDATE employee_site_sessions SET site_id = ?
      WHERE user_id = ? AND site_id = ?`, [destinationId, employeeId, session.site_id]);
    if (update.affectedRows !== 1) throw new AttendanceError(409, 'The open time-in changed. Reload and try again.');
    const [insert] = await connection.query(`INSERT INTO employee_site_transfers
      (user_id, in_log_id, from_site_id, from_site_name, to_site_id, to_site_name, admin_id, admin_username,
        reason, effective_at_utc, created_at_utc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [employeeId, session.in_log_id,
      session.site_id, session.from_site_name, destinationId, sites[0].name,
      adminId, admins[0].username, reason.trim(),
      effectiveAtSql, effectiveAtSql]);
    await connection.query(`INSERT INTO audit_logs
      (user_id, user_type, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, 'admin', 'MANUAL_SITE_TRANSFER', 'site_transfer', ?, ?, ?, ?, ?)`,
    [adminId, insert.insertId,
      JSON.stringify({ employeeId, siteId: session.site_id, inLogId: session.in_log_id }),
      JSON.stringify({ employeeId, siteId: destinationId, effectiveAt, reason: reason.trim(),
        inLogId: session.in_log_id }), ip || null, userAgent || null]);
    await connection.commit();
    committed = true;
    return { transfer: { id: insert.insertId, user_id: employeeId, employee_name: users[0].name,
      from_site_id: session.site_id, from_site_name: session.from_site_name,
      to_site_id: destinationId, to_site_name: sites[0].name,
      in_log_id: session.in_log_id, timestamp: effectiveAt, created_at: effectiveAt,
      created_by: admins[0].username, reason: reason.trim() } };
  } catch (error) {
    if (!committed) await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { recordManualAttendance, transferOpenSession, AttendanceError, parseManilaTime, checkSequence };
