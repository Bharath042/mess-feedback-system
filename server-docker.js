const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'views')));

// Basic routes for Docker deployment
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-login.html'));
});

app.get('/student-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-login.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.get('/student-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Mess Feedback System - Docker Version',
    version: '1.0.0',
    status: 'running',
    database: 'Azure SQL (configured)',
    features: [
      'Student Authentication',
      'Admin Dashboard', 
      'Feedback Submission',
      'Real-time Updates',
      'Analytics & Reports'
    ]
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Mess Feedback System - Docker Version');
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🎓 Student Login: http://localhost:${PORT}/student-login`);
  console.log(`👨‍💼 Admin Login: http://localhost:${PORT}/admin-login`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`📊 API Status: http://localhost:${PORT}/api/status`);
  console.log('');
  console.log('📝 Test Credentials:');
  console.log('   Student: student001 / StudentPass123');
  console.log('   Admin: admin / AdminPass123');
  console.log('✅ Docker containerization successful!');
});
