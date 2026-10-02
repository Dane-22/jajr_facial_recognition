const express = require('express');
const jwt = require('jsonwebtoken');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const { identifyFace } = require('../services/faceRecognition');
const pool = require('../config/db');
const { logAttendance } = require('../controllers/attendanceController');

const router = express.Router();
let isRecognizing = false;
const configuredCooldown = Number(process.env.KIOSK_TOGGLE_COOLDOWN_MINUTES);
const kioskToggleCooldownMinutes = Number.isFinite(configuredCooldown) && configuredCooldown >= 1 ? configuredCooldown : 2;

function isWithinToggleCooldown(minutesSinceLast, isPublicKiosk) {
  return minutesSinceLast < (isPublicKiosk ? kioskToggleCooldownMinutes : 1);
}

router.post('/session', verifyAdminToken, (req, res) => {
  const token = jwt.sign(
    { type: 'scanner', operatorId: req.user.id },
    process.env.JWT_SECRET || 'your_secret_key',
    { expiresIn: '8h' }
  );
  res.json({ token });
});

function verifyScannerToken(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Scanner sign in required.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    if (decoded.type !== 'scanner') return res.status(403).json({ error: 'Scanner session required.' });
    req.scannerOperatorId = decoded.operatorId;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Scanner session expired. Sign in again.' });
  }
}

function requireKioskOrigin(req, res, next) {
  const expected = process.env.FRONTEND_URL || 'http://localhost:3000';
  if (req.get('origin') !== expected) return res.status(403).json({ error: 'Open the scanner from the approved website.' });
  req.isPublicKiosk = true;
  return next();
}

async function scanAttendance(req, res) {
  const { imageBase64 } = req.body || {};
  if (typeof imageBase64 !== 'string' || imageBase64.length > 2_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return res.status(400).json({ error: 'A JPEG image under 1.5 MB is required.' });
  }
  if (isRecognizing) return res.status(503).json({ error: 'Scanner is busy. Please try again.' });
  isRecognizing = true;
  try {
    const image = Buffer.from(imageBase64, 'base64');
    if (image.length < 100 || image.length > 1_500_000 || image[0] !== 0xff || image[1] !== 0xd8) {
      return res.status(400).json({ error: 'Invalid or oversized JPEG image.' });
    }
    const started = performance.now();
    const result = await identifyFace(image);
    res.set('Server-Timing', `face;dur=${Math.round(performance.now() - started)}`);
    if (!result.user) {
      const messages = {
        image_too_small: 'Camera image is too small. Try a higher resolution.',
        image_too_large: 'Camera image is too large. Reduce resolution and retry.',
        no_face: 'No face found. Move closer and improve lighting.',
        multiple_faces: 'Only one person may be in the frame.',
        face_too_small: 'Move closer to the camera.',
        unknown: 'Face not recognized. Please retry or ask an administrator.'
      };
      const payload = { matched: false, error: messages[result.reason] || 'Face not recognized.', reason: result.reason };
      return req.isPublicKiosk ? res.json(payload) : res.status(422).json(payload);
    }

    // The kiosk remains open for the next person. A browser that just recorded
    // this face may ask us to suppress it until the frame has been empty.
    const skipIds = req.isPublicKiosk ? req.body.skipUserIds : null;
    if (Array.isArray(skipIds) && skipIds.length <= 100 && skipIds.includes(result.user.id)) {
      return res.json({ skipped: true, userId: result.user.id, name: result.user.name });
    }

    const [rows] = await pool.query(
      'SELECT status, timestamp FROM attendance_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1',
      [result.user.id]
    );
    const previous = rows[0];
    const minutesSinceLast = previous ? (Date.now() - new Date(previous.timestamp).getTime()) / 60000 : Infinity;
    if (isWithinToggleCooldown(minutesSinceLast, req.isPublicKiosk)) {
      if (req.isPublicKiosk) return res.json({ skipped: true, userId: result.user.id, name: result.user.name });
      return res.status(429).json({ error: 'Attendance was recorded recently. Please wait before retrying.' });
    }
    const [openSessions] = await pool.query('SELECT site_id FROM employee_site_sessions WHERE user_id = ?', [result.user.id]);
    const status = openSessions.length ? 'OUT' : 'IN';
    req.body = { userId: result.user.id, status, latitude: req.body.latitude, longitude: req.body.longitude };
    return await logAttendance(req, res);
  } catch (error) {
    console.error('[FaceRecognition] Scan failed:', error);
    return res.status(500).json({ error: 'Face scanner is temporarily unavailable.' });
  } finally {
    isRecognizing = false;
  }
}

router.post('/kiosk-attendance', requireKioskOrigin, scanAttendance);
router.post('/attendance', verifyScannerToken, scanAttendance);

module.exports = router;
module.exports.isWithinToggleCooldown = isWithinToggleCooldown;
