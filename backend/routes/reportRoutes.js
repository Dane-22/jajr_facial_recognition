const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/authMiddleware');
const { 
  getDailyReport, 
  getWeeklyReport, 
  getMonthlyReport, 
  getAttendanceStats 
} = require('../controllers/reportController');

// Get daily attendance report
router.get('/daily', verifyAdminToken, getDailyReport);

// Get weekly attendance report
router.get('/weekly', verifyAdminToken, getWeeklyReport);

// Get monthly attendance report
router.get('/monthly', verifyAdminToken, getMonthlyReport);

// Get attendance statistics for dashboard
router.get('/stats', verifyAdminToken, getAttendanceStats);

module.exports = router;
