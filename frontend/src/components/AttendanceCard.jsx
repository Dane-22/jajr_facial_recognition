import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const AttendanceCard = ({ systemStatus, lastDetection }) => {
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  /**
   * Log attendance to backend
   */
  const logAttendance = async (userId, userName) => {
    try {
      // Determine status based on last attendance (IN/OUT toggle)
      const lastUserAttendance = recentAttendance.find(a => a.userId === userId);
      const status = lastUserAttendance?.status === 'IN' ? 'OUT' : 'IN';

      const response = await fetch(`${API_URL}/attendance/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to log attendance');
      }

      const result = await response.json();
      
      // Update recent attendance list
      setRecentAttendance(prev => [
        {
          userId,
          userName,
          status,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 4), // Keep only last 5
      ]);

      // Show success toast
      setToastMessage(`${userName} - ${status} recorded successfully!`);
      setToastType('success');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

    } catch (error) {
      console.error('Error logging attendance:', error);
      setToastMessage('Failed to log attendance. Please try again.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  /**
   * Handle face detection from camera
   */
  useEffect(() => {
    if (lastDetection && lastDetection.confidence < 0.6) {
      // Debounce to prevent multiple rapid calls for same user
      const lastUserAttendance = recentAttendance.find(a => a.userId === lastDetection.userId);
      const timeSinceLast = lastUserAttendance 
        ? Date.now() - new Date(lastUserAttendance.timestamp).getTime() 
        : Infinity;

      if (timeSinceLast > 5000) { // 5 second cooldown
        logAttendance(lastDetection.userId, lastDetection.name);
      }
    }
  }, [lastDetection, recentAttendance]);

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    return status === 'IN' ? 'bg-green-500' : 'bg-blue-500';
  };

  /**
   * Get system status color
   */
  const getSystemStatusColor = () => {
    switch (systemStatus) {
      case 'loading':
        return 'bg-yellow-500';
      case 'ready':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* System Status Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">System Status</h2>
          <div className={`w-3 h-3 rounded-full ${getSystemStatusColor()} animate-pulse`} />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600 font-medium">Current State</span>
            <span className="text-gray-900 font-semibold capitalize">
              {systemStatus === 'loading' && 'Loading Models...'}
              {systemStatus === 'ready' && 'Camera Active: Ready for Scan'}
              {systemStatus === 'error' && 'System Error'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600 font-medium">Detection Threshold</span>
            <span className="text-gray-900 font-semibold">0.6</span>
          </div>
        </div>
      </div>

      {/* Recent Attendance Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Attendance</h2>
        
        {recentAttendance.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No attendance recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAttendance.map((attendance, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getStatusColor(attendance.status)} flex items-center justify-center text-white font-bold`}>
                    {attendance.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{attendance.userName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(attendance.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(attendance.status)}`}>
                  {attendance.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-300 ${
            toastType === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white font-medium flex items-center gap-3`}
        >
          {toastType === 'success' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default AttendanceCard;
