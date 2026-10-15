import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || success) return;
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('admin_token', data.token);
        setSuccess(true);
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 1000);
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">

          <h1 className="text-3xl font-bold text-slate-900 mb-2">JAJR Portal</h1>
          <p className="text-slate-500">Sign in to access the dashboard</p>
        </div>

        {/* Login Card */}
        <div className="auth-card">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl" data-testid="login-error-message">
              <div className="flex items-center gap-3">

                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl" data-testid="login-success-message">
              <div className="flex items-center gap-3">

                <p className="text-emerald-700 text-sm font-medium">Login successful! Redirecting...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-600 mb-2">
                Username
              </label>
              <div className="relative">

                <input
                  type="text"
                  id="username"
                  name="username"
                  data-testid="username-input"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white border ${error && !formData.username ? 'border-red-500/50 focus:border-red-500' : 'border-slate-300 focus:border-indigo-500'
                    } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200`}
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">

                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  data-testid="password-input"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-4 pr-20 py-3 bg-white border ${error && !formData.password ? 'border-red-500/50 focus:border-red-500' : 'border-slate-300 focus:border-indigo-500'
                    } rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200`}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-300 transition-colors focus:outline-none"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading || success}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : success ? (
                <div className="flex items-center justify-center gap-2">

                  <span>Success!</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 pt-6 border-t border-slate-200 text-center space-y-4">

            <Link
              to="/"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 text-sm transition-colors duration-200">

              Back to Face Recognition Attendance
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-slate-500 text-sm mt-8">
           2026 Face Recognition Attendance System
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
