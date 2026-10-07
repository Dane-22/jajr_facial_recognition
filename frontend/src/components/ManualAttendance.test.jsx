import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManualAttendance from './ManualAttendance';

const employee = session => ({ id: 7, name: 'Alex', role: 'Staff',
  sites: [{ id: 1, name: 'Main Office' }, { id: 2, name: 'Yard' }], session });
const openSession = { site_id: 1, site_name: 'Main Office',
  started_at: '2026-10-07T01:00:00Z', in_log_id: 50 };
const transfer = { id: 91, kind: 'transfer', from_site_name: 'Main Office',
  to_site_name: 'Yard', timestamp: '2026-10-07T04:00:00.123Z',
  created_at: '2026-10-07T04:00:00.123Z', created_by: 'root',
  reason: 'Assigned to yard duty' };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('transfers an open shift to an assigned site and shows its history', async () => {
  let currentSite = openSession;
  let saved = false;
  const fetchMock = vi.fn(async url => {
    if (url.endsWith('/7/site-transfer')) {
      saved = true;
      currentSite = { ...openSession, site_id: 2, site_name: 'Yard' };
      return { ok: true, json: async () => ({ transfer: { ...transfer, to_site_name: 'Yard' } }) };
    }
    if (url.endsWith('/7')) return { ok: true, json: async () => ({ logs: saved ? [transfer] : [] }) };
    return { ok: true, json: async () => ({ employees: [employee(currentSite)], maxAgeDays: 30 }) };
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<ManualAttendance />);
  fireEvent.click(await screen.findByRole('button', { name: 'Manage attendance' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Transfer site' }));
  expect(screen.queryByRole('option', { name: 'Main Office' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Transfer to assigned site'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Assigned to yard duty' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review transfer' }));
  expect(screen.getByText(/Main Office → Yard/)).toBeInTheDocument();
  expect(screen.getByText(/current shift continues/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm and save' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Alex transferred to Yard'));
  const post = fetchMock.mock.calls.find(([url]) => url.endsWith('/7/site-transfer'));
  expect(post[1].method).toBe('POST');
  expect(JSON.parse(post[1].body)).toEqual({ fromSiteId: 1, toSiteId: 2, reason: 'Assigned to yard duty' });
  expect(await screen.findByText(/Site transfer ·/)).toBeInTheDocument();
});

test('requires an explicit site for time-in and disables transfer without an open shift', async () => {
  vi.stubGlobal('fetch', vi.fn(async url => ({ ok: true, json: async () =>
    url.endsWith('/7') ? { logs: [] } : { employees: [employee(null)], maxAgeDays: 30 } })));
  render(<ManualAttendance />);
  fireEvent.click(await screen.findByRole('button', { name: 'Manage attendance' }));
  expect(screen.getByRole('radio', { name: 'Transfer site' })).toBeDisabled();
  expect(screen.getByLabelText('Assigned site')).toHaveValue('');
});
