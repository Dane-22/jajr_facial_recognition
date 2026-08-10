import axios from 'axios';

// Replace with your actual backend local IP address or production URL
// For local Android emulator, usually 10.0.2.2. For physical device, use your machine's local IP on the network.
const API_BASE_URL = 'http://192.168.0.102:5000/api'; 

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptors if you need to attach auth tokens in the future
apiClient.interceptors.request.use(
    async (config) => {
        // e.g., const token = await AsyncStorage.getItem('token');
        // if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;
