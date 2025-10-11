const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const winston = require('winston');
const cron = require('node-cron');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth-enhanced');
const feedbackRoutes = require('./routes/feedback-enhanced');
const adminRoutes = require('./routes/admin-enhanced');
const powerbiRoutes = require('./routes/powerbi');
const { connectDB } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const { setupLogging } = require('./config/logging');
const { setupMonitoring } = require('./config/monitoring');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Setup logging
const logger = setupLogging();

// Setup monitoring
setupMonitoring(app, logger);

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://api.powerbi.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://app.powerbi.com"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Enhanced rate limiting with different tiers
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message });
  }
});

// Different rate limits for different endpoints
const generalLimiter = createRateLimit(15 * 60 * 1000, 100, 'Too many requests, please try again later');
const authLimiter = createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts, please try again later');
const feedbackLimiter = createRateLimit(60 * 60 * 1000, 10, 'Too many feedback submissions, please wait');

// Slow down middleware for additional protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: 500,
  maxDelayMs: 20000
});

app.use(generalLimiter);
app.use(speedLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Enhanced logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Real-time WebSocket handling
io.on('connection', (socket) => {
  logger.info(`New client connected: ${socket.id}`);
  
  socket.on('join-admin', (data) => {
    if (data.role === 'admin') {
      socket.join('admin-room');
      logger.info(`Admin joined: ${socket.id}`);
    }
  });

  socket.on('join-student', (data) => {
    socket.join('student-room');
    logger.info(`Student joined: ${socket.id}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Health check endpoint with detailed status
app.get('/health', async (req, res) => {
  try {
    const { getPool } = require('./config/database');
    const pool = await getPool();
    await pool.request().query('SELECT 1');
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected',
      version: require('./package.json').version
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API routes with specific rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/feedback', feedbackLimiter, feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/powerbi', powerbiRoutes);

// Serve different login pages
app.get('/student-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-login.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// Default route redirect
app.get('/', (req, res) => {
  res.redirect('/student-login');
});

// Serve React app (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    const { getPool } = require('./config/database');
    getPool().then(pool => {
      pool.close();
      logger.info('Database connections closed');
      process.exit(0);
    }).catch(err => {
      logger.error('Error closing database:', err);
      process.exit(1);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Scheduled tasks for maintenance
cron.schedule('0 2 * * *', () => {
  logger.info('Running daily maintenance tasks');
  // Add maintenance tasks here
});

// Real-time feedback broadcasting
const broadcastFeedback = (feedbackData) => {
  io.to('admin-room').emit('new-feedback', feedbackData);
  io.to('student-room').emit('feedback-update', {
    message: 'New feedback submitted',
    timestamp: new Date().toISOString()
  });
};

// Make broadcast function available globally
global.broadcastFeedback = broadcastFeedback;

// Initialize database and start server
async function startServer() {
  try {
    await connectDB();
    logger.info('✅ Database connected successfully');
    
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`👨‍🎓 Student Login: http://localhost:${PORT}/student-login`);
      logger.info(`👨‍💼 Admin Login: http://localhost:${PORT}/admin-login`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
