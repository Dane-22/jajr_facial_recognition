import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatAttendanceTime } from '../utils/attendanceTime';
import useSocket from '../hooks/useSocket';

export const payrollPeriod = (month, half) => {
  const [year, number] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return { startDate: `${month}-${half === 'first' ? '01' : '16'}`, endDate: `${month}-${half === 'first' ? '15' : last}` };
};
const todayPht = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';
const buttonClass = 'rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
async function request(path, body, signal) {
  const response = await fetch(`/api/salary${path}`, { method: body ? 'POST' : 'GET', signal,
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Salary request failed.');
  return data;
}

export default function SalaryPage({ isSuperadmin = false, onCorrectAttendance }) {
  const today = todayPht();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [half, setHalf] = useState(Number(today.slice(-2)) <= 15 ? 'first' : 'second');
  const [data, setData] = useState(null);
  const [run, setRun] = useState(null);
  const [directory, setDirectory] = useState({ employees: [], rates: [] });
  const [history, setHistory] = useState({ runs: [], total: 0, page: 1 });
  const [historyPage, setHistoryPage] = useState(1);
  const [search, setSearch] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stale, setStale] = useState(false);
  const [rateEmployee, setRateEmployee] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const generation = useRef(0);
  const operation = useRef(null);
  const latest = useRef({ data, run }); latest.current = { data, run };
  const onAttendance = useCallback(event => {
    const current = latest.current;
    if (!current.data || current.run?.status === 'FINALIZED') return;
    const timestamp = new Date(event?.timestamp).getTime();
    if (!Number.isFinite(timestamp)) return;
    const date = new Date(timestamp + 8 * 3600000).toISOString().slice(0, 10);
    if (date >= current.data.startDate && date <= current.data.endDate) {
      setStale(true); setNotice('Attendance changed in this period. Recalculate before exporting, saving or finalizing.');
    }
  }, []);
  useSocket('attendance:new', onAttendance, Boolean(localStorage.getItem('admin_token')));
  const period = payrollPeriod(month, half);
  const invalidate = () => { generation.current++; operation.current?.abort(); setBusy(false); setData(null); setRun(null); setSelected(null); setNotice('Recalculate after changing the period or rates.'); };
  const refresh = async () => {
    const [rates, runs] = await Promise.all([request('/rates'), request(`/runs?page=${historyPage}`)]);
    setDirectory(rates); setHistory(runs);
  };
  useEffect(() => {
    let active = true;
    Promise.all([request('/rates'), request(`/runs?page=${historyPage}`)])
      .then(([rates, runs]) => { if (active) { setDirectory(rates); setHistory(runs); } })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [historyPage]);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => { setPage(1); }, [search, reviewOnly, data]);
  async function act(work) {
    operation.current?.abort();
    const controller = new AbortController(); operation.current = controller;
    const revision = ++generation.current;
    setBusy(true); setError(''); setNotice('');
    try { await work(controller.signal, () => revision === generation.current); }
    catch (e) { if (revision === generation.current && e.name !== 'AbortError') setError(e.message); }
    finally { if (revision === generation.current) setBusy(false); }
  }
  const calculate = () => act(async (signal, current) => {
    const result = await request('/preview', period, signal);
    if (current()) { setData(result); setRun(null); setSelected(null); setStale(false); setNotice('Provisional preview. Totals include every employee in this period.'); }
  });
  const saveDraft = () => act(async (signal, current) => {
    const result = await request('/runs', { ...period, sourceHash: data.sourceHash }, signal);
    if (current()) { setRun(result); setData(result.snapshot); setNotice('Draft saved. Review exceptions before finalizing.'); await refresh(); }
  });
  const finalize = () => act(async (signal, current) => {
    const result = await request(`/runs/${run.id}/finalize`, {}, signal);
    if (current()) { setRun({ ...run, ...result }); setNotice('Payroll finalized. This snapshot is immutable.'); await refresh(); }
  });
  const loadRun = id => act(async (signal, current) => {
    const result = await request(`/runs/${id}`, null, signal);
    if (current()) {
      setRun(result); setData(result.snapshot); setSelected(null); setStale(false);
      setMonth(result.snapshot.startDate.slice(0, 7)); setHalf(result.snapshot.startDate.endsWith('-01') ? 'first' : 'second');
      setNotice(`Viewing saved ${result.status.toLowerCase()} payroll. Drafts may need recalculation before finalizing.`);
    }
  });
  const exportCsv = () => act(async (signal, current) => {
    const response = await fetch(run ? `/api/salary/runs/${run.id}/export` : '/api/salary/export', {
      method: run ? 'GET' : 'POST', signal,
      headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}`, 'Content-Type': 'application/json' },
      ...(run ? {} : { body: JSON.stringify({ ...period, sourceHash: data.sourceHash }) }) });
    if (!response.ok) throw new Error((await response.json()).error || 'Export failed.');
    const blob = await response.blob(); if (!current()) return;
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `salary-${data.startDate}-${run?.status || 'PROVISIONAL'}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Complete payroll scope exported, including employees outside the visible page and search.');
  });
  const saveRate = event => {
    event.preventDefault();
    act(async (signal, current) => {
      await request('/rates', { employeeId: Number(rateEmployee), dailyRate, effectiveFrom }, signal);
      if (current()) { setData(null); setRun(null); setSelected(null); setDailyRate(''); await refresh(); setNotice('Daily rate saved. Recalculate payroll.'); }
    });
  };
  const filtered = (data?.items || []).filter(i => (!reviewOnly || i.exceptions.length) && `${i.name} ${i.role} ${i.employeeId}`.toLowerCase().includes(search.toLowerCase()));
  const visible = filtered.slice((page - 1) * 10, page * 10);
  const selectedRates = directory.rates.filter(r => String(r.user_id) === rateEmployee);
  const final = run?.status === 'FINALIZED';
  return <div className="space-y-6 text-slate-900">
    <header><h1 className="text-2xl font-bold">Salary</h1><p className="mt-1 text-sm text-slate-600">PHP payroll • 15th and month end • attendance-based daily pay</p></header>
    <section className="rounded-2xl border bg-white p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium">Payroll month<input aria-label="Payroll month" type="month" min="2000-01" max="2100-12" required value={month} className={`${inputClass} mt-1`} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { invalidate(); setMonth(e.target.value); } }} /></label>
        <label className="text-sm font-medium">Period<select value={half} className={`${inputClass} mt-1`} onChange={e => { invalidate(); setHalf(e.target.value); }}><option value="first">1st–15th</option><option value="second">16th–month end</option></select></label>
        <div className="sm:col-span-2 flex flex-wrap items-end gap-2">
          <button className={buttonClass} disabled={busy} onClick={calculate}>{busy ? 'Working…' : 'Calculate preview'}</button>
          <button className={buttonClass} disabled={busy || !data || (stale && !final)} onClick={exportCsv}>Export CSV</button>
          {isSuperadmin && <button className={buttonClass} disabled={busy || !data || final || stale} onClick={saveDraft}>Save draft</button>}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">{period.startDate} to {period.endDate} (PHT). CSV includes the complete period; search below only changes the display.</p>
      <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Salary rules</summary><p className="mt-2">Engineers: 7 AM–4 PM. Others: 8 AM–5 PM. Noon–1 PM lunch is unpaid. Within 15-minute grace: no deduction. Beyond grace: ₱1 per minute from scheduled start. Late arrival followed by attendance through scheduled end earns full daily pay minus lateness. Early departure: 8 hours full day, 4–under 8 half day, under 4 prorated at daily rate ÷ 8. Early/after-hours attendance is unpaid.</p><p className="mt-2">Split/overnight attendance, afternoon arrival, fractional late minutes, or deductions exceeding earnings require review. Missing IN/OUT requires Superadmin correction. These exceptions block finalization.</p></details>
    </section>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">{notice}</div>}
    {data && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">{run ? `Saved ${run.status.toLowerCase()} #${run.id}` : 'Provisional preview'} · Calculated {formatAttendanceTime(data.generatedAt)}</p>
        {isSuperadmin && run?.status === 'DRAFT' && <button className={buttonClass} disabled={busy || stale || data.summary.needsReview > 0} onClick={finalize}>Finalize payroll</button>}</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[['Employees', data.summary.employees], ['Payable days', data.summary.payableDays.toFixed(3)], ['Base earnings', money(data.summary.base)], ['Late deductions', money(data.summary.deduction)], ['Salary after late deduction', money(data.summary.salary)]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border bg-white p-4"><p className="text-xs text-slate-600">{label}</p><p className="mt-2 break-words text-lg font-bold">{value}</p></div>)}</div>
      {data.summary.needsReview > 0 && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{data.summary.needsReview} employee(s) need review. Amounts are provisional; payroll cannot finalize until all exceptions are resolved.</p>}
      <section className="rounded-2xl border bg-white p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3"><label className="flex-1 text-sm font-medium">Search employees<input value={search} onChange={e => setSearch(e.target.value)} className={`${inputClass} mt-1`} placeholder="Name, position or ID" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reviewOnly} onChange={e => setReviewOnly(e.target.checked)} />Needs review only</label></div>
        {!filtered.length && <p className="py-6 text-slate-600">No employees match this display filter.</p>}
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-600">{['Employee', 'Daily rate', 'Payable days', 'Base', 'Late deduction', 'Salary', 'Status', 'Details'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(i => <tr className="border-b" key={i.employeeId}><td className="p-3"><strong>{i.name}</strong><p className="text-xs text-slate-500">#{i.employeeId} · {i.role}{!i.active && ' · Archived'}</p></td><td className="p-3">{i.rate ? money(i.rate) : 'Not configured'}</td><td className="p-3">{i.payableDays.toFixed(3)}</td><td className="p-3">{money(i.base)}</td><td className="p-3">{money(i.deduction)}</td><td className="p-3 font-semibold">{money(i.salary)}</td><td className="p-3">{i.status.replaceAll('_', ' ')}</td><td className="p-3"><button className="font-semibold text-blue-700 underline" onClick={() => setSelected(i)}>View {i.name}</button></td></tr>)}</tbody></table></div>
        <div className="space-y-3 md:hidden">{visible.map(i => <article key={i.employeeId} className="rounded-xl border p-4"><h3 className="font-bold">{i.name}</h3><p className="text-xs text-slate-600">#{i.employeeId} · {i.role} · {i.status.replaceAll('_', ' ')}</p><dl className="mt-3 grid grid-cols-2 gap-2 text-sm">{[['Daily rate', i.rate ? money(i.rate) : 'Not configured'], ['Payable days', i.payableDays.toFixed(3)], ['Base', money(i.base)], ['Late deduction', money(i.deduction)], ['Salary', money(i.salary)]].map(([k,v]) => <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></div>)}</dl><button className="mt-3 font-semibold text-blue-700 underline" onClick={() => setSelected(i)}>View {i.name}</button></article>)}</div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><span>{filtered.length} employee(s) · page {page} of {Math.max(1, Math.ceil(filtered.length / 10))}</span><div className="flex gap-2"><button className={buttonClass} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button className={buttonClass} disabled={page * 10 >= filtered.length} onClick={() => setPage(page + 1)}>Next</button></div></div>
      </section>
    </>}
    {selected && <section className="rounded-2xl border bg-white p-4 sm:p-6" aria-label="Employee salary breakdown"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-bold">{selected.name} — attendance breakdown</h2><button className={buttonClass} onClick={() => setSelected(null)}>Close breakdown</button></div>
      {!selected.details.length && <p className="mt-4">No attendance in this period.</p>}
      {selected.exceptions.length > 0 && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><ul className="list-disc pl-5">{selected.exceptions.map(e => <li key={e}>{e}</li>)}</ul>{isSuperadmin && onCorrectAttendance && <button className="mt-3 font-semibold underline" onClick={() => onCorrectAttendance(selected.employeeId)}>Open Manual Attendance</button>}</div>}
      <div className="mt-4 space-y-3">{selected.details.map(d => <article className="rounded-xl border p-4 text-sm" key={d.date}><h3 className="font-semibold">{d.date} · {d.schedule} PHT</h3><p className="mt-2">Worked: {d.workedMinutes.toFixed(2)} min · Grace credit: {d.graceMinutes.toFixed(2)} min · Lunch excluded: {d.lunchMinutes.toFixed(2)} min</p><p>Unpaid early: {d.earlyMinutes.toFixed(2)} min · Unpaid after-hours: {d.afterMinutes.toFixed(2)} min · Late: {d.lateMinutes.toFixed(2)} min</p><p className="mt-2 font-semibold">{money(d.rate)} × {d.payableDays.toFixed(6)} day credit = {money(d.base)} − {money(d.deduction)} lateness = {money(d.salary)}</p>{d.fullLateDay && <p className="text-blue-700">Full-day base pay retained: late arrival followed by attendance through scheduled end.</p>}<ul className="mt-3 space-y-1 text-slate-600">{d.logs.map(l => <li key={l.id}>#{l.id} {l.status} · {formatAttendanceTime(l.timestamp)} · {l.site_name || 'Site unavailable'} · {l.source}{l.created_by ? ` by ${l.created_by}` : ''}{l.reason ? ` — ${l.reason}` : ''}</li>)}</ul>{(data.transfers || []).filter(t => t.user_id === selected.employeeId && d.logs.some(l => l.id === t.in_log_id)).map(t => <p key={t.id} className="mt-2">Site transfer: {t.from_site_name} → {t.to_site_name} · {formatAttendanceTime(t.effective_at_utc)}</p>)}</article>)}</div>
    </section>}
    {isSuperadmin && <section className="rounded-2xl border bg-white p-4 sm:p-6"><h2 className="text-lg font-bold">Daily rate setup</h2><p className="mt-1 text-sm text-slate-600">Rates are effective-dated and immutable. Historical schedules initially use the employee's current position; review them before using historical payroll.</p><form onSubmit={saveRate} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm">Employee<select required className={`${inputClass} mt-1`} value={rateEmployee} onChange={e => setRateEmployee(e.target.value)}><option value="">Choose employee</option>{directory.employees.map(e => <option key={e.id} value={e.id}>{e.name} (#{e.id}, {e.role})</option>)}</select></label><label className="text-sm">Daily rate (PHP)<input required type="number" min="0.01" max="9999999999.99" step="0.01" className={`${inputClass} mt-1`} value={dailyRate} onChange={e => setDailyRate(e.target.value)} /></label><label className="text-sm">Effective from<input required type="date" className={`${inputClass} mt-1`} value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} /></label><button className={`${buttonClass} self-end`} disabled={busy}>Save daily rate</button></form>{rateEmployee && <ul className="mt-3 text-sm text-slate-600">{selectedRates.length ? selectedRates.map(r => <li key={r.id}>{r.effective_from}: {money(r.daily_rate)} / day</li>) : <li>No rate history.</li>}</ul>}</section>}
    <section className="rounded-2xl border bg-white p-4 sm:p-6"><h2 className="text-lg font-bold">Saved payroll</h2><p className="mt-1 text-sm text-slate-600">Finalized records preserve attendance, rates and the calculation policy. Finalize after the period ends.</p><div className="mt-4 space-y-2">{history.runs.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span>{r.startDate}–{r.endDate} · {r.status} · #{r.id}</span><button disabled={busy} className={buttonClass} onClick={() => loadRun(r.id)}>View payroll #{r.id}</button></div>)}{!history.runs.length && <p className="text-sm text-slate-500">No saved payroll records yet.</p>}</div><div className="mt-4 flex gap-2"><button className={buttonClass} disabled={historyPage <= 1 || busy} onClick={() => setHistoryPage(historyPage - 1)}>Previous records</button><button className={buttonClass} disabled={historyPage * 20 >= history.total || busy} onClick={() => setHistoryPage(historyPage + 1)}>Next records</button></div></section>
  </div>;
}
