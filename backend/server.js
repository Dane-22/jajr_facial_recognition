const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const { chatAdmin, canAccessRoom, markRoomRead } = require('./services/chatAccess');
const rateLimiter = require('./middleware/rateLimiter');
const { connectRedis } = require('./config/redis');
require('dotenv').config();

const path = require('path');
const pool = require('./config/db');
const { startSyncService } = require('./services/googleSheetsSync');

const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const auditRoutes = require('./routes/auditRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const assistantRoutes = require('./routes/assistantRoutes');
const chatRoutes = require('./routes/chatRoutes');
const faceRoutes = require('./routes/faceRoutes');
const { loadModels } = require('./services/faceRecognition');

const app = express();
// Trust the private Docker proxy address, not an arbitrary public client that
// can reach the published backend port and supply its own X-Forwarded-For.
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Enable Security Headers with Helmet
app.use(helmet());

// Configure CORS with specific origin
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Kiosk-Api-Key'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(rateLimiter);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  const roomUser = async data => {
    const user = await chatAdmin(data?.token || socket.handshake.auth?.token);
    try { return user && await canAccessRoom(user, data?.roomId) ? user : null; }
    catch { return null; }
  };

  socket.on('join-admin', async data => {
    if (await chatAdmin(data?.token || socket.handshake.auth?.token)) socket.join('admin-room');
  });

  socket.on('chat:join_room', async data => {
    if (await roomUser(data)) socket.join(`room:${data.roomId}`);
  });
  socket.on('chat:leave_room', data => { if (data?.roomId) socket.leave(`room:${data.roomId}`); });
  socket.on('chat:mark_read', async data => {
    const user = await chatAdmin(data?.token || socket.handshake.auth?.token);
    try { if (user) await markRoomRead(user, data?.roomId); }
    catch (error) { console.warn('[Chat] Unable to mark messages read:', error.message); }
  });

  socket.on('chat:typing', async data => {
    const user = await roomUser(data);
    if (user) socket.to(`room:${data.roomId}`).emit('chat:user_typing', { roomId: data.roomId, userName: user.username, isTyping: true });
  });
  socket.on('chat:stop_typing', async data => {
    const user = await roomUser(data);
    if (user) socket.to(`room:${data.roomId}`).emit('chat:user_typing', { roomId: data.roomId, userName: user.username, isTyping: false });
  });

  // Send Message
  socket.on('chat:send_message', async (data, callback) => {
    try {
      const decodedUser = await roomUser(data);
      if (!decodedUser) {
        if (typeof callback === 'function') callback({ success: false, error: 'Chat access denied.' });
        return;
      }

      const { roomId, messageType, content, attachmentUrl, replyToId } = data;
      const actualSenderId = decodedUser.id;
      const actualSenderType = decodedUser.type || 'admin';

      if (!roomId || !content) return;

      const [result] = await pool.query(`
        INSERT INTO chat_messages (room_id, sender_id, sender_type, message_type, content, attachment_url, reply_to_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [roomId, actualSenderId, actualSenderType, messageType || 'text', content, attachmentUrl || null, replyToId || null]);

      const newMessage = {
        id: result.insertId,
        room_id: roomId,
        sender_id: actualSenderId,
        sender_type: actualSenderType,
        sender_name: decodedUser.username,
        sender_role: decodedUser.position,
        message_type: messageType || 'text',
        content,
        attachment_url: attachmentUrl || null,
        reply_to_id: replyToId || null,
        reactions: [],
        created_at: new Date().toISOString()
      };

      // Broadcast to everyone in the room (including sender or ack callback)
      io.to(`room:${roomId}`).emit('chat:new_message', newMessage);

      // Broadcast to all sockets for unread badges update
      io.to(`room:${roomId}`).emit('chat:room_updated', { roomId, last_message: content, last_message_time: newMessage.created_at });

      if (typeof callback === 'function') callback({ success: true, message: newMessage });
    } catch (err) {
      console.error('[Socket.IO] Error saving message:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Emoji Reactions
  socket.on('chat:add_reaction', async (data) => {
    try {
      const decodedUser = await roomUser(data);
      if (!decodedUser) return;

      const { messageId, roomId, emoji } = data;
      const actualUserId = decodedUser.id;
      const actualUserType = decodedUser.type || 'admin';

      if (!messageId || !emoji) return;
      const [messages] = await pool.query('SELECT id FROM chat_messages WHERE id = ? AND room_id = ?', [messageId, roomId]);
      if (!messages.length) return;

      await pool.query(`
        INSERT INTO chat_message_reactions (message_id, user_id, user_type, emoji)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE emoji = VALUES(emoji)
      `, [messageId, actualUserId, actualUserType, emoji]);

      io.to(`room:${roomId}`).emit('chat:reaction_updated', { messageId, userId: actualUserId, userType: actualUserType, emoji });
    } catch (err) {
      console.error('[Socket.IO] Error adding reaction:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Export io so controllers can emit events
app.set('io', io);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/salary', require('./routes/salaryRoutes'));
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/face', faceRoutes);

pool.ready.then(() => server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  loadModels().then(() => console.log('[FaceRecognition] Models ready')).catch(error => console.error('[FaceRecognition] Model preload failed:', error));
  // Attempt Redis connection — falls back to node-cache if unavailable
  await connectRedis();
  
  // Start background Google Sheets sync
  startSyncService();
})).catch(async error => {
  console.error('Database migration failed; server was not started:', error);
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
