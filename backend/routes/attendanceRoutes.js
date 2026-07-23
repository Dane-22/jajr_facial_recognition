const express = require('express');
const router = express.Router();
const { logAttendance, getDailyLogs, getAllLogs, getLastAttendance } = require('../controllers/attendanceController');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const { verifyKioskOrAdminToken } = require('../middleware/kioskAuth');
const { validateAttendance } = require('../middleware/validation');

router.post('/log', verifyKioskOrAdminToken, validateAttendance, logAttendance);
router.get('/daily', verifyAdminToken, getDailyLogs);
router.get('/all', verifyAdminToken, getAllLogs);
router.get('/last/:userId', verifyKioskOrAdminToken, getLastAttendance);

module.exports = router;
