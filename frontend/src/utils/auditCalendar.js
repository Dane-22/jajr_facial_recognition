import { attendanceDate } from './attendanceTime';

// Calendar arithmetic uses civil dates, independent of the browser's timezone.
export const auditToday = (now = new Date()) => new Date(`${attendanceDate(now)}T12:00:00Z`);

export const auditQuickRange = (type, now = new Date()) => {
  const today = auditToday(now);
  const start = new Date(today);
  if (type === 'YESTERDAY') start.setUTCDate(start.getUTCDate() - 1);
  if (type === 'THIS_WEEK') start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return {
    start: start.toISOString().slice(0, 10),
    end: type === 'THIS_WEEK' ? today.toISOString().slice(0, 10) : null,
    viewDate: start
  };
};

export const auditCalendarDays = (year, month) => {
  const offset = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.max(35, Math.ceil((offset + count) / 7) * 7);
  return Array.from({ length: cells }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index - offset + 1));
    return {
      dayNum: date.getUTCDate(),
      dateStr: date.toISOString().slice(0, 10),
      isCurrentMonth: date.getUTCMonth() === month
    };
  });
};
