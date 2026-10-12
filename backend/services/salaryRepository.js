const crypto = require('crypto');
const { calculateSalary, period, SalaryError } = require('./salaryCalculation');
const sqlDate = value => new Date(value).toISOString().slice(0, 19).replace('T', ' ');
async function loadSalary(db, startDate, endDate, lock = false) {
  const bounds = period(startDate, endDate);
  const [allEmployees] = await db.query(`SELECT id, name, role, is_active FROM users ORDER BY id${lock ? ' FOR UPDATE' : ''}`);
  const [logs] = await db.query(`SELECT l.id, l.user_id, l.status, l.timestamp, l.site_id, s.name AS site_name,
    CASE WHEN m.attendance_log_id IS NULL THEN 'scanner' ELSE 'manual' END AS source,
    m.reason, m.admin_username AS created_by
    FROM attendance_logs l LEFT JOIN sites s ON s.id = l.site_id
    LEFT JOIN manual_attendance_details m ON m.attendance_log_id = l.id
    WHERE (l.timestamp >= ? AND l.timestamp < ?)
      OR l.id IN (SELECT previous_event.id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timestamp DESC, id DESC) AS rn
        FROM attendance_logs WHERE timestamp < ?
      ) previous_event WHERE previous_event.rn = 1)
    ORDER BY l.user_id, l.timestamp, l.id`,
  [sqlDate(bounds.start - 86400000), sqlDate(bounds.end + 86400000), sqlDate(bounds.start - 86400000)]);
  const [rates] = await db.query("SELECT id, user_id, daily_rate, DATE_FORMAT(effective_from, '%Y-%m-%d') AS effective_from FROM employee_salary_rates ORDER BY user_id, effective_from");
  const [schedules] = await db.query("SELECT id, user_id, role, DATE_FORMAT(effective_from, '%Y-%m-%d') AS effective_from FROM employee_salary_schedules ORDER BY user_id, effective_from");
  const [transfers] = await db.query(`SELECT id, user_id, in_log_id, from_site_name, to_site_name,
    effective_at_utc, admin_username, reason FROM employee_site_transfers
    WHERE effective_at_utc >= ? AND effective_at_utc < ? ORDER BY id`, [sqlDate(bounds.start), sqlDate(bounds.end)]);
  const employees = allEmployees.filter(e => e.is_active || logs.some(l => Number(l.user_id) === Number(e.id) && new Date(l.timestamp).getTime() >= bounds.start && new Date(l.timestamp).getTime() < bounds.end));
  const result = calculateSalary({ employees, logs, rates, schedules, startDate, endDate });
  result.transfers = transfers;
  result.sourceHash = crypto.createHash('sha256').update(JSON.stringify({ startDate, endDate,
    policy: result.policy, employees, logs, rates, schedules, transfers })).digest('hex');
  return result;
}
async function assertSalaryAccess(db, adminId, write = false, lock = false) {
  const [rows] = await db.query(`SELECT position FROM admins WHERE id = ?${lock ? ' FOR UPDATE' : ''}`, [adminId]);
  if (!rows.length || !['Admin', 'Superadmin'].includes(rows[0].position) || (write && rows[0].position !== 'Superadmin')) {
    throw new SalaryError(403, write ? 'Superadmin access required.' : 'Salary access requires Admin or Superadmin.');
  }
  return rows[0].position;
}
async function auditSalary(db, req, action, entityId, values) {
  await db.query(`INSERT INTO audit_logs (user_id, user_type, action, entity_type, entity_id, new_values, ip_address, user_agent)
    VALUES (?, 'admin', ?, 'salary', ?, ?, ?, ?)`, [req.user.id, action, entityId,
    JSON.stringify(values), req.ip || null, req.get('user-agent') || null]);
}
function canonicalPeriod(startDate, endDate) {
  period(startDate, endDate);
  const month = startDate.slice(0, 7);
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  if (!((startDate === `${month}-01` && endDate === `${month}-15`) ||
    (startDate === `${month}-16` && endDate === `${month}-${last}`))) throw new SalaryError(400, 'Saved payroll uses 1st–15th or 16th–month end.');
}
module.exports = { loadSalary, assertSalaryAccess, auditSalary, canonicalPeriod };
