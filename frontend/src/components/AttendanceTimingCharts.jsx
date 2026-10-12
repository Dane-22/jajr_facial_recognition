import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { payrollPeriod } from './SalaryPage';

export default function AttendanceTimingCharts({ refreshKey = null }) {
  const now = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const [month, setMonth] = useState(now.slice(0, 7));
  const [half, setHalf] = useState(Number(now.slice(-2)) <= 15 ? 'first' : 'second');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    const period = payrollPeriod(month, half);
    fetch(`/api/dashboard/attendance-timing?${new URLSearchParams(period)}`, {
      signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
    }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Attendance charts unavailable.');
      if (!controller.signal.aborted) setData(result);
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, half, refreshKey]);
  const employees = data?.employees.filter(e => !employeeId || String(e.employeeId) === employeeId) || [];
  const chart = (rows, key) => <div className="h-64 min-w-0" aria-label="Unpaid attendance minutes chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={key} tick={{ fontSize: 11 }} /><YAxis /><Tooltip formatter={value => [`${Number(value).toFixed(2)} min`]} /><Legend /><Bar dataKey="earlyMinutes" name="Early arrival (unpaid)" stackId="timing" fill="#2563eb" /><Bar dataKey="afterMinutes" name="After-hours (unpaid)" stackId="timing" fill="#8b5cf6" /></BarChart></ResponsiveContainer></div>;
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 sm:p-6">
    <h2 className="text-lg font-bold">Early-arrival and after-hours attendance</h2><p className="mt-1 text-sm text-slate-600">Minutes outside scheduled hours are excluded from salary. These records do not represent approved overtime.</p>
    <div className="my-4 flex flex-wrap gap-3"><label className="text-sm">Chart month<input className="ml-2 rounded border p-2" aria-label="Chart month" type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} /></label><label className="text-sm">Chart period<select className="ml-2 rounded border p-2" value={half} onChange={e => setHalf(e.target.value)}><option value="first">1st–15th</option><option value="second">16th–month end</option></select></label></div>
    {loading && <p role="status">Loading attendance timing…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
    {data && <><div className="grid min-w-0 gap-6 lg:grid-cols-2"><div><h3 className="mb-3 text-sm font-semibold">Daily totals · minutes</h3>{chart(data.days, 'date')}</div><div><h3 className="mb-3 text-sm font-semibold">Employee comparison · minutes</h3><label className="text-sm">Employee<select className="mb-3 ml-2 max-w-full rounded border p-2" value={employeeId} onChange={e => setEmployeeId(e.target.value)}><option value="">All employees</option>{data.employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.name} (#{e.employeeId})</option>)}</select></label>{chart(employees, 'name')}</div></div>
      {data.excludedRecords > 0 && <p className="mt-3 text-sm text-amber-800">{data.excludedRecords} incomplete/invalid attendance day(s) excluded. Superadmin correction is required.</p>}
      <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">View minutes as a table</summary><div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Employee</th><th className="p-2">Early arrival</th><th className="p-2">After-hours</th></tr></thead><tbody>{employees.map(e => <tr key={e.employeeId}><td className="p-2">{e.name} (#{e.employeeId})</td><td className="p-2">{e.earlyMinutes.toFixed(2)} min</td><td className="p-2">{e.afterMinutes.toFixed(2)} min</td></tr>)}</tbody></table></div></details>
    </>}
  </section>;
}
