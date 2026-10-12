const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../config/db');
const controller = require('../controllers/salaryController');
const { loadSalary } = require('../services/salaryRepository');
function fixture() {
  const db = { position: 'Superadmin', rate: '600.00', missing: false, run: null, writes: [], committed: false, rolledBack: false,
    async beginTransaction() {}, async commit() { this.committed = true; }, async rollback() { this.rolledBack = true; }, release() {},
    async query(sql, params = []) {
      if (sql.includes('FROM admins WHERE')) return [[{ position: this.position }]];
      if (sql.includes('FROM users')) return [[{ id: 1, name: 'Alex', role: 'Engineer', is_active: 1 }]];
      if (sql.includes('FROM attendance_logs l')) return [[{ id: 1, user_id: 1, status: 'IN', timestamp: new Date('2001-01-01T07:20:00+08:00'), source: 'manual' },
        ...(this.missing ? [] : [{ id: 2, user_id: 1, status: 'OUT', timestamp: new Date('2001-01-01T16:00:00+08:00') }])]];
      if (sql.includes('FROM employee_salary_rates')) return [[{ id: 1, user_id: 1, daily_rate: this.rate, effective_from: '2000-01-01' }]];
      if (sql.includes('FROM employee_salary_schedules')) return [[{ id: 1, user_id: 1, role: 'Engineer', effective_from: '2000-01-01' }]];
      if (sql.includes('FROM employee_site_transfers')) return [[]];
      if (sql.includes('FROM payroll_runs')) return [this.run ? [this.run] : []];
      this.writes.push({ sql, params });
      if (sql.startsWith('INSERT INTO payroll_runs')) {
        this.run = { id: 1, status: 'DRAFT', startDate: params[0], endDate: params[1], source_hash: params[2], snapshot: params[3] };
        return [{ insertId: 1 }];
      }
      if (sql.startsWith('UPDATE payroll_runs SET status')) this.run.status = 'FINALIZED';
      return [{ affectedRows: 1 }];
    } };
  return db;
}
const response = () => ({ code: 200, headers: {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, set(k,v) { this.headers[k] = v; return this; }, send(body) { this.body = body; return this; } });
const req = body => ({ user: { id: 1 }, body, params: { id: '1' }, get: () => 'test' });
async function withDb(db, work) {
  const oldConnection = pool.getConnection, oldQuery = pool.query;
  pool.getConnection = async () => db; pool.query = (...args) => db.query(...args);
  try { await work(); } finally { pool.getConnection = oldConnection; pool.query = oldQuery; }
}
test('payroll draft rejects changed source, saves evidence, and finalizes atomically', async () => {
  const db = fixture();
  await withDb(db, async () => {
    const preview = await loadSalary(db, '2001-01-01', '2001-01-15');
    const stale = response();
    await controller.saveRun(req({ startDate: preview.startDate, endDate: preview.endDate, sourceHash: 'stale' }), stale);
    assert.equal(stale.code, 409); assert.equal(db.run, null); assert.equal(db.rolledBack, true);
    const saved = response();
    await controller.saveRun(req({ startDate: preview.startDate, endDate: preview.endDate, sourceHash: preview.sourceHash }), saved);
    assert.equal(saved.code, 200); assert.equal(saved.body.snapshot.items[0].salary, '580.00');
    const final = response(); await controller.finalize(req({}), final);
    assert.equal(final.code, 200); assert.equal(db.run.status, 'FINALIZED');
    assert.ok(db.writes.some(w => w.sql.includes('audit_logs') && w.params.includes('PAYROLL_FINALIZE')));
    const repeat = response(); await controller.finalize(req({}), repeat); assert.equal(repeat.code, 200);
    const overwrite = response(); await controller.saveRun(req({ startDate: preview.startDate, endDate: preview.endDate, sourceHash: preview.sourceHash }), overwrite);
    assert.equal(overwrite.code, 409);
  });
});
test('Admin cannot save/finalize and stale/missing attendance blocks finalization', async () => {
  const db = fixture();
  await withDb(db, async () => {
    const preview = await loadSalary(db, '2001-01-01', '2001-01-15');
    const body = { startDate: preview.startDate, endDate: preview.endDate, sourceHash: preview.sourceHash };
    db.position = 'Admin'; const denied = response(); await controller.saveRun(req(body), denied); assert.equal(denied.code, 403);
    db.position = 'Superadmin'; await controller.saveRun(req(body), response());
    db.rate = '700.00'; const stale = response(); await controller.finalize(req({}), stale); assert.equal(stale.code, 409); assert.equal(db.run.status, 'DRAFT');
    db.missing = true;
    const missing = await loadSalary(db, '2001-01-01', '2001-01-15');
    db.run.source_hash = missing.sourceHash;
    const blocked = response(); await controller.finalize(req({}), blocked);
    assert.equal(blocked.code, 409); assert.match(blocked.body.error, /missing logs/); assert.equal(db.run.status, 'DRAFT');
  });
});
test('finalized export uses original snapshot after rates change and escapes names', async () => {
  const db = fixture();
  await withDb(db, async () => {
    const preview = await loadSalary(db, '2001-01-01', '2001-01-15');
    preview.items[0].name = '=malicious()';
    db.run = { status: 'FINALIZED', snapshot: JSON.stringify(preview) }; db.rate = '900.00';
    const exported = response(); await controller.exportPayroll(req({}), exported);
    assert.equal(exported.code, 200); assert.match(exported.body, /580.00/); assert.match(exported.body, /'=malicious/);
    assert.equal(controller.csvCell('a"b'), '"a""b"');
  });
});
test('salary migration is additive, repeatable, and never overwrites schedules/rates', async () => {
  const { migrateSalary } = require('../utils/salaryMigration');
  const statements = []; const db = { query: async sql => { statements.push(sql); return [[]]; } };
  await migrateSalary(db); await migrateSalary(db);
  assert.ok(statements.some(sql => sql.includes('WHERE NOT EXISTS')));
  assert.ok(!statements.some(sql => /DROP TABLE|DELETE FROM|UPDATE employee_salary_rates/.test(sql)));
});
