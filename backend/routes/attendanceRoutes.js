const express = require('express');
const router = express.Router();
const { logAttendance, getDailyLogs, getAllLogs, getLastAttendance, getPublicSettings } = require('../controllers/attendanceController');
const { batchSync } = require('../controllers/syncController');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const { verifyKioskOrAdminToken } = require('../middleware/kioskAuth');
const { validateAttendance } = require('../middleware/validation');

router.get('/settings', getPublicSettings);
router.post('/log', verifyKioskOrAdminToken, validateAttendance, logAttendance);
router.post('/batch-sync', verifyKioskOrAdminToken, batchSync);
router.get('/daily', verifyAdminToken, getDailyLogs);
router.get('/all', verifyAdminToken, getAllLogs);
router.get('/last/:userId', verifyKioskOrAdminToken, getLastAttendance);

module.exports = router;
