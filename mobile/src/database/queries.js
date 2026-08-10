import { getDB } from './index';

/**
 * Saves a new attendance record offline.
 * @param {number} employeeId
 * @param {string} timestamp (ISO string)
 * @param {string} status ('IN' or 'OUT')
 */
export const logOfflineAttendance = async (employeeId, timestamp, status = 'IN') => {
    const db = getDB();
    try {
        const result = await db.runAsync(
            'INSERT INTO AttendanceLog (employeeId, timestamp, status, synced) VALUES (?, ?, ?, 0)',
            [employeeId, timestamp, status]
        );
        return result.lastInsertRowId;
    } catch (error) {
        console.error('Error logging offline attendance:', error);
        throw error;
    }
};

/**
 * Retrieves all attendance records that haven't been synced to the server yet.
 */
export const getUnsyncedAttendance = async () => {
    const db = getDB();
    try {
        const rows = await db.getAllAsync('SELECT * FROM AttendanceLog WHERE synced = 0');
        return rows;
    } catch (error) {
        console.error('Error fetching unsynced attendance:', error);
        throw error;
    }
};

/**
 * Marks attendance records as synced after they are successfully pushed to the backend.
 * @param {number[]} ids Array of record IDs
 */
export const markAttendanceAsSynced = async (ids) => {
    if (!ids || ids.length === 0) return;
    
    const db = getDB();
    const placeholders = ids.map(() => '?').join(',');
    
    try {
        await db.runAsync(
            `UPDATE AttendanceLog SET synced = 1 WHERE id IN (${placeholders})`,
            ids
        );
    } catch (error) {
        console.error('Error marking attendance as synced:', error);
        throw error;
    }
};

/**
 * Syncs the local employee database with fresh data from the server.
 * This should be called when the app is online to cache face descriptors.
 * @param {Array} employees Array of employee objects from backend
 */
export const syncEmployeesToLocalDB = async (employees) => {
    const db = getDB();
    try {
        // Simple strategy: Clear old data and insert new to keep it fresh
        await db.execAsync('DELETE FROM Employees');
        
        const statement = await db.prepareAsync(
            'INSERT INTO Employees (id, name, department, faceDescriptor) VALUES ($id, $name, $department, $faceDescriptor)'
        );

        for (const emp of employees) {
            // Assume faceDescriptor comes down as a stringified array from the backend
            await statement.executeAsync({
                $id: emp.id,
                $name: emp.name,
                $department: emp.department || 'General',
                $faceDescriptor: typeof emp.faceDescriptor === 'string' ? emp.faceDescriptor : JSON.stringify(emp.faceDescriptor)
            });
        }
        await statement.finalizeAsync();
    } catch (error) {
        console.error('Error syncing employees to local DB:', error);
        throw error;
    }
};

/**
 * Gets all locally cached employees for on-device face recognition.
 */
export const getLocalEmployees = async () => {
    const db = getDB();
    try {
        const rows = await db.getAllAsync('SELECT * FROM Employees');
        return rows.map(row => ({
            ...row,
            faceDescriptor: JSON.parse(row.faceDescriptor)
        }));
    } catch (error) {
        console.error('Error getting local employees:', error);
        throw error;
    }
};
