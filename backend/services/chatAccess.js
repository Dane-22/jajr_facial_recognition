const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function chatAdmin(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    if (decoded.type !== 'admin') return null;
    const [rows] = await pool.query('SELECT id, username, position FROM admins WHERE id = ?', [decoded.id]);
    return rows[0] ? { ...rows[0], type: 'admin' } : null;
  } catch { return null; }
}

async function canAccessRoom(user, roomId) {
  if (!user || !Number.isSafeInteger(Number(roomId)) || Number(roomId) < 1) return false;
  const [rows] = await pool.query(`SELECT r.id FROM chat_rooms r WHERE r.id = ? AND
    (r.type IN ('announcement', 'department') OR EXISTS
      (SELECT 1 FROM chat_room_members member WHERE member.room_id = r.id AND member.member_id = ? AND member.member_type = ?))`,
  [Number(roomId), user.id, user.type]);
  return rows.length > 0;
}

async function requireChatRoom(req, res, next) {
  try {
    if (!await canAccessRoom(req.user, req.params.roomId)) return res.status(403).json({ success: false, error: 'You do not have access to this chat room.' });
    next();
  } catch { res.status(500).json({ success: false, error: 'Unable to verify chat access.' }); }
}

async function markRoomRead(user, roomId) {
  if (!await canAccessRoom(user, roomId)) return false;
  await pool.query(`INSERT INTO chat_room_members (room_id, member_id, member_type, last_read_at)
    VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE last_read_at = NOW()`, [Number(roomId), user.id, user.type]);
  return true;
}

module.exports = { chatAdmin, canAccessRoom, requireChatRoom, markRoomRead };
