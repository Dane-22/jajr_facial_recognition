import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalaryPage, { payrollPeriod } from './SalaryPage';
const socket = vi.hoisted(() => ({ callback: null }));
vi.mock('../hooks/useSocket', () => ({ default: (_event, callback) => { socket.callback = callback; } }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
const item = { employeeId: 1, name: 'Alex', role: 'Engineer', active: true, rate: '600.00', payableDays: 1,
  base: '600.00', deduction: '20.00', salary: '580.00', status: 'READY', exceptions: [], details: [] };
const preview = { startDate: '2026-10-01', endDate: '2026-10-15', sourceHash: 'hash', generatedAt: '2026-10-01T08:00:00Z', items: [item],
  summary: { employees: 1, payableDays: 1, base: '600.00', deduction: '20.00', salary: '580.00', needsReview: 0 } };
function setup(overrides = {}) {
  const fetchMock = vi.fn(async url => ({ ok: true, json: async () => url.endsWith('/rates') ? { employees: [{ id: 1, name: 'Alex', role: 'Engineer' }], rates: [] } :
    url.includes('/runs?') ? { runs: [], total: 0 } : preview, ...overrides }));
  vi.stubGlobal('fetch', fetchMock); return fetchMock;
}
test('semi-monthly cutoff handles leap year and all month ends', () => {
  expect(payrollPeriod('2028-02', 'second')).toEqual({ startDate: '2028-02-16', endDate: '2028-02-29' });
  expect(payrollPeriod('2026-04', 'second').endDate).toBe('2026-04-30');
  expect(payrollPeriod('2026-10', 'first').endDate).toBe('2026-10-15');
});
test('Admin can calculate and see breakdown but cannot edit rates/save/finalize', async () => {
  const fetchMock = setup(); render(<SalaryPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Calculate preview' }));
  await screen.findByText('Late deductions');
  expect(screen.queryByText('Daily rate setup')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
  fireEvent.click(screen.getAllByRole('button', { name: 'View Alex' })[0]);
  expect(screen.getByLabelText('Employee salary breakdown')).toBeInTheDocument();
  const call = fetchMock.mock.calls.find(([url]) => url.endsWith('/preview'));
  expect(JSON.parse(call[1].body)).toHaveProperty('startDate');
});
test('Superadmin rate form saves effective date and invalidates calculated preview', async () => {
  const fetchMock = setup(); render(<SalaryPage isSuperadmin />);
  await screen.findByRole('option', { name: /Alex/ });
  fireEvent.change(screen.getByLabelText('Employee'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Daily rate (PHP)'), { target: { value: '600' } });
  fireEvent.change(screen.getByLabelText('Effective from'), { target: { value: '2026-10-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save daily rate' }));
  await screen.findByText('Daily rate saved. Recalculate payroll.');
  const call = fetchMock.mock.calls.find(([url, options]) => url.endsWith('/rates') && options.method === 'POST');
  expect(JSON.parse(call[1].body)).toEqual({ employeeId: 1, dailyRate: '600', effectiveFrom: '2026-10-01' });
});
test('changing period cancels stale preview response', async () => {
  let finish;
  setup();
  const original = global.fetch;
  global.fetch = vi.fn((url, options) => url.endsWith('/preview') ? new Promise(resolve => { finish = () => resolve({ ok: true, json: async () => preview }); }) : original(url, options));
  render(<SalaryPage />); fireEvent.click(screen.getByRole('button', { name: 'Calculate preview' }));
  fireEvent.change(screen.getByLabelText('Payroll month'), { target: { value: '2026-11' } });
  finish(); await waitFor(() => expect(screen.getByRole('button', { name: 'Calculate preview' })).not.toBeDisabled());
  expect(screen.queryByText('Late deductions')).toBeNull();
});
test('attendance changes mark a preview stale and prevent export/save until recalculation', async () => {
  setup(); render(<SalaryPage isSuperadmin />);
  fireEvent.click(screen.getByRole('button', { name: 'Calculate preview' }));
  await screen.findByText('Late deductions');
  act(() => socket.callback({ timestamp: '2026-10-01T03:00:00Z' }));
  expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Calculate preview' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Export CSV' })).not.toBeDisabled());
});
