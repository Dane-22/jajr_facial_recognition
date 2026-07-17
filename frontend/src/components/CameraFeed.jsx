import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const CameraFeed = ({ onFaceDetected, faceMatcher, isModelsLoaded }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const detectionIntervalRef = useRef(null);

  /**
   * Initialize webcam stream
   */
  const startVideo = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreamActive(true);
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
    }
  }, []);

  /**
   * Stop webcam stream
   */
  const stopVideo = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreamActive(false);
    }
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

    // Set canvas dimensions to match video
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    // Detect faces using tinyFaceDetector
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    // Resize detections to match display size
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // Clear canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find matches for each detected face
    resizedDetections.forEach((detection) => {
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
      
      // Draw detection box
      const box = detection.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: bestMatch.toString(),
        boxColor: bestMatch.distance < 0.6 ? '#00ff00' : '#ff0000',
        lineWidth: 2
      });
      drawBox.draw(canvas);

      // If confidence is good (distance < 0.6), trigger attendance
      if (bestMatch.distance < 0.6) {
        onFaceDetected({
          userId: bestMatch.label,
          confidence: bestMatch.distance,
          name: bestMatch.label
        });
      }
    });
  }, [faceMatcher, isModelsLoaded, onFaceDetected]);

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
    };
  }, [isStreamActive, isModelsLoaded, detectFaces]);

  /**
   * Start video on mount
   */
  useEffect(() => {
    startVideo();

    return () => {
      stopVideo();
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [startVideo, stopVideo]);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
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
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
        />
        
        {/* Status indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            isStreamActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
            {isStreamActive ? 'Camera Active' : 'Camera Inactive'}
          </span>
        </div>

        {/* Detection status */}
        {isModelsLoaded && (
          <div className="absolute top-4 right-4">
            <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
              {faceMatcher ? 'Face Recognition Ready' : 'No Registered Users'}
            </span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-gray-600 text-sm">
        <p>Position your face clearly in front of the camera for attendance scanning</p>
      </div>
    </div>
  );
};

export default CameraFeed;
