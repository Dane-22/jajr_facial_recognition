const express = require('express');
const router = express.Router();
const { getDashboardStats, getCalendarActivity } = require('../controllers/dashboardController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

// Get dashboard statistics and chart data
router.get('/stats', verifyAdminToken, getDashboardStats);

// Get calendar activity data
router.get('/calendar', verifyAdminToken, getCalendarActivity);

module.exports = router;
