import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import CameraFeed from './CameraFeed';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('camera starts automatically and stops when the kiosk view closes', async () => {
  const stop = vi.fn();
  const getUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop }],
    getVideoTracks: () => [{ getSettings: () => ({ width: 640, height: 480 }) }]
  });
  const fetchMock = vi.fn(url => Promise.resolve(url === '/api/attendance/settings'
    ? { ok: true, json: async () => ({ geofencing_enabled: false }) }
    : { ok: true, status: 200, json: async () => ({ matched: false, reason: 'no_face', error: 'No face found.' }) }));
  vi.stubGlobal('fetch', fetchMock);
  let online = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage, getImageData: () => ({ data: new Uint8ClampedArray(32 * 24 * 4) })
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,abcd');

  const onFaceDetected = vi.fn();
  const view = render(<CameraFeed onFaceDetected={onFaceDetected} />);
  const video = view.container.querySelector('video');
  expect(video.classList.contains('-scale-x-100')).toBe(true);
  Object.defineProperty(video, 'readyState', { configurable: true, get: () => 4 });
  Object.defineProperty(video, 'videoWidth', { configurable: true, get: () => 640 });
  Object.defineProperty(video, 'videoHeight', { configurable: true, get: () => 480 });
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
  const guide = await view.findByTestId('face-guide');
  expect(guide.getAttribute('aria-hidden')).toBe('true');
  expect(parseFloat(guide.style.width)).toBeCloseTo(43.875);
  expect(parseFloat(guide.style.height)).toBeCloseTo(78);
  expect(view.getByText('Center your face in the oval.')).toBeTruthy();
  Object.defineProperty(video, 'videoWidth', { configurable: true, get: () => 1280 });
  Object.defineProperty(video, 'videoHeight', { configurable: true, get: () => 720 });
  fireEvent.loadedMetadata(video);
  await waitFor(() => expect(parseFloat(guide.style.height)).toBeCloseTo(58.5));
  expect(parseFloat(guide.style.width)).toBeCloseTo(32.90625);
  Object.defineProperty(video, 'videoWidth', { configurable: true, get: () => 720 });
  Object.defineProperty(video, 'videoHeight', { configurable: true, get: () => 1280 });
  fireEvent.loadedMetadata(video);
  await waitFor(() => expect(parseFloat(guide.style.height)).toBeCloseTo(60));
  expect(parseFloat(guide.style.width)).toBeCloseTo(33.75);
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/face/kiosk-attendance')).toBe(true));
  expect(drawImage.mock.calls.some(([source]) => source === video)).toBe(true);
  await waitFor(() => expect(view.getByText('No face found.')).toBeTruthy());
  online = false;
  window.dispatchEvent(new Event('offline'));
  await waitFor(() => expect(view.getByText('Connection lost. Scanning will resume when the device reconnects.')).toBeTruthy());
  const scansBeforeReconnect = fetchMock.mock.calls.filter(([url]) => url === '/api/face/kiosk-attendance').length;
  online = true;
  window.dispatchEvent(new Event('online'));
  await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url === '/api/face/kiosk-attendance').length).toBeGreaterThan(scansBeforeReconnect));
  expect(onFaceDetected).not.toHaveBeenCalled();
  expect(view.queryByRole('button')).toBeNull();
  view.unmount();
  expect(stop).toHaveBeenCalled();
});

test.each([
  { context: 'closest_assigned_boundary', label: 'Closest assigned boundary: Main Office' },
  { context: 'required_time_out_site', label: 'Required time-out site: Main Office' },
  { context: undefined, label: 'Configured site boundary: Main Office' }
])('shows $context and requests a fresh fix after a site-boundary rejection', async ({ context, label }) => {
  const getUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: vi.fn() }],
    getVideoTracks: () => [{ getSettings: () => ({ width: 640, height: 480 }) }]
  });
  const getCurrentPosition = vi.fn(success => success({
    coords: { latitude: 16.616500, longitude: 120.353922, accuracy: 175 }
  }));
  const fetchMock = vi.fn(url => Promise.resolve(url === '/api/attendance/settings'
    ? { ok: true, json: async () => ({ geofencing_enabled: true }) }
    : {
        ok: false, status: 403,
        json: async () => ({
          error: 'Reported coordinates are outside the configured boundary.',
          reason: 'outside_site_boundary', boundaryContext: context, siteName: 'Main Office',
          distanceMeters: 178, allowedRadiusMeters: 100
        })
      }));
  vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray(32 * 24 * 4) })
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,abcd');

  const view = render(<CameraFeed onFaceDetected={vi.fn()} />);
  const video = view.container.querySelector('video');
  Object.defineProperty(video, 'readyState', { configurable: true, get: () => 4 });
  Object.defineProperty(video, 'videoWidth', { configurable: true, get: () => 640 });
  Object.defineProperty(video, 'videoHeight', { configurable: true, get: () => 480 });
  await waitFor(() => expect(view.getByText(label, { exact: false })).toBeTruthy());
  expect(view.getByText(/Reported coordinates are 178 m/)).toBeTruthy();
  expect(view.getByText(/accuracy was ±175 m/)).toBeTruthy();
  expect(getCurrentPosition.mock.calls[0][2].maximumAge).toBe(15000);
  await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(2), { timeout: 7000 });
  expect(getCurrentPosition.mock.calls[1][2].maximumAge).toBe(0);
  view.unmount();
}, 8000);
