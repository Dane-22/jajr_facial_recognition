import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  // Pagination & Rate Limiting
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const lastFetchRef = useRef(0);

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
    if (selectedDate !== today) return;
    if (selectedEmployee && String(data.user_id) !== String(selectedEmployee)) return;
    if (statusFilter && data.status !== statusFilter) return;

    setLogs((prev) => [data, ...prev]);
    setLiveCount((c) => c + 1);
  }, [selectedDate, selectedEmployee, statusFilter, today]);

  useSocket('attendance:new', handleNewAttendance, isLoggedIn);

  useEffect(() => {
    setCurrentPage(1);
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
    const now = Date.now();
    if (now - lastFetchRef.current < 300) return;
    lastFetchRef.current = now;

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

      if (response.status === 429) {
        setError('Rate limit exceeded: Too many requests. Please wait a moment before trying again.');
        setLogs([]);
        return;
      }

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
    setSelectedDate(today);
  };

  const exportToCSV = () => {
    if (logs.length === 0 || isExporting) return;

    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);

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

  // Metrics summary calculations
  const totalCount = logs.length;
  const inCount = logs.filter(l => l.status === 'IN').length;
  const outCount = logs.filter(l => l.status === 'OUT').length;

  const tableColumns = [
    { 
      header: 'ID', 
      key: 'id',
      render: (value) => <span className="font-mono text-xs font-bold text-slate-400">#{value}</span>
    },
    { 
      header: 'Employee Name', 
      key: 'name',
      render: (value) => <span className="font-bold text-slate-900">{value}</span>
    },
    {
      header: 'Role / Position',
      key: 'role',
      render: (value) => (
        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200">
          {value || 'Staff'}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (value) => (
        value === 'IN' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Check IN
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Check OUT
          </span>
        )
      )
    },
    {
      header: 'Scan Timestamp',
      key: 'timestamp',
      render: (value) => (
        <span className="text-slate-600 text-xs font-medium">
          {formatTimestamp(value)}
        </span>
      )
    }
  ];

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = logs.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden space-y-6 p-6">
      {/* Page Title & Live Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            📋 Daily Attendance Logs
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-medium border border-slate-200">
              Real-time Feed
            </span>
          </h2>
          <p className="text-slate-500 text-xs">Monitor live employee check-in & check-out scans for selected dates.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Socket.IO Active {liveCount > 0 && `(+${liveCount} live)`}
          </div>

          <button
            onClick={exportToCSV}
            disabled={logs.length === 0 || isExporting}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2">
            <span>📥</span> {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-200/60 text-slate-700 flex items-center justify-center font-bold text-base">
            📊
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Scans Logged</p>
            <p className="text-xl font-extrabold text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
            🟢
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Check INs</p>
            <p className="text-xl font-extrabold text-emerald-900">{inCount}</p>
          </div>
        </div>

        <div className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-base">
            🔴
          </div>
          <div>
            <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Check OUTs</p>
            <p className="text-xl font-extrabold text-rose-900">{outCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Employee Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Type</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300">
                <option value="">All Statuses</option>
                <option value="IN">IN Only 🟢</option>
                <option value="OUT">OUT Only 🔴</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sort Order</label>
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition-colors">
                <span>{sortOrder === 'DESC' ? '🔽 Newest First' : '🔼 Oldest First'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end pt-2 sm:pt-0">
            <button
              onClick={() => setSelectedDate(today)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border ${
                selectedDate === today
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}>
              📍 Today
            </button>
            {(selectedEmployee || statusFilter || selectedDate !== today) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                🔄 Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Main Table Area */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            <span className="text-slate-500 text-xs font-medium">Fetching attendance logs...</span>
          </div>
        ) : (
          <Table
            columns={tableColumns}
            data={currentLogs}
            emptyMessage={`No attendance logs recorded for ${selectedDate}`}
          />
        )}

        {/* Pagination Controls */}
        {logs.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4 text-slate-600">
              <span>
                Showing <strong className="text-slate-900">{indexOfFirstItem + 1}</strong> to{' '}
                <strong className="text-slate-900">{Math.min(indexOfLastItem, totalCount)}</strong> of{' '}
                <strong className="text-slate-900">{totalCount}</strong> logs
              </span>

              <div className="flex items-center gap-2">
                <span className="text-slate-500">Rows:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none">
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold rounded-lg transition-colors">
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, array) => {
                  const prevPage = array[idx - 1];
                  const showEllipsis = prevPage && p - prevPage > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1.5 font-bold rounded-lg transition-all ${
                          currentPage === p
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-700'
                        }`}>
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold rounded-lg transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyLogs;
