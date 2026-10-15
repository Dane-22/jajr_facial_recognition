import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
const CameraFeed = lazy(() => import('./components/CameraFeed'));
const AttendanceCard = lazy(() => import('./components/AttendanceCard'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));

import PWAInstallBanner from './components/PWAInstallBanner';
import { adminSession } from './utils/adminSession';

// ── ProtectedRoute ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  if (!adminSession()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

function MainApp() {
  const [systemStatus, setSystemStatus] = useState('loading');
  const [lastDetection, setLastDetection] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/attendance/settings', { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Attendance server unavailable'); return response.json(); })
      .then(() => { if (mounted) setSystemStatus('ready'); })
      .catch(() => { if (mounted) setSystemStatus('error'); });
    return () => { mounted = false; };
  }, []);

  const handleFaceDetected = useCallback((detection) => {
    setLastDetection(detection);
  }, []);

  return (
    <div className="kiosk-page min-h-screen flex flex-col">
      <PWAInstallBanner />
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">

              <div>
                <h1 className="text-xl font-bold text-gray-900">JAJR Face Recognition Attendance</h1>
                <p className="text-sm text-gray-500">Automated attendance system for JAJR</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/admin/login"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors duration-200">
                Admin Portal
              </Link>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${systemStatus === 'loading' ? 'bg-yellow-500 animate-pulse' :
                  systemStatus === 'ready' ? 'bg-green-500' :
                    'bg-red-500'
                  }`} />
                <span className="text-sm font-medium text-gray-600 capitalize">
                  {systemStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">

                Camera Feed
              </h2>
              {systemStatus === 'loading' && <p className="py-12 text-center text-gray-600">Connecting to attendance server...</p>}
              {systemStatus === 'error' && <div className="py-12 text-center"><p className="text-red-600">Attendance server unavailable. Check your connection.</p><button type="button" onClick={() => window.location.reload()} className="mt-3 text-teal-700 underline">Retry</button></div>}
              {systemStatus === 'ready' && <CameraFeed onFaceDetected={handleFaceDetected} />}
            </div>

            <div className="bg-slate-900 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="font-semibold mb-3 flex items-center gap-2">

                How to Use
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-white">1.</span>
                  <span>Allow camera access when prompted</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white">2.</span>
                  <span>Center your face in the oval guide</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white">3.</span>
                  <span>Ensure good lighting for accurate detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white">4.</span>
                  <span>Hold still while the kiosk scans and records attendance automatically</span>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <AttendanceCard
              systemStatus={systemStatus}
              lastDetection={lastDetection} />
          </div>
        </div>
      </main>

      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
             2026 Face Recognition Attendance System. Built with love by JAJR
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}><Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
    </Router>
  );
}

export default App;
