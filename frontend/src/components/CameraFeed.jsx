import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { cameraManager } from '../utils/cameraManager';

const CameraFeed = ({ onFaceDetected, faceMatcher, isModelsLoaded }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('initializing'); // initializing, active, idle, error, motion_detection
  const [countdown, setCountdown] = useState(0); // Countdown timer in seconds
  const [isMotionDetectionActive, setIsMotionDetectionActive] = useState(false);
  const detectionIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  
  // Confidence thresholds for face recognition
  const HIGH_CONFIDENCE_THRESHOLD = 0.4; // Log attendance
  const LOW_CONFIDENCE_THRESHOLD = 0.6; // Show warning but don't log
  
  // Warning state for confidence issues
  const [warningMessage, setWarningMessage] = useState(null);
  const [warningType, setWarningType] = useState(null); // 'low-confidence' or 'unknown'
  const warningTimeoutRef = useRef(null);
  
  // Dwell time tracking for attendance logging
  const MIN_DWELL_TIME = 3000; // 3 seconds minimum dwell time
  const [dwellStartTime, setDwellStartTime] = useState(null);
  const [isDwelling, setIsDwelling] = useState(false);
  const [dwellCountdown, setDwellCountdown] = useState(0);
  const dwellIntervalRef = useRef(null);
  const currentUserIdRef = useRef(null); // Track which user is dwelling

  /**
   * Show warning message with auto-dismiss
   */
  const showWarning = useCallback((message, type) => {
    setWarningMessage(message);
    setWarningType(type);
    
    // Clear existing timeout
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    
    // Auto-dismiss after 3 seconds
    warningTimeoutRef.current = setTimeout(() => {
      setWarningMessage(null);
      setWarningType(null);
    }, 3000);
  }, []);

  /**
   * Reset dwell time tracking
   */
  const resetDwellTracking = useCallback(() => {
    if (dwellIntervalRef.current) {
      clearInterval(dwellIntervalRef.current);
      dwellIntervalRef.current = null;
    }
    setDwellStartTime(null);
    setIsDwelling(false);
    setDwellCountdown(0);
    currentUserIdRef.current = null;
  }, []);

  /**
   * Start dwell time tracking for a user
   */
  const startDwellTracking = useCallback((userId) => {
    // If already dwelling for same user, don't reset
    if (isDwelling && currentUserIdRef.current === userId) {
      return;
    }
    
    // Clear any existing dwell tracking
    resetDwellTracking();
    
    // Start new dwell tracking
    setDwellStartTime(Date.now());
    setIsDwelling(true);
    setDwellCountdown(MIN_DWELL_TIME / 1000);
    currentUserIdRef.current = userId;
  }, [isDwelling, resetDwellTracking]);

  /**
   * Countdown timer for dwell time
   */
  useEffect(() => {
    if (isDwelling && dwellCountdown > 0) {
      dwellIntervalRef.current = setInterval(() => {
        setDwellCountdown(prev => {
          if (prev <= 1) {
            clearInterval(dwellIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (dwellIntervalRef.current) {
        clearInterval(dwellIntervalRef.current);
        dwellIntervalRef.current = null;
      }
    }

    return () => {
      if (dwellIntervalRef.current) {
        clearInterval(dwellIntervalRef.current);
      }
    };
  }, [isDwelling]);

  /**
   * Initialize webcam stream using CameraManager
   */
  const startVideo = useCallback(async () => {
    try {
      setCameraStatus('initializing');
      setCameraError(null);
      
      const stream = await cameraManager.ensureActive();
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreamActive(true);
        setCameraStatus('active');
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      setCameraError(cameraManager.getErrorMessage(error));
      setCameraStatus('error');
      setIsStreamActive(false);
    }
  }, []);

  /**
   * Stop webcam stream using CameraManager
   */
  const stopVideo = useCallback(() => {
    cameraManager.stopCamera();
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    setIsStreamActive(false);
    setCameraStatus('idle');
  }, []);

  /**
   * Detect faces in video stream
   */
  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelsLoaded) {
      return;
    }

    // If no face matcher, just detect faces without recognition
    if (!faceMatcher) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== 4) {
      return;
    }

    // Register activity to prevent idle timeout
    cameraManager.registerActivity();

    // Set canvas dimensions to match video
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    // Detect faces using tinyFaceDetector
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    // Register face detection to reset face timeout and countdown
    if (detections.length > 0) {
      cameraManager.registerFaceDetection();
      setCountdown(5); // Reset countdown to 5 seconds
    }

    // Resize detections to match display size
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // Clear canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find matches for each detected face
    resizedDetections.forEach((detection) => {
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
      
      // Determine confidence level and box color
      let boxColor;
      if (bestMatch.distance < HIGH_CONFIDENCE_THRESHOLD) {
        boxColor = '#00ff00'; // Green - high confidence
      } else if (bestMatch.distance < LOW_CONFIDENCE_THRESHOLD) {
        boxColor = '#ffaa00'; // Orange - low confidence
      } else {
        boxColor = '#ff0000'; // Red - unknown
      }
      
      // Draw detection box
      const box = detection.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: bestMatch.toString(),
        boxColor: boxColor,
        lineWidth: 2
      });
      drawBox.draw(canvas);

      // Handle based on confidence level
      if (bestMatch.distance < HIGH_CONFIDENCE_THRESHOLD) {
        // High confidence - start dwell tracking
        const userId = bestMatch.label;
        startDwellTracking(userId);
        
        // Check if minimum dwell time has been reached
        if (dwellStartTime && (Date.now() - dwellStartTime >= MIN_DWELL_TIME)) {
          // Dwell time reached - log attendance
          onFaceDetected({
            userId: bestMatch.label,
            confidence: bestMatch.distance,
            name: bestMatch.label
          });
          resetDwellTracking();
        }
      } else if (bestMatch.distance < LOW_CONFIDENCE_THRESHOLD) {
        // Low confidence - reset dwell tracking and show warning
        resetDwellTracking();
        showWarning(
          `Low confidence match for ${bestMatch.label}. Please reposition or improve lighting.`,
          'low-confidence'
        );
      } else {
        // Unknown face - reset dwell tracking and show warning
        resetDwellTracking();
        showWarning(
          'Unknown face detected. Please register to use attendance system.',
          'unknown'
        );
      }
    });
    
    // If no faces detected, reset dwell tracking
    if (detections.length === 0 && isDwelling) {
      resetDwellTracking();
    }
  }, [faceMatcher, isModelsLoaded, onFaceDetected, showWarning, startDwellTracking, resetDwellTracking, dwellStartTime, isDwelling]);

  /**
   * Start detection loop
   */
  useEffect(() => {
    if (isStreamActive && isModelsLoaded) {
      // Run detection at ~5-10 FPS (every 100-200ms)
      detectionIntervalRef.current = setInterval(detectFaces, 150);
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (dwellIntervalRef.current) {
        clearInterval(dwellIntervalRef.current);
      }
    };
  }, [isStreamActive, isModelsLoaded, detectFaces]);

  /**
   * Countdown timer for face timeout
   */
  useEffect(() => {
    if (countdown > 0 && cameraStatus === 'active') {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [countdown, cameraStatus]);

  /**
   * Start video on mount
   */
  useEffect(() => {
    startVideo();

    // Listen for camera manager events
    const handleCameraIdleStopped = () => {
      setCameraStatus('motion_detection');
      setIsMotionDetectionActive(true);
      setIsStreamActive(false);
      setCountdown(0);
    };

    const handleMotionDetected = () => {
      console.log('Motion detected, auto-reactivating camera');
      setIsMotionDetectionActive(false);
      setCameraStatus('initializing');
      startVideo();
    };

    cameraManager.on('cameraIdleStopped', handleCameraIdleStopped);
    cameraManager.on('motionDetected', handleMotionDetected);

    return () => {
      stopVideo();
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      cameraManager.off('cameraIdleStopped', handleCameraIdleStopped);
      cameraManager.off('motionDetected', handleMotionDetected);
    };
  }, [startVideo, stopVideo]);

  /**
   * Get status indicator color and text
   */
  const getStatusInfo = () => {
    switch (cameraStatus) {
      case 'initializing':
        return { color: 'bg-yellow-500 animate-pulse', text: 'Initializing...' };
      case 'active':
        return { 
          color: 'bg-green-500 animate-pulse', 
          text: countdown > 0 ? `Camera Active (${countdown}s)` : 'Camera Active' 
        };
      case 'motion_detection':
        return { color: 'bg-blue-500 animate-pulse', text: 'Motion Detection Active' };
      case 'idle':
        return { color: 'bg-gray-500', text: 'Camera Idle' };
      case 'error':
        return { color: 'bg-red-500', text: 'Camera Error' };
      default:
        return { color: 'bg-gray-500', text: 'Unknown' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
        {/* Error state */}
        {cameraStatus === 'error' && (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-10">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-400 font-medium mb-2">Camera Error</p>
            <p className="text-gray-400 text-sm text-center max-w-xs mb-4">{cameraError}</p>
            <button
              onClick={startVideo}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors duration-200">
              Retry Camera
            </button>
          </div>
        )}

        {/* Idle state */}
        {cameraStatus === 'idle' && (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-10">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium mb-2">Camera Idle</p>
            <p className="text-gray-500 text-sm text-center max-w-xs mb-4">
              Camera was stopped to save battery. Click to reactivate.
            </p>
            <button
              onClick={startVideo}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors duration-200">
              Reactivate Camera
            </button>
          </div>
        )}

        {/* Initializing state */}
        {cameraStatus === 'initializing' && (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-10">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-400 font-medium">Initializing camera...</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-auto"
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.play();
            }
          }}/>
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"/>
        
        {/* Status indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
          <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
            {statusInfo.text}
          </span>
        </div>

        {/* Confidence warning */}
        {warningMessage && (
          <div className="absolute top-4 right-4 max-w-xs">
            <div className={`px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm ${
              warningType === 'low-confidence' 
                ? 'bg-orange-500/90 text-white' 
                : 'bg-red-500/90 text-white'
            }`}>
              <div className="flex items-start gap-2">
                {warningType === 'low-confidence' ? (
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <p className="text-sm font-medium">{warningMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dwell time countdown */}
        {isDwelling && dwellCountdown > 0 && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
            <div className="bg-black/70 backdrop-blur-sm px-6 py-4 rounded-xl shadow-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="text-white text-sm font-medium">Hold position for attendance</div>
                <div className="flex items-center gap-3">
                  <div className={`text-3xl font-bold ${
                    dwellCountdown > 2 ? 'text-red-400' : 
                    dwellCountdown > 1 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {dwellCountdown}
                  </div>
                  <div className="w-16 h-2 bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        dwellCountdown > 2 ? 'bg-red-400' : 
                        dwellCountdown > 1 ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${((MIN_DWELL_TIME / 1000) - dwellCountdown) / (MIN_DWELL_TIME / 1000) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual controls */}
        {cameraStatus === 'active' && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={stopVideo}
              className="px-3 py-1.5 bg-red-600/80 hover:bg-red-700/80 text-white text-xs font-medium rounded-lg transition-colors duration-200 backdrop-blur-sm">
              Stop Camera
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-gray-600 text-sm">
        <p>Position your face clearly in front of the camera for attendance scanning</p>
        <p className="text-gray-400 text-xs mt-1">
          Camera will automatically stop after 30 seconds of inactivity to save battery
        </p>
      </div>
    </div>
  );
};

export default CameraFeed;
