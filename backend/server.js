const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const rateLimiter = require('./middleware/rateLimiter');
const { connectRedis } = require('./config/redis');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const auditRoutes = require('./routes/auditRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
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
app.use(express.json());
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

  // Admin clients join dedicated room after token verification
  socket.on('join-admin', (data) => {
    const token = data?.token || socket.handshake.auth?.token;
    if (!token) {
      console.warn(`[Socket.IO] Auth rejected for ${socket.id}: No token provided`);
      return;
    }
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
      socket.join('admin-room');
      console.log(`[Socket.IO] ${socket.id} authenticated and joined admin-room`);
    } catch (err) {
      console.warn(`[Socket.IO] Auth rejected for ${socket.id}: Invalid token`);
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

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Attempt Redis connection — falls back to node-cache if unavailable
  await connectRedis();
});
