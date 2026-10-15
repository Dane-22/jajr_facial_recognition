const pool = require('../config/db');
const { dateRangeError, manilaBounds } = require('../utils/reportDates');

const auditWhere = filters => {
  const params = [];
  let sql = ' WHERE 1=1';
  for (const [key, column] of [['action', 'action'], ['entityType', 'entity_type'], ['userId', 'user_id'], ['userType', 'user_type']]) {
    if (filters[key]) { sql += ' AND audit_logs.' + column + ' = ?'; params.push(filters[key]); }
  }
  sql += manilaBounds('audit_logs.timestamp', filters.startDate, filters.endDate, params);
  return { sql, params };
};

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
    
    const dateError = dateRangeError(startDate, endDate);
    if (dateError) return res.status(400).json({ error: dateError });
    const pageNumber = Number(page), pageSize = Number(limit);
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
      return res.status(400).json({ error: 'Page must be positive and limit must be between 1 and 500.' });
    }
    const offset = (pageNumber - 1) * pageSize;
    if (!Number.isSafeInteger(offset)) return res.status(400).json({ error: 'Invalid page.' });
    const { sql: whereClause, params } = auditWhere(req.query);

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
    const sortDirection = allowedSortOrders.includes(String(sortOrder).toUpperCase()) ? String(sortOrder).toUpperCase() : 'DESC';
    
    query += ` ORDER BY audit_logs.${sortField} ${sortDirection}, audit_logs.id ${sortDirection}`;
    query += ` LIMIT ? OFFSET ?`;
    
    const queryParams = [...params, pageSize, offset];
    
    const [logs] = await pool.query(query, queryParams);
    
    res.status(200).json({
      logs,
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
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
    const dateError = dateRangeError(req.query.startDate, req.query.endDate);
    if (dateError) return res.status(400).json({ error: dateError });
    const { sql: whereClause, params } = auditWhere(req.query);

    // Get action counts
    const [actionCounts] = await pool.query(
      `SELECT action, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY action ORDER BY count DESC, action ASC`,
      params
    );
    
    // Get entity type counts
    const [entityCounts] = await pool.query(
      `SELECT entity_type, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY entity_type`,
      params
    );
    
    // Get user type counts
    const [userTypeCounts] = await pool.query(
      `SELECT user_type, COUNT(*) as count FROM audit_logs ${whereClause} GROUP BY user_type`,
      params
    );
    
    // Get total logs
    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
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
