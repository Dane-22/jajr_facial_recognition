const pool = require('../config/db');
const { loadSalary, assertSalaryAccess, auditSalary, canonicalPeriod } = require('../services/salaryRepository');
const { rateCents, centsText, validDate, localDate, SalaryError } = require('../services/salaryCalculation');
const fail = (res, error) => {
  if (!error.status) console.error('[Salary]', error);
  return res.status(error.status || 500).json({ error: error.status ? error.message : 'Salary operation failed. Please retry.' });
};
async function access(req, res, next) {
  try { await pool.ready; req.salaryPosition = await assertSalaryAccess(pool, req.user.id); res.set('Cache-Control', 'no-store'); next(); }
  catch (error) { fail(res, error); }
}
async function readTransaction(work) {
  const db = await pool.getConnection();
  try { await db.beginTransaction(); const result = await work(db); await db.commit(); return result; }
  catch (error) { await db.rollback().catch(() => {}); throw error; }
  finally { db.release(); }
}
async function preview(req, res) {
  try { res.json(await readTransaction(db => loadSalary(db, req.body.startDate, req.body.endDate))); }
  catch (error) { fail(res, error); }
}
async function getRates(req, res) {
  try {
    const [employees] = await pool.query('SELECT id, name, role, is_active FROM users ORDER BY name, id');
    const [rates] = await pool.query("SELECT id, user_id, daily_rate, DATE_FORMAT(effective_from, '%Y-%m-%d') AS effective_from FROM employee_salary_rates ORDER BY user_id, effective_from DESC");
    res.json({ employees, rates });
  } catch (error) { fail(res, error); }
}
async function saveRate(req, res) {
  try {
    const { employeeId, dailyRate, effectiveFrom } = req.body;
    const id = Number(employeeId);
    if (!Number.isInteger(id) || id < 1 || !validDate(effectiveFrom)) throw new SalaryError(400, 'Choose an employee and valid effective date.');
    const amount = centsText(rateCents(dailyRate));
    const saved = await readTransaction(async db => {
      await assertSalaryAccess(db, req.user.id, true, true);
      const [users] = await db.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [id]);
      if (!users.length) throw new SalaryError(404, 'Employee not found.');
      const [existing] = await db.query('SELECT id FROM employee_salary_rates WHERE user_id = ? AND effective_from = ?', [id, effectiveFrom]);
      if (existing.length) throw new SalaryError(409, 'A rate already starts on that date. Use a new effective date; existing rate history is immutable.');
      const [runs] = await db.query("SELECT id FROM payroll_runs WHERE status = 'FINALIZED' AND end_date >= ? LIMIT 1", [effectiveFrom]);
      if (runs.length) throw new SalaryError(409, 'This effective date overlaps finalized payroll. Choose a date after finalized periods.');
      const [result] = await db.query('INSERT INTO employee_salary_rates (user_id, daily_rate, effective_from, created_by) VALUES (?, ?, ?, ?)', [id, amount, effectiveFrom, req.user.id]);
      await auditSalary(db, req, 'SALARY_RATE_CREATE', result.insertId, { employeeId: id, dailyRate: amount, effectiveFrom });
      return { id: result.insertId, user_id: id, daily_rate: amount, effective_from: effectiveFrom };
    });
    res.status(201).json(saved);
  } catch (error) { fail(res, error); }
}
async function saveRun(req, res) {
  try {
    const { startDate, endDate, sourceHash } = req.body;
    canonicalPeriod(startDate, endDate);
    const saved = await readTransaction(async db => {
      await assertSalaryAccess(db, req.user.id, true, true);
      const snapshot = await loadSalary(db, startDate, endDate, true);
      if (snapshot.sourceHash !== sourceHash) throw new SalaryError(409, 'Attendance, rates or schedules changed. Recalculate before saving.');
      const [old] = await db.query('SELECT id, status FROM payroll_runs WHERE start_date = ? AND end_date = ? FOR UPDATE', [startDate, endDate]);
      if (old[0]?.status === 'FINALIZED') throw new SalaryError(409, 'This period is finalized and cannot be changed.');
      let id = old[0]?.id;
      if (id) await db.query('UPDATE payroll_runs SET snapshot = ?, source_hash = ? WHERE id = ?', [JSON.stringify(snapshot), sourceHash, id]);
      else {
        const [insert] = await db.query('INSERT INTO payroll_runs (start_date, end_date, source_hash, snapshot, created_by) VALUES (?, ?, ?, ?, ?)', [startDate, endDate, sourceHash, JSON.stringify(snapshot), req.user.id]);
        id = insert.insertId;
      }
      await auditSalary(db, req, 'PAYROLL_DRAFT_SAVE', id, { startDate, endDate, sourceHash });
      return { id, status: 'DRAFT', snapshot };
    });
    res.json(saved);
  } catch (error) { fail(res, error); }
}
async function finalize(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new SalaryError(400, 'Invalid payroll ID.');
    const result = await readTransaction(async db => {
      await assertSalaryAccess(db, req.user.id, true, true);
      // Lock employees before the run, consistently with rate and attendance writes.
      await db.query('SELECT id FROM users ORDER BY id FOR UPDATE');
      const [rows] = await db.query("SELECT *, DATE_FORMAT(start_date, '%Y-%m-%d') AS startDate, DATE_FORMAT(end_date, '%Y-%m-%d') AS endDate FROM payroll_runs WHERE id = ? FOR UPDATE", [id]);
      const row = rows[0];
      if (!row) throw new SalaryError(404, 'Payroll not found.');
      if (row.status === 'FINALIZED') return { id, status: 'FINALIZED' };
      if (row.endDate >= localDate(new Date())) throw new SalaryError(409, 'Finalize after the attendance period has ended in Manila time.');
      const current = await loadSalary(db, row.startDate, row.endDate);
      if (current.sourceHash !== row.source_hash) throw new SalaryError(409, 'Draft is stale. Recalculate and save it again.');
      if (current.summary.needsReview) throw new SalaryError(409, 'Resolve all missing logs, rates and policy exceptions before finalizing. Superadmin attendance correction is required for missing IN/OUT.');
      await db.query("UPDATE payroll_runs SET status = 'FINALIZED', finalized_by = ?, finalized_at = UTC_TIMESTAMP() WHERE id = ?", [req.user.id, id]);
      await auditSalary(db, req, 'PAYROLL_FINALIZE', id, { sourceHash: row.source_hash });
      return { id, status: 'FINALIZED' };
    });
    res.json(result);
  } catch (error) { fail(res, error); }
}
async function history(req, res) {
  try {
    const limit = 20, page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const [runs] = await pool.query(`SELECT id, status, DATE_FORMAT(start_date, '%Y-%m-%d') AS startDate,
      DATE_FORMAT(end_date, '%Y-%m-%d') AS endDate, created_at, finalized_at, created_by, finalized_by
      FROM payroll_runs ORDER BY start_date DESC LIMIT ? OFFSET ?`, [limit, (page - 1) * limit]);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM payroll_runs');
    res.json({ runs, total, page });
  } catch (error) { fail(res, error); }
}
async function getRun(req, res) {
  try {
    const [rows] = await pool.query('SELECT id, status, snapshot, created_by, finalized_by, finalized_at FROM payroll_runs WHERE id = ?', [req.params.id]);
    if (!rows.length) throw new SalaryError(404, 'Payroll not found.');
    res.json({ ...rows[0], snapshot: JSON.parse(rows[0].snapshot) });
  } catch (error) { fail(res, error); }
}
function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
async function exportPayroll(req, res) {
  try {
    let snapshot, state;
    if (req.params.id) {
      const [rows] = await pool.query('SELECT snapshot, status FROM payroll_runs WHERE id = ?', [req.params.id]);
      if (!rows.length) throw new SalaryError(404, 'Payroll not found.');
      snapshot = JSON.parse(rows[0].snapshot); state = rows[0].status;
    } else {
      snapshot = await readTransaction(db => loadSalary(db, req.body.startDate, req.body.endDate)); state = 'PROVISIONAL';
      if (snapshot.sourceHash !== req.body.sourceHash) throw new SalaryError(409, 'Preview changed. Recalculate before exporting.');
    }
    await auditSalary(pool, req, 'PAYROLL_EXPORT', Number(req.params.id) || null, { startDate: snapshot.startDate, endDate: snapshot.endDate, state });
    const rows = [['State', 'Start', 'End', 'Currency', 'Employee ID', 'Name', 'Rate at period end', 'Applied rates by date', 'Payable days', 'Base earnings', 'Late deduction', 'Salary', 'Status', 'Exceptions']];
    for (const i of snapshot.items) rows.push([state, snapshot.startDate, snapshot.endDate, 'PHP', i.employeeId, i.name, i.rate,
      i.details.map(d => `${d.date}: ${d.rate || 'not configured'}`).join('; '), i.payableDays.toFixed(6), i.base, i.deduction, i.salary, i.status, i.exceptions.join('; ')]);
    rows.push([state, snapshot.startDate, snapshot.endDate, 'PHP', '', 'TOTAL', '', '', snapshot.summary.payableDays.toFixed(6), snapshot.summary.base, snapshot.summary.deduction, snapshot.summary.salary, '', '']);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="salary-${snapshot.startDate}-${state.toLowerCase()}.csv"`);
    res.send('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'));
  } catch (error) { fail(res, error); }
}
async function timing(req, res) {
  try {
    const snapshot = await readTransaction(db => loadSalary(db, req.query.startDate, req.query.endDate));
    const days = new Map(), employees = [];
    for (const item of snapshot.items) {
      const entry = { employeeId: item.employeeId, name: item.name, earlyMinutes: 0, afterMinutes: 0 };
      for (const d of item.details) {
        // Do not infer duration from invalid attendance sequences.
        if (d.exceptions.some(e => /Missing IN|Missing OUT|Repeated IN|shift|ambiguous/.test(e))) continue;
        const date = days.get(d.date) || { date: d.date, earlyMinutes: 0, afterMinutes: 0 };
        date.earlyMinutes += d.earlyMinutes; date.afterMinutes += d.afterMinutes;
        entry.earlyMinutes += d.earlyMinutes; entry.afterMinutes += d.afterMinutes;
        days.set(d.date, date);
      }
      employees.push(entry);
    }
    res.json({ days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)), employees,
      excludedRecords: snapshot.items.flatMap(i => i.details.filter(d => d.exceptions.some(e => /Missing IN|Missing OUT|Repeated IN|shift|ambiguous/.test(e)))).length });
  } catch (error) { fail(res, error); }
}
module.exports = { access, preview, getRates, saveRate, saveRun, finalize, history, getRun, exportPayroll, timing, csvCell };
