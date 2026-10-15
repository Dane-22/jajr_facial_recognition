import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom';
import DailyLogs from './DailyLogs';
import AttendanceReports from './AttendanceReports';
import AuditLogs from './AuditLogs';
import Settings from './Settings';
import AdminManagement from './AdminManagement';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

vi.mock('../hooks/useSocket', () => ({ default: () => {} }));
vi.mock('jspdf', () => ({ default: vi.fn() }));
vi.mock('xlsx', () => ({ utils: { json_to_sheet: vi.fn(rows => ({ rows })), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() }, writeFile: vi.fn() }));

const result = data => ({ ok: true, json: async () => data });
const record = name => ({ id: 1, user_id: 7, name, status: 'OUT', timestamp: '2026-10-15T00:00:00Z' });
const pending = () => {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn((url) => url.includes('/employees') ? Promise.resolve(result({ employees: [] })) :
    new Promise(resolve => calls.push({ url, resolve }))));
  return calls;
};
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); });

test('daily logs honor rapid filter changes and ignore an older response', async () => {
  localStorage.setItem('admin_token', 'fixture');
  const calls = pending(); render(<DailyLogs />);
  await waitFor(() => expect(calls.length).toBe(1));
  fireEvent.change(screen.getByLabelText('Status Type'), { target: { value: 'IN' } });
  fireEvent.change(screen.getByLabelText('Status Type'), { target: { value: 'OUT' } });
  expect(calls.at(-1).url).toContain('status=OUT');
  await act(async () => { calls.at(-1).resolve(result({ logs: [record('Current result')] })); });
  await screen.findAllByText('Current result');
  await act(async () => { calls[0].resolve(result({ logs: [record('Wrong old result')] })); });
  expect(screen.queryByText('Wrong old result')).toBeNull();
  fireEvent.change(screen.getByLabelText('Target Date'), { target: { value: '' } });
  expect(screen.getByText('Select an attendance date.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Export CSV/ })).toBeDisabled();
});

test('reports default to the Philippine date and do not skip rapid date changes', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-14T17:00:00Z'));
  localStorage.setItem('admin_token', 'fixture');
  const calls = pending(); render(<AttendanceReports />);
  expect(screen.getByLabelText('Select Date')).toHaveValue('2026-10-15');
  fireEvent.change(screen.getByLabelText('Select Date'), { target: { value: '2026-10-14' } });
  fireEvent.change(screen.getByLabelText('Select Date'), { target: { value: '2026-10-13' } });
  expect(calls.at(-1).url).toContain('date=2026-10-13');
  await act(async () => { calls.at(-1).resolve(result({ date: '2026-10-13', report: [{ name: 'Correct report', days_present: 1 }] })); });
  await screen.findAllByText('Correct report');
  await act(async () => { calls[0].resolve(result({ date: '2026-10-15', report: [{ name: 'Stale report', days_present: 99 }] })); });
  expect(screen.queryByText('Stale report')).toBeNull();
});

test('report failure removes old data and blocks both exports', async () => {
  localStorage.setItem('admin_token', 'fixture');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(result({ report: [{ name: 'Old report', days_present: 1 }] })).mockRejectedValue(new Error('offline')));
  render(<AttendanceReports />); await screen.findAllByText('Old report');
  fireEvent.click(screen.getByRole('button', { name: /Refresh Report/ }));
  await screen.findByText('Network error. Please check your connection.');
  expect(screen.queryByText('Old report')).toBeNull();
  expect(screen.getByRole('button', { name: /Export PDF/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Export Excel/ })).toBeDisabled();
});

test('audit summary sends table filters and most common action uses the largest count', async () => {
  localStorage.setItem('admin_token', 'fixture');
  const fetchMock = vi.fn(async url => result(url.includes('/stats/summary')
    ? { total: 2, byAction: [{ action: 'LOGIN', count: 1 }, { action: 'UPDATE', count: 9 }] }
    : { logs: [{ id: 1, action: 'UPDATE', timestamp: '2026-10-15T00:00:00Z' }], pagination: { total: 2, totalPages: 1 } }));
  vi.stubGlobal('fetch', fetchMock); render(<AuditLogs />);
  await screen.findByText('Most Common Action');
  expect(screen.getAllByText('UPDATE').length).toBeGreaterThan(0);
  fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'LOGIN' } });
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-10-15' } });
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('/stats/summary?') && url.includes('action=LOGIN') && url.includes('startDate=2026-10-15'))).toBe(true));
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-10-14' } });
  expect(screen.getByText('End date must be on or after start date.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Export current page' })).toBeDisabled();
});

test('settings cannot overwrite saved values with defaults when initial loading fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(result({ settings: { confidence_threshold: '0.85' } })));
  render(<Settings />);
  await screen.findByText(/Unable to load saved settings/);
  expect(screen.getByRole('button', { name: 'Save Recognition Settings' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry settings' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save Recognition Settings' })).toBeEnabled());
  expect(screen.getByRole('slider')).toHaveValue('0.85');
});

test('report exports include every employee and PDF wraps rows across pages', async () => {
  localStorage.setItem('admin_token', 'fixture');
  const report = Array.from({ length: 35 }, (_, index) => ({ name: `Employee ${index}`, role: 'Long role description', days_present: 1 }));
  vi.stubGlobal('fetch', vi.fn(async () => result({ date: '2026-10-15', report })));
  const doc = { setFontSize: vi.fn(), text: vi.fn(), splitTextToSize: vi.fn(text => [text, 'wrapped continuation']), addPage: vi.fn(), save: vi.fn() };
  vi.mocked(jsPDF).mockImplementation(function () { return doc; });
  render(<AttendanceReports />);
  await screen.findAllByText('Employee 0');
  expect(screen.queryByText('Employee 34')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Export Excel/ }));
  expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(report);
  fireEvent.click(screen.getByRole('button', { name: /Export PDF/ }));
  expect(doc.addPage).toHaveBeenCalled();
  expect(doc.text.mock.calls.filter(([value]) => value === 'Name').length).toBeGreaterThan(1);
  expect(doc.text.mock.calls.some(([value]) => Array.isArray(value) && value[0] === 'Employee 34')).toBe(true);
  expect(doc.text.mock.calls.every(([, x, y]) => x >= 14 && x < 280 && y <= 195)).toBe(true);
  expect(doc.save).toHaveBeenCalled();
});

test('a regular Admin is not given account-management controls by username or ID fallback', async () => {
  localStorage.setItem('admin_token', `header.${btoa(JSON.stringify({ id: 1, username: 'admin', position: 'Admin' }))}.signature`);
  vi.stubGlobal('fetch', vi.fn(async () => result({ admins: [] })));
  render(<AdminManagement />);
  await waitFor(() => expect(screen.queryByText('Loading administrator accounts...')).toBeNull());
  expect(screen.queryByRole('button', { name: /Register New Admin/ })).toBeNull();
});
