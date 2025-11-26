const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback-complete');
const complaintsRoutes = require('./routes/complaints');
const adminRoutes = require('./routes/admin');
const chatbotRoutes = require('./routes/chatbot');
const { connectDB } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

// Security middleware - disable CSP to prevent HTTPS upgrade
app.use(helmet({
  contentSecurityPolicy: false,  // Disable CSP completely to prevent upgrade-insecure-requests
  hsts: false,  // Disable HSTS to allow HTTP connections
  crossOriginOpenerPolicy: false,  // Disable COOP header for HTTP
}));

// Explicitly remove all HTTPS-forcing headers
app.use((req, res, next) => {
  res.removeHeader('Strict-Transport-Security');
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Content-Security-Policy-Report-Only');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-login.html'));
});

app.get('/student-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-login.html'));
});

app.get('/student-register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-register.html'));
});

app.get('/student-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-dashboard.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.get('/admin-register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-register.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes - MUST be before catch-all routes
console.log('📍 Registering API routes...');
app.use('/api/auth', (req, res, next) => {
  console.log(`🔵 [API] ${req.method} /api/auth${req.path} - Headers:`, req.headers);
  next();
}, authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/ai', chatbotRoutes);  // Also support /api/ai for compatibility
console.log('✅ API routes registered');

// Serve React app (for production) - AFTER API routes
// Note: React build is served from views/student-login.html for now
// In production, ensure client/build exists or disable this section
const buildPath = path.join(__dirname, 'client/build');
if (process.env.NODE_ENV === 'production' && fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  
  // Catch-all for React app - only for non-API routes
  app.get('*', (req, res) => {
    console.log(`🟡 [CATCH-ALL] ${req.method} ${req.path}`);
    // Don't serve React app for API routes
    if (req.path.startsWith('/api/')) {
      console.log(`🔴 [CATCH-ALL] Blocking API route: ${req.path}`);
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }
    console.log(`🟢 [CATCH-ALL] Serving React app for: ${req.path}`);
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.log('⚠️  React build not found at:', buildPath);
  console.log('✅ API routes will be served without React catch-all');
}

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('join-student', (data) => {
    console.log('Student joined:', data);
    socket.join('students');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize database and start server
function startServer() {
  // Start server immediately - don't wait for database
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
  
  // Initialize database connection in background (non-blocking)
  connectDB()
    .then(() => {
      console.log('✅ Database connected successfully');
    })
    .catch((error) => {
      console.error('❌ Database connection failed:', error.message);
      console.log('⚠️  Server running without database - will retry in 10 seconds...');
      // Retry after 10 seconds
      setTimeout(() => {
        connectDB()
          .then(() => {
            console.log('✅ Database connected successfully on retry');
          })
          .catch((retryError) => {
            console.error('❌ Database connection retry failed:', retryError.message);
            // Retry again after 10 seconds
            setTimeout(startServer, 10000);
          });
      }, 10000);
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;
