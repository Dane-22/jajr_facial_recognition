import React, { useState, useEffect, useRef } from 'react';
import Table from './UI/Table';

const API_URL = 'http://localhost:5000/api';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Pagination & Rate Limiting
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, entityTypeFilter, userTypeFilter, startDate, endDate, sortBy, sortOrder, itemsPerPage]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      fetchAuditLogs(token);
      fetchAuditStats(token);
    }
  }, [actionFilter, entityTypeFilter, userTypeFilter, startDate, endDate, sortBy, sortOrder, page, itemsPerPage]);

  const fetchAuditLogs = async (token) => {
    const now = Date.now();
    // Rate limit throttle check (min 300ms between calls)
    if (now - lastFetchRef.current < 300) {
      return;
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);
      if (entityTypeFilter) params.append('entityType', entityTypeFilter);
      if (userTypeFilter) params.append('userType', userTypeFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', page);
      params.append('limit', itemsPerPage);

      const response = await fetch(`${API_URL}/audit?${params.toString()}`, {
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
        const fetchedLogs = data.logs || [];
        setLogs(fetchedLogs);
        const totalCount = data.pagination?.total || data.total || data.count || fetchedLogs.length;
        const pagesCount = data.pagination?.totalPages || data.totalPages || Math.max(1, Math.ceil(totalCount / itemsPerPage));
        setTotal(totalCount);
        setTotalPages(pagesCount);
      } else {
        setError(data.error || 'Failed to fetch audit logs');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditStats = async (token) => {
    try {
      const response = await fetch(`${API_URL}/audit/stats/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit stats:', err);
    }
  };

  const clearFilters = () => {
    setActionFilter('');
    setEntityTypeFilter('');
    setUserTypeFilter('');
    setStartDate('');
    setEndDate('');
    setSortBy('timestamp');
    setSortOrder('DESC');
    setPage(1);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getActionBadgeColor = (action) => {
    const colors = {
      'LOGIN': 'bg-green-100 text-green-800',
      'LOGOUT': 'bg-gray-100 text-gray-800',
      'CREATE': 'bg-blue-100 text-blue-800',
      'UPDATE': 'bg-yellow-100 text-yellow-800',
      'DELETE': 'bg-red-100 text-red-800',
      'VIEW': 'bg-purple-100 text-purple-800',
      'CHECK_IN': 'bg-green-100 text-green-800',
      'CHECK_OUT': 'bg-orange-100 text-orange-800',
      'EXPORT': 'bg-indigo-100 text-indigo-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const exportToCSV = () => {
    if (logs.length === 0 || isExporting) return;

    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);

    const headers = ['ID', 'User', 'User Type', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Timestamp'];
    const rows = logs.map(log => [
      log.id,
      log.user_name || 'Unknown',
      log.user_type,
      log.action,
      log.entity_type || '-',
      log.entity_id || '-',
      log.ip_address || '-',
      formatTimestamp(log.timestamp)
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tableColumns = [
    { header: 'ID', key: 'id' },
    { header: 'User', key: 'user_name' },
    {
      header: 'User Type',
      key: 'user_type',
      render: (value) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${value === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
          {value}
        </span>
      )
    },
    {
      header: 'Action',
      key: 'action',
      render: (value) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getActionBadgeColor(value)}`}>
          {value}
        </span>
      )
    },
    { header: 'Entity Type', key: 'entity_type' },
    { header: 'Entity ID', key: 'entity_id' },
    { header: 'IP Address', key: 'ip_address' },
    {
      header: 'Timestamp',
      key: 'timestamp',
      render: (value) => formatTimestamp(value)
    }
  ];

  const emptyIcon = (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const displayTotal = total || logs.length;
  const displayTotalPages = totalPages || Math.max(1, Math.ceil(displayTotal / itemsPerPage));

  return (
    <div className="w-full bg-white rounded-xl border border-slate-100 shadow-sm">
      {/* Header */}
      <div className="w-full border-b border-slate-100 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 m-0 p-0">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Audit Logs</h2>
          <p className="text-slate-500 text-xs">View and track all system actions</p>
        </div>
        <button
          type="button"
          onClick={exportToCSV}
          disabled={logs.length === 0 || isExporting}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isExporting ? 'Exporting...' : 'Export '}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="w-full grid grid-cols-4 divide-x divide-slate-150 border-b border-slate-150 m-0 p-0">
          <div className="flex items-center justify-center gap-3 px-4 py-4">
            <div className="text-left">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Logs</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 px-4 py-4">
            <div className="text-left">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Admin Actions</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.byUserType?.find(t => t.user_type === 'admin')?.count || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 px-4 py-4">
            <div className="text-left">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Employee Actions</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.byUserType?.find(t => t.user_type === 'employee')?.count || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 px-4 py-4">
            <div className="text-left">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Most Common Action</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.byAction?.[0]?.action || '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
            <option value="">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="CHECK_IN">Check-in</option>
            <option value="CHECK_OUT">Check-out</option>
          </select>
          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
            <option value="">All Entity Types</option>
            <option value="employee">Employee</option>
            <option value="attendance">Attendance</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={userTypeFilter}
            onChange={(e) => setUserTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
            <option value="">All User Types</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
            <option value="timestamp">Timestamp</option>
            <option value="action">Action</option>
            <option value="entity_type">Entity Type</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200">
            <option value="DESC">Descending</option>
            <option value="ASC">Ascending</option>
          </select>
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors duration-200">
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="w-full m-0 p-0">
        <div className="border-b border-slate-100 px-4 py-4">
          <h3 className="text-sm font-bold text-slate-900">Audit Records ({displayTotal} total)</h3>
        </div>
        <div className="w-full m-0 p-0">
          {loading ? (
            <div className="flex py-12 items-center justify-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin mr-4" />
              <p className="text-slate-500 text-sm font-medium">Loading audit logs...</p>
            </div>
          ) : error ? (
            <div className="flex py-12 flex-col items-center justify-center">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm font-medium">{error}</p>
            </div>
          ) : (
            <div className="w-full">
              <Table
                columns={tableColumns}
                data={logs}
                emptyMessage="No audit logs found"
                emptyIcon={emptyIcon} />
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {displayTotal > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span>
                Showing <span className="font-semibold text-slate-900">{(page - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-slate-900">
                  {Math.min(page * itemsPerPage, displayTotal)}
                </span>{' '}
                of <span className="font-semibold text-slate-900">{displayTotal}</span> records
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="auditLogItemsPerPage" className="text-xs text-slate-500 font-medium">Rows per page:</label>
                <select
                  id="auditLogItemsPerPage"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setPage(1);
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
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                Previous
              </button>

              {Array.from({ length: displayTotalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === displayTotalPages || Math.abs(p - page) <= 1)
                .map((p, idx, array) => {
                  const prevPage = array[idx - 1];
                  const showEllipsis = prevPage && p - prevPage > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-2 text-xs text-slate-400">...</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${page === p
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setPage(p => Math.min(displayTotalPages, p + 1))}
                disabled={page === displayTotalPages}
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

export default AuditLogs;
