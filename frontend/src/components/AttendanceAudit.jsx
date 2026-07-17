import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const AttendanceAudit = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    status: ''
  });

  const [users, setUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetchAllLogs(token);
      fetchUsers(token);
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const fetchAllLogs = async (token) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/attendance/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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

  const fetchUsers = async (token) => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (filters.startDate) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) <= new Date(filters.endDate + 'T23:59:59')
      );
    }

    if (filters.userId) {
      filtered = filtered.filter(log => log.user_id === parseInt(filters.userId));
    }

    if (filters.status) {
      filtered = filtered.filter(log => log.status === filters.status);
    }

    setFilteredLogs(filtered);
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      status: ''
    });
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
      ? 'bg-slate-100 text-slate-700 border-slate-200' 
      : 'bg-slate-200 text-slate-800 border-slate-300';
  };

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['ID', 'Name', 'Role', 'Status', 'Timestamp'];
    const rows = filteredLogs.map(log => [
      log.id,
      log.name,
      log.role,
      log.status,
      formatTimestamp(log.timestamp)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_audit_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm">
      {/* Compact Integrated Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Attendance Audit</h2>
          <p className="text-slate-500 text-xs">Advanced history view with date filters and employee search</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredLogs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-xs font-medium text-slate-600 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-xs font-medium text-slate-600 mb-1.5">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"
            />
          </div>

          <div>
            <label htmlFor="userId" className="block text-xs font-medium text-slate-600 mb-1.5">
              Employee
            </label>
            <select
              id="userId"
              name="userId"
              value={filters.userId}
              onChange={handleFilterChange}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"
            >
              <option value="">All Employees</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-xs font-medium text-slate-600 mb-1.5">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"
            >
              <option value="">All Status</option>
              <option value="IN">Check In</option>
              <option value="OUT">Check Out</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-3 items-center">
          <button
            onClick={resetFilters}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-900 text-sm font-medium rounded-lg transition-colors duration-200"
          >
            Reset Filters
          </button>
          <span className="text-slate-500 text-sm">
            Showing {filteredLogs.length} of {logs.length} records
          </span>
        </div>
      </div>

      {/* Results Table */}
      <div className="px-6 py-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Attendance Records</h3>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-3" />
            <p className="text-slate-500 text-sm font-medium">Loading attendance logs...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm font-medium">{error}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm font-medium">No attendance logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-700">
                      #{log.id}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {log.name}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-700">
                      <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                        {log.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-700">
                      {formatTimestamp(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceAudit;
