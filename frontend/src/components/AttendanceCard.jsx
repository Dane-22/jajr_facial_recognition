import { useEffect, useState } from 'react';

export default function AttendanceCard({ systemStatus, lastDetection }) {
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    if (lastDetection) setRecent(previous => [lastDetection, ...previous].slice(0, 5));
  }, [lastDetection]);
  return <div className="w-full max-w-md mx-auto space-y-6">
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-4">System Status</h2>
      <p className="text-gray-700">{systemStatus === 'ready' ? 'Attendance server online' : systemStatus === 'loading' ? 'Connecting to attendance server...' : 'Attendance server unavailable'}</p>
    </div>
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Attendance</h2>
      {recent.length === 0 ? <p className="text-gray-500">No attendance recorded in this session</p> : recent.map(item =>
        <div key={item.timestamp} className="flex justify-between gap-3 border-t py-3 text-sm">
          <span className="font-medium">{item.name}</span><span>{item.status}</span><span>{new Date(item.timestamp).toLocaleTimeString()}</span>
        </div>)}
    </div>
  </div>;
}
