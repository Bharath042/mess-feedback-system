const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

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

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// Test API routes
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API is working!' });
});

// Try to load the auth routes
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

// Try to load the feedback routes
try {
  const feedbackRoutes = require('./routes/feedback-complete');
  app.use('/api/feedback', feedbackRoutes);
  console.log('✅ Feedback routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading feedback routes:', error.message);
}

// Try to load the complaints routes
try {
  const complaintsRoutes = require('./routes/complaints');
  app.use('/api/complaints', complaintsRoutes);
  console.log('✅ Complaints routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading complaints routes:', error.message);
}

// Try to load the admin routes
try {
  const adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading admin routes:', error.message);
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📊 Test URL: http://localhost:${PORT}/test`);
  console.log(`🔗 API Test: http://localhost:${PORT}/api/test`);
  console.log(`🏠 Student Login: http://localhost:${PORT}/student-login`);
});

module.exports = app;
