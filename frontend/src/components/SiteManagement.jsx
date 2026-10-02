import { useCallback, useEffect, useState } from 'react';

const emptySite = { name: '', latitude: '', longitude: '', radius_meters: '100', active: true };

export default function SiteManagement() {
  const isSuperadmin = (() => {
    try {
      const payload = JSON.parse(atob((localStorage.getItem('admin_token') || '').split('.')[1]));
      return payload.position === 'Superadmin' || (payload.position == null && payload.id === 1);
    } catch { return false; }
  })();
  const [data, setData] = useState({ sites: [], employees: [], sessions: [] });
  const [form, setForm] = useState(emptySite);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [assignments, setAssignments] = useState({});
  const [assignmentFeedback, setAssignmentFeedback] = useState({});
  const [correction, setCorrection] = useState({});

  const request = async (path, options = {}) => {
    const response = await fetch(`/api/admin/${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('admin_token')}`, ...options.headers }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Request failed.');
    return body;
  };

  const refresh = useCallback(async () => {
    try {
      const result = await request('sites');
      setData(result);
      setAssignments(Object.fromEntries(result.employees.map(employee => [employee.id, employee.site_ids])));
      setError('');
    } catch (failure) { setError(failure.message); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const saveSite = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await request(editingId ? `sites/${editingId}` : 'sites', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, radius_meters: Number(form.radius_meters) })
      });
      setForm(emptySite); setEditingId(null); setMessage('Site saved.');
      await refresh();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };

  const saveAssignment = async userId => {
    setBusy(true); setError(''); setMessage('');
    setAssignmentFeedback(current => ({ ...current, [userId]: { type: 'saving', text: 'Saving...' } }));
    try {
      await request(`site-assignments/${userId}`, { method: 'PUT', body: JSON.stringify({ siteIds: assignments[userId] || [] }) });
      setAssignmentFeedback(current => ({ ...current, [userId]: { type: 'success', text: 'Assignments saved.' } }));
      await refresh();
    } catch (failure) {
      setAssignmentFeedback(current => ({ ...current, [userId]: { type: 'error', text: failure.message } }));
    }
    finally { setBusy(false); }
  };

  const correctTimeOut = async userId => {
    setBusy(true); setError(''); setMessage('');
    try {
      const entry = correction[userId] || {};
      await request(`time-out-corrections/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ correctedAt: entry.correctedAt ? new Date(entry.correctedAt).toISOString() : null, reason: entry.reason })
      });
      setCorrection(current => ({ ...current, [userId]: {} }));
      setMessage('Time-out correction recorded.');
      await refresh();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };

  const edit = site => {
    setEditingId(site.id);
    setForm({ name: site.name, latitude: String(site.latitude), longitude: String(site.longitude),
      radius_meters: String(site.radius_meters), active: Boolean(site.active) });
  };

  return <div className="space-y-6 max-w-5xl">
    <div><h3 className="text-sm font-bold text-slate-900">Sites & geofencing</h3>
      <p className="text-xs text-slate-500 mt-1">Employees can scan within an assigned site's allowed radius. Each time-out must occur at the same site as its time-in.</p></div>
    {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</p>}
    {message && <p role="status" className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs">{message}</p>}
    <div className="grid gap-3 md:grid-cols-3">
      {data.sites.map(site => <div key={site.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
        <div className="flex justify-between gap-2"><strong className="text-sm">{site.name}</strong><span className="text-xs">{site.active ? 'Active' : 'Inactive'}</span></div>
        <p className="text-xs text-slate-600 mt-2">{site.latitude}, {site.longitude}</p>
        <p className="text-xs text-slate-600">Allowed radius: {site.radius_meters} m</p>
        <button type="button" onClick={() => edit(site)} className="text-xs text-blue-700 font-semibold mt-3">Edit site</button>
      </div>)}
    </div>
    <form onSubmit={saveSite} className="p-4 rounded-xl border border-slate-200 space-y-3">
      <h4 className="text-sm font-bold">{editingId ? 'Edit site' : 'Add site'}</h4>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-xs font-semibold">Site name<input required maxLength="100" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="block w-full border rounded-lg p-2 mt-1" /></label>
        <label className="text-xs font-semibold">Allowed radius (10–1000 m)<input required type="number" min="10" max="1000" value={form.radius_meters} onChange={e => setForm({ ...form, radius_meters: e.target.value })} className="block w-full border rounded-lg p-2 mt-1" /></label>
        <label className="text-xs font-semibold">Latitude<input required type="number" step="any" min="-90" max="90" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} className="block w-full border rounded-lg p-2 mt-1" /></label>
        <label className="text-xs font-semibold">Longitude<input required type="number" step="any" min="-180" max="180" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} className="block w-full border rounded-lg p-2 mt-1" /></label>
      </div>
      <label className="text-xs flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active</label>
      {form.latitude && form.longitude && <iframe title="Site map preview" className="w-full h-64 border rounded-xl" src={`https://maps.google.com/maps?q=${encodeURIComponent(`${form.latitude},${form.longitude}`)}&hl=en&z=16&output=embed`} />}
      <div className="flex gap-3"><button disabled={busy} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs">Save site</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptySite); }} className="text-xs">Cancel edit</button>}</div>
    </form>
    <section className="space-y-3"><h4 className="text-sm font-bold">Employee site assignments</h4>
      {data.employees.map(employee => <div key={employee.id} className="border rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs">
        <strong className="min-w-36">{employee.name}</strong>
        {data.sites.filter(site => site.active || (assignments[employee.id] || []).includes(site.id)).map(site =>
          <label key={site.id} className="flex items-center gap-1"><input type="checkbox" checked={(assignments[employee.id] || []).includes(site.id)}
            onChange={e => {
              setAssignments(current => ({ ...current, [employee.id]: e.target.checked
                ? [...(current[employee.id] || []), site.id] : (current[employee.id] || []).filter(id => id !== site.id) }));
              setAssignmentFeedback(current => ({ ...current, [employee.id]: null }));
            }} />{site.name}</label>)}
        <button type="button" disabled={busy} onClick={() => saveAssignment(employee.id)} aria-label={`Save assignments for ${employee.name}`} className="ml-auto px-3 py-1.5 bg-slate-900 text-white rounded-lg">{assignmentFeedback[employee.id]?.type === 'saving' ? 'Saving...' : 'Save assignments'}</button>
        {assignmentFeedback[employee.id] && <span role={assignmentFeedback[employee.id].type === 'error' ? 'alert' : 'status'}
          className={`font-semibold ${assignmentFeedback[employee.id].type === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>
          {assignmentFeedback[employee.id].text}
        </span>}
      </div>)}
    </section>
    <section className="space-y-3"><h4 className="text-sm font-bold">Open time-ins · Superadmin corrections</h4>
      {!data.sessions.length && <p className="text-xs text-slate-500">No open time-ins.</p>}
      {data.sessions.map(session => <div key={session.user_id} className="border rounded-xl p-3 text-xs space-y-2">
        <p><strong>{session.employee_name}</strong> · {session.site_name} · In since {new Date(session.started_at).toLocaleString()}</p>
        {isSuperadmin && <><div className="grid md:grid-cols-2 gap-2">
          <label>Verified time-out<input type="datetime-local" value={correction[session.user_id]?.correctedAt || ''}
            onChange={e => setCorrection(current => ({ ...current, [session.user_id]: { ...current[session.user_id], correctedAt: e.target.value } }))} className="block border rounded-lg p-2 w-full mt-1" /></label>
          <label>Reason (at least 10 characters)<input value={correction[session.user_id]?.reason || ''}
            onChange={e => setCorrection(current => ({ ...current, [session.user_id]: { ...current[session.user_id], reason: e.target.value } }))} className="block border rounded-lg p-2 w-full mt-1" /></label>
        </div>
        <button type="button" disabled={busy} onClick={() => correctTimeOut(session.user_id)} className="px-3 py-1.5 bg-amber-700 text-white rounded-lg">Record corrected time-out</button></>}
      </div>)}
    </section>
  </div>;
}
