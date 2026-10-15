import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import useSocket from '../hooks/useSocket';
import { attendanceDate, formatAttendanceTime } from '../utils/attendanceTime';
import { auditToday } from '../utils/auditCalendar';
import RecordCard from './UI/RecordCard';
import AttendanceTimingCharts from './AttendanceTimingCharts';

const API_URL = '/api';

// ─── Theme tokens ──────────────────────────────────────────────────────────────
const THEMES = {
  light: {
    bg: '#ffffff', surface: '#f8fafc', border: '#e2e8f0',
    text: '#0f172a', subtext: '#64748b', muted: '#94a3b8',
    card: '#ffffff', cardBorder: '#e2e8f0',
    gridStroke: '#f1f5f9', axisStroke: '#94a3b8',
    tooltipBg: '#1e293b', tooltipText: '#f8fafc',
    badge: '#f1f5f9', badgeText: '#475569',
  },
  dark: {
    bg: '#0f172a', surface: '#1e293b', border: '#334155',
    text: '#f8fafc', subtext: '#94a3b8', muted: '#64748b',
    card: '#1e293b', cardBorder: '#334155',
    gridStroke: '#1e293b', axisStroke: '#475569',
    tooltipBg: '#0f172a', tooltipText: '#f8fafc',
    badge: '#334155', badgeText: '#94a3b8',
  }
};


// ─── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, live, t }) => (
  <div style={{ background: t.card, borderColor: t.cardBorder }}
    className="metric-card min-w-0 border p-5">
    <div className="min-w-0 flex-1">
      <p style={{ color: t.subtext }} className="text-xs font-semibold uppercase tracking-wider leading-snug break-words">{label}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p style={{ color: t.text }} className="text-3xl font-bold leading-none mt-1">{value ?? '—'}</p>
        {live && (
          <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
            <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />LIVE
          </span>
        )}
      </div>
      {sub && <p style={{ color: t.muted }} className="text-xs mt-0.5">{sub}</p>}
    </div>
  </div>
);

const ChartCard = ({ title, children, t, span = 1 }) => (
  <div
    style={{ background: t.card, borderColor: t.cardBorder }}
    className={`rounded-2xl border p-5 ${span === 2 ? 'lg:col-span-2' : ''}`}>
    <h3 style={{ color: t.text }} className="text-sm font-bold mb-4">{title}</h3>
    {children}
  </div>
);

