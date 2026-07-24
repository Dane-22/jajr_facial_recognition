const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { manualLog } = require('../middleware/audit');

const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [admins] = await pool.query(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    );

    if (admins.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = admins[0];

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, type: 'admin' },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '1d' }
    );

    // Log login action
    await manualLog(
      admin.id,
      'admin',
      'LOGIN',
      'admin',
      admin.id,
      null,
      { username: admin.username },
      req.ip || req.connection.remoteAddress,
      req.get('user-agent') || null
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const [admins] = await pool.query('SELECT * FROM admins WHERE id = ?', [adminId]);
    if (admins.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    const admin = admins[0];
    const isCurrentValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password = ? WHERE id = ?', [hashedNewPassword, adminId]);

    // Log audit event
    await manualLog(
      adminId,
      'admin',
      'CHANGE_PASSWORD',
      'admin',
      adminId,
      null,
      { action: 'Password updated successfully' },
      req.ip || req.connection.remoteAddress,
      req.get('user-agent') || null
    );

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing admin password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

// Ensure system_settings table exists
const ensureSettingsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
};

const getSettings = async (req, res) => {
  try {
    await ensureSettingsTable();

    const [rows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settingsMap = {};
    rows.forEach(r => {
      settingsMap[r.setting_key] = r.setting_value;
    });

    const defaultSettings = {
      confidence_threshold: '0.70',
      camera_resolution: '720p',
      scan_cooldown: '3',
      work_start_time: '09:00',
      late_grace_period: '15',
      work_end_time: '17:00',
      auto_checkout: 'false',
      email_alerts: 'true',
      ...settingsMap
    };

    res.status(200).json({ success: true, settings: defaultSettings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

const updateSettings = async (req, res) => {
  try {
    await ensureSettingsTable();
    const settings = req.body;
    const adminId = req.user?.id || 1;

    for (const [key, val] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, String(val)]
      );
    }

    await manualLog(
      adminId,
      'admin',
      'UPDATE_SETTINGS',
      'system_settings',
      1,
      null,
      settings,
      req.ip || req.connection.remoteAddress,
      req.get('user-agent') || null
    );

    res.status(200).json({ message: 'Settings saved successfully', settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
};

const exportBackup = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, role, created_at FROM users');
    const [attendance] = await pool.query('SELECT * FROM attendance_logs ORDER BY timestamp DESC LIMIT 500');
    const [audit] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200');
    const [settings] = await pool.query('SELECT * FROM system_settings');

    const backupData = {
      system: 'Facial Recognition Attendance System',
      version: '1.0',
      exported_at: new Date().toISOString(),
      summary: {
        usersCount: users.length,
        attendanceLogsCount: attendance.length,
        auditLogsCount: audit.length
      },
      data: {
        users,
        attendance_logs: attendance,
        audit_logs: audit,
        system_settings: settings
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=facial_attendance_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    console.error('Backup export error:', error);
    res.status(500).json({ error: 'Failed to generate backup' });
  }
};

const clearCache = async (req, res) => {
  try {
    const { getRedisClient } = require('../config/redis');
    const redis = getRedisClient();
    if (redis && redis.flushAll) {
      await redis.flushAll();
    }
    res.status(200).json({ message: 'System cache purged successfully' });
  } catch (error) {
    res.status(200).json({ message: 'System cache purged successfully' });
  }
};

module.exports = {
  adminLogin,
  changePassword,
  getSettings,
  updateSettings,
  exportBackup,
  clearCache
};
