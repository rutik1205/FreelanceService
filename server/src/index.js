require('dotenv').config();
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const bidRoutes = require('./routes/bidRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const messageRoutes = require('./routes/messageRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const disputeRoutes = require('./routes/disputeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();
const server = http.createServer(app);


// Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

  // User-specific notification room
  socket.on('joinUser', (userId) => {
    if (userId) {
      socket.join(`user_${userId.toString()}`);
      console.log(`Socket ${socket.id} joined personal room: user_${userId}`);
    }
  });

  socket.on('joinProject', (projectId) => {
    socket.join(projectId.toString());
    console.log(`Socket ${socket.id} joined project room: ${projectId}`);
  });

  socket.on('leaveProject', (projectId) => {
    socket.leave(projectId.toString());
    console.log(`Socket ${socket.id} left project room: ${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected from Socket.IO: ${socket.id}`);
  });
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-demo'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    name: 'SkillDesk API',
    endpoints: {
      health: '/api/health',
      projects: '/api/projects',
      auth: '/api/auth'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateCode = mongoose.connection.readyState;
  const rawUri = process.env.MONGODB_URI || process.env.ATLAS_MONGODB_URI || '';
  const masked = rawUri ? rawUri.replace(/:([^:@]+)@/, ':****@') : 'NONE (using default 127.0.0.1)';

  res.json({
    status: 'online',
    platform: 'SkillDesk MERN API with Socket.IO Chat',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: {
      state: states[stateCode] || 'unknown',
      readyState: stateCode,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
      configuredUri: masked,
      hasMongodbUri: Boolean(process.env.MONGODB_URI),
      hasAtlasUri: Boolean(process.env.ATLAS_MONGODB_URI),
    },
    imagekitConfigured: Boolean(process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY),
  });
});

// Diagnostic DB reconnect endpoint
app.get('/api/db-reconnect', async (req, res) => {
  const mongoose = require('mongoose');
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    const conn = await connectDB();
    if (conn && mongoose.connection.readyState === 1) {
      res.json({
        success: true,
        message: 'Connected successfully to MongoDB',
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to establish connection to any MongoDB host',
        readyState: mongoose.connection.readyState
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      errorName: err.name,
      errorMessage: err.message,
    });
  }
});

// Global 404 handler for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `API route ${req.originalUrl} not found` });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SkillDesk Server with Socket.IO running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`📡 Local Health Check: http://localhost:${PORT}/api/health`);
});
