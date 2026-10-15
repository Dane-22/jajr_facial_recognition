import { StrictMode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { io } from 'socket.io-client';
import useSocket from './useSocket';

vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({
  on: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), emit: vi.fn()
})) }));

function Listener() {
  useSocket('attendance:new', () => {}, true);
  return null;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

test('Strict Mode opens one socket after its discarded effect is cleaned up', async () => {
  const view = render(<StrictMode><Listener /></StrictMode>);
  await waitFor(() => expect(io).toHaveBeenCalledTimes(2));
  const first = io.mock.results[0].value;
  const active = io.mock.results[1].value;
  await waitFor(() => expect(active.connect).toHaveBeenCalledTimes(1));
  expect(first.connect).not.toHaveBeenCalled();
  expect(first.disconnect).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(active.disconnect).toHaveBeenCalledTimes(1);
});

test('events use the latest callback after filters change without reconnecting', () => {
  const first = vi.fn(), latest = vi.fn();
  function CurrentListener({ callback }) { useSocket('attendance:new', callback, true); return null; }
  const view = render(<CurrentListener callback={first} />);
  const socket = io.mock.results[0].value;
  const handler = socket.on.mock.calls.find(([event]) => event === 'attendance:new')[1];
  view.rerender(<CurrentListener callback={latest} />);
  handler({ id: 10 });
  expect(first).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledWith({ id: 10 });
  expect(io).toHaveBeenCalledTimes(1);
});
