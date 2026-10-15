const test = require('node:test');
const assert = require('node:assert/strict');
const { mutateAdmin } = require('../services/adminAccounts');

function fixture(admins, failAudit = false) {
  const connection = {
    writes: [], committed: false, rolledBack: false, released: false,
    async beginTransaction() {}, async commit() { this.committed = true; },
    async rollback() { this.rolledBack = true; }, release() { this.released = true; },
    async query(sql, params) {
      if (sql.startsWith('SELECT')) return [admins];
      this.writes.push({ sql, params });
      if (failAudit && sql.includes('audit_logs')) throw new Error('audit unavailable');
      return [{ affectedRows: 1 }];
    }
  };
  return { connection, async getConnection() { return connection; } };
}
const root = { id: 1, username: 'owner', position: 'Superadmin' };
const admin = { id: 2, username: 'reviewer', position: 'Admin' };
const edit = { username: 'owner', position: 'Admin' };

test('last Superadmin cannot demote themselves, and rejection has no writes', async () => {
  const db = fixture([root, admin]);
  await assert.rejects(mutateAdmin({ db, actorId: 1, targetId: 1, changes: edit }), /last remaining Superadmin/);
  assert.equal(db.connection.rolledBack, true);
  assert.equal(db.connection.writes.length, 0);
});

test('revoked role, missing target and self deletion are rejected', async () => {
  await assert.rejects(mutateAdmin({ db: fixture([root, admin]), actorId: 2, targetId: 1, changes: edit }), error => error.status === 403);
  await assert.rejects(mutateAdmin({ db: fixture([root]), actorId: 1, targetId: 8 }), error => error.status === 404);
  await assert.rejects(mutateAdmin({ db: fixture([root]), actorId: 1, targetId: 1 }), /own active/);
});

test('invalid position and duplicate username cannot be saved', async () => {
  await assert.rejects(mutateAdmin({ db: fixture([root, admin]), actorId: 1, targetId: 2, changes: { username: 'reviewer', position: 'Owner' } }), error => error.status === 400);
  await assert.rejects(mutateAdmin({ db: fixture([root, admin]), actorId: 1, targetId: 2, changes: { username: 'OWNER', position: 'Admin' } }), error => error.status === 409);
});

test('account mutation and audit commit together, and audit failure rolls back', async () => {
  const db = fixture([root, admin]);
  await mutateAdmin({ db, actorId: 1, targetId: 2, changes: { username: ' Updated ', position: 'Admin' } });
  assert.equal(db.connection.committed, true);
  assert.equal(db.connection.released, true);
  assert.equal(db.connection.writes[0].params[0], 'Updated');
  assert.match(db.connection.writes[1].sql, /audit_logs/);
  const failure = fixture([root, admin], true);
  await assert.rejects(mutateAdmin({ db: failure, actorId: 1, targetId: 2 }), /audit unavailable/);
  assert.equal(failure.connection.rolledBack, true);
  assert.equal(failure.connection.committed, false);
});
