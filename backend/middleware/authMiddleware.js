const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    if (decoded.type !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    await pool.ready;
    const [admins] = await pool.query('SELECT id, username, position FROM admins WHERE id = ?', [decoded.id]);
    const current = admins[0];
    if (!current) return res.status(401).json({ error: 'This administrator account no longer exists. Please sign in again.' });
    
    const adminObj = {
      id: current.id,
      username: current.username,
      position: current.position || (current.id === 1 ? 'Superadmin' : 'Admin'),
      type: decoded.type
    };

    req.admin = adminObj;
    req.user = adminObj;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  verifyAdminToken
};
