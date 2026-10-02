import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SiteManagement from './SiteManagement';

const siteData = {
  sites: [
    { id: 1, name: 'Main Office', latitude: 16.6148977, longitude: 120.3539222, radius_meters: 100, active: 1 },
    { id: 2, name: 'YARD', latitude: 16.6137584, longitude: 120.3430499, radius_meters: 100, active: 1 }
  ],
  employees: [{ id: 7, name: 'Employee One', site_ids: [1] }],
  sessions: []
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('shows assignment success in the employee row and clears it when edited again', async () => {
  const fetchMock = vi.fn((_url, options) => Promise.resolve(options?.method === 'PUT'
    ? { ok: true, json: async () => ({ userId: 7, siteIds: [1, 2] }) }
    : { ok: true, json: async () => siteData }));
  vi.stubGlobal('fetch', fetchMock);
  render(<SiteManagement />);
  const row = (await screen.findByText('Employee One')).closest('div');
  fireEvent.click(within(row).getByLabelText('YARD'));
  fireEvent.click(within(row).getByRole('button', { name: 'Save assignments for Employee One' }));
  await waitFor(() => expect(within(row).getByRole('status')).toHaveTextContent('Assignments saved.'));
  expect(fetchMock.mock.calls.some(([url, options]) => url === '/api/admin/site-assignments/7' && options.method === 'PUT')).toBe(true);
  fireEvent.click(within(row).getByLabelText('YARD'));
  expect(within(row).queryByRole('status')).toBeNull();
});

test('shows a failed assignment save in the same row', async () => {
  vi.stubGlobal('fetch', vi.fn((_url, options) => Promise.resolve(options?.method === 'PUT'
    ? { ok: false, json: async () => ({ error: 'Close the open time-in first.' }) }
    : { ok: true, json: async () => siteData })));
  render(<SiteManagement />);
  const row = (await screen.findByText('Employee One')).closest('div');
  fireEvent.click(within(row).getByRole('button', { name: 'Save assignments for Employee One' }));
  await waitFor(() => expect(within(row).getByRole('alert')).toHaveTextContent('Close the open time-in first.'));
});
