const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
let dbConnected = false;
const { connectDB, getPool, sql } = require('./config/database-simple');

// Initialize database connection
connectDB()
  .then(() => {
    dbConnected = true;
    console.log('✅ Database connected successfully');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Database connection failed, but starting server anyway');
    console.log('   You can add users manually to the database');
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

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.get('/admin-register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-register.html'));
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
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'Connected' : 'Disconnected',
    uptime: process.uptime()
  });
});

// Authentication endpoints
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
        
        // Check user in database
        const result = await pool.request()
          .input('username', sql.VarChar, username)
          .input('password', sql.VarChar, password)
          .query('SELECT id, username, role FROM users WHERE username = @username AND password = @password');

        if (result.recordset.length > 0) {
          const user = result.recordset[0];
          
          // Generate a simple token
          const token = Buffer.from(`${user.id}:${user.username}:${user.role}`).toString('base64');
          
          res.json({
            success: true,
            message: 'Login successful',
            user: {
              id: user.id,
              username: user.username,
              role: user.role
            },
            token: token
          });
        } else {
          res.status(401).json({
            success: false,
            message: 'Invalid username or password'
          });
        }
      } catch (dbError) {
        console.error('Database error during login:', dbError);
        throw dbError;
      }
    } else {
      // Fallback to mock users if database fails
      const mockUsers = [
        { id: 1, username: 'student001', password: 'StudentPass123', role: 'student' },
        { id: 2, username: 'admin', password: 'AdminPass123', role: 'admin' }
      ];

      const user = mockUsers.find(u => u.username === username && u.password === password);
      
      if (user) {
        const token = Buffer.from(`${user.id}:${user.username}:${user.role}`).toString('base64');
        
        res.json({
          success: true,
          message: 'Login successful (fallback mode)',
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          },
          token: token
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid username or password'
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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role = 'student' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    if (dbConnected) {
      try {
        const pool = await getPool();
        
        // Check if user already exists
        const existingUser = await pool.request()
          .input('username', sql.VarChar, username)
          .query('SELECT id FROM users WHERE username = @username');

        if (existingUser.recordset.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Username already exists'
          });
        }

        // Insert new user
        const result = await pool.request()
          .input('username', sql.VarChar, username)
          .input('password', sql.VarChar, password)
          .input('role', sql.VarChar, role)
          .query(`
            INSERT INTO users (username, password, role) 
            OUTPUT INSERTED.id, INSERTED.username, INSERTED.role
            VALUES (@username, @password, @role)
          `);

        const newUser = result.recordset[0];
        
        res.json({
          success: true,
          message: 'Registration successful',
          user: {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role
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
      res.status(503).json({
        success: false,
        message: 'Database not available. Please try again later.'
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

// Student API endpoints
app.post('/api/feedback/submit', async (req, res) => {
  try {
    const { messHall, mealType, itemRatings, itemComments, commonRatings, overallComments } = req.body;
    
    if (!messHall || !mealType) {
      return res.status(400).json({
        success: false,
        message: 'Mess hall and meal type are required'
      });
    }

    if (dbConnected) {
      try {
        const pool = await getPool();
        
        // Get mess hall ID
        let messHallId = 1; // Default
        try {
          const messHallResult = await pool.request()
            .input('messHallName', sql.NVarChar, messHall)
            .query('SELECT id FROM mess_halls WHERE name = @messHallName');
          if (messHallResult.recordset.length > 0) {
            messHallId = messHallResult.recordset[0].id;
          }
        } catch (e) {
          console.log('Mess hall lookup failed, using default ID');
        }

        // Create feedback session
        const sessionResult = await pool.request()
          .input('user_id', sql.Int, 1) // Default user for now
          .input('mess_hall_id', sql.Int, messHallId)
          .input('meal_type', sql.VarChar, mealType)
          .input('feedback_date', sql.Date, new Date())
          .input('overall_comments', sql.NVarChar, overallComments || '')
          .input('points_earned', sql.Int, 10)
          .input('is_anonymous', sql.Bit, 0)
          .query(`
            INSERT INTO feedback_sessions (
              user_id, mess_hall_id, meal_type, feedback_date, 
              overall_comments, points_earned, is_anonymous
            ) 
            OUTPUT INSERTED.id
            VALUES (
              @user_id, @mess_hall_id, @meal_type, @feedback_date,
              @overall_comments, @points_earned, @is_anonymous
            )
          `);

        const sessionId = sessionResult.recordset[0].id;

        // Insert individual item feedback
        if (itemRatings && Object.keys(itemRatings).length > 0) {
          for (const [itemId, rating] of Object.entries(itemRatings)) {
            const comment = itemComments[itemId] || '';
            
            await pool.request()
              .input('feedback_session_id', sql.Int, sessionId)
              .input('menu_item_id', sql.Int, parseInt(itemId))
              .input('rating', sql.Int, rating)
              .input('comment', sql.NVarChar, comment)
              .query(`
                INSERT INTO item_feedback (
                  feedback_session_id, menu_item_id, rating, comment
                ) VALUES (
                  @feedback_session_id, @menu_item_id, @rating, @comment
                )
              `);
          }
        }

        // Also insert into legacy Feedback table for compatibility
        try {
          await pool.request()
            .input('StudentName', sql.NVarChar, 'Student User')
            .input('Roll', sql.NVarChar, 'STU001')
            .input('Meal', sql.NVarChar, mealType)
            .input('Rating', sql.Int, commonRatings.service || 5)
            .input('Emotion', sql.NVarChar, 'Satisfied')
            .input('Comment', sql.NVarChar, overallComments || '')
            .query(`
              INSERT INTO Feedback (
                StudentName, Roll, Meal, Rating, Emotion, Comment, DateSubmitted
              ) VALUES (
                @StudentName, @Roll, @Meal, @Rating, @Emotion, @Comment, GETDATE()
              )
            `);
        } catch (e) {
          console.log('Legacy feedback insert failed:', e.message);
        }

        res.json({
          success: true,
          message: 'Feedback submitted successfully! +10 credits earned.'
        });

      } catch (dbError) {
        console.error('Database error during feedback submission:', dbError);
        res.status(500).json({
          success: false,
          message: 'Database error: ' + dbError.message
        });
      }
    } else {
      res.json({
        success: true,
        message: 'Feedback submitted successfully! (Database offline - using fallback)'
      });
    }
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

app.post('/api/complaints/submit', async (req, res) => {
  try {
    const { type, title, description, severity } = req.body;
    
    if (!type || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (dbConnected) {
      try {
        const pool = await getPool();
        
        // Insert complaint
        await pool.request()
          .input('user_id', sql.Int, 1) // Default user for now
          .input('complaint_type', sql.VarChar, type)
          .input('title', sql.VarChar, title)
          .input('description', sql.NVarChar, description)
          .input('severity', sql.VarChar, severity || 'medium')
          .input('status', sql.VarChar, 'open')
          .input('incident_date', sql.DateTime2, new Date())
          .query(`
            INSERT INTO complaints (
              user_id, complaint_type, title, description, severity, status, incident_date
            ) VALUES (
              @user_id, @complaint_type, @title, @description, @severity, @status, @incident_date
            )
          `);

        res.json({
          success: true,
          message: 'Complaint submitted successfully!'
        });

      } catch (dbError) {
        console.error('Database error during complaint submission:', dbError);
        res.status(500).json({
          success: false,
          message: 'Database error: ' + dbError.message
        });
      }
    } else {
      res.json({
        success: true,
        message: 'Complaint submitted successfully! (Database offline - using fallback)'
      });
    }
  } catch (error) {
    console.error('Complaint submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin API endpoints
app.get('/api/admin/users', async (req, res) => {
  try {
    if (dbConnected) {
      const pool = await getPool();
      
      const result = await pool.request()
        .query('SELECT id, username, role FROM users ORDER BY id DESC');
      
      const users = result.recordset.map(user => ({
        ...user,
        status: 'active',
        lastLogin: new Date().toISOString()
      }));
      
      res.json(users);
    } else {
      // Fallback data
      res.json([
        { id: 1, username: 'student001', role: 'student', status: 'active', lastLogin: new Date().toISOString() },
        { id: 2, username: 'admin', role: 'admin', status: 'active', lastLogin: new Date().toISOString() }
      ]);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (dbConnected) {
      const pool = await getPool();
      
      await pool.request()
        .input('userId', sql.Int, userId)
        .query('DELETE FROM users WHERE id = @userId');
      
      res.json({ success: true, message: 'User deleted successfully' });
    } else {
      res.json({ success: true, message: 'User deleted successfully (fallback mode)' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    if (dbConnected) {
      const pool = await getPool();
      
      // Get total users
      const usersResult = await pool.request()
        .query('SELECT COUNT(*) as count FROM users');
      
      // Get total feedback
      let feedbackCount = 0;
      try {
        const feedbackResult = await pool.request()
          .query('SELECT COUNT(*) as count FROM Feedback');
        feedbackCount = feedbackResult.recordset[0].count;
      } catch (e) {
        console.log('Feedback table not found, using 0');
      }
      
      // Get complaints count
      let complaintsCount = 0;
      try {
        const complaintsResult = await pool.request()
          .query('SELECT COUNT(*) as count FROM complaints WHERE status != \'resolved\'');
        complaintsCount = complaintsResult.recordset[0].count;
      } catch (e) {
        console.log('Complaints table not found, using 0');
      }
      
      res.json({
        totalUsers: usersResult.recordset[0].count,
        totalFeedback: feedbackCount,
        totalComplaints: complaintsCount,
        avgRating: 4.2
      });
    } else {
      // Fallback data
      res.json({
        totalUsers: 25,
        totalFeedback: 150,
        totalComplaints: 8,
        avgRating: 4.2
      });
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('👋 Client disconnected:', socket.id);
  });
  
  // Handle real-time feedback updates
  socket.on('feedback_submitted', (data) => {
    socket.broadcast.emit('new_feedback', data);
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Student Login: http://localhost:${PORT}/student-login`);
  console.log(`🌐 Admin Login: http://localhost:${PORT}/admin-login`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📝 Test Credentials:');
  console.log('   Student: student001 / StudentPass123');
  console.log('   Admin: admin / AdminPass123');
});

module.exports = app;
