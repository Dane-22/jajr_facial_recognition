import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'jajr_kiosk_recent_faces';

function storedFaces() {
  try {
    const ids = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(Array.isArray(ids) ? ids.filter(Number.isInteger).slice(0, 100) : []);
  } catch {
    return new Set();
  }
}

export default function CameraFeed({ onFaceDetected }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('starting');
  const [message, setMessage] = useState('Starting camera...');
  const [resolution, setResolution] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [scanPhase, setScanPhase] = useState(null);
  const [scanElapsedMs, setScanElapsedMs] = useState(0);

  useEffect(() => {
    let disposed = false;
    let active = false;
    let starting = false;
    let busy = false;
    let stream = null;
    let timer = null;
    let scanTicker = null;
    let confirmationTimer = null;
    let request = null;
    let generation = 0;
    let previousPixels = null;
    let lastSent = 0;
    let recentFace = false;
    let emptyFrames = 0;
    let serverFailures = 0;
    let geofencingEnabled = false;
    let location = null;
    const blocked = storedFaces();
    const motionCanvas = document.createElement('canvas');
    motionCanvas.width = 32;
    motionCanvas.height = 24;

    const saveBlocked = () => {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...blocked])); } catch { /* Storage may be disabled. */ }
    };

    const finishScan = () => {
      clearInterval(scanTicker);
      scanTicker = null;
      if (!disposed) setScanPhase(null);
    };

    const stop = () => {
      generation += 1;
      active = false;
      busy = false;
      clearTimeout(timer);
      clearTimeout(confirmationTimer);
      finishScan();
      if (!disposed) setConfirmation(null);
      request?.abort();
      stream?.getTracks().forEach(track => track.stop());
      stream = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      previousPixels = null;
    };

    const schedule = delay => {
      clearTimeout(timer);
      if (active && !disposed && navigator.onLine) timer = setTimeout(loop, delay);
    };

    const hasMotion = video => {
      const context = motionCanvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(video, 0, 0, 32, 24);
      const pixels = context.getImageData(0, 0, 32, 24).data;
      if (!previousPixels) { previousPixels = new Uint8ClampedArray(pixels); return true; }
      let difference = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        difference += Math.abs(pixels[i] - previousPixels[i]);
      }
      previousPixels = new Uint8ClampedArray(pixels);
      return difference / (32 * 24) > 7;
    };

    const currentLocation = async () => {
      if (!geofencingEnabled) return {};
      if (location && Date.now() - location.time < 15000) return location.coords;
      if (!navigator.geolocation) throw new Error('Location access is required at this site.');
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 15000
      }));
      location = { time: Date.now(), coords: { latitude: position.coords.latitude, longitude: position.coords.longitude } };
      return location.coords;
    };

    async function loop() {
      if (!active || busy || disposed || document.hidden) return;
      if (!navigator.onLine) {
        setMessage('Connection lost. Scanning will resume when the device reconnects.');
        return;
      }
      if (confirmationTimer) { schedule(500); return; }
      const scanGeneration = generation;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) { schedule(500); return; }
      try {
        const motion = hasMotion(video);
        const now = Date.now();
        const periodicDelay = blocked.size || recentFace ? 3000 : 5000;
        if (now - lastSent < 1500 || (!motion && now - lastSent < periodicDelay)) {
          schedule(700);
          return;
        }
        busy = true;
        lastSent = now;
        const scanStartedAt = performance.now();
        clearInterval(scanTicker);
        setScanElapsedMs(0);
        setScanPhase(geofencingEnabled ? 'location' : 'matching');
        scanTicker = setInterval(() => {
          if (!disposed) setScanElapsedMs(performance.now() - scanStartedAt);
        }, 100);
        const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        setMessage(geofencingEnabled ? 'Getting location...' : 'Checking face...');
        const coords = await currentLocation();
        if (!active || disposed || scanGeneration !== generation) return;
        setScanPhase('matching');
        setMessage('Checking face...');
        request = new AbortController();
        const response = await fetch('/api/face/kiosk-attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, skipUserIds: [...blocked], ...coords }),
          signal: request.signal
        });
        const result = await response.json().catch(() => ({}));
        if (!active || disposed || scanGeneration !== generation) return;
        if ((response.ok && result.matched === false) || response.status === 422) {
          serverFailures = 0;
          if (result.reason === 'no_face') {
            recentFace = false;
            emptyFrames += 1;
            if (emptyFrames >= 2) {
              blocked.clear();
              saveBlocked();
            }
          } else {
            recentFace = true;
            emptyFrames = 0;
          }
          setMessage(result.error || 'Move closer and improve lighting.');
          schedule(1200);
        } else if (response.ok) {
          serverFailures = 0;
          recentFace = true;
          emptyFrames = 0;
          if (result.skipped) {
            blocked.add(result.userId);
            saveBlocked();
            setMessage('Attendance already recorded. The next person may step forward.');
          } else {
            blocked.add(result.userId);
            saveBlocked();
            onFaceDetected({ userId: result.userId, name: result.name, status: result.status, siteName: result.siteName, timestamp: Date.now() });
            clearTimeout(confirmationTimer);
            setConfirmation({ name: result.name, status: result.status });
            confirmationTimer = setTimeout(() => {
              confirmationTimer = null;
              setConfirmation(null);
            }, 2000);
            setMessage(`${result.name}: ${result.status} at ${result.siteName || 'assigned site'} recorded. The next person may step forward.`);
          }
          schedule(2500);
        } else {
          if (response.status === 403 && result.error?.includes('approved website')) {
            stop();
            setStatus('error');
            setMessage(result.error || 'Scanner access is not configured for this website.');
          } else if (response.status === 403 || response.status === 409 || response.status === 400) {
            setMessage(result.error || 'Attendance could not be recorded at this site.');
            schedule(5000);
          } else if (response.status === 503) {
            setMessage('Scanner is busy. Retrying shortly...');
            schedule(2000);
          } else {
            serverFailures += 1;
            const delay = Math.min(30000, 5000 * 2 ** Math.min(serverFailures - 1, 3));
            setMessage(`${result.error || 'Attendance server error.'} Retrying in ${delay / 1000}s.`);
            schedule(delay);
          }
        }
      } catch (error) {
        if (active && !disposed && scanGeneration === generation) {
          if (!navigator.onLine) {
            setMessage('Connection lost. Scanning will resume when the device reconnects.');
            return;
          }
          if (error.name === 'AbortError' && request?.signal.aborted) {
            schedule(500);
            return;
          }
          serverFailures += 1;
          const delay = Math.min(30000, 5000 * 2 ** Math.min(serverFailures - 1, 3));
          setMessage(`${error instanceof TypeError && request ? 'Connection interrupted.' : error.message || 'Scanner unavailable.'} Retrying in ${delay / 1000}s.`);
          schedule(delay);
        }
      } finally {
        if (scanGeneration === generation) {
          finishScan();
          request = null;
          busy = false;
        }
      }
    }

    const start = async () => {
      if (active || starting || disposed || document.hidden) return;
      starting = true;
      setStatus('starting');
      setMessage('Starting camera...');
      try {
        const settingsResponse = await fetch('/api/attendance/settings');
        if (!settingsResponse.ok) throw new Error('Attendance server unavailable.');
        const settings = await settingsResponse.json();
        if (disposed || document.hidden) return;
        geofencingEnabled = !!settings.geofencing_enabled;
        const camera = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
        });
        if (disposed || document.hidden) { camera.getTracks().forEach(track => track.stop()); return; }
        stream = camera;
        const video = videoRef.current;
        if (!video) { stop(); return; }
        video.srcObject = camera;
        await video.play();
        if (disposed || document.hidden) { stop(); return; }
        const trackSettings = camera.getVideoTracks()[0]?.getSettings?.() || {};
        setResolution(`${trackSettings.width || video.videoWidth} × ${trackSettings.height || video.videoHeight}`);
        setStatus('active');
        setMessage('Position one face in the frame. Scanning is automatic.');
        active = true;
        schedule(0);
      } catch (error) {
        stop();
        if (!disposed) {
          setStatus('error');
          setMessage(error.name === 'NotAllowedError'
            ? 'Allow camera access in browser settings, then reload this page.'
            : error.message || 'Camera unavailable. Reload this page to retry.');
        }
      } finally {
        starting = false;
      }
    };

    const visibilityChanged = () => {
      if (document.hidden) { stop(); if (!disposed) setStatus('paused'); }
      else start();
    };
    const connectionLost = () => {
      clearTimeout(timer);
      request?.abort();
      if (!disposed) setMessage('Connection lost. Scanning will resume when the device reconnects.');
    };
    const connectionRestored = () => {
      if (disposed || document.hidden) return;
      serverFailures = 0;
      lastSent = 0;
      setMessage('Connection restored. Resuming scanner...');
      if (active) schedule(500);
      else if (!starting) start();
    };
    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener('offline', connectionLost);
    window.addEventListener('online', connectionRestored);
    start();
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', visibilityChanged);
      window.removeEventListener('offline', connectionLost);
      window.removeEventListener('online', connectionRestored);
      stop();
    };
  }, [onFaceDetected]);

  return <div className="w-full max-w-2xl mx-auto">
    <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden">
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
      {status === 'active' && <div className="absolute inset-0 border-[3px] border-emerald-400/40 rounded-full m-[15%] pointer-events-none" />}
      {status === 'active' && scanPhase && <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-slate-950/85 px-3 py-2 text-sm font-semibold text-white shadow-lg" aria-live="off">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
        <span>{scanPhase === 'location' ? 'Getting location' : 'Scanning face'}</span>
        <span className="tabular-nums text-emerald-300">{(scanElapsedMs / 1000).toFixed(1)}s</span>
      </div>}
      {status !== 'active' && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-white px-6 text-center">{message}</div>}
    </div>
    <div aria-live="polite" className="mt-3 text-sm text-slate-700">
      <p>{message}</p>
      {status === 'active' && <p className="text-xs text-slate-500">Camera: {resolution}</p>}
    </div>
    {status === 'active' && confirmation && <div role="alert" className="fixed inset-0 z-[100] flex overflow-y-auto bg-slate-950/95 px-4 py-4 text-center text-white sm:px-8 sm:py-8">
      <div className="m-auto w-full max-w-2xl rounded-3xl border-4 border-emerald-300 bg-emerald-700 px-5 py-6 shadow-2xl sm:px-10 sm:py-14">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-emerald-700 sm:mb-6 sm:h-28 sm:w-28" aria-hidden="true">
          <svg className="h-14 w-14 sm:h-20 sm:w-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
        </div>
        <p className="text-3xl font-black uppercase tracking-wide sm:text-5xl">Attendance recorded</p>
        <p className="mt-4 break-words text-4xl font-bold sm:mt-6 sm:text-6xl">{confirmation.name}</p>
        <p className="mt-4 text-3xl font-bold sm:mt-5 sm:text-4xl">{confirmation.status === 'IN' ? 'Checked in' : 'Checked out'}</p>
        <p className="mt-5 text-lg font-medium text-emerald-50 sm:mt-8 sm:text-2xl">The next person may step forward.</p>
      </div>
    </div>}
  </div>;
}
