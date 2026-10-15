const express = require('express');
const router = express.Router();
const {
  getUserRooms,
  getRoomMessages,
  getAvailableParticipants,
  createRoom,
  uploadAttachment,
  sendMessageToRoom
} = require('../controllers/chatController');

const { verifyAdminToken } = require('../middleware/authMiddleware');
const { requireChatRoom } = require('../services/chatAccess');
router.use(verifyAdminToken);

router.get('/rooms', getUserRooms);
router.get('/rooms/:roomId/messages', requireChatRoom, getRoomMessages);
router.post('/rooms/:roomId/messages', requireChatRoom, sendMessageToRoom);
router.get('/participants', getAvailableParticipants);
router.post('/rooms', createRoom);
router.post('/attachment', uploadAttachment);

module.exports = router;
