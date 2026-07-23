/**
 * CameraManager - Manages camera lifecycle with state detection, 
 * graceful degradation, and battery optimization
 */
class CameraManager {
  constructor() {
    this.stream = null;
    this.isActive = false;
    this.isInitialized = false;
    this.idleTimeout = null;
    this.lastActivity = null;
    this.listeners = [];
    this.IDLE_TIMEOUT_MS = 30000; // 30 seconds of inactivity before stopping
    this.lastFaceDetection = null;
    this.faceTimeoutMs = 5000; // 5 seconds of no face detection before stopping
    this.faceTimeout = null;
    this.motionDetectionInterval = null;
    this.motionCanvas = null;
    this.motionContext = null;
    this.previousFrameData = null;
    this.isMotionDetectionActive = false;
    this.motionStream = null;
    this.motionVideo = null;
    this.currentFacingMode = 'user';
  }

  /**
   * Switch between front ('user') and rear ('environment') cameras
   */
  async toggleFacingMode() {
    const nextMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    this.stopCamera();
    return await this.startCamera({ video: { facingMode: nextMode, width: { ideal: 640 }, height: { ideal: 480 } } });
  }

  /**
   * Initialize camera and request stream
   * @param {Object} options - Camera configuration options
   * @returns {Promise<MediaStream>}
   */
  async startCamera(options = {}) {
    try {
      const facing = options?.video?.facingMode || this.currentFacingMode;
      const defaultOptions = {
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: facing
        },
        audio: false
      };

      const config = { ...defaultOptions, ...options };
      this.currentFacingMode = facing;
      
      this.stream = await navigator.mediaDevices.getUserMedia(config);
      this.isActive = true;
      this.isInitialized = true;
      this.lastActivity = Date.now();
      
      this._notifyListeners('cameraStarted', { stream: this.stream });
      console.log('Camera started successfully');
      
      return this.stream;
    } catch (error) {
      console.error('Error starting camera:', error);
      this._notifyListeners('cameraError', { error });
      throw error;
    }
  }

  /**
   * Stop camera stream and release resources
   */
  stopCamera() {
    if (this.stream) {
      const tracks = this.stream.getTracks();
      tracks.forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      
      this.stream = null;
      this.isActive = false;
      this.lastActivity = null;
      
      if (this.idleTimeout) {
        clearTimeout(this.idleTimeout);
        this.idleTimeout = null;
      }

      if (this.faceTimeout) {
        clearTimeout(this.faceTimeout);
        this.faceTimeout = null;
      }

      this.stopMotionDetection();
      
      this._notifyListeners('cameraStopped');
      console.log('Camera stopped');
    }
  }

  /**
   * Check if camera is currently active and streaming
   * @returns {boolean}
   */
  isCameraActive() {
    if (!this.stream) return false;
    
    const tracks = this.stream.getTracks();
    return tracks.some(track => track.readyState === 'live');
  }

  /**
   * Check if camera is ready to use
   * @returns {boolean}
   */
  isCameraReady() {
    return this.isInitialized && this.isCameraActive();
  }

  /**
   * Ensure camera is active, reinitialize if needed
   * @param {Object} options - Camera configuration options
   * @returns {Promise<MediaStream>}
   */
  async ensureActive(options = {}) {
    if (this.isCameraReady()) {
      this._updateActivity();
      return this.stream;
    }
    
    return await this.startCamera(options);
  }

  /**
   * Update last activity timestamp and reset idle timeout
   */
  _updateActivity() {
    this.lastActivity = Date.now();
    
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
    
    // Set new idle timeout
    this.idleTimeout = setTimeout(() => {
      console.log('Camera idle timeout reached, stopping for battery optimization');
      this.stopCamera();
      this._notifyListeners('cameraIdleStopped');
    }, this.IDLE_TIMEOUT_MS);
  }

  /**
   * Register activity to prevent idle timeout
   */
  registerActivity() {
    this._updateActivity();
  }

  /**
   * Get camera error type for user-friendly messages
   * @param {Error} error - Camera error
   * @returns {string} - Error type
   */
  getErrorType(error) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'permission_denied';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'no_camera';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'camera_in_use';
    }
    if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
      return 'constraint_not_met';
    }
    return 'unknown';
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Camera error
   * @returns {string} - User-friendly message
   */
  getErrorMessage(error) {
    const errorType = this.getErrorType(error);
    
    const messages = {
      permission_denied: 'Camera access was denied. Please allow camera access in your browser settings and try again.',
      no_camera: 'No camera was found on your device. Please connect a camera and try again.',
      camera_in_use: 'Camera is already in use by another application. Please close other applications using the camera.',
      constraint_not_met: 'Camera does not support the requested settings. Using default settings instead.',
      unknown: 'An error occurred while accessing the camera. Please try again.'
    };
    
    return messages[errorType] || messages.unknown;
  }

  /**
   * Add event listener for camera state changes
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    this.listeners = this.listeners.filter(
      listener => listener.event !== event || listener.callback !== callback
    );
  }

  /**
   * Notify all listeners of an event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _notifyListeners(event, data = {}) {
    this.listeners
      .filter(listener => listener.event === event)
      .forEach(listener => listener.callback(data));
  }

  /**
   * Register face detection to reset face timeout
   */
  registerFaceDetection() {
    this.lastFaceDetection = Date.now();
    
    if (this.faceTimeout) {
      clearTimeout(this.faceTimeout);
    }
    
    // Set new face timeout - stop camera if no face detected for faceTimeoutMs
    this.faceTimeout = setTimeout(() => {
      console.log('No face detected for timeout period, stopping camera');
      this.stopCamera();
      this._notifyListeners('cameraIdleStopped');
      this.startMotionDetection(); // Start motion detection for auto-reactivate
    }, this.faceTimeoutMs);
  }

  /**
   * Start motion detection for auto-reactivate
   */
  async startMotionDetection() {
    if (this.isMotionDetectionActive) return;
    
    this.isMotionDetectionActive = true;
    this.motionCanvas = document.createElement('canvas');
    this.motionContext = this.motionCanvas.getContext('2d');
    this.motionCanvas.width = 320; // Low resolution for performance
    this.motionCanvas.height = 240;
    
    try {
      // Start low-resolution camera for continuous motion monitoring
      this.motionStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('Motion detection started with low-res camera');
      
      // Create video element for motion detection
      this.motionVideo = document.createElement('video');
      this.motionVideo.srcObject = this.motionStream;
      this.motionVideo.width = 320;
      this.motionVideo.height = 240;
      this.motionVideo.muted = true;
      this.motionVideo.autoplay = true;
      this.motionVideo.playsInline = true;
      
      await this.motionVideo.play();
      
      // Check for motion every 2 seconds
      this.motionDetectionInterval = setInterval(() => {
        this.detectMotion();
      }, 2000);
      
    } catch (error) {
      console.error('Error starting motion detection:', error);
      this.stopMotionDetection();
    }
  }

  /**
   * Stop motion detection
   */
  stopMotionDetection() {
    if (this.motionDetectionInterval) {
      clearInterval(this.motionDetectionInterval);
      this.motionDetectionInterval = null;
    }
    
    if (this.motionStream) {
      this.motionStream.getTracks().forEach(track => track.stop());
      this.motionStream = null;
    }
    
    if (this.motionVideo) {
      this.motionVideo.pause();
      this.motionVideo.srcObject = null;
      this.motionVideo = null;
    }
    
    this.isMotionDetectionActive = false;
    this.motionCanvas = null;
    this.motionContext = null;
    this.previousFrameData = null;
    
    console.log('Motion detection stopped');
  }

  /**
   * Detect motion in camera feed
   */
  async detectMotion() {
    if (!this.motionCanvas || !this.motionVideo) return;
    
    try {
      // Draw current frame from motion video to canvas
      this.motionContext.drawImage(this.motionVideo, 0, 0, 320, 240);
      const currentFrameData = this.motionContext.getImageData(0, 0, 320, 240);
      
      // Compare with previous frame if available
      if (this.previousFrameData) {
        const motionDetected = this.compareFrames(currentFrameData, this.previousFrameData);
        
        if (motionDetected) {
          console.log('Motion detected, reactivating camera');
          this.stopMotionDetection();
          this._notifyListeners('motionDetected');
          return;
        }
      }
      
      this.previousFrameData = currentFrameData;
      
    } catch (error) {
      console.error('Error in motion detection:', error);
    }
  }

  /**
   * Compare two frames for motion detection
   */
  compareFrames(current, previous) {
    const threshold = 30; // Pixel difference threshold
    const motionThreshold = 1000; // Number of changed pixels to consider motion
    let changedPixels = 0;
    
    // Sample every 4th pixel for performance
    for (let i = 0; i < current.data.length; i += 16) {
      const rDiff = Math.abs(current.data[i] - previous.data[i]);
      const gDiff = Math.abs(current.data[i + 1] - previous.data[i + 1]);
      const bDiff = Math.abs(current.data[i + 2] - previous.data[i + 2]);
      
      if (rDiff + gDiff + bDiff > threshold) {
        changedPixels++;
      }
    }
    
    return changedPixels > motionThreshold;
  }

  /**
   * Cleanup and release all resources
   */
  destroy() {
    this.stopCamera();
    this.stopMotionDetection();
    this.listeners = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
export const cameraManager = new CameraManager();
export default CameraManager;
