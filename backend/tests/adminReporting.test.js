const test = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../config/db');
const { getDashboardStats } = require('../controllers/dashboardController');
const { getMonthlyReport } = require('../controllers/reportController');

const response = () => ({
  code: 200,
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; }
});

test('dashboard fills inactive dates and counts latest employee states', async () => {
  const originalQuery = pool.query;
  const results = [
    [{ today: '2026-10-01' }],
    [{ date: '2026-09-29', check_ins: 2, check_outs: 1, unique_employees: 2 },
      { date: '2026-10-01', check_ins: 2, check_outs: 1, unique_employees: 1 }],
    [],
    [{ checked_in: '1', checked_out: '0' }],
    [{ count: 9 }],
    [],
    [{ today_check_ins: 2, today_check_outs: 1, today_total: 3 }]
  ];
  pool.query = async () => [results.shift()];
  try {
    const res = response();
    await getDashboardStats({ query: { days: '7' } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.trends.length, 7);
    assert.deepEqual(res.body.trends.find(row => row.date === '2026-09-30'), {
      date: '2026-09-30', check_ins: 0, check_outs: 0, unique_employees: 0
    });
    assert.deepEqual(res.body.breakdown, {
      checked_in: 1, checked_out: 0, not_checked_in: 8, total_employees: 9
    });
    assert.equal(res.body.summary.today_total, 3);
  } finally {
    pool.query = originalQuery;
  }
});

test('monthly report uses the actual February boundary in a leap year', async () => {
  const originalQuery = pool.query;
  let queryParams;
  pool.query = async (_sql, params) => {
    queryParams = params;
    return [[]];
  };
  try {
    const res = response();
    await getMonthlyReport({ query: { year: '2028', month: '2' } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(queryParams, ['2028-02-01', '2028-03-01']);
    assert.equal(res.body.endDate, '2028-02-29');
  } finally {
    pool.query = originalQuery;
  }
});
