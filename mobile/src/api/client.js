import { create } from 'axios';

// Set EXPO_PUBLIC_API_URL to the local server when developing on a device.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://jajr.xandree.com/api';
let authToken = null;

export const setAuthToken = (token) => {
    authToken = token;
};

const apiClient = create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default apiClient;
