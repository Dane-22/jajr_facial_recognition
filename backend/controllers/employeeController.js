const pool = require('../config/db');

// Get all employees
const getAllEmployees = async (req, res) => {
  try {
    const [employees] = await pool.query(
      'SELECT id, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 1000'
    );
    res.status(200).json({ employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single employee by ID
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const [employees] = await pool.query(
      'SELECT id, name, role, created_at FROM users WHERE id = ?',
      [id]
    );

    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json({ employee: employees[0] });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new employee
const createEmployee = async (req, res) => {
  try {
    const { name, role, face_descriptor } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    if (!face_descriptor) {
      return res.status(400).json({ error: 'Face descriptor is required for new employees' });
    }

    // Convert face descriptor array to JSON string for storage
    const faceDescriptorJson = JSON.stringify(face_descriptor);

    const [result] = await pool.query(
      'INSERT INTO users (name, role, face_descriptor) VALUES (?, ?, ?)',
      [name, role, faceDescriptorJson]
    );

    const [newEmployee] = await pool.query(
      'SELECT id, name, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ 
      message: 'Employee created successfully', 
      employee: newEmployee[0] 
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, face_descriptor } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await pool.query(
      'UPDATE users SET name = ?, role = ?, face_descriptor = COALESCE(?, face_descriptor) WHERE id = ?',
      [name, role, face_descriptor || null, id]
    );

    const [updatedEmployee] = await pool.query(
      'SELECT id, name, role, created_at FROM users WHERE id = ?',
      [id]
    );

    res.status(200).json({ 
      message: 'Employee updated successfully', 
      employee: updatedEmployee[0] 
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete employee
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
