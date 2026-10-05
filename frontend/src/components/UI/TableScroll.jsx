import React from 'react';

const TableScroll = ({ children, className = '' }) => (
  <div className={`min-w-0 max-w-full ${className}`}>
    <p className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500 sm:hidden" aria-hidden="true">
      Swipe table sideways to see all columns →
    </p>
    <div className="table-scroll max-w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="Scrollable table" tabIndex={0}>
      {children}
    </div>
  </div>
);

export default TableScroll;
