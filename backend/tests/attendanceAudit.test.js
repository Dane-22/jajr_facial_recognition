const test = require('node:test');
const assert = require('node:assert/strict');

let statement;
const records = Array.from({ length: 1005 }, (_, id) => ({ id, timestamp: '2026-10-15T00:00:00Z' }));
const dbPath = require.resolve('../config/db');
const originalDb = require.cache[dbPath];
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  async query(sql) {
    statement = sql;
    return [/LIMIT\s+1000/i.test(sql) ? records.slice(0, 1000) : records];
  }
} };
const { getAllLogs, getDailyLogs } = require('../controllers/attendanceController');
if (originalDb) require.cache[dbPath] = originalDb; else delete require.cache[dbPath];

test('audit history includes records beyond 1000 and orders identical timestamps consistently', async () => {
  const response = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
  await getAllLogs({}, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.logs.length, 1005);
  assert.match(statement, /ORDER BY attendance_logs.timestamp DESC, attendance_logs.id DESC/);
  assert.match(statement, /LEFT JOIN manual_attendance_details/);
  assert.doesNotMatch(statement, /users.is_active\s*=\s*1/);
  assert.match(statement, /manual_attendance_details details ON details.attendance_log_id/);
  assert.doesNotMatch(statement, /manual_attendance_details manual\b/);
});

test('daily logs use safe SQL aliases and qualified columns for every supported sort', async () => {
  for (const [sortBy, column] of Object.entries({ timestamp: 'attendance_logs.timestamp', name: 'users.name', status: 'attendance_logs.status', id: 'attendance_logs.id', unknown: 'attendance_logs.timestamp' })) {
    const response = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
    await getDailyLogs({ query: { date: '2026-10-15', sortBy, sortOrder: 'asc' } }, response);
    assert.equal(response.statusCode, 200);
    assert.ok(statement.endsWith(`ORDER BY ${column} ASC, attendance_logs.id ASC`));
    assert.match(statement, /manual_attendance_details details ON details.attendance_log_id/);
    assert.doesNotMatch(statement, /manual_attendance_details manual\b/);
  }
});
