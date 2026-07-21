import React, { useState, useEffect, useRef } from 'react';

const API_URL = 'http://localhost:5000/api';

const AttendanceCard = ({ systemStatus, lastDetection }) => {
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [loggedUsers, setLoggedUsers] = useState(new Set()); // Track users logged in current session
  const [userLastDetected, setUserLastDetected] = useState({}); // Track last detection time per user
  const SESSION_TIMEOUT = 10000; // 10 seconds timeout
  const MIN_TOGGLE_MINUTES = 15; // Minimum time between IN/OUT toggles
  
  // useRef for immediate synchronous tracking to prevent race conditions
  const pendingRequests = useRef(new Set()); // Track users with pending API calls
  const debounceTimers = useRef({}); // Track debounce timers per user
  const DEBOUNCE_DELAY = 2000; // 2 seconds debounce window

  /**
   * Speak attendance notification using Web Speech API
   */
  const speakAttendance = (userName, status) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`${userName} ${status} recorded successfully`);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
  };

  /**
   * Determine attendance status based on business rules
   * Returns null if no status change needed (prevents unnecessary API calls)
   */
  const determineAttendanceStatus = (lastAttendance) => {
    if (!lastAttendance || !lastAttendance.status) {
      // First time logging - default to IN
      return 'IN';
    }
    
    const lastTime = new Date(lastAttendance.timestamp).getTime();
    const currentTime = Date.now();
    const hoursSinceLast = (currentTime - lastTime) / (1000 * 60 * 60);
    const minutesSinceLast = (currentTime - lastTime) / (1000 * 60);
    
    // Business rule: More than 12 hours since last log = new shift, always IN
    if (hoursSinceLast > 12) {
      // New shift - always record IN
      return 'IN';
    }
    
    // Business rule: More than MIN_TOGGLE_MINUTES since last log = allow toggle
    if (minutesSinceLast > MIN_TOGGLE_MINUTES) {
      // Enough time passed - toggle status
      return lastAttendance.status === 'OUT' ? 'IN' : 'OUT';
    } else {
      // Not enough time - don't toggle, return null to prevent API call
      return null;
    }
  };

  /**
   * Log attendance to backend
   */
  const logAttendance = async (userId, userName) => {
    // Check immediately using useRef (synchronous) to prevent race conditions
    if (pendingRequests.current.has(userId)) {
      console.log(`Attendance request already pending for ${userName}, skipping`);
      return;
    }

    // Add to pending requests immediately
    pendingRequests.current.add(userId);

    // Clear any existing debounce timer for this user
    if (debounceTimers.current[userId]) {
      clearTimeout(debounceTimers.current[userId]);
    }

    try {
      // Add user to logged set for session tracking
      setLoggedUsers(prev => new Set([...prev, userId]));

      // Fetch last attendance from database
      const lastAttendanceResponse = await fetch(`${API_URL}/attendance/last/${userId}`);
      const lastAttendance = await lastAttendanceResponse.json();
      
      // Determine status based on business rules
      const status = determineAttendanceStatus(lastAttendance);

      // If status is null, no change needed - skip API call
      if (status === null) {
        console.log(`No status change needed for ${userName} (same session), skipping`);
        return;
      }

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
        // Remove from logged set if API call failed
        setLoggedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
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

      // Speak attendance notification
      speakAttendance(userName, status);

    } catch (error) {
      console.error('Error logging attendance:', error);
      // Remove from logged set if error occurred
      setLoggedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setToastMessage('Failed to log attendance. Please try again.');
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      // Set debounce timer to remove from pending requests after delay
      debounceTimers.current[userId] = setTimeout(() => {
        pendingRequests.current.delete(userId);
        delete debounceTimers.current[userId];
      }, DEBOUNCE_DELAY);
    }
  };

  /**
   * Handle face detection from camera with session-based logging
   */
  useEffect(() => {
    if (lastDetection && lastDetection.confidence < 0.6) {
      const { userId, name } = lastDetection;
      
      // Update last detection time for this user
      setUserLastDetected(prev => ({
        ...prev,
        [userId]: Date.now()
      }));

      // Check if user is already logged in current session
      if (loggedUsers.has(userId)) {
        // User already logged, ignore this detection
        return;
      }

      // Log attendance for this user
      logAttendance(userId, name);
    }
  }, [lastDetection, loggedUsers]);

  /**
   * Cleanup logged users who haven't been detected for SESSION_TIMEOUT
   */
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const usersToRemove = [];

      // Check each logged user
      loggedUsers.forEach(userId => {
        const lastDetected = userLastDetected[userId];
        if (lastDetected && now - lastDetected > SESSION_TIMEOUT) {
          usersToRemove.push(userId);
        }
      });

      // Remove users who haven't been detected for SESSION_TIMEOUT
      if (usersToRemove.length > 0) {
        setLoggedUsers(prev => {
          const newSet = new Set(prev);
          usersToRemove.forEach(id => newSet.delete(id));
          return newSet;
        });

        // Also clean up last detection times
        setUserLastDetected(prev => {
          const newState = { ...prev };
          usersToRemove.forEach(id => delete newState[id]);
          return newState;
        });
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(cleanupInterval);
  }, [loggedUsers, userLastDetected]);

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
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
          } text-white font-medium flex items-center gap-3`}>
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
