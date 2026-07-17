const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Hash the default password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Insert default admin
    await connection.execute(
      'INSERT INTO admins (username, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = ?',
      ['admin', hashedPassword, hashedPassword]
    );

    console.log('Default admin user created/updated successfully');
    console.log('Username: admin');
    console.log('Password: password123');

    await connection.end();
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
