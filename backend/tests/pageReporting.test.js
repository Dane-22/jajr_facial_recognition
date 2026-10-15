const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../config/db');
const audit = require('../controllers/auditController');
const reports = require('../controllers/reportController');
const dashboard = require('../controllers/dashboardController');
const { getAllEmployees } = require('../controllers/employeeController');
const { dateRangeError } = require('../utils/reportDates');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('report and audit endpoints reject invalid dates/ranges and pagination before querying', async () => {
  for (const [handler, query] of [
    [reports.getDailyReport, { date: '2026-02-30' }],
    [reports.getWeeklyReport, { startDate: '2026-10-15', endDate: '2026-10-14' }],
    [audit.getAuditLogs, { page: '-1' }], [audit.getAuditLogs, { limit: '501' }],
    [audit.getAuditStats, { startDate: 'garbage' }],
    [dashboard.getCalendarActivity, { year: '2026', month: '13' }]
  ]) {
    const res = response(); await handler({ query }, res); assert.equal(res.code, 400, JSON.stringify(query));
  }
  assert.equal(dateRangeError('2028-02-29', '2028-02-29'), null);
});

test('audit table and cards share filters and inclusive Philippine date boundaries', async () => {
  const original = pool.query, statements = [];
  pool.query = async (sql, params) => {
    statements.push({ sql, params });
    return [sql.includes('COUNT(*) as total') ? [{ total: 2 }] : []];
  };
  try {
    const query = { action: 'LOGIN', userType: 'admin', entityType: 'admin', startDate: '2026-10-15', endDate: '2026-10-15', page: '2', limit: '1' };
    const table = response(), stats = response();
    await audit.getAuditLogs({ query }, table); await audit.getAuditStats({ query }, stats);
    assert.equal(table.body.pagination.total, stats.body.total);
    for (const statement of statements) {
      assert.match(statement.sql, /audit_logs.action = \?/);
      assert.match(statement.sql, /DATE_SUB\(\?, INTERVAL 8 HOUR\)/);
      assert.deepEqual(statement.params.slice(0, 5), ['LOGIN', 'admin', 'admin', '2026-10-15', '2026-10-15']);
    }
    assert.match(statements.find(item => item.sql.includes('GROUP BY action')).sql, /ORDER BY count DESC/);
  } finally { pool.query = original; }
});

test('employee end-date includes the whole Philippine day and directory is not capped', async () => {
  const original = pool.query, statements = [];
  pool.query = async (sql, params) => { statements.push({ sql, params }); return [sql.includes('COUNT(*)') ? [{ total: 1005 }] : Array.from({ length: 1005 }, (_, id) => ({ id }))]; };
  try {
    const res = response();
    await getAllEmployees({ query: { startDate: '2026-10-15', endDate: '2026-10-15', status: 'all' } }, res);
    assert.equal(res.body.employees.length, res.body.total);
    assert.match(statements[0].sql, /created_at < DATE_ADD\(DATE_SUB\(\?, INTERVAL 8 HOUR\), INTERVAL 1 DAY\)/);
    assert.doesNotMatch(statements[0].sql, /LIMIT 1000/);
  } finally { pool.query = original; }
});

test('dashboard activity calendar groups dates in Philippine time', async () => {
  const original = pool.query; let statement;
  pool.query = async sql => { statement = sql; return [[{ active_date: '2026-10-15' }]]; };
  try {
    const res = response(); await dashboard.getCalendarActivity({ query: { year: '2026', month: '10' } }, res);
    assert.deepEqual(res.body.activeDates, ['2026-10-15']);
    assert.match(statement, /DATE_FORMAT\(DATE_ADD\(timestamp, INTERVAL 8 HOUR\)/);
    assert.match(statement, /MONTH\(DATE_ADD\(timestamp, INTERVAL 8 HOUR\)/);
  } finally { pool.query = original; }
});
