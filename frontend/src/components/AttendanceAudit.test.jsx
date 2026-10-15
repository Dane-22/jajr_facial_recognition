import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttendanceAudit from './AttendanceAudit';

const logs = [
  { id: 3, user_id: 7, name: 'Alex', status: 'OUT', timestamp: '2026-10-15T01:00:00Z' },
  { id: 2, user_id: '7', name: 'Alex', status: 'IN', timestamp: '2026-10-14T17:00:00Z', source: 'manual', reason: 'Verified missed scan', created_by: 'admin', created_at: '2026-10-15T00:00:00Z' },
  { id: 1, user_id: 8, name: 'Sam', status: 'IN', timestamp: '2026-10-14T16:30:00Z' },
  { id: 0, user_id: 7, name: 'Alex', status: 'IN', timestamp: '2026-10-14T15:59:00Z' }
];

const mount = async (records = logs) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-15T00:00:00Z'));
  localStorage.setItem('admin_token', 'test-token');
  vi.stubGlobal('fetch', vi.fn(async url => ({ ok: true, json: async () => url.includes('/employees')
    ? { employees: [{ id: 7, name: 'Alex', is_active: 1 }, { id: 8, name: 'Sam', is_active: 0 }] }
    : { logs: records } })));
  render(<AttendanceAudit />);
  await screen.findByRole('option', { name: 'Sam (archived)' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled());
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test('CSV respects date, employee and status together, including string IDs and manual details', async () => {
  await mount();
  fireEvent.click(screen.getByRole('button', { name: '2026-10-15', exact: true }));
  fireEvent.change(screen.getByLabelText('Employee Filter'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Attendance Status'), { target: { value: 'IN' } });
  expect(within(screen.getByTestId('audit-table')).getAllByRole('row')).toHaveLength(2);
  const createUrl = vi.fn(() => 'blob:test');
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createUrl });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  let csv;
  vi.stubGlobal('Blob', class { constructor(parts) { csv = parts.join(''); } });
  fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
  fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
  expect(csv.split('\r\n')).toHaveLength(2);
  expect(csv).toContain('Verified missed scan');
  expect(csv).toContain('01:00 AM PHT');
  expect(csv).not.toContain('Sam');
  expect(csv).not.toContain('"OUT"');
});

test('invalid and empty export ranges show an error without creating a download', async () => {
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
  fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-10-15' } });
  fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-10-14' } });
  fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
  expect(screen.getByRole('alert')).toHaveTextContent('End date must be on or after start date');
  fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-10-20' } });
  fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
  expect(screen.getByRole('alert')).toHaveTextContent('No attendance logs match');
});

test('pagination resets after filtering and an empty result can be cleared', async () => {
  await mount(Array.from({ length: 23 }, (_, i) => ({ ...logs[0], id: i })));
  fireEvent.click(screen.getByRole('button', { name: 'Next', exact: true }));
  expect(within(screen.getByTestId('audit-table')).getAllByRole('row')).toHaveLength(11);
  fireEvent.change(screen.getByLabelText('Rows per page:'), { target: { value: '5' } });
  expect(screen.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Next', exact: true }));
  fireEvent.change(screen.getByLabelText('Attendance Status'), { target: { value: 'IN' } });
  expect(screen.getByText('No attendance logs match the selected filter criteria')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filters', exact: true }));
  expect(screen.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  expect(within(screen.getByTestId('audit-table')).getAllByRole('row')).toHaveLength(6);
});

test('refresh failure clears stale data and allows retry', async () => {
  await mount();
  fetch.mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh records' }));
  await screen.findByText('Network error. Please check your connection.');
  expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh records' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled());
});

test('missing authentication shows a session error instead of loading forever', () => {
  render(<AttendanceAudit />);
  expect(screen.getByText('Your session has expired. Please sign in again.')).toBeInTheDocument();
  expect(screen.queryByText('Loading attendance logs...')).toBeNull();
});

test('calendar selection crosses month boundaries, collapse preserves filters, and reset restores all records', async () => {
  await mount();
  fireEvent.click(screen.getByRole('button', { name: '2026-09-30', exact: true }));
  expect(screen.getByTestId('audit-start-date')).toHaveValue('2026-09-30');
  fireEvent.click(screen.getByRole('button', { name: '2026-10-14', exact: true }));
  expect(screen.getByTestId('audit-end-date')).toHaveValue('2026-10-14');
  expect(within(screen.getByTestId('audit-table')).getAllByRole('row')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: /Collapse Calendar/ }));
  expect(within(screen.getByTestId('audit-table')).getAllByRole('row')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: /Show Calendar Filter/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset All Filters' }));
  expect(within(screen.getByTestId('audit-table')).getAllByRole('row')).toHaveLength(5);
});
