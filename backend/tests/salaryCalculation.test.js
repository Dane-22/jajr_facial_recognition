const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSalary, period, rateCents, centsText } = require('../services/salaryCalculation');
const { assertSalaryAccess, canonicalPeriod } = require('../services/salaryRepository');
function calculate(role, intervals, rate = '600.00', extra = {}) {
  let id = 0;
  const logs = intervals.flatMap(([a, b]) => [{ id: ++id, user_id: 1, status: 'IN', timestamp: `2026-10-01T${a}+08:00`, source: 'manual', reason: 'Correction' },
    ...(b ? [{ id: ++id, user_id: 1, status: 'OUT', timestamp: `2026-10-01T${b}+08:00` }] : [])]);
  return calculateSalary({ employees: [{ id: 1, name: 'Alex', role, is_active: 1 }], logs,
    rates: rate ? [{ id: 1, user_id: 1, daily_rate: rate, effective_from: '2026-01-01' }] : [],
    schedules: [{ user_id: 1, role, effective_from: '2026-01-01' }],
    startDate: '2026-10-01', endDate: '2026-10-15', ...extra }).items[0];
}
test('both schedules exclude lunch and earn one full day', () => {
  for (const [role, start, end] of [[' Engineer ', '07:00:00', '16:00:00'], ['Staff', '08:00:00', '17:00:00']]) {
    const item = calculate(role, [[start, end]]);
    assert.equal(item.salary, '600.00'); assert.equal(item.details[0].workedMinutes, 480);
    assert.equal(item.details[0].lunchMinutes, 60); assert.equal(item.status, 'READY');
  }
});
test('grace credits scheduled start, but does not excuse early departure', () => {
  assert.equal(calculate('Engineer', [['07:15:00', '16:00:00']]).salary, '600.00');
  assert.equal(calculate('Staff', [['08:15:00', '17:00:00']]).salary, '600.00');
  assert.equal(calculate('Engineer', [['07:15:00', '15:00:00']]).salary, '300.00');
});
test('late-to-end retains full base pay and counts all minutes from start', () => {
  for (const [role, start, end] of [['Engineer', '07:20:00', '16:00:00'], ['Staff', '08:20:00', '17:00:00']]) {
    const item = calculate(role, [[start, end]]);
    assert.equal(item.base, '600.00'); assert.equal(item.deduction, '20.00'); assert.equal(item.salary, '580.00');
    assert.equal(item.details[0].workedMinutes, 460); assert.equal(item.details[0].fullLateDay, true);
  }
  assert.equal(calculate('Engineer', [['07:16:00', '16:00:00']]).deduction, '16.00');
});
test('engineer noon checkout earns half day, with additional lateness where applicable', () => {
  assert.equal(calculate('Engineer', [['07:00:00', '12:00:00']]).salary, '300.00');
  assert.equal(calculate('Engineer', [['07:20:00', '12:00:00']]).salary, '280.00');
});
test('below-half-day formula rounds money half-up without floating-point rate multiplication', () => {
  assert.equal(calculate('Engineer', [['07:00:00', '10:00:00']]).salary, '225.00');
  assert.equal(calculate('Engineer', [['07:00:00', '10:30:00']]).salary, '262.50');
  assert.equal(calculate('Engineer', [['07:00:00', '07:00:01']], '1000.00').salary, '0.03');
  assert.equal(calculate('Engineer', [['07:00:00', '11:00:00']]).salary, '300.00');
  assert.equal(calculate('Engineer', [['07:00:00', '15:59:59']]).salary, '300.00');
});
test('lunch subtracts only overlap; early and after-hours time never increases pay', () => {
  const item = calculate('Engineer', [['06:00:00', '18:00:00']]);
  assert.equal(item.salary, '600.00'); assert.equal(item.details[0].earlyMinutes, 60); assert.equal(item.details[0].afterMinutes, 120);
  const partial = calculate('Engineer', [['11:30:00', '12:30:00']]);
  assert.equal(partial.details[0].workedMinutes, 30); assert.equal(partial.details[0].lunchMinutes, 30);
});
test('missing logs/rates, split shifts, fractional lateness, and extreme arrival cannot silently finalize', () => {
  assert.match(calculate('Engineer', [['07:00:00', null]]).exceptions.join(), /Missing OUT/);
  assert.match(calculate('Engineer', [['07:00:00', '16:00:00']], null).exceptions.join(), /rate/);
  assert.match(calculate('Engineer', [['07:00:00', '12:00:00'], ['13:00:00', '16:00:00']]).exceptions.join(), /Split attendance/);
  assert.match(calculate('Engineer', [['07:20:01', '16:00:00']]).exceptions.join(), /Fractional/);
  assert.match(calculate('Engineer', [['13:00:00', '16:00:00']]).exceptions.join(), /Afternoon/);
});
test('effective rate and schedule history are used instead of current role', () => {
  const item = calculate('Staff', [['07:00:00', '16:00:00']], '600.00', {
    rates: [{ id: 1, user_id: 1, daily_rate: '500.00', effective_from: '2026-01-01' }, { id: 2, user_id: 1, daily_rate: '600.00', effective_from: '2026-10-02' }],
    schedules: [{ user_id: 1, role: 'Engineer', effective_from: '2026-01-01' }, { user_id: 1, role: 'Staff', effective_from: '2026-10-02' }]
  });
  assert.equal(item.salary, '500.00'); assert.equal(item.details[0].role, 'Engineer');
});
test('orphan OUT and repeated IN are exceptions; archived employee attendance retains amounts', () => {
  const events = [{ id: 1, user_id: 1, status: 'OUT', timestamp: '2026-10-01T16:00:00+08:00' }];
  assert.match(calculate('Engineer', [], '600.00', { logs: events }).exceptions.join(), /Missing IN/);
  const repeated = [{ id: 1, user_id: 1, status: 'IN', timestamp: '2026-10-01T07:00:00+08:00' }, { id: 2, user_id: 1, status: 'IN', timestamp: '2026-10-01T08:00:00+08:00' }];
  assert.match(calculate('Engineer', [], '600.00', { logs: repeated }).exceptions.join(), /Repeated IN/);
  const archived = calculate('Engineer', [['07:00:00', '16:00:00']], '600.00', { employees: [{ id: 1, name: 'Alex', role: 'Engineer', is_active: 0 }] });
  assert.equal(archived.salary, '600.00'); assert.equal(archived.active, false);
});
test('overnight records crossing the cutoff and earlier open IN require review', () => {
  const logs = [{ id: 1, user_id: 1, status: 'IN', timestamp: '2026-09-30T23:00:00+08:00' }, { id: 2, user_id: 1, status: 'OUT', timestamp: '2026-10-01T07:00:00+08:00' }];
  assert.match(calculate('Engineer', [], '600.00', { logs }).exceptions.join(), /Overnight/);
  assert.match(calculate('Engineer', [], '600.00', { logs: logs.slice(0, 1) }).exceptions.join(), /Missing OUT from earlier/);
});
test('period validation, UTC boundaries, month ends and rate precision', () => {
  assert.equal(new Date(period('2028-02-16', '2028-02-29').end).toISOString(), '2028-02-29T16:00:00.000Z');
  for (const date of ['2026-02-30', '2026-13-01', 'bad']) assert.throws(() => period(date, '2026-10-15'));
  assert.throws(() => period('2026-01-01', '2026-12-31'));
  canonicalPeriod('2028-02-16', '2028-02-29'); assert.throws(() => canonicalPeriod('2028-02-16', '2028-02-28'));
  assert.equal(centsText(rateCents('600.01')), '600.01');
  for (const rate of ['0', '-1', '1.234', '1e3', '', 'NaN']) assert.throws(() => rateCents(rate));
});
test('current database roles allow Admin reads but restrict writes and revoked roles', async () => {
  const db = position => ({ query: async () => [position ? [{ position }] : []] });
  assert.equal(await assertSalaryAccess(db('Admin'), 1), 'Admin');
  await assert.rejects(assertSalaryAccess(db('Admin'), 1, true), /Superadmin/);
  assert.equal(await assertSalaryAccess(db('Superadmin'), 1, true), 'Superadmin');
  await assert.rejects(assertSalaryAccess(db(null), 1), /requires/);
});
