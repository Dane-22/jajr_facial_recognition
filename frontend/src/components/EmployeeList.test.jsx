import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmployeeList from './EmployeeList';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('archives an employee and offers restore from the archived filter', async () => {
  let active = true;
  const employee = () => ({ id: 7, name: 'Alex', role: 'Staff', is_active: active ? 1 : 0,
    created_at: '2026-10-01T00:00:00Z', archived_at: active ? null : '2026-10-07T00:00:00Z' });
  const fetchMock = vi.fn(async (url, options = {}) => {
    if (options.method === 'PATCH') {
      active = JSON.parse(options.body).active;
      return { ok: true, json: async () => ({ employee: employee() }) };
    }
    const status = new URL(url, 'http://localhost').searchParams.get('status');
    return { ok: true, json: async () => ({ employees: status === (active ? 'active' : 'archived') ? [employee()] : [] }) };
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('confirm', vi.fn(() => true));
  render(<EmployeeList isSuperadmin />);

  fireEvent.click(await screen.findByTestId('status-employee-7'));
  await waitFor(() => expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(true));
  const statusRequest = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
  expect(JSON.parse(statusRequest[1].body)).toEqual({ active: false });
  expect(await screen.findByRole('status')).toHaveTextContent('Alex archived successfully.');

  fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'archived' } });
  await waitFor(() => expect(screen.getByTestId('status-employee-7')).toHaveTextContent('Restore'));
});
