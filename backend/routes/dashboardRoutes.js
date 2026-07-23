const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

// Get dashboard statistics and chart data
router.get('/stats', verifyAdminToken, getDashboardStats);

module.exports = router;
