const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const rateLimiter = require('./middleware/rateLimiter');
const { connectRedis } = require('./config/redis');
require('dotenv').config();

const path = require('path');
const pool = require('./config/db');

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
  const isAdmin = token => {
    try { return jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key').type === 'admin'; }
    catch { return false; }
  };

  // Admin clients join dedicated room after token verification
  socket.on('join-admin', (data) => {
    const token = data?.token || socket.handshake.auth?.token;
    if (!token) {
      console.warn(`[Socket.IO] Auth rejected for ${socket.id}: No token provided`);
      return;
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      if (decoded.type !== 'admin') return;
      socket.join('admin-room');
      console.log(`[Socket.IO] ${socket.id} authenticated and joined admin-room`);
    } catch (err) {
      console.warn(`[Socket.IO] Auth rejected for ${socket.id}: Invalid token`);
    }
  });

  // Chat Room Joins
  socket.on('chat:join_room', (data) => {
    if (!isAdmin(data?.token || socket.handshake.auth?.token)) return;
    const { roomId } = data || {};
    if (roomId) {
      socket.join(`room:${roomId}`);
      console.log(`[Socket.IO] ${socket.id} joined chat room:${roomId}`);
    }
  });

  // Typing status signal
  socket.on('chat:typing', (data) => {
    if (!isAdmin(data?.token || socket.handshake.auth?.token)) return;
    const { roomId, userName } = data || {};
    if (roomId) {
      socket.to(`room:${roomId}`).emit('chat:user_typing', { roomId, userName, isTyping: true });
    }
  });

  socket.on('chat:stop_typing', (data) => {
    if (!isAdmin(data?.token || socket.handshake.auth?.token)) return;
    const { roomId, userName } = data || {};
    if (roomId) {
      socket.to(`room:${roomId}`).emit('chat:user_typing', { roomId, userName, isTyping: false });
    }
  });

  // Send Message
  socket.on('chat:send_message', async (data, callback) => {
    try {
      const token = data?.token || socket.handshake.auth?.token;
      if (!token) {
        if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized' });
        return;
      }
      let decodedUser;
      try {
        decodedUser = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
        if (decodedUser.type !== 'admin') throw new Error('Admin access required');
      } catch (err) {
        if (typeof callback === 'function') callback({ success: false, error: 'Invalid token' });
        return;
      }

      const { roomId, senderName, senderRole, messageType, content, attachmentUrl, replyToId } = data;
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
        sender_name: senderName || decodedUser.username || 'User',
        sender_role: senderRole || decodedUser.position || 'User',
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
      io.to('admin-room').emit('chat:room_updated', { roomId, last_message: content, last_message_time: newMessage.created_at });

      if (typeof callback === 'function') callback({ success: true, message: newMessage });
    } catch (err) {
      console.error('[Socket.IO] Error saving message:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Emoji Reactions
  socket.on('chat:add_reaction', async (data) => {
    try {
      const token = data?.token || socket.handshake.auth?.token;
      if (!token) return;
      let decodedUser;
      try {
        decodedUser = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
        if (decodedUser.type !== 'admin') return;
      } catch (err) {
        return;
      }

      const { messageId, roomId, emoji } = data;
      const actualUserId = decodedUser.id;
      const actualUserType = decodedUser.type || 'admin';

      if (!messageId || !emoji) return;

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
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/face', faceRoutes);

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  loadModels().then(() => console.log('[FaceRecognition] Models ready')).catch(error => console.error('[FaceRecognition] Model preload failed:', error));
  // Attempt Redis connection — falls back to node-cache if unavailable
  await connectRedis();
});
