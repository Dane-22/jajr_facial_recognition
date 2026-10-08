const test = require('node:test');
const assert = require('node:assert/strict');
const { changeEmployeeStatus } = require('../services/employeeArchive');
const { migrateEmployeeArchive } = require('../utils/employeeArchiveMigration');

function fakeDatabase({ isActive = 1, openShift = false, position = 'Superadmin', failAudit = false } = {}) {
  const statements = [];
  const connection = {
    committed: false, rolledBack: false, released: false,
    async beginTransaction() {},
    async commit() { this.committed = true; },
    async rollback() { this.rolledBack = true; },
    release() { this.released = true; },
    async query(sql, params = []) {
      statements.push({ sql, params });
      if (sql.includes('FROM admins WHERE')) return [[{ position }]];
      if (sql.includes('FROM users WHERE') && sql.includes('FOR UPDATE')) {
        return [[{ id: 7, name: 'Alex', role: 'Staff', is_active: isActive, archived_at: isActive ? null : new Date() }]];
      }
      if (sql.includes('FROM employee_site_sessions')) return [openShift ? [{ user_id: 7 }] : []];
      if (sql.startsWith('UPDATE users')) return [{ affectedRows: 1 }];
      if (sql.includes('FROM users WHERE')) return [[{ id: 7, name: 'Alex', role: 'Staff',
        is_active: isActive ? 0 : 1, archived_at: isActive ? new Date() : null }]];
      if (sql.startsWith('INSERT INTO audit_logs') && failAudit) throw new Error('audit failed');
      return [[]];
    }
  };
  return { statements, connection, async getConnection() { return connection; } };
}

const change = (db, active) => changeEmployeeStatus({ db, employeeId: 7, adminId: 1,
  active, ip: '127.0.0.1', userAgent: 'test' });

test('archive preserves employee and attendance rows and commits its audit event', async () => {
  const db = fakeDatabase();
  const employee = await change(db, false);
  assert.equal(employee.is_active, 0);
  assert.equal(db.connection.committed, true);
  assert.equal(db.connection.released, true);
  assert.equal(db.statements.some(({ sql }) => sql.startsWith('DELETE')), false);
  assert.equal(db.statements.filter(({ sql }) => sql.startsWith('INSERT INTO audit_logs')).length, 1);
  assert.equal(db.statements.find(({ sql }) => sql.startsWith('INSERT INTO audit_logs')).params[1], 'ARCHIVE');
});

test('archive rejects an open shift without changing employee status', async () => {
  const db = fakeDatabase({ openShift: true });
  await assert.rejects(change(db, false), error => error.status === 409 && /open time-in/.test(error.message));
  assert.equal(db.connection.rolledBack, true);
  assert.equal(db.statements.some(({ sql }) => sql.startsWith('UPDATE users')), false);
});

test('restore requires live Superadmin role and audits the change', async () => {
  const denied = fakeDatabase({ isActive: 0, position: 'Admin' });
  await assert.rejects(change(denied, true), error => error.status === 403);
  assert.equal(denied.connection.rolledBack, true);
  const db = fakeDatabase({ isActive: 0 });
  const employee = await change(db, true);
  assert.equal(employee.is_active, 1);
  assert.equal(db.statements.find(({ sql }) => sql.startsWith('INSERT INTO audit_logs')).params[1], 'RESTORE');
});

test('audit failure rolls back the archive', async () => {
  const db = fakeDatabase({ failAudit: true });
  await assert.rejects(change(db, false), /audit failed/);
  assert.equal(db.connection.rolledBack, true);
  assert.equal(db.connection.committed, false);
});

test('archive migration adds missing columns only once', async () => {
  const changes = [];
  const columns = new Set(['id']);
  const db = { async query(sql) {
    if (sql === 'SHOW COLUMNS FROM users') return [[...columns].map(Field => ({ Field }))];
    changes.push(sql);
    columns.add(sql.match(/ADD COLUMN (\w+)/)[1]);
    return [[]];
  } };
  await migrateEmployeeArchive(db);
  await migrateEmployeeArchive(db);
  assert.equal(changes.length, 2);
  assert.ok(changes.some(sql => sql.includes('is_active TINYINT(1) NOT NULL DEFAULT 1')));
  assert.ok(changes.some(sql => sql.includes('archived_at DATETIME NULL')));
});
