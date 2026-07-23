import React, { useState, useEffect } from 'react';

const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Monitor offline / online status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capture PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted PWA installation');
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  return (
    <>
      {/* Offline Alert Bar */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-900 text-xs sm:text-sm font-semibold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-md">
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m3.536 3.536a5 5 0 017.072 0m-7.072 7.072a5 5 0 017.072 0M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <span>Offline Mode Active — Face Recognition models & cached assets loaded from local storage</span>
        </div>
      )}

      {/* PWA Install Banner */}
      {showBanner && deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-md bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/30 flex items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <img src="/pwa-icon.svg" alt="App Icon" className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Install Attendance Kiosk</h4>
              <p className="text-xs text-slate-300">Add to Home Screen for fast mobile & tablet access</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowBanner(false)}
              className="p-2 text-slate-400 hover:text-white rounded-lg text-xs transition-colors">
              Dismiss
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all duration-200 shadow-lg min-h-[44px]">
              Install App
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallBanner;
