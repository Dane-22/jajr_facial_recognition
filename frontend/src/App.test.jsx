import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import App from './App';
import * as faceApiLoader from './utils/faceApiLoader';

// Mock external sub-components and face loader functions
vi.mock('./utils/faceApiLoader', () => ({
  loadModels: vi.fn(),
  initializeFaceMatcher: vi.fn(),
}));

vi.mock('./components/CameraFeed', () => ({
  default: ({ isModelsLoaded }) => (
    <div data-testid="camera-feed-mock">Camera Feed Active (Models: {String(isModelsLoaded)})</div>
  ),
}));

vi.mock('./components/AttendanceCard', () => ({
  default: ({ systemStatus }) => <div data-testid="attendance-card-mock">Status: {systemStatus}</div>,
}));

vi.mock('./components/PWAInstallBanner', () => ({
  default: () => <div data-testid="pwa-banner-mock" />,
}));

describe('App Component Unit & Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders loading state initially while models are initializing', async () => {
    faceApiLoader.loadModels.mockImplementation(() => new Promise(() => {})); // pending promise

    render(<App />);

    expect(screen.getByText(/Loading face recognition models/i)).toBeInTheDocument();
    expect(screen.getByTestId('attendance-card-mock')).toHaveTextContent('Status: loading');
  });

  it('renders ready state and camera feed upon successful model initialization', async () => {
    faceApiLoader.loadModels.mockResolvedValue(true);
    faceApiLoader.initializeFaceMatcher.mockResolvedValue({ findBestMatch: vi.fn() });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('camera-feed-mock')).toBeInTheDocument();
    });
    expect(screen.getByTestId('attendance-card-mock')).toHaveTextContent('Status: ready');
  });

  it('renders error state when model initialization fails', async () => {
    faceApiLoader.loadModels.mockRejectedValue(new Error('Failed to load weights'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to initialize system/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId('attendance-card-mock')).toHaveTextContent('Status: error');
  });

  it('redirects unauthenticated users attempting to access /admin/dashboard to /admin/login', () => {
    window.history.pushState({}, 'Test page', '/admin/dashboard');

    render(<App />);

    // Since admin_token is missing in localStorage, ProtectedRoute redirects to /admin/login
    expect(window.location.pathname).toBe('/admin/login');
  });
});
