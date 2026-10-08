const pool = require('../config/db');
const { encrypt, decrypt } = require('../utils/crypto');

const registerUser = async (req, res) => {
  try {
    const { name, role, faceDescriptor } = req.body;

    if (!name || !role || !faceDescriptor) {
      return res.status(400).json({ error: 'Name, role, and face descriptor are required' });
    }

    const faceDescriptorJson = JSON.stringify(faceDescriptor);
    const encryptedDescriptor = encrypt(faceDescriptorJson);

    const connection = await pool.getConnection();
    let result;
    try {
      await connection.beginTransaction();
      [result] = await connection.query('INSERT INTO users (name, role, face_descriptor) VALUES (?, ?, ?)',
        [name, role, encryptedDescriptor]);
      const [assignment] = await connection.query(`INSERT INTO employee_sites (user_id, site_id)
        SELECT ?, id FROM sites WHERE site_key = 'MAIN_OFFICE'`, [result.insertId]);
      if (!assignment.affectedRows) throw new Error('Main Office site is missing.');
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId,
      name,
      role
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    await pool.ready;
    const [rows] = await pool.query('SELECT id, name, role, face_descriptor, created_at FROM users WHERE is_active = 1');

    const users = rows.map(user => {
      let descriptor = user.face_descriptor;
      try {
        const decrypted = decrypt(descriptor);
        descriptor = JSON.parse(decrypted);
      } catch (err) {
        console.warn(`[UserController] Failed to parse descriptor for user ID ${user.id}:`, err.message);
        descriptor = [];
      }
      return {
        ...user,
        face_descriptor: descriptor
      };
    });

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerUser,
  getAllUsers
};

