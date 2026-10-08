const test = require('node:test');
const assert = require('node:assert/strict');

const statements = [];
let assignedSites = [];
let openSession = null;
let connection;
const fakePool = {
  ready: Promise.resolve(),
  async getConnection() {
    connection = {
      rolledBack: false, committed: false, released: false,
      async beginTransaction() {},
      async rollback() { this.rolledBack = true; },
      async commit() { this.committed = true; },
      release() { this.released = true; },
      async query(sql) {
        statements.push(sql);
        if (sql.includes('FROM users WHERE id = ? FOR UPDATE')) return [[{ id: 7, is_active: 1 }]];
        if (sql.includes('FROM attendance_logs') && sql.includes('INTERVAL 60 SECOND')) return [[]];
        if (sql.includes('FROM sites s JOIN employee_sites')) return [assignedSites];
        if (sql.includes('FROM employee_site_sessions ss JOIN sites')) return [openSession ? [openSession] : []];
        throw new Error(`Unexpected query: ${sql}`);
      }
    };
    return connection;
  }
};

const dbPath = require.resolve('../config/db');
const auditPath = require.resolve('../middleware/audit');
const originalDb = require.cache[dbPath];
const originalAudit = require.cache[auditPath];
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakePool };
require.cache[auditPath] = { id: auditPath, filename: auditPath, loaded: true,
  exports: { manualLog: () => { throw new Error('Rejection must not write an audit event'); } } };
const { logAttendance } = require('../controllers/attendanceController');
if (originalDb) require.cache[dbPath] = originalDb; else delete require.cache[dbPath];
if (originalAudit) require.cache[auditPath] = originalAudit; else delete require.cache[auditPath];

const panicsican = { id: 1, site_id: 1, name: 'PANICSICAN', latitude: 16.66, longitude: 120.33, radius_meters: 100 };
const sundara = { id: 2, site_id: 2, name: 'SUNDARA', latitude: 16.66, longitude: 120.38, radius_meters: 100 };

async function rejectScan({ sites, session, status, latitude, longitude }) {
  statements.length = 0;
  assignedSites = sites;
  openSession = session;
  const response = { statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await logAttendance({ body: { userId: 7, status, latitude, longitude } }, response);
  assert.equal(response.statusCode, 403);
  assert.equal(connection.rolledBack, true);
  assert.equal(connection.committed, false);
  assert.equal(connection.released, true);
  assert.equal(statements.some(sql => /^\s*(?:INSERT|UPDATE|DELETE)\b/i.test(sql)), false);
  return response.body;
}

test('missing active assignments return a distinct reason without attendance or session writes', async () => {
  const result = await rejectScan({ sites: [], session: null, status: 'IN',
    latitude: sundara.latitude, longitude: sundara.longitude });
  assert.equal(result.reason, 'no_active_site_assignment');
  assert.match(result.error, /No active site is assigned/);
});

test('open-session boundary rejection keeps legacy reason and identifies the required site', async () => {
  const result = await rejectScan({ sites: [panicsican, sundara], session: panicsican, status: 'OUT',
    latitude: sundara.latitude, longitude: sundara.longitude });
  assert.equal(result.reason, 'outside_site_boundary');
  assert.equal(result.boundaryContext, 'required_time_out_site');
  assert.equal(result.siteName, 'PANICSICAN');
  assert.match(result.error, /Time-out requires reported coordinates inside/);
});

test('inactive open-session assignment rejects without attendance or session writes', async () => {
  const result = await rejectScan({ sites: [sundara], session: panicsican, status: 'OUT',
    latitude: panicsican.latitude, longitude: panicsican.longitude });
  assert.equal(result.reason, 'inactive_open_session_assignment');
  assert.match(result.error, /open time-in at PANICSICAN/);
});

test('new time-in boundary rejection labels the comparison site without a write', async () => {
  const result = await rejectScan({ sites: [panicsican], session: null, status: 'IN',
    latitude: sundara.latitude, longitude: sundara.longitude });
  assert.equal(result.reason, 'outside_site_boundary');
  assert.equal(result.boundaryContext, 'closest_assigned_boundary');
  assert.equal(result.siteName, 'PANICSICAN');
  assert.match(result.error, /Closest assigned boundary: PANICSICAN/);
});
