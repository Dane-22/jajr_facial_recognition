import { useCallback, useEffect, useMemo, useState } from 'react';

const manilaInputNow = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 19);
const toManilaIso = value => value ? `${value}${value.length === 16 ? ':00' : ''}+08:00` : '';
const isCompleteTime = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value);
const formatManila = value => value ? new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short'
}).format(new Date(value)) + ' PHT' : '—';

function ManilaDateTimeFields({ label, value, onChange }) {
  const [date = '', time = ''] = value.split('T');
  return <fieldset className="min-w-0 space-y-1">
    <legend className="text-sm font-semibold">{label} · Asia/Manila</legend>
    <div className="flex flex-wrap gap-2">
      <label className="min-w-28 flex-1 text-xs font-medium text-slate-600">Date
        <input type="date" value={date} onChange={event => onChange(`${event.target.value}T${time}`)}
          className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 p-2 text-base" />
      </label>
      <label className="min-w-28 flex-1 text-xs font-medium text-slate-600">Time
        <input type="time" step="1" value={time} onChange={event => onChange(`${date}T${event.target.value}`)}
          className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 p-2 text-base" />
      </label>
    </div>
  </fieldset>;
}

export default function ManualAttendance() {
  const [employees, setEmployees] = useState([]);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState('IN');
  const [siteId, setSiteId] = useState('');
  const [at, setAt] = useState(manilaInputNow);
  const [outAt, setOutAt] = useState(manilaInputNow);
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [maxAgeDays, setMaxAgeDays] = useState(30);

  const request = useCallback(async (path = '', options = {}) => {
    const response = await fetch(`/api/admin/manual-attendance${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('admin_token')}`, ...options.headers }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Request failed.');
    return body;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const body = await request();
      setEmployees(body.employees || []);
      setMaxAgeDays(body.maxAgeDays || 30);
      setError('');
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => { refresh(); }, [refresh]);

  const visibleEmployees = useMemo(() => employees.filter(employee =>
    employee.name.toLowerCase().includes(query.trim().toLowerCase()) || String(employee.id) === query.trim()
  ), [employees, query]);
  const selected = employees.find(employee => employee.id === expandedId);

  const openEmployee = async employee => {
    if (expandedId === employee.id) { setExpandedId(null); return; }
    setExpandedId(employee.id);
    setMode(employee.session ? 'OUT' : 'IN');
    setSiteId('');
    setAt(manilaInputNow()); setOutAt(manilaInputNow()); setReason('');
    setReviewing(false); setMessage(''); setError(''); setHistory([]);
    try { setHistory((await request(`/${employee.id}`)).logs || []); }
    catch (failure) { setError(failure.message); }
  };

  const effectiveSite = mode === 'OUT' ? selected?.session?.site_name
    : selected?.sites.find(site => String(site.id) === siteId)?.name;
  const submit = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const transferring = mode === 'TRANSFER';
      const result = await request(`/${selected.id}${transferring ? '/site-transfer' : ''}`, { method: 'POST',
        body: JSON.stringify(transferring ? { fromSiteId: selected.session?.site_id, toSiteId: Number(siteId), reason }
          : { mode, siteId: mode === 'OUT' ? selected.session?.site_id : Number(siteId),
            at: toManilaIso(at), outAt: mode === 'PAIR' ? toManilaIso(outAt) : undefined, reason }) });
      setReviewing(false); setReason('');
      if (transferring) { setSiteId(''); setAt(manilaInputNow()); }
      setMessage(transferring
        ? `${selected.name} transferred to ${result.transfer.to_site_name} at ${formatManila(result.transfer.timestamp)}.`
        : `${result.logs.length} manual attendance record${result.logs.length === 1 ? '' : 's'} saved for ${selected.name}.`);
      await refresh();
      setHistory((await request(`/${selected.id}`)).logs || []);
    } catch (failure) {
      if (mode === 'TRANSFER') { await refresh(); setSiteId(''); }
      setError(failure.message); setReviewing(false);
    }
    finally { setBusy(false); }
  };

  return <section className="max-w-6xl min-w-0 space-y-4 pb-24">
    <header>
      <h2 className="text-xl font-bold text-slate-900">Manual Attendance</h2>
      <p className="text-sm text-slate-600 mt-1">Superadmin only · Asia/Manila time · Attendance entries up to {maxAgeDays} days back</p>
    </header>
    <label className="block text-sm font-semibold text-slate-700 max-w-md">Search employees
      <input type="search" value={query} onChange={event => setQuery(event.target.value)}
        placeholder="Name or employee ID" className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-base" />
    </label>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {loading && <p className="text-sm text-slate-600">Loading employees…</p>}
    {!loading && !visibleEmployees.length && <p className="text-sm text-slate-600">No employees found.</p>}
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {visibleEmployees.map(employee => <article key={employee.id}
        className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="break-words text-base font-bold text-slate-900">{employee.name}</h3>
            <p className="text-sm text-slate-600">Employee #{employee.id}{employee.role ? ` · ${employee.role}` : ''}</p>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${employee.session
            ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
            {employee.session ? 'Timed in' : 'No open time-in'}
          </span>
        </div>
        {employee.session && <p className="mt-2 text-sm text-slate-700">{employee.session.site_name} · Since {formatManila(employee.session.started_at)}</p>}
        <button type="button" onClick={() => openEmployee(employee)} aria-expanded={expandedId === employee.id}
          className="mt-3 min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          {expandedId === employee.id ? 'Close attendance details' : 'Manage attendance'}
        </button>
        {expandedId === employee.id && <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
          <fieldset className="space-y-2"><legend className="text-sm font-bold">Action</legend>
            {[['IN', 'Time in'], ['OUT', 'Time out'], ['PAIR', 'Historical pair'], ['TRANSFER', 'Transfer site']].map(([value, label]) =>
              <label key={value} className="inline-flex min-h-11 items-center gap-2 mr-4 text-sm">
                <input type="radio" name={`mode-${employee.id}`} value={value} checked={mode === value}
                  disabled={(value === 'IN' && Boolean(employee.session)) ||
                    ((value === 'OUT' || value === 'TRANSFER') && !employee.session)}
                  onChange={() => { setMode(value); setSiteId(''); setAt(manilaInputNow()); setReviewing(false); }} />{label}
              </label>)}
          </fieldset>
          {mode === 'OUT' && <p className="text-sm">Site: <strong>{employee.session?.site_name}</strong></p>}
          {mode === 'TRANSFER' && <p className="text-sm">Current site: <strong>{employee.session?.site_name}</strong>. The open shift and original time-in remain in place.</p>}
          {mode !== 'OUT' && <label className="block text-sm font-semibold">{mode === 'TRANSFER' ? 'Transfer to assigned site' : 'Assigned site'}
              <select required value={siteId} onChange={event => { setSiteId(event.target.value); setReviewing(false); }}
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 p-2 text-base">
                <option value="">Select site</option>
                {employee.sites.filter(site => mode !== 'TRANSFER' || site.id !== employee.session?.site_id)
                  .map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </label>}
          {mode === 'TRANSFER' && employee.sites.every(site => site.id === employee.session?.site_id) &&
            <p className="text-sm text-amber-800">Assign another active site to this employee in Settings before transferring.</p>}
          {mode !== 'TRANSFER' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ManilaDateTimeFields label={mode === 'PAIR' ? 'Time in' : `Time ${mode.toLowerCase()}`}
              value={at} onChange={value => { setAt(value); setReviewing(false); }} />
            {mode === 'PAIR' && <ManilaDateTimeFields label="Time out" value={outAt}
              onChange={value => { setOutAt(value); setReviewing(false); }} />}
          </div>}
          {mode === 'TRANSFER' && <p className="text-sm text-slate-600">The transfer takes effect when you confirm and save it.</p>}
          <label className="block text-sm font-semibold">Reason (10–500 characters)
            <textarea value={reason} minLength={10} maxLength={500} rows={2}
              onChange={event => { setReason(event.target.value); setReviewing(false); }}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-base" />
          </label>
          {!reviewing ? <button type="button" disabled={busy || (mode !== 'TRANSFER' && !isCompleteTime(at)) || (mode === 'PAIR' && !isCompleteTime(outAt)) ||
              (mode !== 'OUT' && !siteId) || reason.trim().length < 10}
            onClick={() => { setError(''); setReviewing(true); }}
            className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {mode === 'TRANSFER' ? 'Review transfer' : 'Review entry'}
          </button> : <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-bold">{mode === 'TRANSFER' ? 'Confirm site transfer' : 'Confirm manual attendance'}</p>
            <p>{employee.name} · {mode === 'TRANSFER' ? `${employee.session?.site_name} → ${effectiveSite}`
              : `${mode === 'PAIR' ? 'Historical time-in and time-out' : `Time ${mode.toLowerCase()}`} · ${effectiveSite}`}</p>
            {mode === 'TRANSFER' ? <p>Effective when saved. The current shift continues.</p>
              : <p>Effective {mode === 'PAIR' ? 'time-in' : 'time'}: {formatManila(toManilaIso(at))}</p>}
            {mode === 'PAIR' && <p>Effective time-out: {formatManila(toManilaIso(outAt))}</p>}
            <p>Reason: {reason.trim()}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={submit}
                className="min-h-11 rounded-lg bg-amber-800 px-4 py-2 font-semibold text-white disabled:opacity-50">
                {busy ? 'Saving…' : 'Confirm and save'}
              </button>
              <button type="button" disabled={busy} onClick={() => setReviewing(false)}
                className="min-h-11 rounded-lg border border-slate-300 px-4 py-2">Edit</button>
            </div>
          </div>}
          <div>
            <h4 className="text-sm font-bold">Recent attendance and site transfers</h4>
            {!history.length && <p className="text-sm text-slate-600">No records found.</p>}
            <ol className="mt-2 space-y-2">
              {history.map(log => <li key={`${log.kind || 'attendance'}-${log.id}`} className="rounded-lg border border-slate-200 p-2 text-sm">
                {log.kind === 'transfer' ? <>
                  <p className="font-semibold">Site transfer · {formatManila(log.timestamp)}</p>
                  <p>{log.from_site_name} → {log.to_site_name} · Shift continues</p>
                  <details className="mt-1"><summary className="cursor-pointer font-semibold">Transfer details</summary>
                    <p>Recorded: {formatManila(log.created_at)}</p><p>By: {log.created_by}</p>
                    <p>Reason: {log.reason}</p>
                  </details>
                </> : <>
                  <p className="font-semibold">#{log.id} · {log.status} · {formatManila(log.timestamp)}</p>
                  <p>{log.site_name || 'No site'} · {log.source === 'manual' ? 'Manual' : 'Scanner'}</p>
                  {log.source === 'manual' && <details className="mt-1"><summary className="cursor-pointer font-semibold">Manual-entry details</summary>
                    <p>Created: {formatManila(log.created_at)}</p><p>By: {log.created_by}</p>
                    <p>Reason: {log.reason}</p>
                  </details>}
                </>}
              </li>)}
            </ol>
          </div>
        </div>}
      </article>)}
    </div>
  </section>;
}
