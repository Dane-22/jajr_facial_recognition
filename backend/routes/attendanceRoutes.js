const express = require('express');
const router = express.Router();
const { logAttendance, getDailyLogs, getAllLogs } = require('../controllers/attendanceController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.post('/log', logAttendance);
router.get('/daily', verifyAdminToken, getDailyLogs);
router.get('/all', verifyAdminToken, getAllLogs);

module.exports = router;
