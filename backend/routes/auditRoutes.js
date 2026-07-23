const express = require('express');
const router = express.Router();
const { 
  getAuditLogs, 
  getAuditLogById, 
  getAuditStats 
} = require('../controllers/auditController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

// Get all audit logs with filtering and pagination
router.get('/', verifyAdminToken, getAuditLogs);

// Get audit statistics
router.get('/stats/summary', verifyAdminToken, getAuditStats);

// Get single audit log by ID
router.get('/:id', verifyAdminToken, getAuditLogById);

module.exports = router;
