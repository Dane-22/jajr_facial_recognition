import * as faceapi from 'face-api.js';

const API_URL = '/api';

/**
 * Load face-api.js models from CDN
 * @returns {Promise<void>}
 */
export const loadModels = async () => {
  const MODEL_URL = '/models';
  
  try {
    try {
      await faceapi.tf.setBackend('webgl');
      await faceapi.tf.ready();
      console.log('TensorFlow backend set to:', faceapi.tf.getBackend());
    } catch (tfError) {
      console.warn('WebGL backend failed, using default CPU:', tfError);
    }

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    console.log('Face-api models loaded successfully');
  } catch (error) {
    console.error('Error loading face-api models:', error);
    throw new Error('Failed to load local face models. Check your connection and retry.');
  }
};


/**
 * Fetch registered users from the backend API
 * @returns {Promise<Array>} Array of user objects with face descriptors
 */
export const fetchRegisteredUsers = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    const headers = { Authorization: `Bearer ${token}` };

    const response = await fetch(`${API_URL}/users`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    const users = await response.json();
    return users;
  } catch (error) {
    console.error('Error fetching registered users:', error);
    throw error;
  }
};

/**
 * Parse face descriptors from backend users and create LabeledFaceDescriptors
 * @param {Array} users - Array of user objects with faceDescriptor field
 * @returns {Promise<faceapi.LabeledFaceDescriptors[]>}
 */
export const createLabeledFaceDescriptors = async (users) => {
  return users.flatMap(user => {
    try {
      const data = user.face_descriptor || user.faceDescriptor;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const samples = Array.isArray(parsed?.[0]) ? parsed : [parsed];
      if (!Number.isInteger(Number(user.id || user._id)) || !samples.length ||
          samples.some(sample => !Array.isArray(sample) || sample.length !== 128 || !sample.every(Number.isFinite))) return [];
      return [new faceapi.LabeledFaceDescriptors(
        String(user.id || user._id), samples.map(sample => new Float32Array(sample))
      )];
    } catch (error) {
      console.warn('Skipping an invalid face enrollment:', user.id);
      return [];
    }
  });
};

/**
 * Initialize the face matcher with registered users
 * @returns {Promise<{matcher: faceapi.FaceMatcher, names: Object}>}
 */
export const initializeFaceMatcher = async () => {
  try {
    const users = await fetchRegisteredUsers();
    const labeledDescriptors = await createLabeledFaceDescriptors(users);
    
    if (labeledDescriptors.length === 0) throw new Error('No enrolled employees are available for scanning.');
    
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    const names = Object.fromEntries(users.map(user => [String(user.id || user._id), user.name]));
    return { matcher: faceMatcher, names };
  } catch (error) {
    console.error('Error initializing face matcher:', error);
    throw error;
  }
};
