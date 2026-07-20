const express = require('express');
const router = express.Router();
const { logAttendance, getDailyLogs, getAllLogs, getLastAttendance } = require('../controllers/attendanceController');
const { verifyAdminToken } = require('../middleware/authMiddleware');

router.post('/log', logAttendance);
router.get('/daily', verifyAdminToken, getDailyLogs);
router.get('/all', verifyAdminToken, getAllLogs);
router.get('/last/:userId', getLastAttendance);

module.exports = router;
