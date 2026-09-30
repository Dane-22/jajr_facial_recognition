import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
const CameraFeed = lazy(() => import('./components/CameraFeed'));
const AttendanceCard = lazy(() => import('./components/AttendanceCard'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));

import PWAInstallBanner from './components/PWAInstallBanner';

// ── ProtectedRoute ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  if (!token) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      <PWAInstallBanner />
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">JAJR Face Recognition Attendance</h1>
                <p className="text-sm text-gray-500">Automated attendance system for JAJR</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/admin/login"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors duration-200">
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
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Camera Feed
              </h2>
              {systemStatus === 'loading' && <p className="py-12 text-center text-gray-600">Connecting to attendance server...</p>}
              {systemStatus === 'error' && <div className="py-12 text-center"><p className="text-red-600">Attendance server unavailable. Check your connection.</p><button type="button" onClick={() => window.location.reload()} className="mt-3 text-indigo-600 underline">Retry</button></div>}
              {systemStatus === 'ready' && <CameraFeed onFaceDetected={handleFaceDetected} />}
            </div>

            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to Use
              </h3>
              <ul className="space-y-2 text-sm text-indigo-100">
                <li className="flex items-start gap-2">
                  <span className="text-white">1.</span>
                  <span>Allow camera access when prompted</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white">2.</span>
                  <span>Position your face clearly in the camera frame</span>
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
            © 2026 Face Recognition Attendance System. Built with love by JAJR
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
