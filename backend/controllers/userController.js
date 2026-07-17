const pool = require('../config/db');

const registerUser = async (req, res) => {
  try {
    const { name, role, faceDescriptor } = req.body;

    if (!name || !role || !faceDescriptor) {
      return res.status(400).json({ error: 'Name, role, and face descriptor are required' });
    }

    const faceDescriptorJson = JSON.stringify(faceDescriptor);

    const [result] = await pool.query(
      'INSERT INTO users (name, role, face_descriptor) VALUES (?, ?, ?)',
      [name, role, faceDescriptorJson]
    );

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
    const [rows] = await pool.query('SELECT id, name, role, face_descriptor, created_at FROM users');

    const users = rows.map(user => ({
      ...user,
      face_descriptor: JSON.parse(user.face_descriptor)
    }));

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
