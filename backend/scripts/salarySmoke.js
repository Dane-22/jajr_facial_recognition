// Local MySQL integration check. Every fixture write is rolled back.
require('dotenv').config();
if (!['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST)) {
  console.error('Salary smoke checks require a loopback database host. Nothing changed.'); process.exit(1);
}
const assert = require('node:assert/strict');
const pool = require('../config/db');
const { loadSalary } = require('../services/salaryRepository');
(async () => {
  let db;
  try {
    await pool.ready; db = await pool.getConnection(); await db.beginTransaction();
    const ids = [];
    for (const role of ['Engineer', 'Staff']) {
      const [insert] = await db.query('INSERT INTO users (name, role, face_descriptor) VALUES (?, ?, ?)', ['Salary integration fixture', role, 'test-only']);
      ids.push(insert.insertId);
      await db.query('INSERT INTO employee_salary_schedules (user_id, role, effective_from) VALUES (?, ?, ?)', [insert.insertId, role, '2001-01-01']);
      await db.query('INSERT INTO employee_salary_rates (user_id, daily_rate, effective_from) VALUES (?, ?, ?)', [insert.insertId, '600.00', '2001-01-01']);
    }
    const rows = [[ids[0], 'IN', '2001-01-01 23:20:00'], [ids[0], 'OUT', '2001-01-02 08:00:00'],
      [ids[0], 'IN', '2001-01-02 23:20:00'], [ids[0], 'OUT', '2001-01-03 04:00:00'],
      [ids[1], 'IN', '2001-01-01 00:15:00'], [ids[1], 'OUT', '2001-01-01 09:00:00']];
    // 1,002 additional events verify that the payroll query is not capped at 1,000.
    for (let index = 0; index < 501; index++) {
      const start = new Date(Date.parse('2001-01-04T23:00:00Z') + index * 2000);
      rows.push([ids[0], 'IN', start.toISOString().slice(0, 19).replace('T', ' ')],
        [ids[0], 'OUT', new Date(start.getTime() + 1000).toISOString().slice(0, 19).replace('T', ' ')]);
    }
    await db.query('INSERT INTO attendance_logs (user_id, status, timestamp) VALUES ?', [rows]);
    const result = await loadSalary(db, '2001-01-01', '2001-01-15');
    const engineer = result.items.find(i => i.employeeId === ids[0]);
    const staff = result.items.find(i => i.employeeId === ids[1]);
    assert.equal(engineer.details.find(d => d.date === '2001-01-02').salary, '580.00');
    assert.equal(engineer.details.find(d => d.date === '2001-01-03').salary, '280.00');
    assert.equal(engineer.details.find(d => d.date === '2001-01-05').logs.length, 1002);
    assert.equal(staff.salary, '600.00');
    assert.ok(engineer.exceptions.some(e => e.includes('Split attendance')));
    assert.match(result.sourceHash, /^[a-f0-9]{64}$/);
    console.log('Local MySQL salary checks passed: schedules, rates, PHP 580/PHP 280, duplicate names by ID, and 1,002-event completeness.');
  } catch (error) { console.error(error.code || error.message); process.exitCode = 1; }
  finally { if (db) { await db.rollback(); db.release(); } await pool.end(); }
})();
