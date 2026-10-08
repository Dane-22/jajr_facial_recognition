const pool = require('../config/db');
const { manualLog } = require('../middleware/audit');
const { encrypt } = require('../utils/crypto');
const { changeEmployeeStatus, EmployeeStatusError } = require('../services/employeeArchive');

// Get all employees with advanced search and filtering
const getAllEmployees = async (req, res) => {
  try {
    await pool.ready;
    const { search, role, startDate, endDate, status, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    if (status && !['active', 'archived', 'all'].includes(status)) {
      return res.status(400).json({ error: 'Invalid employee status filter.' });
    }
    
    let query = 'SELECT id, name, role, created_at, is_active, archived_at FROM users WHERE 1=1';
    const params = [];
    if (status === 'active' || status === 'archived') {
      query += ' AND is_active = ?';
      params.push(status === 'active' ? 1 : 0);
    }
    
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
    const requestedSortOrder = String(sortOrder).toUpperCase();
    const sortDirection = allowedSortOrders.includes(requestedSortOrder) ? requestedSortOrder : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortDirection} LIMIT 1000`;
    
    const [employees] = await pool.query(query, params);
    
    // Get total count for pagination info
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];
    if (status === 'active' || status === 'archived') {
      countQuery += ' AND is_active = ?';
      countParams.push(status === 'active' ? 1 : 0);
    }
    
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
      filters: { search, role, startDate, endDate, status, sortBy, sortOrder }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single employee by ID
const getEmployeeById = async (req, res) => {
  try {
    await pool.ready;
    const { id } = req.params;
    const [employees] = await pool.query(
      'SELECT id, name, role, created_at, is_active, archived_at FROM users WHERE id = ?',
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
    await pool.ready;
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

    const [newEmployee] = await pool.query(
      'SELECT id, name, role, created_at, is_active, archived_at FROM users WHERE id = ?',
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
    await pool.ready;
    const { id } = req.params;
    const { name, role, face_descriptor } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    const [existing] = await pool.query(
      'SELECT id, name, role, is_active FROM users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    if (!existing[0].is_active) {
      return res.status(409).json({ error: 'Restore this employee before editing.' });
    }

    const oldData = { id: existing[0].id, name: existing[0].name, role: existing[0].role };

    let encryptedDescriptor = null;
    if (face_descriptor) {
      const faceDescriptorJson = typeof face_descriptor === 'string' ? face_descriptor : JSON.stringify(face_descriptor);
      encryptedDescriptor = encrypt(faceDescriptorJson);
    }

    const [updateResult] = await pool.query(
      'UPDATE users SET name = ?, role = ?, face_descriptor = COALESCE(?, face_descriptor) WHERE id = ? AND is_active = 1',
      [name, role, encryptedDescriptor, id]
    );
    if (!updateResult.affectedRows) return res.status(409).json({ error: 'Restore this employee before editing.' });

    const [updatedEmployee] = await pool.query(
      'SELECT id, name, role, created_at, is_active, archived_at FROM users WHERE id = ?',
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

const setEmployeeStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || typeof req.body?.active !== 'boolean') {
      return res.status(400).json({ error: 'Choose an employee and an active status.' });
    }
    await pool.ready;
    const employee = await changeEmployeeStatus({ db: pool, employeeId: id, adminId: req.user.id,
      active: req.body.active, ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent') || null });
    res.json({ employee, message: employee.is_active ? 'Employee restored.' : 'Employee archived.' });
  } catch (error) {
    if (error instanceof EmployeeStatusError) return res.status(error.status).json({ error: error.message });
    console.error('Error changing employee status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteEmployee = (_req, res) => res.status(409).json({
  error: 'Permanent deletion is disabled to preserve attendance history. Archive the employee instead.'
});

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  setEmployeeStatus,
  deleteEmployee
};
