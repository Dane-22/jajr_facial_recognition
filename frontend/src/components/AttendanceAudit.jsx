import React, { useState, useEffect, useRef, useMemo } from 'react';

const API_URL = 'http://localhost:5000/api';

const AttendanceAudit = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Interactive Calendar & Dropdown Filters State
  const [selectedStartDate, setSelectedStartDate] = useState(null); // 'YYYY-MM-DD'
  const [selectedEndDate, setSelectedEndDate] = useState(null);     // 'YYYY-MM-DD'
  const [viewDate, setViewDate] = useState(new Date());              // Month view state
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
  
  const [filters, setFilters] = useState({
    userId: '',
    status: ''
  });

  const [users, setUsers] = useState([]);

  // Pagination & Rate Limiting states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetchAllLogs(token);
      fetchUsers(token);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    applyFilters();
  }, [logs, selectedStartDate, selectedEndDate, filters]);

  const fetchAllLogs = async (token) => {
    const now = Date.now();
    if (now - lastFetchRef.current < 300) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/attendance/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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

  // Pre-calculate set of dates that contain attendance logs (for green activity dots 🟢)
  const activityDates = useMemo(() => {
    const set = new Set();
    logs.forEach(log => {
      if (log.timestamp) {
        const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
        set.add(dateStr);
      }
    });
    return set;
  }, [logs]);

  const applyFilters = () => {
    let filtered = [...logs];

    // Filter by Calendar Selected Date Range
    if (selectedStartDate && !selectedEndDate) {
      filtered = filtered.filter(log => {
        const logDateStr = new Date(log.timestamp).toISOString().split('T')[0];
        return logDateStr === selectedStartDate;
      });
    } else if (selectedStartDate && selectedEndDate) {
      filtered = filtered.filter(log => {
        const logDateStr = new Date(log.timestamp).toISOString().split('T')[0];
        return logDateStr >= selectedStartDate && logDateStr <= selectedEndDate;
      });
    }

    // Filter by Employee Dropdown
    if (filters.userId) {
      filtered = filtered.filter(log => log.user_id === parseInt(filters.userId));
    }

    // Filter by Status Dropdown
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
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setFilters({
      userId: '',
      status: ''
    });
  };

  // Calendar Date Click Handler
  const handleDateClick = (dateStr) => {
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // Start new selection
      setSelectedStartDate(dateStr);
      setSelectedEndDate(null);
    } else if (selectedStartDate && !selectedEndDate) {
      if (dateStr < selectedStartDate) {
        setSelectedStartDate(dateStr);
        setSelectedEndDate(null);
      } else if (dateStr === selectedStartDate) {
        // Toggle off if same date clicked twice
        setSelectedStartDate(null);
      } else {
        setSelectedEndDate(dateStr);
      }
    }
  };

  // Quick Shortcut Actions
  const setQuickRange = (rangeType) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (rangeType === 'TODAY') {
      setSelectedStartDate(todayStr);
      setSelectedEndDate(null);
      setViewDate(today);
    } else if (rangeType === 'YESTERDAY') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      setSelectedStartDate(yestStr);
      setSelectedEndDate(null);
      setViewDate(yest);
    } else if (rangeType === 'THIS_WEEK') {
      const day = today.getDay(); // 0 = Sun
      const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(today.setDate(diffToMon));
      const monStr = mon.toISOString().split('T')[0];
      setSelectedStartDate(monStr);
      setSelectedEndDate(new Date().toISOString().split('T')[0]);
      setViewDate(new Date());
    } else if (rangeType === 'ALL') {
      setSelectedStartDate(null);
      setSelectedEndDate(null);
    }
  };

  // Calendar Grid Builder Helpers
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Padding from Previous Month
    for (let x = firstDayIndex; x > 0; x--) {
      const dayNum = prevMonthDays - x + 1;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({ dayNum, dateStr, isCurrentMonth: false });
    }

    // Days in Current Month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const currDate = new Date(year, month, i);
      // Format YYYY-MM-DD locally to avoid timezone offsets
      const yearStr = currDate.getFullYear();
      const monthStr = String(currDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

      days.push({ dayNum: i, dateStr, isCurrentMonth: true });
    }

    // Padding for Next Month grid completion (total 35 or 42 grid cells)
    const remainingGrid = (42 - days.length) % 7;
    for (let j = 1; j <= remainingGrid; j++) {
      const nextDate = new Date(year, month + 1, j);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({ dayNum: j, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

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
    if (filteredLogs.length === 0 || isExporting) return;

    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);

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

  // Pagination calculations
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm">
      {/* Compact Integrated Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            Attendance Audit
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-medium border border-slate-200">
              Interactive Calendar Filter
            </span>
          </h2>
          <p className="text-slate-500 text-xs">Filter attendance logs by clicking dates on the interactive calendar grid.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5">
            📅 {isCalendarExpanded ? 'Collapse Calendar' : 'Show Calendar Filter'}
          </button>
          <button
            onClick={exportToCSV}
            data-testid="export-csv-button"
            disabled={filteredLogs.length === 0 || isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* 📅 Interactive Calendar Filter Section */}
      {isCalendarExpanded && (
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Embedded Calendar Grid Widget */}
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              {/* Calendar Header: Month Navigation */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {monthNames[month]} {year}
                  </h3>
                  {activityDates.size > 0 && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                      🟢 Activity indicator active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Previous month">
                    ◄
                  </button>
                  <button
                    onClick={() => setViewDate(new Date())}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors">
                    Current Month
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Next month">
                    ►
                  </button>
                </div>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-500 mb-1">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((item, idx) => {
                  const { dayNum, dateStr, isCurrentMonth } = item;
                  const hasLogs = activityDates.has(dateStr);
                  const isSelectedStart = selectedStartDate === dateStr;
                  const isSelectedEnd = selectedEndDate === dateStr;
                  const isInRange =
                    selectedStartDate &&
                    selectedEndDate &&
                    dateStr >= selectedStartDate &&
                    dateStr <= selectedEndDate;

                  const isToday = new Date().toISOString().split('T')[0] === dateStr;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleDateClick(dateStr)}
                      className={`
                        relative h-9 rounded-xl text-xs font-medium flex items-center justify-center transition-all duration-150
                        ${!isCurrentMonth ? 'text-slate-300 opacity-40 hover:opacity-100' : 'text-slate-700 hover:bg-slate-100'}
                        ${isToday ? 'border border-slate-400 font-bold' : ''}
                        ${isInRange ? 'bg-emerald-100/70 text-emerald-900 font-semibold' : ''}
                        ${isSelectedStart || isSelectedEnd ? 'bg-slate-900 text-white font-bold shadow-sm hover:bg-slate-800' : ''}
                      `}>
                      <span>{dayNum}</span>

                      {/* Green activity indicator dot if logs exist for date */}
                      {hasLogs && !(isSelectedStart || isSelectedEnd) && (
                        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Range Display Status */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-slate-600 font-medium">
                  {selectedStartDate && !selectedEndDate && (
                    <span>Selected Date: <strong className="text-slate-900">{selectedStartDate}</strong></span>
                  )}
                  {selectedStartDate && selectedEndDate && (
                    <span>Selected Range: <strong className="text-slate-900">{selectedStartDate}</strong> to <strong className="text-slate-900">{selectedEndDate}</strong></span>
                  )}
                  {!selectedStartDate && (
                    <span className="text-slate-400">Click a day or range above to filter by date</span>
                  )}
                </div>

                {/* Hidden input compatibility for existing test runners */}
                <input type="hidden" data-testid="audit-start-date" value={selectedStartDate || ''} />
                <input type="hidden" data-testid="audit-end-date" value={selectedEndDate || ''} />
              </div>
            </div>

            {/* Sidebar Dropdowns & Quick Action Shortcuts */}
            <div className="w-full lg:w-72 flex flex-col gap-4">
              {/* Quick Range Chips */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Shortcuts</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setQuickRange('TODAY')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors border border-slate-200 text-left flex items-center justify-between">
                    <span>📍 Today</span>
                  </button>
                  <button
                    onClick={() => setQuickRange('YESTERDAY')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors border border-slate-200 text-left flex items-center justify-between">
                    <span>📅 Yesterday</span>
                  </button>
                  <button
                    onClick={() => setQuickRange('THIS_WEEK')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors border border-slate-200 text-left flex items-center justify-between">
                    <span>🗓️ This Week</span>
                  </button>
                  <button
                    onClick={() => setQuickRange('ALL')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors border border-slate-200 text-left flex items-center justify-between">
                    <span>🔄 All Dates</span>
                  </button>
                </div>
              </div>

              {/* Employee & Status Dropdown Filters */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div>
                  <label htmlFor="userId" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Employee Filter
                  </label>
                  <select
                    id="userId"
                    name="userId"
                    data-testid="audit-employee-select"
                    value={filters.userId}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
                    <option value="">All Employees</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Attendance Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    data-testid="audit-status-select"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
                    <option value="">All Statuses</option>
                    <option value="IN">Check In</option>
                    <option value="OUT">Check Out</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={resetFilters}
                    data-testid="reset-filters-button"
                    className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs font-bold rounded-xl transition-colors duration-200 text-center">
                    Reset All Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-900">{filteredLogs.length}</strong> of <strong className="text-slate-900">{logs.length}</strong> total attendance records
            </span>
          </div>
        </div>
      )}

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
            <p className="text-slate-500 text-sm font-medium">No attendance logs match the selected filter criteria</p>
            <button
              onClick={resetFilters}
              className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="audit-table">
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
                {currentLogs.map((log) => (
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

        {/* Pagination Bar */}
        {filteredLogs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span>
                Showing <span className="font-semibold text-slate-900">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-semibold text-slate-900">
                  {Math.min(indexOfLastItem, totalItems)}
                </span>{' '}
                of <span className="font-semibold text-slate-900">{totalItems}</span> records
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="auditItemsPerPage" className="text-xs text-slate-500 font-medium">Rows per page:</label>
                <select
                  id="auditItemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
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
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, idx, array) => {
                  const prevPage = array[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-2 text-xs text-slate-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceAudit;
