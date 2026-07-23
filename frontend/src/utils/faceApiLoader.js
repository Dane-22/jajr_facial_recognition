import * as faceapi from 'face-api.js';

const API_URL = 'http://localhost:5000/api';

/**
 * Load face-api.js models from CDN
 * @returns {Promise<void>}
 */
export const loadModels = async () => {
  const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
  
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    console.log('Face-api models loaded successfully');
  } catch (error) {
    console.error('Error loading face-api models:', error);
    throw new Error('Failed to load face-api models from CDN');
  }
};

const KIOSK_API_KEY = 'kiosk_dev_secret_key_2026';

/**
 * Fetch registered users from the backend API
 * @returns {Promise<Array>} Array of user objects with face descriptors
 */
export const fetchRegisteredUsers = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    const headers = { 'X-Kiosk-Api-Key': KIOSK_API_KEY };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/users`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    const users = await response.json();
    console.log('Fetched users:', users);
    console.log('Number of users:', users.length);
    console.log('Users with face descriptors:', users.filter(u => u.face_descriptor || u.faceDescriptor).length);
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
  try {
    const labeledDescriptors = users
      .filter(user => user.face_descriptor || user.faceDescriptor)
      .map(user => {
        // Handle both snake_case and camelCase field names
        const descriptorData = user.face_descriptor || user.faceDescriptor;
        
        // Parse the stored face descriptor (stored as JSON array string)
        const descriptor = typeof descriptorData === 'string' 
          ? JSON.parse(descriptorData) 
          : descriptorData;
        const float32Descriptor = new Float32Array(descriptor);
        
        // Use user name as the label for voice announcements
        const label = user.name || String(user._id || user.id);
        
        return new faceapi.LabeledFaceDescriptors(
          label,
          [float32Descriptor]
        );
      });
    
    console.log(`Created ${labeledDescriptors.length} labeled face descriptors`);
    return labeledDescriptors;
  } catch (error) {
    console.error('Error creating labeled face descriptors:', error);
    throw error;
  }
};

/**
 * Initialize the face matcher with registered users
 * @returns {Promise<faceapi.FaceMatcher|null>}
 */
export const initializeFaceMatcher = async () => {
  try {
    const users = await fetchRegisteredUsers();
    const labeledDescriptors = await createLabeledFaceDescriptors(users);
    
    if (labeledDescriptors.length === 0) {
      console.log('No registered users with face descriptors found');
      return null;
    }
    
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    return faceMatcher;
  } catch (error) {
    console.error('Error initializing face matcher:', error);
    return null;
  }
};
