import React from 'react';

export const RecordField = ({ label, value, dark = false }) => (
  <div className="min-w-0">
    <dt className={`text-xs font-semibold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</dt>
    <dd className={`mt-0.5 break-words text-sm ${dark ? 'text-slate-100' : 'text-slate-800'}`}>{value ?? '—'}</dd>
  </div>
);

const RecordCard = ({ title, subtitle, badge, fields = [], details = [], actions, testId, dark = false }) => (
  <article data-testid={testId} className={`min-w-0 rounded-xl border p-4 shadow-sm ${dark ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'}`}>
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <h4 className={`break-words text-base font-bold leading-snug ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
        {subtitle && <p className={`mt-0.5 text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>}
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
    </div>
    {fields.length > 0 && (
      <dl className="mt-3 grid grid-cols-1 gap-x-3 gap-y-2 min-[360px]:grid-cols-2">
        {fields.map(({ label, value }) => <RecordField key={label} label={label} value={value} dark={dark} />)}
      </dl>
    )}
    {details.length > 0 && (
      <details className={`mt-3 border-t pt-2 ${dark ? 'border-slate-600' : 'border-slate-100'}`}>
        <summary className={`w-fit cursor-pointer rounded-lg py-2 pr-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
          More details
        </summary>
        <dl className="grid grid-cols-1 gap-y-2 pb-1 pt-2">
          {details.map(({ label, value }) => <RecordField key={label} label={label} value={value} dark={dark} />)}
        </dl>
      </details>
    )}
    {actions && <div className={`mt-3 flex flex-wrap gap-2 border-t pt-3 ${dark ? 'border-slate-600' : 'border-slate-100'}`}>{actions}</div>}
  </article>
);

export default RecordCard;
