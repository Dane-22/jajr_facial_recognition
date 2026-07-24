const jwt = require('jsonwebtoken');

const verifyAdminToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    
    const adminObj = {
      id: decoded.id,
      username: decoded.username,
      position: decoded.position || (decoded.id === 1 || decoded.username === 'admin' ? 'Superadmin' : 'Admin'),
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
