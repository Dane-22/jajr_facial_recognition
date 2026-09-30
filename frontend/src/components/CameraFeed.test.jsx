import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
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
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray(32 * 24 * 4) })
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,abcd');

  const onFaceDetected = vi.fn();
  const view = render(<CameraFeed onFaceDetected={onFaceDetected} />);
  const video = view.container.querySelector('video');
  Object.defineProperty(video, 'readyState', { configurable: true, get: () => 4 });
  Object.defineProperty(video, 'videoWidth', { configurable: true, get: () => 640 });
  Object.defineProperty(video, 'videoHeight', { configurable: true, get: () => 480 });
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/face/kiosk-attendance')).toBe(true));
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
