import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import App from './App';

vi.mock('./components/CameraFeed', () => ({
  default: () => <div data-testid="camera-feed-mock">Camera Feed Active</div>,
}));

vi.mock('./components/AttendanceCard', () => ({
  default: ({ systemStatus }) => <div data-testid="attendance-card-mock">Status: {systemStatus}</div>,
}));

vi.mock('./components/PWAInstallBanner', () => ({
  default: () => <div data-testid="pwa-banner-mock" />,
}));

describe('App Component Unit & Integration Tests', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    localStorage.clear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows a connection state while the attendance server is responding', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    render(<App />);

    await waitFor(() => expect(screen.getByText(/Connecting to attendance server/i)).toBeInTheDocument());
    expect(screen.getByTestId('attendance-card-mock')).toHaveTextContent('Status: loading');
  });

  it('shows the automatic camera when the attendance server is ready', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('camera-feed-mock')).toBeInTheDocument();
    });
    expect(screen.getByTestId('attendance-card-mock')).toHaveTextContent('Status: ready');
  });

  it('shows a connection error when the attendance server fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Attendance server unavailable. Check your connection/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId('attendance-card-mock')).toHaveTextContent('Status: error');
  });

  it('redirects unauthenticated users attempting to access /admin/dashboard to /admin/login', async () => {
    window.history.pushState({}, 'Test page', '/admin/dashboard');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/admin/login'));
  });
});
