import * as SQLite from 'expo-sqlite';

const DB_NAME = 'attendance.db';
let db = null;

/**
 * Initializes the database and creates tables if they don't exist.
 */
export const initDB = async () => {
    try {
        db = await SQLite.openDatabaseAsync(DB_NAME);
        
        // Table for caching employee face embeddings for offline recognition
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS Employees (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                department TEXT,
                faceDescriptor TEXT NOT NULL
            );
        `);

        // Table for logging offline attendance
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS AttendanceLog (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employeeId INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                synced INTEGER DEFAULT 0,
                FOREIGN KEY (employeeId) REFERENCES Employees(id)
            );
        `);
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database', error);
        throw error;
    }
};

export const getDB = () => {
    if (!db) {
        throw new Error('Database not initialized. Call initDB() first.');
    }
    return db;
};
