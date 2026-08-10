import { getUnsyncedAttendance, markAttendanceAsSynced } from '../database/queries';
import apiClient from '../api/client';
import CryptoJS from 'crypto-js';

/**
 * Synchronizes offline attendance records with the backend database.
 * Returns an object with success count and failure count.
 */
export const syncOfflineData = async () => {
    try {
        const unsyncedRecords = await getUnsyncedAttendance();

        if (!unsyncedRecords || unsyncedRecords.length === 0) {
            return { success: 0, failed: 0, message: 'No records to sync' };
        }

        let syncedIds = [];
        let failedCount = 0;
        const KIOSK_API_KEY = process.env.EXPO_PUBLIC_KIOSK_API_KEY || 'kiosk_dev_secret_key_2026';
        
        // Chunk array into batches of 100
        const chunkSize = 100;
        for (let i = 0; i < unsyncedRecords.length; i += chunkSize) {
            const chunk = unsyncedRecords.slice(i, i + chunkSize);
            
            // Format records with signatures
            const formattedRecords = chunk.map(record => {
                const userId = record.employeeId;
                const status = record.status || 'IN';
                const timestamp = new Date(record.timestamp).toISOString();
                const payload = `${userId}:${status}:${timestamp}`;
                const signature = CryptoJS.HmacSHA256(payload, KIOSK_API_KEY).toString(CryptoJS.enc.Hex);
                
                return {
                    id: record.id, // Keep local id for reference
                    userId,
                    status,
                    timestamp,
                    signature,
                    isOfflineSync: true
                };
            });

            try {
                const response = await apiClient.post('/attendance/batch-sync', {
                    records: formattedRecords
                }, {
                    headers: { 'X-Kiosk-Api-Key': KIOSK_API_KEY }
                });

                if (response.status === 200 || response.status === 201) {
                    // All successfully processed by backend
                    // Note: Backend might skip duplicates, but we still mark them as synced locally
                    syncedIds = [...syncedIds, ...chunk.map(r => r.id)];
                } else {
                    failedCount += chunk.length;
                }
            } catch (err) {
                console.error(`Failed to sync batch starting at index ${i}`, err);
                failedCount += chunk.length;
            }
        }

        // Update local database to mark successful ones as synced
        if (syncedIds.length > 0) {
            await markAttendanceAsSynced(syncedIds);
        }

        return {
            success: syncedIds.length,
            failed: failedCount,
            message: `Synced ${syncedIds.length} records. Failed: ${failedCount}`
        };
    } catch (error) {
        console.error('Error during synchronization process:', error);
        throw error;
    }
};
