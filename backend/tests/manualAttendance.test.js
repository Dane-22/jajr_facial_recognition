const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../config/db');
const { recordManualAttendance, parseManilaTime } = require('../services/manualAttendance');

const manila = minutesAgo => new Date(Date.now() - minutesAgo * 60000 + 8 * 3600000)
  .toISOString().slice(0, 19) + '+08:00';
const sqlUtc = value => new Date(value).toISOString().slice(0, 19).replace('T', ' ');

function fakeConnection(existing, session, position = 'Superadmin') {
  const statements = [];
  let nextId = 100;
  const connection = {
    statements,
    committed: false,
    rolledBack: false,
    released: false,
    async beginTransaction() {},
    async commit() { this.committed = true; },
    async rollback() { this.rolledBack = true; },
    release() { this.released = true; },
    async query(sql, params = []) {
      statements.push({ sql, params });
      if (sql.includes('FROM admins WHERE')) return [[{ position, username: 'root' }]];
      if (sql.includes('FROM users WHERE')) return [[{ id: 7, name: 'Alex', role: 'Staff' }]];
      if (sql.includes('FROM employee_site_sessions WHERE')) return [session ? [session] : []];
      if (sql.includes('FROM attendance_logs WHERE')) return [existing];
      if (sql.includes('FROM employee_sites es')) return [[{ id: 2, name: 'Yard' }]];
      if (sql.startsWith('INSERT INTO attendance_logs')) return [{ insertId: nextId++ }];
      return [[]];
    }
  };
  return connection;
}

test('historical pair inserts two distinct logs without changing a later open session', async () => {
  const original = pool.getConnection;
  const laterIn = manila(30);
  const connection = fakeConnection([{ id: 50, status: 'IN', at_utc: sqlUtc(laterIn) }],
    { user_id: 7, site_id: 2, in_log_id: 50 });
  pool.getConnection = async () => connection;
  try {
    const result = await recordManualAttendance({ adminId: 1, userId: 7, mode: 'PAIR',
      at: manila(180), outAt: manila(120), siteId: 2, reason: 'Verified missed shift' });
    assert.deepEqual(result.logs.map(log => [log.id, log.status]), [[100, 'IN'], [101, 'OUT']]);
    assert.equal(connection.committed, true);
    assert.equal(connection.released, true);
    assert.equal(connection.statements.filter(statement => statement.sql.startsWith('INSERT INTO audit_logs')).length, 2);
    assert.equal(connection.statements.some(statement => /(?:INSERT INTO|DELETE FROM) employee_site_sessions/.test(statement.sql)), false);
  } finally { pool.getConnection = original; }
});

test('single historical time-in is rejected when later attendance exists', async () => {
  const original = pool.getConnection;
  const connection = fakeConnection([{ id: 50, status: 'IN', at_utc: sqlUtc(manila(30)) }]);
  pool.getConnection = async () => connection;
  try {
    await assert.rejects(recordManualAttendance({ adminId: 1, userId: 7, mode: 'IN',
      at: manila(180), siteId: 2, reason: 'Verified missed time-in' }),
    error => error.status === 409 && /paired correction/.test(error.message));
    assert.equal(connection.rolledBack, true);
    assert.equal(connection.statements.some(statement => statement.sql.startsWith('INSERT INTO attendance_logs')), false);
  } finally { pool.getConnection = original; }
});

test('live admin role is checked before any attendance write', async () => {
  const original = pool.getConnection;
  const connection = fakeConnection([], null, 'Admin');
  pool.getConnection = async () => connection;
  try {
    await assert.rejects(recordManualAttendance({ adminId: 2, userId: 7, mode: 'IN',
      at: manila(10), siteId: 2, reason: 'Verified missed time-in' }),
    error => error.status === 403);
    assert.equal(connection.rolledBack, true);
    assert.equal(connection.statements.some(statement => statement.sql.startsWith('INSERT INTO attendance_logs')), false);
  } finally { pool.getConnection = original; }
});

test('rejects invalid Manila dates, future times, and entries beyond 30 days', () => {
  assert.throws(() => parseManilaTime('2026-02-30T08:00:00+08:00'), /valid Asia\/Manila/);
  assert.throws(() => parseManilaTime(manila(-10)), /Future/);
  assert.throws(() => parseManilaTime(manila(31 * 24 * 60)), /30 days/);
});
