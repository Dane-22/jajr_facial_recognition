const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../config/db');
const { recordManualAttendance, transferOpenSession, parseManilaTime } = require('../services/manualAttendance');

const manila = minutesAgo => new Date(Date.now() - minutesAgo * 60000 + 8 * 3600000)
  .toISOString().slice(0, 19) + '+08:00';
const sqlUtc = value => new Date(value).toISOString().slice(0, 19).replace('T', ' ');

function fakeConnection(existing, session, position = 'Superadmin', lastTransfer = null) {
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
      if (sql.includes('FROM employee_site_transfers WHERE')) return [lastTransfer ? [lastTransfer] : []];
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

test('manual time-out cannot be dated before the latest site transfer', async () => {
  const original = pool.getConnection;
  const inAt = manila(90);
  const transferAt = manila(5);
  const connection = fakeConnection([{ id: 50, status: 'IN', at_utc: sqlUtc(inAt) }],
    { user_id: 7, site_id: 2, in_log_id: 50 }, 'Superadmin',
    { at_utc: sqlUtc(transferAt) });
  pool.getConnection = async () => connection;
  try {
    await assert.rejects(recordManualAttendance({ adminId: 1, userId: 7, mode: 'OUT',
      at: manila(10), reason: 'Verified missed time-out' }),
    error => error.status === 409 && /latest site transfer/.test(error.message));
    assert.equal(connection.rolledBack, true);
    assert.equal(connection.statements.some(statement => statement.sql.startsWith('INSERT INTO attendance_logs')), false);
  } finally { pool.getConnection = original; }
});

test('manual time-out cannot use the same second as a site transfer', async () => {
  const original = pool.getConnection;
  const transferAt = manila(5);
  const connection = fakeConnection([{ id: 50, status: 'IN', at_utc: sqlUtc(manila(90)) }],
    { user_id: 7, site_id: 2, in_log_id: 50 }, 'Superadmin',
    { at_utc: sqlUtc(transferAt) });
  pool.getConnection = async () => connection;
  try {
    await assert.rejects(recordManualAttendance({ adminId: 1, userId: 7, mode: 'OUT',
      at: transferAt, reason: 'Verified missed time-out' }),
    error => error.status === 409 && /latest site transfer/.test(error.message));
    assert.equal(connection.rolledBack, true);
  } finally { pool.getConnection = original; }
});

function fakeTransferConnection({ session = { site_id: 1, in_log_id: 50,
  from_site_name: 'Main Office', started_at_utc: '2026-10-07 03:00:00' },
position = 'Superadmin', destination = { id: 2, name: 'Yard' }, latest = { id: 50, status: 'IN' },
failAudit = false } = {}) {
  const statements = [];
  return {
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
      if (sql.includes('FROM employee_site_sessions ss')) return [session ? [session] : []];
      if (sql.includes('FROM attendance_logs') && sql.includes('LIMIT 1')) return [[latest]];
      if (sql.includes('FROM employee_sites es')) return [destination ? [destination] : []];
      if (sql.includes('UTC_TIMESTAMP(6)')) return [[{ now_utc: '2026-10-07 04:00:00.123456' }]];
      if (sql.startsWith('UPDATE employee_site_sessions')) return [{ affectedRows: 1 }];
      if (sql.startsWith('INSERT INTO employee_site_transfers')) return [{ insertId: 91 }];
      if (sql.startsWith('INSERT INTO audit_logs') && failAudit) throw new Error('audit unavailable');
      return [[]];
    }
  };
}

test('site transfer keeps one open shift and records provenance without attendance logs', async () => {
  const original = pool.getConnection;
  const connection = fakeTransferConnection();
  pool.getConnection = async () => connection;
  try {
    const result = await transferOpenSession({ adminId: 1, userId: 7, fromSiteId: 1, toSiteId: 2,
      reason: 'Assigned to yard duty' });
    assert.equal(result.transfer.from_site_name, 'Main Office');
    assert.equal(result.transfer.to_site_name, 'Yard');
    assert.equal(result.transfer.in_log_id, 50);
    assert.equal(connection.committed, true);
    assert.deepEqual(connection.statements.find(statement => statement.sql.startsWith('UPDATE employee_site_sessions')).params,
      [2, 7, 1]);
    assert.equal(connection.statements.filter(statement => statement.sql.startsWith('INSERT INTO employee_site_transfers')).length, 1);
    assert.equal(connection.statements.filter(statement => statement.sql.startsWith('INSERT INTO audit_logs')).length, 1);
    assert.equal(connection.statements.some(statement => /(?:INSERT INTO attendance_logs|DELETE FROM employee_site_sessions)/.test(statement.sql)), false);
  } finally { pool.getConnection = original; }
});

test('site transfer rejects a missing shift, same site, unassigned site, and stale attendance', async () => {
  const original = pool.getConnection;
  try {
    for (const [options, message] of [
      [{ session: null }, /no open time-in/],
      [{}, /current site changed/],
      [{}, /already at that site/],
      [{ destination: null }, /active site assigned/],
      [{ latest: { id: 51, status: 'OUT' } }, /conflicts with later attendance/]
    ]) {
      const connection = fakeTransferConnection(options);
      pool.getConnection = async () => connection;
      await assert.rejects(transferOpenSession({ adminId: 1, userId: 7,
        fromSiteId: message.source.includes('current site changed') ? 2 : 1,
        toSiteId: message.source.includes('already') ? 1 : 2,
        reason: 'Assigned to yard duty' }), message);
      assert.equal(connection.rolledBack, true);
      assert.equal(connection.statements.some(statement => statement.sql.startsWith('UPDATE employee_site_sessions')), false);
    }
  } finally { pool.getConnection = original; }
});

test('site transfer checks the live role and rolls back if audit writing fails', async () => {
  const original = pool.getConnection;
  try {
    const denied = fakeTransferConnection({ position: 'Admin' });
    pool.getConnection = async () => denied;
    await assert.rejects(transferOpenSession({ adminId: 2, userId: 7, fromSiteId: 1, toSiteId: 2,
      reason: 'Assigned to yard duty' }), error => error.status === 403);
    assert.equal(denied.rolledBack, true);
    const failed = fakeTransferConnection({ failAudit: true });
    pool.getConnection = async () => failed;
    await assert.rejects(transferOpenSession({ adminId: 1, userId: 7, fromSiteId: 1, toSiteId: 2,
      reason: 'Assigned to yard duty' }), /audit unavailable/);
    assert.equal(failed.rolledBack, true);
    assert.equal(failed.committed, false);
  } finally { pool.getConnection = original; }
});
