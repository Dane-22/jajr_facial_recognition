const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS !== 'false',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0
});

// Run auto-migrations on startup
const runMigrations = async () => {
  try {
    // 1. Add position column to admins table if not present
    const [columns] = await pool.query(`SHOW COLUMNS FROM admins LIKE 'position'`);
    if (columns.length === 0) {
      await pool.query(`ALTER TABLE admins ADD COLUMN position VARCHAR(50) NOT NULL DEFAULT 'Admin' AFTER password`);
      console.log('[DB Migration] Added position column to admins table');
    }

    // 2. Ensure initial admin (#1) is set to Superadmin
    await pool.query(`UPDATE admins SET position = 'Superadmin' WHERE id = 1 AND (position IS NULL OR position = 'Admin')`);

    // 3. Create Chat Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`chat_rooms\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NULL,
        \`type\` ENUM('direct', 'group', 'department', 'announcement') DEFAULT 'group',
        \`avatar_url\` VARCHAR(255) NULL,
        \`created_by_id\` INT NULL,
        \`created_by_type\` ENUM('admin', 'employee') DEFAULT 'admin',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`chat_room_members\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`room_id\` INT NOT NULL,
        \`member_id\` INT NOT NULL,
        \`member_type\` ENUM('admin', 'employee') NOT NULL,
        \`role\` ENUM('owner', 'admin', 'member') DEFAULT 'member',
        \`joined_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`last_read_at\` TIMESTAMP NULL,
        FOREIGN KEY (\`room_id\`) REFERENCES \`chat_rooms\`(\`id\`) ON DELETE CASCADE,
        UNIQUE KEY \`uniq_room_member\` (\`room_id\`, \`member_id\`, \`member_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`chat_messages\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`room_id\` INT NOT NULL,
        \`sender_id\` INT NOT NULL,
        \`sender_type\` ENUM('admin', 'employee') NOT NULL,
        \`message_type\` ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
        \`content\` TEXT NOT NULL,
        \`attachment_url\` VARCHAR(255) NULL,
        \`reply_to_id\` INT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`room_id\`) REFERENCES \`chat_rooms\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`reply_to_id\`) REFERENCES \`chat_messages\`(\`id\`) ON DELETE SET NULL,
        INDEX \`idx_room_messages\` (\`room_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`chat_message_reactions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`message_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`user_type\` ENUM('admin', 'employee') NOT NULL,
        \`emoji\` VARCHAR(20) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`message_id\`) REFERENCES \`chat_messages\`(\`id\`) ON DELETE CASCADE,
        UNIQUE KEY \`uniq_user_reaction\` (\`message_id\`, \`user_id\`, \`user_type\`, \`emoji\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Seed Default Chat Rooms if none exist
    const [existingRooms] = await pool.query(`SELECT COUNT(*) as count FROM chat_rooms`);
    if (existingRooms[0].count === 0) {
      await pool.query(`
        INSERT INTO chat_rooms (name, type, avatar_url) VALUES
        ('📢 General Announcements', 'announcement', '📢'),
        ('💻 IT Department', 'department', '💻'),
        ('⚙️ Engineering Department', 'department', '⚙️'),
        ('💼 Admin Lounge', 'group', '💼')
      `);
      console.log('[DB Migration] Seeded default chat rooms');
    }
  } catch (err) {
    console.warn('[DB Migration] Auto-migration check warning:', err.message);
  }
};

runMigrations();

module.exports = pool;
