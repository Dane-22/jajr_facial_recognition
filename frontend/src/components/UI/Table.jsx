import React from 'react';

const Table = ({ columns, data, emptyMessage, emptyIcon }) => {
  const getStatusBadge = (status) => {
    if (status === 'IN') {
      return (
        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold border border-slate-200">
          IN
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-xs font-semibold border border-slate-300">
        OUT
      </span>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
          <div className="text-slate-400">
            {emptyIcon}
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-x-auto w-full">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-5 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-slate-50 transition-colors duration-150">
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className="px-5 py-3 whitespace-nowrap text-sm text-slate-700"
                >
                  {column.key === 'status' ? (
                    getStatusBadge(row[column.key])
                  ) : column.render ? (
                    column.render(row[column.key], row)
                  ) : (
                    row[column.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
