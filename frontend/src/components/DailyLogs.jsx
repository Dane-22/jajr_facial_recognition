import React, { useState, useEffect, useCallback } from 'react';
import useSocket from '../hooks/useSocket';
import Table from './UI/Table';

const API_URL = 'http://localhost:5000/api';

const DailyLogs = () => {
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('DESC');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetchDailyLogs(token);
      fetchEmployees(token);
    }
  }, []);

  // ── Real-time updates via Socket.IO ──────────────────────────────────────
  const isLoggedIn = !!localStorage.getItem('admin_token');
  const today = new Date().toISOString().split('T')[0];

  const handleNewAttendance = useCallback((data) => {
    // Only inject live row when viewing today and no specific employee/status filter
    if (selectedDate !== today) return;
    if (selectedEmployee && String(data.user_id) !== String(selectedEmployee)) return;
    if (statusFilter && data.status !== statusFilter) return;

    setLogs((prev) => [data, ...prev]);
    setLiveCount((c) => c + 1);
  }, [selectedDate, selectedEmployee, statusFilter, today]);

  useSocket('attendance:new', handleNewAttendance, isLoggedIn);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetchDailyLogs(token);
    }
  }, [selectedDate, selectedEmployee, statusFilter, sortBy, sortOrder]);

  const fetchEmployees = async (token) => {
    try {
      const response = await fetch(`${API_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchDailyLogs = async (token) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      if (selectedEmployee) params.append('userId', selectedEmployee);
      if (statusFilter) params.append('status', statusFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await fetch(
        `${API_URL}/attendance/daily?${params.toString()}`,
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

  const clearFilters = () => {
    setSelectedEmployee('');
    setStatusFilter('');
    setSortBy('timestamp');
    setSortOrder('DESC');
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Role', 'Status', 'Timestamp'];
    const rows = logs.map(log => [
      log.id,
      log.name,
      log.role,
      log.status,
      formatTimestamp(log.timestamp)
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tableColumns = [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { 
      header: 'Role', 
      key: 'role',
      render: (value) => (
        <span className="px-2 py-1 bg-slate-100 text-black rounded-lg text-xs font-medium">
          {value}
        </span>
      )
    },
    { header: 'Status', key: 'status' },
    { 
      header: 'Timestamp', 
      key: 'timestamp',
      render: (value) => formatTimestamp(value)
    }
  ];

  const emptyIcon = (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );

  const totalLogsIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );

  const checkInsIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
  );

  const checkOutsIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
  );

  return (
    <div className="w-full h-full flex flex-col m-0 p-0 bg-white overflow-hidden">
      {/* Compact Integrated Header */}
      <div className="w-full border-b border-slate-100 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 m-0 p-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900">Daily Attendance Logs</h2>
            {isLoggedIn && selectedDate === today && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE
                {liveCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-500 text-white text-xs leading-none">{liveCount}</span>
                )}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs">View and manage attendance records</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="date" className="text-slate-600 text-sm font-medium">
            Select Date:
          </label>
          <input
            type="date"
            id="date"
            data-testid="date-filter-input"
            value={selectedDate}
            onChange={handleDateChange}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"/>
          <label htmlFor="employee" className="text-slate-600 text-sm font-medium ml-4">
            Employee:
          </label>
          <select
            id="employee"
            data-testid="daily-logs-employee-select"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
            <option value="">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
            <option value="">All Status</option>
            <option value="IN">Check-in</option>
            <option value="OUT">Check-out</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
            <option value="timestamp">Timestamp</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
          </select>
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors duration-200">
            Clear
          </button>
          <button
            type="button"
            data-testid="daily-logs-export-button"
            onClick={exportToCSV}
            disabled={logs.length === 0}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Flat Summary Panels */}
      <div className="w-full grid grid-cols-3 divide-x divide-slate-150 border-b border-slate-150 m-0 p-0">
        <div className="flex items-center justify-center gap-3 px-4 py-4">
          <span className="w-8 h-8 text-slate-500">
            {totalLogsIcon}
          </span>
          <div className="text-left">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Logs</p>
            <p className="text-2xl font-bold text-slate-900" data-testid="total-logs-stat">{logs.length}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 px-4 py-4">
          <span className="w-8 h-8 text-slate-500">
            {checkInsIcon}
          </span>
          <div className="text-left">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Check-ins</p>
            <p className="text-2xl font-bold text-slate-900" data-testid="check-ins-stat">{logs.filter(log => log.status === 'IN').length}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 px-4 py-4">
          <span className="w-8 h-8 text-slate-500">
            {checkOutsIcon}
          </span>
          <div className="text-left">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Check-outs</p>
            <p className="text-2xl font-bold text-slate-900" data-testid="check-outs-stat">{logs.filter(log => log.status === 'OUT').length}</p>
          </div>
        </div>
      </div>

      {/* Compact Table Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full m-0 p-0">
        <div className="border-b border-slate-100 px-4 py-4">
          <h3 className="text-sm font-bold text-slate-900">Attendance Records</h3>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto w-full m-0 p-0">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin mr-4" />
              <p className="text-slate-500 text-sm font-medium">Loading attendance logs...</p>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm font-medium">{error}</p>
            </div>
          ) : (
            <div className="h-full w-full">
              <Table
                data-testid="daily-logs-table"
                columns={tableColumns}
                data={logs}
                emptyMessage="No attendance logs found for this date"
                emptyIcon={emptyIcon}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyLogs;
