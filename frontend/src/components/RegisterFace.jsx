import React, { useState, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const API_URL = 'http://localhost:5000/api';

const RegisterFace = () => {
  const [formData, setFormData] = useState({
    name: '',
    role: ''
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturing(false);
    }
  }, []);

  const captureFaceDescriptor = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== 4) return;

    try {
      setIsProcessing(true);
      setError('');

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections) {
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        const drawBox = new faceapi.draw.DrawBox(resizedDetections.detection.box, {
          label: 'Face Detected',
          boxColor: '#00ff00',
          lineWidth: 2
        });
        drawBox.draw(canvas);

        setFaceDescriptor(Array.from(detections.descriptor));
        setSuccess(true);
      } else {
        setError('No face detected. Please position your face clearly in the frame.');
      }
    } catch (error) {
      console.error('Error capturing face:', error);
      setError('Failed to capture face. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!formData.name || !formData.role) {
      setError('Name and role are required');
      return;
    }

    if (!faceDescriptor) {
      setError('Please capture a face descriptor first');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          faceDescriptor
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register user');
      }

      const result = await response.json();
      
      setSuccess(true);
      setFormData({ name: '', role: '' });
      setFaceDescriptor(null);
      
      setTimeout(() => {
        setSuccess(false);
        stopCamera();
      }, 3000);

    } catch (error) {
      console.error('Error registering user:', error);
      setError('Failed to register user. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
      {/* Compact Integrated Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Register Face</h2>
        <p className="text-slate-500 text-xs">Register a new user and capture their face encoding for attendance recognition.</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="mb-4 p-3 bg-slate-100 border border-slate-200 rounded-lg">
            <p className="text-slate-800 text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-slate-100 border border-slate-200 rounded-lg">
            <p className="text-slate-800 text-sm font-medium">User registered successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className="w-full">
              <label htmlFor="name" className="block text-xs font-medium text-slate-600 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-black text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all duration-200"
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="w-full">
              <label htmlFor="role" className="block text-xs font-medium text-slate-600 mb-1.5">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-black text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all duration-200"
                required
              >
                <option value="">Select role</option>
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Intern">Intern</option>
                <option value="Contractor">Contractor</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Face Capture</h3>
              {!isCapturing ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Start Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Stop Camera
                </button>
              )}
            </div>

            {isCapturing && (
              <div className="w-full h-[400px] bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
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
                <button
                  type="button"
                  onClick={captureFaceDescriptor}
                  disabled={isProcessing}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-md px-6 py-3 bg-white hover:bg-slate-100 disabled:bg-slate-300 disabled:cursor-not-allowed text-black font-medium rounded-lg transition-colors duration-200"
                >
                  {isProcessing ? 'Processing...' : 'Capture Face'}
                </button>
              </div>
            )}

            {faceDescriptor && (
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-slate-800 text-sm font-medium">Face descriptor captured successfully</p>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!faceDescriptor || isProcessing}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 text-sm"
          >
            Register User
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterFace;
