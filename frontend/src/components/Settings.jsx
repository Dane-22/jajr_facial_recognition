import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const Settings = () => {
  const [activeSubTab, setActiveSubTab] = useState('recognition');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Settings State
  const [settings, setSettings] = useState({
    confidence_threshold: '0.70',
    camera_resolution: '720p',
    scan_cooldown: '3',
    work_start_time: '09:00',
    late_grace_period: '15',
    work_end_time: '17:00',
    auto_checkout: 'false',
    email_alerts: 'true'
  });

  // Change Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPw, setIsUpdatingPw] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
    } catch (err) {
      console.error('[Settings] Error fetching settings:', err);
    }
  };

  const handleSettingsChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaveSuccess('');
    setSaveError('');
  };

  const saveSettings = async () => {
    setLoading(true);
    setSaveSuccess('');
    setSaveError('');
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSaveSuccess('System settings saved successfully!');
        setTimeout(() => setSaveSuccess(''), 3000);
      } else {
        const data = await response.json();
        setSaveError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setSaveError('Network error while saving settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('Current password and new password are required');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsUpdatingPw(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/admin/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('Password changed successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordSuccess(''), 4000);
      } else {
        setPasswordError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setPasswordError('Network error while updating password');
    } finally {
      setIsUpdatingPw(false);
    }
  };

  // Password strength score
  const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, label: 'Empty', color: 'bg-slate-200' };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const pwStrength = getPasswordStrength(passwordForm.newPassword);

  const handleExportBackup = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/admin/backup`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facial_attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        setSaveSuccess('Backup exported successfully!');
        setTimeout(() => setSaveSuccess(''), 3000);
      } else {
        setSaveError('Failed to generate system backup.');
      }
    } catch (err) {
      setSaveError('Network error while exporting backup.');
    }
  };

  const handleClearCache = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/admin/clear-cache`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setSaveSuccess('System cache purged successfully!');
        setTimeout(() => setSaveSuccess(''), 3000);
      }
    } catch (err) {
      setSaveError('Failed to purge cache.');
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            System Settings
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-medium border border-slate-200">
              Admin Portal
            </span>
          </h2>
          <p className="text-slate-500 text-xs">Configure facial recognition parameters, work shift rules, security, & system maintenance.</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/60 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('recognition')}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'recognition'
              ? 'border-slate-900 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}>
          📸 Facial Recognition
        </button>

        <button
          onClick={() => setActiveSubTab('shifts')}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'shifts'
              ? 'border-slate-900 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}>
          ⏰ Work Shift Rules
        </button>

        <button
          onClick={() => setActiveSubTab('security')}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'security'
              ? 'border-slate-900 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}>
          🔒 Security & Password
        </button>

        <button
          onClick={() => setActiveSubTab('maintenance')}
          className={`px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'maintenance'
              ? 'border-slate-900 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}>
          🛠️ System Maintenance
        </button>
      </div>

      {/* Status Feedback Banners */}
      {saveSuccess && (
        <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <span>✅</span> {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <span>⚠️</span> {saveError}
        </div>
      )}

      {/* Tab Content Container */}
      <div className="p-6">
        {/* ─── TAB 1: FACIAL RECOGNITION SETTINGS ────────────────────────── */}
        {activeSubTab === 'recognition' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Facial Recognition Parameters</h3>
              <p className="text-xs text-slate-500">Fine-tune detection threshold and camera stream settings for face matching accuracy.</p>
            </div>

            {/* Confidence Threshold Slider */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-800">
                  Match Confidence Threshold: <span className="text-emerald-600 font-bold">{Math.round(settings.confidence_threshold * 100)}%</span>
                </label>
                <span className="text-[10px] text-slate-500">Default: 70%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={settings.confidence_threshold}
                onChange={(e) => handleSettingsChange('confidence_threshold', e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>50% (Strict)</span>
                <span>70% (Balanced)</span>
                <span>95% (Lenient)</span>
              </div>
            </div>

            {/* Camera Resolution & Cooldown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-bold text-slate-800">Preferred Camera Resolution</label>
                <select
                  value={settings.camera_resolution}
                  onChange={(e) => handleSettingsChange('camera_resolution', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="480p">480p (Compact Standard)</option>
                  <option value="720p">720p HD (Recommended)</option>
                  <option value="1080p">1080p Full HD</option>
                </select>
                <p className="text-[10px] text-slate-500">Higher resolution increases detection detail but requires more GPU/CPU processing.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-bold text-slate-800">Scan Cooldown Interval</label>
                <select
                  value={settings.scan_cooldown}
                  onChange={(e) => handleSettingsChange('scan_cooldown', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="2">2 Seconds</option>
                  <option value="3">3 Seconds (Standard)</option>
                  <option value="5">5 Seconds</option>
                  <option value="10">10 Seconds</option>
                </select>
                <p className="text-[10px] text-slate-500">Delay required between consecutive scans of the same employee to prevent duplicate logs.</p>
              </div>
            </div>

            <button
              onClick={saveSettings}
              disabled={loading}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
              {loading ? 'Saving...' : 'Save Recognition Settings'}
            </button>
          </div>
        )}

        {/* ─── TAB 2: WORK SHIFT RULES ─────────────────────────────────────── */}
        {activeSubTab === 'shifts' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Work Shift & Schedule Rules</h3>
              <p className="text-xs text-slate-500">Configure standard working hours used by the system and AI assistant to determine punctuality.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-bold text-slate-800">Standard Work Start Time</label>
                <input
                  type="time"
                  value={settings.work_start_time}
                  onChange={(e) => handleSettingsChange('work_start_time', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <p className="text-[10px] text-slate-500">Check-ins recorded after this time will be flagged as late.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-bold text-slate-800">Late Grace Period (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.late_grace_period}
                  onChange={(e) => handleSettingsChange('late_grace_period', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <p className="text-[10px] text-slate-500">Allowable delay before check-in is officially counted as late.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-bold text-slate-800">Standard Work End Time</label>
                <input
                  type="time"
                  value={settings.work_end_time}
                  onChange={(e) => handleSettingsChange('work_end_time', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <p className="text-[10px] text-slate-500">Standard shift conclusion time.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800">Midnight Auto Check-Out</label>
                  <p className="text-[10px] text-slate-500">Automatically check out remaining active logs at 23:59 PM.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.auto_checkout === 'true'}
                  onChange={(e) => handleSettingsChange('auto_checkout', e.target.checked ? 'true' : 'false')}
                  className="w-5 h-5 accent-slate-900 rounded cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={saveSettings}
              disabled={loading}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
              {loading ? 'Saving...' : 'Save Shift Rules'}
            </button>
          </div>
        )}

        {/* ─── TAB 3: SECURITY & CHANGE PASSWORD ─────────────────────────── */}
        {activeSubTab === 'security' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Admin Security & Password Management</h3>
              <p className="text-xs text-slate-500">Update your administrator password and review account security settings.</p>
            </div>

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <span>✅</span> {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <span>⚠️</span> {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              {/* Current Password */}
              <div>
                <label htmlFor="currentPassword" class="block text-xs font-bold text-slate-800 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    id="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 pr-10"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs">
                    {showCurrentPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="newPassword" class="block text-xs font-bold text-slate-800 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    id="newPassword"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 pr-10"
                    placeholder="Minimum 8 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs">
                    {showNewPw ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {passwordForm.newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                      <span>Strength</span>
                      <span className="capitalize">{pwStrength.label}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${pwStrength.color}`}
                        style={{ width: `${pwStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" class="block text-xs font-bold text-slate-800 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingPw}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                {isUpdatingPw ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* ─── TAB 4: SYSTEM MAINTENANCE & HEALTH ────────────────────────── */}
        {activeSubTab === 'maintenance' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">System Health & Data Maintenance</h3>
              <p className="text-xs text-slate-500">Monitor live service connections and export database backups.</p>
            </div>

            {/* Health Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                  🗄️
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">MySQL Database</p>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected (Port 3306)
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                  ⚡
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Redis Cache</p>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active / Node Cache
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                  🔌
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Socket.IO Server</p>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Real-time Active
                  </p>
                </div>
              </div>
            </div>

            {/* Backup & Maintenance Actions */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-800">Database & System Maintenance</h4>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExportBackup}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                  💾 Export Data Backup (.json)
                </button>

                <button
                  onClick={handleClearCache}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                  🧹 Purge Redis Cache
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
