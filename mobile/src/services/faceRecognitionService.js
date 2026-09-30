import apiClient from '../api/client';

/**
 * The server performs detection, matching, and attendance logging together.
 * A captured image never becomes a local attendance record on this client.
 */
export const scanAndLogAttendance = async (base64Image, location = {}) => {
    if (!base64Image) throw new Error('No camera image was captured. Please try again.');
    try {
        const response = await apiClient.post('/face/attendance', { imageBase64: base64Image, ...location });
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            throw new Error('Your session expired. Please sign in again.');
        }
        throw new Error(error.response?.data?.error || (error.request
            ? 'Cannot reach the attendance server. Check your connection and retry.'
            : 'Unable to scan your face. Please retry.'));
    }
};
