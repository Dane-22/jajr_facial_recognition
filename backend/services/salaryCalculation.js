const POLICY_VERSION = 'daily-2026-10-v1';
const POLICY = Object.freeze({ version: POLICY_VERSION, currency: 'PHP', fullDaySeconds: 28800,
  halfDaySeconds: 14400, graceSeconds: 900, lateDeductionPhpPerMinute: 1,
  lateOrigin: 'scheduled_start_when_grace_exceeded', lateToScheduledEnd: 'full_daily_base',
  lunch: ['12:00', '13:00'], engineer: ['07:00', '16:00'], other: ['08:00', '17:00'],
  outsideSchedule: 'unpaid', monetaryRounding: 'nearest_cent_half_up',
  fractionalLateMinutes: 'review', splitAndOvernight: 'review', afternoonArrival: 'review' });
const DAY = 86400000;
const OFFSET = 8 * 3600000;
class SalaryError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2100 &&
    Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
function period(startDate, endDate) {
  if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) throw new SalaryError(400, 'Choose valid payroll dates.');
  const start = Date.parse(`${startDate}T00:00:00+08:00`);
  const end = Date.parse(`${endDate}T00:00:00+08:00`) + DAY;
  if (end - start > 32 * DAY) throw new SalaryError(400, 'Choose a period of at most 32 days.');
  return { startDate, endDate, start, end };
}
const localDate = value => new Date(new Date(value).getTime() + OFFSET).toISOString().slice(0, 10);
const centsText = cents => `${cents < 0 ? '-' : ''}${Math.floor(Math.abs(cents) / 100)}.${String(Math.abs(cents) % 100).padStart(2, '0')}`;
function rateCents(value) {
  const text = String(value);
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(text)) throw new SalaryError(400, 'Daily rate must be a positive PHP amount with at most two decimal places.');
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents <= 0 || cents > 999999999999) throw new SalaryError(400, 'Daily rate is out of range.');
  return cents;
}
function roundedRatio(cents, numerator, denominator) {
  const result = (BigInt(cents) * BigInt(numerator) * 2n + BigInt(denominator)) / (2n * BigInt(denominator));
  return Number(result);
}
const overlap = (a, b, c, d) => Math.max(0, Math.min(b, d) - Math.max(a, c));
const effective = (rows, userId, date) => rows.filter(row => Number(row.user_id) === Number(userId) && row.effective_from <= date)
  .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];

