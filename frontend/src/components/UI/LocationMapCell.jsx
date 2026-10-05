import React from 'react';

const LocationMapCell = ({ latitude, longitude }) => {
  if (latitude == null || longitude == null || latitude === '' || longitude === '') {
    return <span className="text-slate-500 text-xs">No location data</span>;
  }

  const coordinates = `${latitude},${longitude}`;
  return (
    <details className="min-w-0 max-w-full text-xs text-slate-700">
      <summary className="w-fit cursor-pointer rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
        View map
      </summary>
      <div className="mt-2 space-y-2">
        <span className="block break-all">{coordinates}</span>
        <iframe
          title={`Map for ${coordinates}`}
          width="200"
          height="120"
          loading="lazy"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(coordinates)}&hl=en&z=17&output=embed`}
          className="h-[120px] w-full max-w-[200px] rounded-lg border border-slate-200"
        />
      </div>
    </details>
  );
};

export default LocationMapCell;