const DateAuditModal = ({ isOpen, onClose, date, t, dark }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (isOpen && date) {
      const fetchLogs = async () => {
        setLoading(true); setLogs([]); setError('');
        try {
          const token = localStorage.getItem('admin_token');
          const res = await fetch(`${API_URL}/attendance/daily?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (!active) return;
          if (res.ok) {
            setLogs(data.logs || []);
          } else setError(data.error || 'Unable to load attendance.');
        } catch (e) {
          if (active) setError('Unable to load attendance. Please try again.');
        } finally {
          if (active) setLoading(false);
        }
      };
      fetchLogs();
    }
    return () => { active = false; };
  }, [isOpen, date]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div style={{ background: t.card, borderColor: t.cardBorder }} className="w-full max-w-2xl rounded-2xl border shadow-xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div style={{ borderColor: t.border }} className="flex items-center justify-between p-5 border-b shrink-0">
          <div>
            <h2 style={{ color: t.text }} className="text-xl font-bold">Attendance Audit</h2>
            <p style={{ color: t.subtext }} className="text-sm mt-1">
              Logs for {new Date(date).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} style={{ background: t.surface, color: t.subtext, borderColor: t.border }} className="p-2 rounded-xl border hover:scale-105 transition-transform">
            Close
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {loading ? (
             <div className="flex justify-center p-8">
               <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
             </div>
          ) : error ? <p role="alert">{error}</p> : logs.length === 0 ? (
             <div style={{ color: t.muted }} className="text-center p-8 text-sm">No attendance logs found for this date.</div>
          ) : (
            <>
            <div className="space-y-3 md:hidden" data-testid="mobile-record-list">
              {logs.map((log) => (
                <RecordCard
                  key={log.id}
                  testId={`dashboard-attendance-card-${log.id}`}
                  dark={dark}
                  title={log.name}
                  subtitle={`Attendance #${log.id}`}
                  badge={<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${log.status === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{log.status}</span>}
                  fields={[
                    { label: 'Role', value: log.role || 'Staff' },
                    { label: 'Time', value: formatAttendanceTime(log.timestamp) },
                  ]}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr style={{ color: t.subtext, borderBottomColor: t.border }} className="border-b">
                    <th className="pb-3 font-semibold">Employee</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Time</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: t.border }}>
                  {logs.map(log => (
                    <tr key={log.id} style={{ color: t.text }} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-3 font-medium">{log.name}</td>
                      <td className="py-3 opacity-70">{log.role}</td>
                      <td className="py-3">{formatAttendanceTime(log.timestamp)}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${log.status === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ActivityCalendar = ({ t, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(auditToday);
  const [activeDates, setActiveDates] = useState([]);
  const calendarRequest = useRef(0);
  const [calendarError, setCalendarError] = useState('');

  const fetchCalendarActivity = async (year, month) => {
    const revision = ++calendarRequest.current;
    setActiveDates([]); setCalendarError('');
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/dashboard/calendar?year=${year}&month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (revision !== calendarRequest.current) return;
      if (res.ok) {
        setActiveDates(data.activeDates || []);
      } else setCalendarError('Calendar activity unavailable.');
    } catch (e) {
      if (revision === calendarRequest.current) setCalendarError('Calendar activity unavailable.');
    }
  };

  useEffect(() => {
    fetchCalendarActivity(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1);
    return () => { calendarRequest.current++; };
  }, [currentDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 1, 1)));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() + 1, 1)));
  };
  const goToCurrentMonth = () => {
    setCurrentDate(auditToday());
  };

  // Calendar logic
  const year = currentDate.getUTCFullYear();
  const month = currentDate.getUTCMonth();

  const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 is Sunday
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const days = [];

  // Previous month padding
  for (let i = 0; i < firstDayOfMonth; i++) {
    const d = daysInPrevMonth - firstDayOfMonth + i + 1;
    days.push({ day: d, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    // Format YYYY-MM-DD
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isActive = activeDates.includes(dateStr);
    const isToday = attendanceDate(new Date()) === dateStr;

    days.push({ day: i, isCurrentMonth: true, isActive, dateStr, isToday });
  }

  // Next month padding (to fill a 6 week grid = 42 days)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isCurrentMonth: false });
  }

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ background: t.card, borderColor: t.cardBorder }} className="min-w-0 rounded-2xl border p-3 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <h3 style={{ color: t.text }} className="text-xl font-bold">{monthName} {year}</h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Activity indicator active
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button aria-label="Previous calendar month" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            Previous
          </button>
          <button onClick={goToCurrentMonth} className="px-3 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors border border-slate-200">
            Current Month
          </button>
          <button aria-label="Next calendar month" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            Next
          </button>
        </div>
      </div>

      {calendarError && <p role="alert" className="mb-3 text-sm text-red-700">{calendarError}</p>}
      {/* Calendar Grid */}
      <p className="mb-2 text-xs font-medium text-slate-500 sm:hidden" aria-hidden="true">Swipe calendar sideways to see all days →</p>
      <div className="table-scroll w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="Scrollable dashboard calendar" tabIndex={0}>
        <div className="min-w-[308px]">
        {/* Weekdays */}
        <div className="grid grid-cols-7 mb-6">
          {weekdays.map(d => (
            <div key={d} className="text-center text-sm font-semibold text-slate-500">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-y-6">
          {days.map((d, i) => (
            <div key={i} className="flex flex-col items-center justify-center relative min-h-[48px] group">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium z-10
                ${!d.isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                ${d.isCurrentMonth ? 'cursor-pointer hover:bg-slate-100' : ''}
                ${d.isToday ? 'border border-slate-400' : ''}
              `}
              role={d.isCurrentMonth ? "button" : undefined}
              aria-label={d.dateStr}
              tabIndex={d.isCurrentMonth ? 0 : undefined}
              onKeyDown={event => { if (d.isCurrentMonth && ["Enter", " "].includes(event.key)) { event.preventDefault(); onDateClick?.(d.dateStr); } }}
              onClick={() => {
                if (d.isCurrentMonth && onDateClick) {
                  onDateClick(d.dateStr);
                }
              }}>
                {d.day}
              </div>
              {d.isActive && d.isCurrentMonth && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute bottom-1 left-1/2 -translate-x-1/2 z-10" />
              )}
            </div>
          ))}
        </div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-400 font-medium">
        Click a day or range above to filter by date
      </div>
    </div>
  );
};

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label, formatLabel, t }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: t.tooltipBg, color: t.tooltipText }}
      className="rounded-xl px-3 py-2 text-xs shadow-xl border border-white/10">
      <p className="font-semibold mb-1">{formatLabel ? formatLabel(label) : label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const DashboardCharts = () => {
  const [data, setData] = useState(null);
  const dashboardRequest = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(7);
  const [darkMode, setDarkMode] = useState(false);
  const [liveCheckIns, setLiveCheckIns] = useState(0);
  const [liveCheckOuts, setLiveCheckOuts] = useState(0);
  const [lastActivity, setLastActivity] = useState(null);

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedAuditDate, setSelectedAuditDate] = useState(null);

  const handleDateClick = (dateStr) => {
    setSelectedAuditDate(dateStr);
    setAuditModalOpen(true);
  };

  const t = THEMES[darkMode ? 'dark' : 'light'];
  const isLoggedIn = !!localStorage.getItem('admin_token');

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (token, daysParam, showLoading = true) => {
    const revision = ++dashboardRequest.current;
    if (showLoading) setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/dashboard/stats?days=${daysParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (revision !== dashboardRequest.current) return;
      if (res.ok) {
        setData(result);
        // Seed live counters from today's data
        setLiveCheckIns(result.summary?.today_check_ins ?? 0);
        setLiveCheckOuts(result.summary?.today_check_outs ?? 0);
      } else {
        setError(result.error || 'Failed to fetch dashboard data');
      }
    } catch {
      if (revision === dashboardRequest.current) setError('Network error. Please check your connection.');
    } finally {
      if (revision === dashboardRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) fetchDashboardData(token, days);
    else { setError('Your session has expired. Please sign in again.'); setLoading(false); }
    return () => { dashboardRequest.current++; };
  }, [days, fetchDashboardData]);

  // ── Real-time socket updates ───────────────────────────────────────────────
  const handleNewAttendance = useCallback((event) => {
    setLastActivity(event);
    const token = localStorage.getItem('admin_token');
    if (token) fetchDashboardData(token, days, false);
  }, [days, fetchDashboardData]);

  useSocket('attendance:new', handleNewAttendance, isLoggedIn);

  // ── System preference sync ─────────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setDarkMode(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });

  // ─── Loading / Error states ────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background: t.bg }} className="flex h-full items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p style={{ color: t.subtext }} className="text-sm font-medium">Loading dashboard…</p>
    </div>
  );

  if (error) return (
    <div style={{ background: t.bg }} className="flex h-full flex-col items-center justify-center gap-3">

      <p style={{ color: t.subtext }} className="text-sm font-medium">{error}</p>
    </div>
  );

  const totalLive = liveCheckIns + liveCheckOuts;

  return (
    <div style={{ background: t.bg, color: t.text }} className="page-panel w-full h-full flex flex-col overflow-hidden transition-colors duration-300">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{ borderColor: t.border }} className="px-3 py-4 sm:px-6 border-b flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 style={{ color: t.text }} className="text-lg font-bold">Dashboard</h2>
            {isLoggedIn && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                LIVE · {totalLive} today
              </span>
            )}
          </div>
          <p style={{ color: t.subtext }} className="text-xs mt-0.5">Attendance analytics and insights</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(d => !d)}
            style={{ background: t.surface, borderColor: t.border, color: t.subtext }}
            className="p-2 rounded-xl border transition-all duration-200 hover:scale-105"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchDashboardData(localStorage.getItem('admin_token'), days)}
            style={{ background: t.surface, borderColor: t.border, color: t.subtext }}
            className="p-2 rounded-xl border transition-all duration-200 hover:scale-105"
            title="Refresh data">
            Refresh
          </button>

          {/* Days range */}
          <select
            aria-label="Trend period"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            style={{ background: t.surface, borderColor: t.border, color: t.text }}
            className="px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all">
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-6">

        {/* Live activity toast */}
        {lastActivity && (
          <div style={{ background: t.surface, borderColor: t.border }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm animate-pulse-once">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping shrink-0" />
            <span style={{ color: t.text }}>
              <span className="font-semibold">{lastActivity.name}</span>{' '}
              just checked {lastActivity.status === 'IN' ? ' IN' : ' OUT'}
            </span>
            <span style={{ color: t.muted }} className="ml-auto text-xs">
              {new Date(lastActivity.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Stat cards */}
        {data?.summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <StatCard t={t}
              label="Total Employees"
              value={data.summary.total_employees}
              color="bg-indigo-100"

            />
            <StatCard t={t}
              label="Check-ins Today"
              value={liveCheckIns}
              sub="updates live"
              live
              color="bg-emerald-100"

            />
            <StatCard t={t}
              label="Check-outs Today"
              value={liveCheckOuts}
              sub="updates live"
              live
              color="bg-amber-100"

            />
            <StatCard t={t}
              label="Total Events Today"
              value={totalLive}
              sub="check-ins + check-outs"
              color="bg-purple-100"

            />
          </div>
        )}

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Area line chart — Trends */}
          <ChartCard title={`Attendance Trends — Last ${days} Days`} t={t} span={2}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.trends || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: t.axisStroke }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: t.axisStroke }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip formatLabel={formatDate} t={t} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: t.subtext }} />
                <Area type="monotone" dataKey="check_ins" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradIn)" name="Check-ins" dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="check_outs" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gradOut)" name="Check-outs" dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="unique_employees" stroke="#10b981" strokeWidth={2} strokeDasharray="4 3" name="Unique Employees" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Bar chart — Employee */}
          <ChartCard title="Employee Comparison" t={t}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.employees || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
                <XAxis dataKey="employee_name" tick={{ fontSize: 10, fill: t.axisStroke }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: t.axisStroke }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip t={t} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: t.subtext }} />
                <Bar dataKey="total_attendance" fill="#6366f1" name="Total Attendance" radius={[6, 6, 0, 0]} />
                <Bar dataKey="checked_in_today" fill="#10b981" name="Checked In Today" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Donut pie — Today breakdown */}
          <ChartCard title="Today's Attendance Breakdown" t={t}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Checked In', value: data?.breakdown?.checked_in || 0 },
                    { name: 'Checked Out', value: data?.breakdown?.checked_out || 0 },
                    { name: 'Not Checked In', value: data?.breakdown?.not_checked_in || 0 }
                  ]}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={4} dataKey="value"
                  label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}>
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip content={<DarkTooltip t={t} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: t.subtext }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>

        <ActivityCalendar t={t} onDateClick={handleDateClick} />
        <AttendanceTimingCharts refreshKey={lastActivity?.id} />

      </div>

      <DateAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        date={selectedAuditDate}
        t={t}
        dark={darkMode}
      />
    </div>
  );
};

export default DashboardCharts;
