const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const initDatabase = async () => {
  try {
    // First connect without database to create it
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    // Create database
    await connection.query('CREATE DATABASE IF NOT EXISTS facial_attendance_db');
    await connection.query('USE facial_attendance_db');

    // Read and execute the SQL file (skip the first two lines since we already did them)
    const sql = fs.readFileSync('./database.sql', 'utf8');
    
    // Remove the first two lines (CREATE DATABASE and USE)
    const lines = sql.split('\n');
    const tableSql = lines.slice(2).join('\n');
    
    // Split by semicolon and execute each statement
    const statements = tableSql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
        } catch (err) {
          // Ignore errors for existing tables/indexes
          if (!err.code.includes('ER_TABLE_EXISTS_ERROR') && !err.code.includes('ER_DUP_KEYNAME')) {
            throw err;
          }
        }
      }
    }

    console.log('Database initialized successfully');
    await connection.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initDatabase();
