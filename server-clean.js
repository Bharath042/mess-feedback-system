const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
let dbConnected = false;
const { connectDB, getPool, sql } = require('./config/database-simple');

// Initialize database connection - Simple version
connectDB()
  .then(async () => {
    dbConnected = true;
    console.log('✅ Connected to Azure SQL Database');
    
    // Simple verification - only check essential tables
    try {
      const pool = await getPool();
      
      // Verify Users table
      const usersResult = await pool.request().query('SELECT id, username, role FROM users ORDER BY id');
      console.log('✅ Users table found');
      console.log('👥 Total users:', usersResult.recordset.length);
      
      // Check other basic tables
      try {
        const profilesResult = await pool.request().query('SELECT COUNT(*) as count FROM user_profiles');
        console.log('✅ User profiles table found:', profilesResult.recordset[0].count, 'records');
      } catch (err) {
        console.log('⚠️  User profiles table not found');
      }
      
      try {
        const pointsResult = await pool.request().query('SELECT COUNT(*) as count FROM user_points');
        console.log('✅ User points table found:', pointsResult.recordset[0].count, 'records');
      } catch (err) {
        console.log('⚠️  User points table not found');
      }
      
      console.log('📝 Test Credentials:');
      console.log('   Student: student001 / StudentPass123');
      console.log('   Admin: admin / AdminPass123');
      console.log('✅ Simple database setup complete');
      
    } catch (verificationError) {
      console.error('⚠️  Database verification failed:', verificationError.message);
      console.log('✅ Database connected but verification incomplete');
    }
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Starting server anyway - you can add database connection later');
  });

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-login.html'));
});

app.get('/student-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-login.html'));
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// ===== AUTHENTICATION ENDPOINTS ONLY =====

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    if (dbConnected) {
      try {
        const pool = await getPool();
        
        // Find user in database
        const result = await pool.request()
          .input('username', sql.VarChar, username)
          .query('SELECT id, username, role FROM users WHERE username = @username');

        if (result.recordset.length === 0) {
          return res.status(401).json({
            success: false,
            message: 'Invalid username or password'
          });
        }

        const user = result.recordset[0];
        
        // Simple password check (in production, use proper hashing)
        if (password !== username && password !== 'StudentPass123' && password !== 'AdminPass123') {
          return res.status(401).json({
            success: false,
            message: 'Invalid username or password'
          });
        }

        // Create simple token
        const token = Buffer.from(`${user.id}:${user.username}:${user.role}`).toString('base64');

        res.json({
          success: true,
          message: 'Login successful',
          token: token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });

      } catch (dbError) {
        console.error('Database error during login:', dbError);
        res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }
    } else {
      // Mock login when database not connected
      if ((username === 'admin' && password === 'AdminPass123') || 
          (username === 'student001' && password === 'StudentPass123')) {
        const role = username === 'admin' ? 'admin' : 'student';
        const token = Buffer.from(`1:${username}:${role}`).toString('base64');
        
        res.json({
          success: true,
          message: 'Login successful (mock mode)',
          token: token,
          user: { id: 1, username: username, role: role }
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    if (dbConnected) {
      try {
        const pool = await getPool();
        
        // Check if username already exists
        const existingUser = await pool.request()
          .input('username', sql.VarChar, username)
          .query('SELECT id FROM users WHERE username = @username');

        if (existingUser.recordset.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Username already exists'
          });
        }

        // Get next available ID
        const maxIdResult = await pool.request()
          .query('SELECT ISNULL(MAX(id), 0) + 1 as next_id FROM users');
        const nextId = maxIdResult.recordset[0].next_id;

        // Insert new user
        await pool.request()
          .input('id', sql.Int, nextId)
          .input('username', sql.VarChar, username)
          .input('role', sql.VarChar, role || 'student')
          .query(`
            INSERT INTO users (id, username, role, created_at)
            VALUES (@id, @username, @role, GETDATE())
          `);

        res.json({
          success: true,
          message: 'Registration successful',
          user: {
            id: nextId,
            username: username,
            role: role || 'student'
          }
        });

      } catch (dbError) {
        console.error('Database error during registration:', dbError);
        res.status(500).json({
          success: false,
          message: 'Database error: ' + dbError.message
        });
      }
    } else {
      res.json({
        success: true,
        message: 'Registration successful (mock mode)',
        user: {
          id: Math.floor(Math.random() * 1000),
          username: username,
          role: role || 'student'
        }
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Basic user profile endpoint
app.get('/api/user/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Decode the simple token
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [id, username, role] = decoded.split(':');

    res.json({
      success: true,
      id: parseInt(id),
      username: username,
      role: role
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📋 Available routes:');
  console.log('   🏠 Home: http://localhost:' + PORT);
  console.log('   👨‍🎓 Student Login: http://localhost:' + PORT + '/student-login');
  console.log('   👨‍💼 Admin Login: http://localhost:' + PORT + '/admin-login');
  console.log('   ❤️  Health Check: http://localhost:' + PORT + '/health');
});
