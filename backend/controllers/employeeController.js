const pool = require('../config/db');
const { manualLog } = require('../middleware/audit');
const { encrypt } = require('../utils/crypto');

// Get all employees with advanced search and filtering
const getAllEmployees = async (req, res) => {
  try {
    const { search, role, startDate, endDate, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    
    let query = 'SELECT id, name, role, created_at FROM users WHERE 1=1';
    const params = [];
    
    // Search by name
    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    
    // Filter by role (exact match or starts with)
    if (role) {
      query += ' AND role LIKE ?';
      params.push(`${role}%`);
    }
    
    // Filter by date range (created_at)
    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }
    
    // Sort
    const allowedSortFields = ['id', 'name', 'role', 'created_at'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const allowedSortOrders = ['ASC', 'DESC'];
    const sortDirection = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortDirection} LIMIT 1000`;
    
    const [employees] = await pool.query(query, params);
    
    // Get total count for pagination info
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];
    
    if (search) {
      countQuery += ' AND name LIKE ?';
      countParams.push(`%${search}%`);
    }
    
    if (role) {
      countQuery += ' AND role LIKE ?';
      countParams.push(`${role}%`);
    }
    
    if (startDate) {
      countQuery += ' AND created_at >= ?';
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ' AND created_at <= ?';
      countParams.push(endDate);
    }
    
    const [countResult] = await pool.query(countQuery, countParams);
    
    res.status(200).json({ 
      employees, 
      total: countResult[0].total,
      filters: { search, role, startDate, endDate, sortBy, sortOrder }
    });
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

    // Convert face descriptor array to JSON string and encrypt for storage
    const faceDescriptorJson = JSON.stringify(face_descriptor);
    const encryptedDescriptor = encrypt(faceDescriptorJson);

    const [result] = await pool.query(
      'INSERT INTO users (name, role, face_descriptor) VALUES (?, ?, ?)',
      [name, role, encryptedDescriptor]
    );

    const [newEmployee] = await pool.query(
      'SELECT id, name, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    // Log create action
    await manualLog(
      req.user?.id,
      req.user?.type || 'admin',
      'CREATE',
      'employee',
      result.insertId,
      null,
      { id: newEmployee[0].id, name: newEmployee[0].name, role: newEmployee[0].role },
      req.ip || req.connection.remoteAddress,
      req.get('user-agent') || null
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
      'SELECT id, name, role FROM users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const oldData = existing[0];

    let encryptedDescriptor = null;
    if (face_descriptor) {
      const faceDescriptorJson = typeof face_descriptor === 'string' ? face_descriptor : JSON.stringify(face_descriptor);
      encryptedDescriptor = encrypt(faceDescriptorJson);
    }

    await pool.query(
      'UPDATE users SET name = ?, role = ?, face_descriptor = COALESCE(?, face_descriptor) WHERE id = ?',
      [name, role, encryptedDescriptor, id]
    );

    const [updatedEmployee] = await pool.query(
      'SELECT id, name, role, created_at FROM users WHERE id = ?',
      [id]
    );

    // Log update action
    await manualLog(
      req.user?.id,
      req.user?.type || 'admin',
      'UPDATE',
      'employee',
      id,
      { id: oldData.id, name: oldData.name, role: oldData.role },
      { id: updatedEmployee[0].id, name: updatedEmployee[0].name, role: updatedEmployee[0].role },
      req.ip || req.connection.remoteAddress,
      req.get('user-agent') || null
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
      'SELECT id, name, role FROM users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const deletedData = existing[0];

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    // Log delete action
    await manualLog(
      req.user?.id,
      req.user?.type || 'admin',
      'DELETE',
      'employee',
      id,
      { id: deletedData.id, name: deletedData.name, role: deletedData.role },
      null,
      req.ip || req.connection.remoteAddress,
      req.get('user-agent') || null
    );

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
