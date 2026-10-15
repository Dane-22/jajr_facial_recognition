import { expect, test } from 'vitest';
import { auditCalendarDays, auditQuickRange } from './auditCalendar';

test('shortcuts use the Philippine date before UTC midnight', () => {
  const now = new Date('2026-10-14T17:00:00Z'); // Oct 15, 1 AM PHT
  expect(auditQuickRange('TODAY', now).start).toBe('2026-10-15');
  expect(auditQuickRange('YESTERDAY', now).start).toBe('2026-10-14');
  expect(auditQuickRange('THIS_WEEK', now)).toMatchObject({ start: '2026-10-12', end: '2026-10-15' });
});

test('Monday and Sunday week shortcuts stay within the correct Philippine week', () => {
  expect(auditQuickRange('THIS_WEEK', new Date('2026-10-11T17:00:00Z')))
    .toMatchObject({ start: '2026-10-12', end: '2026-10-12' });
  expect(auditQuickRange('THIS_WEEK', new Date('2026-10-10T17:00:00Z')))
    .toMatchObject({ start: '2026-10-05', end: '2026-10-11' });
  expect(auditQuickRange('YESTERDAY', new Date('2026-12-31T17:00:00Z')).start).toBe('2026-12-31');
});

test('adjacent-month calendar buttons match their visible day numbers', () => {
  const october = auditCalendarDays(2026, 9);
  expect(october[0]).toEqual({ dayNum: 27, dateStr: '2026-09-27', isCurrentMonth: false });
  expect(october[3]).toEqual({ dayNum: 30, dateStr: '2026-09-30', isCurrentMonth: false });
  const november = auditCalendarDays(2026, 10);
  expect(november.at(-1)).toEqual({ dayNum: 5, dateStr: '2026-12-05', isCurrentMonth: false });
  const leap = auditCalendarDays(2028, 1);
  expect(leap.filter(day => day.isCurrentMonth)).toHaveLength(29);
});
