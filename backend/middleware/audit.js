const pool = require('../config/db');

const auditMiddleware = (action, entityType = null) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to log after response
    res.json = function(data) {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAudit(req, action, entityType, data).catch(err => {
          console.error('Audit logging error:', err);
        });
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
};

const logAudit = async (req, action, entityType, responseData) => {
  try {
    const userId = req.user?.id || null;
    const userType = req.user?.type || 'admin';
    const entityId = req.params.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || null;
    
    let oldValues = null;
    let newValues = null;
    
    // For CREATE operations, log the new data
    if (action === 'CREATE' && responseData) {
      newValues = responseData;
    }
    
    // For UPDATE operations, we need to fetch old data before update
    // This is handled in controllers with manual logging
    
    // For DELETE operations, log the deleted data
    if (action === 'DELETE' && responseData) {
      oldValues = responseData;
    }
    
    const query = `
      INSERT INTO audit_logs (user_id, user_type, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await pool.query(query, [
      userId,
      userType,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

const manualLog = async (userId, userType, action, entityType, entityId, oldValues, newValues, ipAddress, userAgent) => {
  try {
    const query = `
      INSERT INTO audit_logs (user_id, user_type, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await pool.query(query, [
      userId,
      userType,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error('Manual audit logging error:', error);
  }
};

module.exports = {
  auditMiddleware,
  manualLog
};
