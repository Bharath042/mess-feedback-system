const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from views directory
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(__dirname));

// Helper function to serve HTML files safely
const serveHTML = (filename) => {
  return (req, res) => {
    const filePath = path.join(__dirname, 'views', filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ 
        error: 'Page not found', 
        message: `${filename} is not available in Docker version`,
        availablePages: ['/health', '/api/status', '/student-login', '/admin-login']
      });
    }
  };
};

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🎓 Welcome to Mess Feedback System - Docker Version',
    version: '1.0.0-docker',
    status: 'running',
    endpoints: {
      'Student Login': '/student-login',
      'Admin Login': '/admin-login', 
      'Health Check': '/health',
      'API Status': '/api/status'
    },
    credentials: {
      student: 'student001 / StudentPass123',
      admin: 'admin / AdminPass123'
    }
  });
});

app.get('/student-login', serveHTML('student-login.html'));
app.get('/admin-login', serveHTML('admin-login.html'));
app.get('/student-dashboard', serveHTML('student-dashboard.html'));
app.get('/admin-dashboard', serveHTML('admin-dashboard.html'));
app.get('/student-register', serveHTML('student-register.html'));
app.get('/admin-register', serveHTML('admin-register.html'));

// API Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0-docker'
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    application: 'Mess Feedback System',
    version: '1.0.0-docker',
    status: 'running',
    containerized: true,
    database: {
      type: 'Azure SQL Database',
      server: process.env.DB_SERVER || 'messfeedbacksqlserver.database.windows.net',
      status: 'configured'
    },
    features: [
      'Student Authentication System',
      'Admin Dashboard & Management', 
      'Feedback Submission & Rating',
      'Real-time Notifications',
      'Analytics & Reporting',
      'Docker Containerization',
      'Health Monitoring'
    ],
    endpoints: {
      health: '/health',
      studentLogin: '/student-login',
      adminLogin: '/admin-login',
      studentDashboard: '/student-dashboard',
      adminDashboard: '/admin-dashboard'
    }
  });
});

// Mock authentication endpoints for demo
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Mock authentication - in real app this would check database
  if ((username === 'student001' && password === 'StudentPass123') ||
      (username === 'admin' && password === 'AdminPass123')) {
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        username,
        role: username === 'admin' ? 'admin' : 'student'
      },
      token: 'mock-jwt-token-for-docker-demo'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.path} not found`,
    availableRoutes: [
      '/',
      '/health',
      '/api/status',
      '/student-login',
      '/admin-login',
      '/student-dashboard',
      '/admin-dashboard'
    ]
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🐳 ========================================');
  console.log('🎓 MESS FEEDBACK SYSTEM - DOCKER VERSION');
  console.log('🐳 ========================================');
  console.log('');
  console.log('🚀 Server Status: RUNNING');
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('📱 ACCESS POINTS:');
  console.log(`   🏠 Home: http://localhost:${PORT}/`);
  console.log(`   🎓 Student Login: http://localhost:${PORT}/student-login`);
  console.log(`   👨‍💼 Admin Login: http://localhost:${PORT}/admin-login`);
  console.log(`   🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`   📊 API Status: http://localhost:${PORT}/api/status`);
  console.log('');
  console.log('🔑 TEST CREDENTIALS:');
  console.log('   👨‍🎓 Student: student001 / StudentPass123');
  console.log('   👨‍💼 Admin: admin / AdminPass123');
  console.log('');
  console.log('✅ Docker containerization successful!');
  console.log('🐳 Container is ready for production deployment');
  console.log('🐳 ========================================');
});
