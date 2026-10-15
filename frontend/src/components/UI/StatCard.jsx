import React from 'react';

const StatCard = ({ title, value }) => {
  return (
    <div className="bg-white border border-slate-200 shadow-md rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-black">{value}</p>
        </div>

      </div>
    </div>
  );
};

export default StatCard;
