import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import useSocket from '../hooks/useSocket';

const API_URL = 'http://localhost:5000/api';

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

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, color, icon, live, t }) => (
  <div style={{ background: t.card, borderColor: t.cardBorder }}
    className="flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 hover:shadow-md">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p style={{ color: t.subtext }} className="text-xs font-semibold uppercase tracking-wider truncate">{label}</p>
      <div className="flex items-end gap-2">
        <p style={{ color: t.text }} className="text-3xl font-bold leading-none mt-1">{value ?? '—'}</p>
        {live && (
          <span className="mb-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
            <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />LIVE
          </span>
        )}
      </div>
      {sub && <p style={{ color: t.muted }} className="text-xs mt-0.5">{sub}</p>}
    </div>
  </div>
);

const SectionTitle = ({ children, t }) => (
  <h3 style={{ color: t.text }} className="text-sm font-bold uppercase tracking-wider mb-3">{children}</h3>
);

const ChartCard = ({ title, children, t, span = 1 }) => (
  <div
    style={{ background: t.card, borderColor: t.cardBorder }}
    className={`rounded-2xl border p-5 ${span === 2 ? 'lg:col-span-2' : ''}`}>
    <h3 style={{ color: t.text }} className="text-sm font-bold mb-4">{title}</h3>
    {children}
  </div>
);

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(7);
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [liveCheckIns, setLiveCheckIns] = useState(0);
  const [liveCheckOuts, setLiveCheckOuts] = useState(0);
  const [lastActivity, setLastActivity] = useState(null);

  const t = THEMES[darkMode ? 'dark' : 'light'];
  const isLoggedIn = !!localStorage.getItem('admin_token');

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) fetchDashboardData(token, days);
  }, [days]);

  const fetchDashboardData = async (token, daysParam) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/dashboard/stats?days=${daysParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok) {
        setData(result);
        // Seed live counters from today's data
        setLiveCheckIns(result.summary?.today_check_ins ?? 0);
        setLiveCheckOuts(result.summary?.today_check_outs ?? 0);
      } else {
        setError(result.error || 'Failed to fetch dashboard data');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Real-time socket updates ───────────────────────────────────────────────
  const handleNewAttendance = useCallback((event) => {
    setLastActivity(event);
    if (event.status === 'IN') {
      setLiveCheckIns(c => c + 1);
    } else {
      setLiveCheckOuts(c => c + 1);
    }
    // Patch today's trends line chart
    setData(prev => {
      if (!prev?.trends?.length) return prev;
      const today = new Date().toISOString().split('T')[0];
      const updated = prev.trends.map(row => {
        if (row.date !== today) return row;
        return {
          ...row,
          check_ins: row.check_ins + (event.status === 'IN' ? 1 : 0),
          check_outs: row.check_outs + (event.status === 'OUT' ? 1 : 0),
        };
      });
      return { ...prev, trends: updated };
    });
  }, []);

  useSocket('attendance:new', handleNewAttendance, isLoggedIn);

  // ── System preference sync ─────────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setDarkMode(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // ─── Loading / Error states ────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background: t.bg }} className="flex h-full items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p style={{ color: t.subtext }} className="text-sm font-medium">Loading dashboard…</p>
    </div>
  );

  if (error) return (
    <div style={{ background: t.bg }} className="flex h-full flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p style={{ color: t.subtext }} className="text-sm font-medium">{error}</p>
    </div>
  );

  const totalLive = liveCheckIns + liveCheckOuts;

  return (
    <div style={{ background: t.bg, color: t.text }} className="w-full h-full flex flex-col overflow-hidden transition-colors duration-300">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{ borderColor: t.border }} className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(d => !d)}
            style={{ background: t.surface, borderColor: t.border, color: t.subtext }}
            className="p-2 rounded-xl border transition-all duration-200 hover:scale-105"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchDashboardData(localStorage.getItem('admin_token'), days)}
            style={{ background: t.surface, borderColor: t.border, color: t.subtext }}
            className="p-2 rounded-xl border transition-all duration-200 hover:scale-105"
            title="Refresh data">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Days range */}
          <select
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
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* Live activity toast */}
        {lastActivity && (
          <div style={{ background: t.surface, borderColor: t.border }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm animate-pulse-once">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping shrink-0" />
            <span style={{ color: t.text }}>
              <span className="font-semibold">{lastActivity.name}</span>{' '}
              just checked {lastActivity.status === 'IN' ? '✅ IN' : '🔴 OUT'}
            </span>
            <span style={{ color: t.muted }} className="ml-auto text-xs">
              {new Date(lastActivity.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Stat cards */}
        {data?.summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard t={t}
              label="Total Employees"
              value={data.summary.total_employees}
              color="bg-indigo-100"
              icon={<svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <StatCard t={t}
              label="Check-ins Today"
              value={liveCheckIns}
              sub="updates live"
              live
              color="bg-emerald-100"
              icon={<svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" /></svg>}
            />
            <StatCard t={t}
              label="Check-outs Today"
              value={liveCheckOuts}
              sub="updates live"
              live
              color="bg-amber-100"
              icon={<svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>}
            />
            <StatCard t={t}
              label="Total Events Today"
              value={totalLive}
              sub="check-ins + check-outs"
              color="bg-purple-100"
              icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
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

          {/* Bar chart — Department */}
          <ChartCard title="Department Comparison" t={t}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.departments || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.gridStroke} vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 10, fill: t.axisStroke }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: t.axisStroke }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip t={t} />} />
                <Legend wrapperStyle={{ fontSize: 12, color: t.subtext }} />
                <Bar dataKey="total_employees" fill="#6366f1" name="Total" radius={[6, 6, 0, 0]} />
                <Bar dataKey="checked_in_today" fill="#10b981" name="Checked In" radius={[6, 6, 0, 0]} />
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
                  label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
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

        {/* Heat map */}
        <div style={{ background: t.card, borderColor: t.cardBorder }} className="rounded-2xl border p-5">
          <h3 style={{ color: t.text }} className="text-sm font-bold mb-4">Check-in Patterns by Day &amp; Hour</h3>
          {data?.heatMap?.length > 0 ? (
            <div className="overflow-x-auto">
              <div style={{ minWidth: 700 }}>
                {/* Hour labels */}
                <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '52px repeat(24, 1fr)' }}>
                  <div />
                  {[...Array(24)].map((_, i) => (
                    <div key={i} style={{ color: t.muted }} className="text-center text-[10px] font-mono">{i}</div>
                  ))}
                </div>
                {/* Day rows */}
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => {
                  const dayData = data.heatMap.filter(h => h.day === day);
                  return (
                    <div key={day} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '52px repeat(24, 1fr)' }}>
                      <div style={{ color: t.subtext }} className="text-xs font-medium flex items-center pr-2">{day.slice(0, 3)}</div>
                      {[...Array(24)].map((_, hour) => {
                        const count = dayData.find(h => h.hour === hour)?.check_ins || 0;
                        const alpha = count > 0 ? Math.min(0.9, 0.15 + (count / 8) * 0.75) : 0;
                        return (
                          <div key={hour}
                            className="aspect-square rounded flex items-center justify-center text-[9px] font-bold transition-all duration-200 cursor-default hover:scale-110"
                            style={{
                              background: count > 0 ? `rgba(99,102,241,${alpha})` : t.surface,
                              color: alpha > 0.5 ? '#fff' : t.muted,
                              border: `1px solid ${t.border}`
                            }}
                            title={`${day} ${hour}:00 — ${count} check-in${count !== 1 ? 's' : ''}`}>
                            {count > 0 ? count : ''}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <div style={{ color: t.muted }} className="text-[10px] mt-2 text-right">
                  Darker = more check-ins at that hour
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: t.muted }} className="flex items-center justify-center h-20 text-sm">
              No heat map data available yet
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DashboardCharts;
