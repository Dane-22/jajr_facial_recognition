const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

const dateRangeError = (start, end) => {
  if ((start && !validDate(start)) || (end && !validDate(end))) return 'Use valid dates in YYYY-MM-DD format.';
  if (start && end && start > end) return 'End date must be on or after start date.';
  return null;
};

// Database timestamps are UTC; date inputs represent inclusive Philippine days.
const manilaBounds = (column, start, end, params) => {
  let sql = '';
  if (start) { sql += ` AND ${column} >= DATE_SUB(?, INTERVAL 8 HOUR)`; params.push(start); }
  if (end) { sql += ` AND ${column} < DATE_ADD(DATE_SUB(?, INTERVAL 8 HOUR), INTERVAL 1 DAY)`; params.push(end); }
  return sql;
};

module.exports = { validDate, dateRangeError, manilaBounds };
