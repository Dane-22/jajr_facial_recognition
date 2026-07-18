import React, { useState, useEffect } from 'react';
import Table from './UI/Table';

const API_URL = 'http://localhost:5000/api';

const DailyLogs = () => {
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
        `${API_URL}/attendance/daily?date=${selectedDate}`,
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
          <h2 className="text-lg font-bold text-slate-900 mb-1">Daily Attendance Logs</h2>
          <p className="text-slate-500 text-xs">View and manage attendance records</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="date" className="text-slate-600 text-sm font-medium">
            Select Date:
          </label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all duration-200"/>
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
            <p className="text-2xl font-bold text-slate-900">{logs.length}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 px-4 py-4">
          <span className="w-8 h-8 text-slate-500">
            {checkInsIcon}
          </span>
          <div className="text-left">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Check-ins</p>
            <p className="text-2xl font-bold text-slate-900">{logs.filter(log => log.status === 'IN').length}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 px-4 py-4">
          <span className="w-8 h-8 text-slate-500">
            {checkOutsIcon}
          </span>
          <div className="text-left">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Check-outs</p>
            <p className="text-2xl font-bold text-slate-900">{logs.filter(log => log.status === 'OUT').length}</p>
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
