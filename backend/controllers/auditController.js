const pool = require('../config/db');

const getAuditLogs = async (req, res) => {
  try {
    const { 
      action, 
      entityType, 
      userId, 
      userType,
      startDate, 
      endDate, 
      sortBy = 'timestamp', 
      sortOrder = 'DESC',
      page = 1,
      limit = 50
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = ' WHERE 1=1';
    const params = [];
    
    // Filter by action
    if (action) {
      whereClause += ' AND audit_logs.action = ?';
      params.push(action);
    }
    
    // Filter by entity type
    if (entityType) {
      whereClause += ' AND audit_logs.entity_type = ?';
      params.push(entityType);
    }
    
    // Filter by user ID
    if (userId) {
      whereClause += ' AND audit_logs.user_id = ?';
      params.push(userId);
    }
    
    // Filter by user type
    if (userType) {
      whereClause += ' AND audit_logs.user_type = ?';
      params.push(userType);
    }
    
    // Filter by date range
    if (startDate) {
      whereClause += ' AND audit_logs.timestamp >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND audit_logs.timestamp <= ?';
      params.push(endDate);
    }
    
    // Get total count
    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`, params);
    const total = countResult[0].total;

    let query = `
      SELECT audit_logs.*, 
        CASE 
          WHEN audit_logs.user_type = 'admin' THEN (SELECT username FROM admins WHERE id = audit_logs.user_id)
          WHEN audit_logs.user_type = 'employee' THEN (SELECT name FROM users WHERE id = audit_logs.user_id)
          ELSE 'Unknown'
        END as user_name
      FROM audit_logs
      ${whereClause}
    `;
    
    // Sort
    const allowedSortFields = ['id', 'action', 'entity_type', 'timestamp', 'user_id'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'timestamp';
    const allowedSortOrders = ['ASC', 'DESC'];
    const sortDirection = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    query += ` ORDER BY audit_logs.${sortField} ${sortDirection}`;
    query += ` LIMIT ? OFFSET ?`;
    
    const queryParams = [...params, parseInt(limit), offset];
    
    const [logs] = await pool.query(query, queryParams);
    
    res.status(200).json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      },
      filters: { action, entityType, userId, userType, startDate, endDate, sortBy, sortOrder }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [logs] = await pool.query(
      `
      SELECT audit_logs.*, 
        CASE 
          WHEN audit_logs.user_type = 'admin' THEN (SELECT username FROM admins WHERE id = audit_logs.user_id)
          WHEN audit_logs.user_type = 'employee' THEN (SELECT name FROM users WHERE id = audit_logs.user_id)
          ELSE 'Unknown'
        END as user_name
      FROM audit_logs
      WHERE audit_logs.id = ?
      `,
      [id]
    );
    
    if (logs.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }
    
    res.status(200).json({ log: logs[0] });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAuditStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate) {
      dateFilter += ' AND timestamp >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      dateFilter += ' AND timestamp <= ?';
      params.push(endDate);
    }
    
    // Get action counts
    const [actionCounts] = await pool.query(
      `SELECT action, COUNT(*) as count FROM audit_logs WHERE 1=1 ${dateFilter} GROUP BY action`,
      params
    );
    
    // Get entity type counts
    const [entityCounts] = await pool.query(
      `SELECT entity_type, COUNT(*) as count FROM audit_logs WHERE 1=1 ${dateFilter} GROUP BY entity_type`,
      params
    );
    
    // Get user type counts
    const [userTypeCounts] = await pool.query(
      `SELECT user_type, COUNT(*) as count FROM audit_logs WHERE 1=1 ${dateFilter} GROUP BY user_type`,
      params
    );
    
    // Get total logs
    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1 ${dateFilter}`,
      params
    );
    
    res.status(200).json({
      total: totalResult[0].total,
      byAction: actionCounts,
      byEntityType: entityCounts,
      byUserType: userTypeCounts
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById,
  getAuditStats
};
