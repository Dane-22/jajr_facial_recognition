const jwt = require('jsonwebtoken');

/**
 * Middleware to verify request authorization.
 * Accepts either:
 * 1. A valid X-Kiosk-Api-Key matching process.env.KIOSK_API_KEY (or default dev key)
 * 2. A valid Bearer JWT token in Authorization header
 */
const verifyKioskOrAdminToken = (req, res, next) => {
  const kioskApiKey = req.headers['x-kiosk-api-key'];
  const expectedApiKey = process.env.KIOSK_API_KEY || 'kiosk_dev_secret_key_2026';

  // Check 1: Valid Kiosk API Key
  if (kioskApiKey && kioskApiKey === expectedApiKey) {
    req.userType = 'kiosk';
    return next();
  }

  // Check 2: Valid Admin JWT Token
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      req.user = decoded;
      req.userType = 'admin';
      return next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired authentication token.' });
    }
  }

  return res.status(401).json({ error: 'Unauthorized. Kiosk API Key or Admin Authorization token required.' });
};

module.exports = { verifyKioskOrAdminToken };
