const express = require('express');
const router = express.Router();
const { logAttendance, getDailyLogs, getAllLogs, getLastAttendance, getPublicSettings } = require('../controllers/attendanceController');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const { verifyKioskOrAdminToken } = require('../middleware/kioskAuth');
const { validateAttendance } = require('../middleware/validation');

router.get('/settings', getPublicSettings);
router.post('/log', verifyKioskOrAdminToken, validateAttendance, logAttendance);
router.post('/batch-sync', verifyKioskOrAdminToken, (_req, res) => res.status(409).json({
  error: 'Offline attendance is disabled. Scan while connected so site and open-session rules can be checked.'
}));
router.get('/daily', verifyAdminToken, getDailyLogs);
router.get('/all', verifyAdminToken, getAllLogs);
router.get('/last/:userId', verifyKioskOrAdminToken, getLastAttendance);

module.exports = router;
