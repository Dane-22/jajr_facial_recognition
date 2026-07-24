const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// Helper to ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Get all rooms relevant to the authenticated user/admin
 */
const getUserRooms = async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const userType = req.user?.type || 'admin';

    // Fetch all public announcement & department rooms, plus any group/direct rooms user is member of
    const [rooms] = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.type,
        r.avatar_url,
        r.created_by_id,
        r.created_by_type,
        r.created_at,
        (
          SELECT content FROM chat_messages m 
          WHERE m.room_id = r.id 
          ORDER BY m.created_at DESC LIMIT 1
        ) as last_message,
        (
          SELECT created_at FROM chat_messages m 
          WHERE m.room_id = r.id 
          ORDER BY m.created_at DESC LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) FROM chat_messages m 
          LEFT JOIN chat_room_members rm ON rm.room_id = r.id AND rm.member_id = ? AND rm.member_type = ?
          WHERE m.room_id = r.id AND (rm.last_read_at IS NULL OR m.created_at > rm.last_read_at)
        ) as unread_count
      FROM chat_rooms r
      ORDER BY COALESCE(last_message_time, r.created_at) DESC
    `, [userId, userType]);

    return res.json({ success: true, rooms });
  } catch (error) {
    console.error('Error fetching user rooms:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch rooms' });
  }
};

/**
 * Get message history for a specific chat room
 */
const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id || 1;
    const userType = req.user?.type || 'admin';

    // Update last_read_at for this member
    await pool.query(`
      INSERT INTO chat_room_members (room_id, member_id, member_type, last_read_at)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE last_read_at = NOW()
    `, [roomId, userId, userType]);

    // Fetch messages with sender names & positions
    const [messages] = await pool.query(`
      SELECT 
        m.id,
        m.room_id,
        m.sender_id,
        m.sender_type,
        m.message_type,
        m.content,
        m.attachment_url,
        m.reply_to_id,
        m.created_at,
        CASE 
          WHEN m.sender_type = 'admin' THEN a.username
          ELSE u.name 
        END as sender_name,
        CASE 
          WHEN m.sender_type = 'admin' THEN a.position
          ELSE u.role 
        END as sender_role
      FROM chat_messages m
      LEFT JOIN admins a ON m.sender_type = 'admin' AND m.sender_id = a.id
      LEFT JOIN users u ON m.sender_type = 'employee' AND m.sender_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC
    `, [roomId]);

    // Fetch reactions for messages in this room
    const [reactions] = await pool.query(`
      SELECT r.message_id, r.user_id, r.user_type, r.emoji
      FROM chat_message_reactions r
      JOIN chat_messages m ON r.message_id = m.id
      WHERE m.room_id = ?
    `, [roomId]);

    // Group reactions by message_id
    const reactionsMap = {};
    reactions.forEach(r => {
      if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
      reactionsMap[r.message_id].push(r);
    });

    const enrichedMessages = messages.map(msg => ({
      ...msg,
      reactions: reactionsMap[msg.id] || []
    }));

    return res.json({ success: true, messages: enrichedMessages });
  } catch (error) {
    console.error('Error fetching room messages:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
};

/**
 * Get all available users & admins for starting 1-on-1 chats or creating groups
 */
const getAvailableParticipants = async (req, res) => {
  try {
    const [admins] = await pool.query(`SELECT id, username as name, position as role, 'admin' as type FROM admins`);
    const [employees] = await pool.query(`SELECT id, name, role, 'employee' as type FROM users`);

    return res.json({
      success: true,
      participants: [
        ...admins.map(a => ({ ...a, displayRole: `Admin (${a.role})` })),
        ...employees.map(e => ({ ...e, displayRole: `Employee (${e.role})` }))
      ]
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch participants' });
  }
};

/**
 * Create a new group room or direct message room
 */
const createRoom = async (req, res) => {
  try {
    const { name, type, memberIds, avatarUrl } = req.body;
    const creatorId = req.user?.id || 1;
    const creatorType = req.user?.type || 'admin';

    const [result] = await pool.query(`
      INSERT INTO chat_rooms (name, type, avatar_url, created_by_id, created_by_type)
      VALUES (?, ?, ?, ?, ?)
    `, [name || 'New Group Chat', type || 'group', avatarUrl || '💬', creatorId, creatorType]);

    const roomId = result.insertId;

    // Add creator as owner
    await pool.query(`
      INSERT INTO chat_room_members (room_id, member_id, member_type, role)
      VALUES (?, ?, ?, 'owner')
    `, [roomId, creatorId, creatorType]);

    // Add invited members if provided
    if (Array.isArray(memberIds)) {
      for (const m of memberIds) {
        if (m.id && m.type && !(m.id === creatorId && m.type === creatorType)) {
          await pool.query(`
            INSERT IGNORE INTO chat_room_members (room_id, member_id, member_type, role)
            VALUES (?, ?, ?, 'member')
          `, [roomId, m.id, m.type]);
        }
      }
    }

    return res.json({ success: true, roomId, name: name || 'New Group Chat' });
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({ success: false, error: 'Failed to create chat room' });
  }
};

/**
 * Upload chat attachment (Image/PDF base64 or file buffer)
 */
const uploadAttachment = async (req, res) => {
  try {
    const { fileName, base64Data } = req.body;
    if (!base64Data) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid base64 string format' });
    }

    const ext = matches[1].split('/')[1] || 'png';
    const buffer = Buffer.from(matches[2], 'base64');
    const safeFileName = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = path.join(uploadDir, safeFileName);

    fs.writeFileSync(filePath, buffer);

    const attachmentUrl = `/uploads/chat/${safeFileName}`;
    return res.json({ success: true, attachmentUrl });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    return res.status(500).json({ success: false, error: 'Failed to save attachment' });
  }
};

/**
 * Send message to a chat room via REST API
 */
const sendMessageToRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, messageType, attachmentUrl, replyToId } = req.body;
    const senderId = req.user?.id || 1;
    const senderType = req.user?.type || 'admin';
    const senderName = req.user?.username || 'Admin';
    const senderRole = req.user?.position || 'Superadmin';

    if (!content) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    const [result] = await pool.query(`
      INSERT INTO chat_messages (room_id, sender_id, sender_type, message_type, content, attachment_url, reply_to_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [roomId, senderId, senderType, messageType || 'text', content, attachmentUrl || null, replyToId || null]);

    const newMessage = {
      id: result.insertId,
      room_id: parseInt(roomId),
      sender_id: senderId,
      sender_type: senderType,
      sender_name: senderName,
      sender_role: senderRole,
      message_type: messageType || 'text',
      content,
      attachment_url: attachmentUrl || null,
      reply_to_id: replyToId || null,
      reactions: [],
      created_at: new Date().toISOString()
    };

    // Emit Socket.IO event if io instance is available
    const io = req.app.get('io');
    if (io) {
      io.to(`room:${roomId}`).emit('chat:new_message', newMessage);
      io.emit('chat:room_updated', { roomId: parseInt(roomId), last_message: content, last_message_time: newMessage.created_at });
    }

    return res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending room message via REST:', error);
    return res.status(500).json({ success: false, error: 'Failed to send message' });
  }
};

module.exports = {
  getUserRooms,
  getRoomMessages,
  getAvailableParticipants,
  createRoom,
  uploadAttachment,
  sendMessageToRoom
};
