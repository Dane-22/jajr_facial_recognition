import { useState, useEffect } from 'react';

const AdminDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetchDailyLogs(token);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetchDailyLogs(token);
    }
  }, [selectedDate]);

  const fetchDailyLogs = async (token) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:5000/api/attendance/daily?date=${selectedDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setLogs(data.logs || []);
      } else {
        setError(data.error || 'Failed to fetch logs');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status) => {
    return status === 'IN' 
      ? 'bg-green-500/10 text-green-400 border-green-500/30' 
      : 'bg-red-500/10 text-red-400 border-red-500/30';
  };

  return (
    <div>
      {/* Main Content */}
      <main>
        {/* Date Selector */}
        <div className="mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Daily Attendance Logs</h2>
                <p className="text-slate-400 text-sm">View and manage attendance records</p>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="date" className="text-slate-300 text-sm font-medium">
                  Select Date:
                </label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Logs</p>
                <p className="text-3xl font-bold text-white">{logs.length}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Check-ins</p>
                <p className="text-3xl font-bold text-green-400">
                  {logs.filter(log => log.status === 'IN').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">Check-outs</p>
                <p className="text-3xl font-bold text-red-400">
                  {logs.filter(log => log.status === 'OUT').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col min-h-[30rem]">
          <div className="p-6 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-white">Attendance Records</h3>
          </div>

          <div className="flex-1 min-h-0 overflow-auto px-6 py-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-medium">Loading attendance logs...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-400 font-medium">{error}</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-slate-400 font-medium">No attendance logs found for this date</p>
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[18rem]">
                <table className="w-full">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-700/30 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        #{log.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {log.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        <span className="px-2 py-1 bg-slate-700/50 rounded-lg text-xs">
                          {log.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatTimestamp(log.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