function calculateSalary({ employees, logs, rates, schedules = [], startDate, endDate }) {
  const bounds = period(startDate, endDate);
  const items = employees.map(employee => {
    const events = logs.filter(log => Number(log.user_id) === Number(employee.id))
      .map(log => ({ ...log, time: new Date(log.timestamp).getTime() }))
      .sort((a, b) => a.time - b.time || a.id - b.id);
    const days = new Map();
    function day(date) {
      if (!days.has(date)) days.set(date, { date, intervals: [], logs: [], exceptions: [] });
      return days.get(date);
    }
    const flag = (date, message) => {
      if (date >= startDate && date <= endDate) day(date).exceptions.push(message);
    };
    let open = null;
    for (const event of events) {
      const date = localDate(event.timestamp);
      if (date >= startDate && date <= endDate) day(date).logs.push(event);
      if (event.status === 'IN') {
        if (open) { flag(localDate(open.timestamp), 'Repeated IN: Superadmin correction required.'); flag(date, 'Repeated IN: Superadmin correction required.'); }
        open = event;
      } else if (event.status === 'OUT') {
        if (!open) flag(date, 'Missing IN: Superadmin correction required.');
        else {
          const inDate = localDate(open.timestamp);
          if (event.time <= open.time) flag(date, 'Nonpositive or ambiguous shift.');
          else if (inDate !== date) {
            flag(inDate, 'Overnight shift requires payroll review.'); flag(date, 'Overnight shift requires payroll review.');
            if (open.time < bounds.start && event.time > bounds.start) flag(startDate, 'Overnight shift requires payroll review.');
          }
          else if (date >= startDate && date <= endDate) day(date).intervals.push([open.time, event.time]);
          open = null;
        }
      } else flag(date, 'Invalid attendance status.');
    }
    if (open) {
      flag(localDate(open.timestamp), 'Missing OUT: Superadmin correction required.');
      if (open.time < bounds.start) flag(startDate, 'Missing OUT from earlier shift: Superadmin correction required.');
    }
    const details = [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).map(record => {
      const assignment = effective(schedules, employee.id, record.date);
      if (!assignment) record.exceptions.push('Schedule history missing: review employee schedule.');
      const role = assignment?.role || employee.role;
      const engineer = String(role).trim().toLowerCase() === 'engineer';
      const midnight = Date.parse(`${record.date}T00:00:00+08:00`);
      const start = midnight + (engineer ? 7 : 8) * 3600000;
      const end = midnight + (engineer ? 16 : 17) * 3600000;
      const noon = midnight + 12 * 3600000;
      const lunchEnd = noon + 3600000;
      let worked = 0, early = 0, after = 0, lunch = 0;
      for (const [a, b] of record.intervals) {
        worked += overlap(a, b, start, noon) + overlap(a, b, lunchEnd, end);
        early += overlap(a, b, midnight, start);
        after += overlap(a, b, end, midnight + DAY);
        lunch += overlap(a, b, noon, lunchEnd);
      }
      const first = record.intervals[0]?.[0];
      const last = record.intervals.at(-1)?.[1];
      const withinGrace = first != null && first <= start + 15 * 60000;
      const grace = first > start && withinGrace ? first - start : 0;
      const lateMs = first != null && !withinGrace ? Math.max(0, first - start) : 0;
      // Unapproved edge rules cannot silently become payable payroll.
      if (first >= noon) record.exceptions.push('Afternoon arrival: payroll policy review required.');
      const interruptions = record.intervals.length > 1;
      if (interruptions) record.exceptions.push('Split attendance: payroll policy review required.');
      if (lateMs % 60000 !== 0) record.exceptions.push('Fractional late minute: rounding policy review required.');
      const fullLateDay = lateMs > 0 && last >= end && !interruptions && first < noon;
      const seconds = Math.floor((worked + grace) / 1000);
      const credit = fullLateDay || seconds >= 28800 ? 1 : seconds >= 14400 ? 0.5 : seconds / 28800;
      const rate = effective(rates, employee.id, record.date);
      let base = 0;
      if (!rate) record.exceptions.push('Daily rate not configured for this date.');
      else {
        const cents = rateCents(rate.daily_rate);
        base = credit === 1 ? cents : credit === 0.5 ? roundedRatio(cents, 1, 2) : roundedRatio(cents, seconds, 28800);
      }
      const deduction = Math.floor(lateMs / 60000) * 100;
      if (deduction > base && rate) record.exceptions.push('Late deduction exceeds earnings: payroll review required.');
      return { date: record.date, role, scheduleId: assignment?.id || null, schedule: engineer ? '07:00–16:00' : '08:00–17:00',
        workedMinutes: worked / 60000, graceMinutes: grace / 60000, lunchMinutes: lunch / 60000,
        earlyMinutes: early / 60000, afterMinutes: after / 60000, lateMinutes: lateMs / 60000,
        fullLateDay, payableDays: credit, rate: rate?.daily_rate || null, rateId: rate?.id || null,
        base: centsText(base), deduction: centsText(deduction), salary: centsText(base - deduction),
        baseCents: base, deductionCents: deduction, salaryCents: base - deduction,
        exceptions: [...new Set(record.exceptions)], logs: record.logs.map(({ time, ...log }) => log) };
    });
    const exceptions = details.flatMap(d => d.exceptions.map(message => `${d.date}: ${message}`));
    if (!details.length && !effective(rates, employee.id, endDate)) exceptions.push('Daily rate not configured.');
    const sum = key => details.reduce((total, d) => {
      const value = total + d[key];
      if (key.endsWith('Cents') && !Number.isSafeInteger(value)) throw new SalaryError(422, 'Payroll amount exceeds supported precision.');
      return value;
    }, 0);
    return { employeeId: employee.id, name: employee.name, role: employee.role, active: Boolean(employee.is_active),
      rate: effective(rates, employee.id, endDate)?.daily_rate || null, details, exceptions,
      payableDays: sum('payableDays'), base: centsText(sum('baseCents')), deduction: centsText(sum('deductionCents')),
      salary: centsText(sum('salaryCents')), baseCents: sum('baseCents'), deductionCents: sum('deductionCents'), salaryCents: sum('salaryCents'),
      status: exceptions.length ? 'NEEDS_REVIEW' : details.length ? 'READY' : 'NO_ATTENDANCE' };
  });
  const sum = key => items.reduce((total, item) => {
    const value = total + item[key];
    if (key.endsWith('Cents') && !Number.isSafeInteger(value)) throw new SalaryError(422, 'Payroll amount exceeds supported precision.');
    return value;
  }, 0);
  return { startDate: bounds.startDate, endDate: bounds.endDate, currency: 'PHP', policyVersion: POLICY_VERSION, policy: POLICY,
    generatedAt: new Date().toISOString(), items, summary: { employees: items.length,
      needsReview: items.filter(i => i.exceptions.length).length, payableDays: sum('payableDays'),
      base: centsText(sum('baseCents')), deduction: centsText(sum('deductionCents')), salary: centsText(sum('salaryCents')) } };
}
module.exports = { calculateSalary, period, validDate, localDate, rateCents, centsText, SalaryError, POLICY_VERSION };
