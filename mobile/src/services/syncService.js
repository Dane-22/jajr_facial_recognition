import { getUnsyncedAttendance, markAttendanceAsSynced } from '../database/queries';
import apiClient from '../api/client';

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

        const syncedIds = [];
        let failedCount = 0;

        for (const record of unsyncedRecords) {
            try {
                // Post to the backend endpoint (adjust endpoint to match your Node.js backend)
                // Assuming the backend expects { employeeId, time, status } etc.
                const response = await apiClient.post('/attendance/record', {
                    employeeId: record.employeeId,
                    time: record.timestamp, // Assuming ISO string is handled correctly by backend
                    status: 'Present', // Or infer from time/logic
                    isOfflineSync: true, // Flag to let backend know this is historical
                });

                if (response.status === 200 || response.status === 201) {
                    syncedIds.push(record.id);
                } else {
                    failedCount++;
                }
            } catch (err) {
                console.error(`Failed to sync record ID ${record.id}`, err);
                failedCount++;
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
