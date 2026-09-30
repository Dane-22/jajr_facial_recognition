const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {
  getUserRooms,
  getRoomMessages,
  getAvailableParticipants,
  createRoom,
  uploadAttachment,
  sendMessageToRoom
} = require('../controllers/chatController');

// Flexible & Fallback-Safe Auth Middleware for Chat Routes
const verifyChatAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token && token !== 'null' && token !== 'undefined') {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
          if (decoded.type !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
          req.user = {
            id: decoded.id || 1,
            username: decoded.username || 'Admin',
            type: decoded.type || 'admin',
            position: decoded.position || 'Superadmin'
          };
          return next();
        } catch (jwtErr) {
          return res.status(401).json({ error: 'Invalid or expired token.' });
        }
      }
    }

    return res.status(401).json({ error: 'Sign in required.' });
  } catch (error) {
    return res.status(500).json({ error: 'Authentication failed.' });
  }
};

router.use(verifyChatAuth);

router.get('/rooms', getUserRooms);
router.get('/rooms/:roomId/messages', getRoomMessages);
router.post('/rooms/:roomId/messages', sendMessageToRoom);
router.get('/participants', getAvailableParticipants);
router.post('/rooms', createRoom);
router.post('/attachment', uploadAttachment);

module.exports = router;
