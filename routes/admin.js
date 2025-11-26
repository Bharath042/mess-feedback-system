const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getPool, sql } = require('../config/database');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(protect);
router.use(authorize('admin', 'mess_manager'));

// @desc    Get admin profile
// @route   GET /api/admin/profile
// @access  Private (Admin/Manager)
router.get('/profile', async (req, res, next) => {
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT id, username, role, is_active, created_at
        FROM users
        WHERE id = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }
    
    const admin = result.recordset[0];
    
    res.status(200).json({
      success: true,
      data: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        is_active: admin.is_active,
        created_at: admin.created_at
      }
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    next(error);
  }
});

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin/Manager)
router.get('/dashboard', async (req, res, next) => {
  try {
    const pool = await getPool();

    // Get overall statistics
    const statsResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as total_users,
        (SELECT COUNT(*) FROM mess_halls WHERE is_active = 1) as total_mess_halls,
        (SELECT COUNT(*) FROM feedback WHERE created_at >= DATEADD(day, -30, GETDATE())) as feedback_last_30_days,
        (SELECT AVG(CAST(overall_rating AS FLOAT)) FROM feedback WHERE created_at >= DATEADD(day, -30, GETDATE())) as avg_rating_last_30_days
    `);

    // Get feedback trends (last 7 days)
    const trendsResult = await pool.request().query(`
      SELECT 
        CAST(created_at AS DATE) as date,
        COUNT(*) as feedback_count,
        AVG(CAST(overall_rating AS FLOAT)) as avg_rating
      FROM feedback 
      WHERE created_at >= DATEADD(day, -7, GETDATE())
      GROUP BY CAST(created_at AS DATE)
      ORDER BY date DESC
    `);

    // Get mess hall performance
    const messHallsResult = await pool.request().query(`
      SELECT 
        mh.id, mh.name, mh.location,
        COUNT(f.id) as feedback_count,
        AVG(CAST(f.overall_rating AS FLOAT)) as avg_rating
      FROM mess_halls mh
      LEFT JOIN feedback f ON mh.id = f.mess_hall_id 
        AND f.created_at >= DATEADD(day, -30, GETDATE())
      WHERE mh.is_active = 1
      GROUP BY mh.id, mh.name, mh.location
      ORDER BY avg_rating DESC
    `);

    const stats = statsResult.recordset[0];

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total_users: stats.total_users,
          total_mess_halls: stats.total_mess_halls,
          feedback_last_30_days: stats.feedback_last_30_days,
          avg_rating_last_30_days: parseFloat((stats.avg_rating_last_30_days || 0).toFixed(2))
        },
        daily_trends: trendsResult.recordset,
        mess_hall_performance: messHallsResult.recordset.map(mh => ({
          ...mh,
          avg_rating: parseFloat((mh.avg_rating || 0).toFixed(2))
        }))
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    next(error);
  }
});

// @desc    Get dashboard statistics (alternative route)
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin/Manager)
router.get('/dashboard/stats', async (req, res, next) => {
  try {
    const pool = await getPool();

    // Get overall statistics
    const statsResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as total_users,
        (SELECT COUNT(*) FROM mess_halls WHERE is_active = 1) as total_mess_halls,
        (SELECT COUNT(*) FROM Feedback WHERE created_at >= DATEADD(day, -30, GETDATE())) as feedback_last_30_days,
        (SELECT AVG(CAST(Rating AS FLOAT)) FROM Feedback WHERE created_at >= DATEADD(day, -30, GETDATE())) as avg_rating_last_30_days
    `);

    const stats = statsResult.recordset[0];

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total_users: stats.total_users,
          total_mess_halls: stats.total_mess_halls,
          feedback_last_30_days: stats.feedback_last_30_days,
          avg_rating_last_30_days: parseFloat((stats.avg_rating_last_30_days || 0).toFixed(2))
        }
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    next(error);
  }
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get('/users', authorize('admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search term too long'),
  query('role').optional().isIn(['student', 'admin', 'mess_manager']).withMessage('Invalid role')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const pool = await getPool();

    let whereClause = 'WHERE 1=1';
    let searchParam = '';
    let roleParam = '';

    if (search) {
      whereClause += ` AND (first_name LIKE @search OR last_name LIKE @search OR email LIKE @search OR student_id LIKE @search)`;
      searchParam = `%${search}%`;
    }

    if (role) {
      whereClause += ` AND role = @role`;
      roleParam = role;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countRequest = pool.request();
    if (search) countRequest.input('search', sql.NVarChar, searchParam);
    if (role) countRequest.input('role', sql.NVarChar, roleParam);
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    // Get users with pagination
    const usersQuery = `
      SELECT id, student_id, email, first_name, last_name, role, hostel,
             year_of_study, department, is_active, created_at, updated_at
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const usersRequest = pool.request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit);
    
    if (search) usersRequest.input('search', sql.NVarChar, searchParam);
    if (role) usersRequest.input('role', sql.NVarChar, roleParam);

    const usersResult = await usersRequest.query(usersQuery);

    res.status(200).json({
      success: true,
      count: usersResult.recordset.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: usersResult.recordset
    });

  } catch (error) {
    console.error('Get users error:', error);
    next(error);
  }
});

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
router.put('/users/:id/status', authorize('admin'), [
  body('is_active').isBoolean().withMessage('Active status must be boolean')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.params.id;
    const { is_active } = req.body;

    const pool = await getPool();

    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('isActive', sql.Bit, is_active)
      .query(`
        UPDATE users 
        SET is_active = @isActive, updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.student_id, INSERTED.email, 
               INSERTED.first_name, INSERTED.last_name, INSERTED.is_active
        WHERE id = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Update user status error:', error);
    next(error);
  }
});

// @desc    Get all mess halls (admin view)
// @route   GET /api/admin/mess-halls
// @access  Private (Admin/Manager)
router.get('/mess-halls', async (req, res, next) => {
  try {
    const pool = await getPool();
    
    const result = await pool.request().query(`
      SELECT mh.id, mh.name, mh.location, mh.capacity, mh.is_active, mh.created_at,
             u.first_name + ' ' + u.last_name as manager_name,
             u.email as manager_email,
             COUNT(f.id) as total_feedback,
             AVG(CAST(f.overall_rating AS FLOAT)) as avg_rating
      FROM mess_halls mh
      LEFT JOIN users u ON mh.manager_id = u.id
      LEFT JOIN feedback f ON mh.id = f.mess_hall_id 
        AND f.created_at >= DATEADD(day, -30, GETDATE())
      GROUP BY mh.id, mh.name, mh.location, mh.capacity, mh.is_active, mh.created_at,
               u.first_name, u.last_name, u.email
      ORDER BY mh.name
    `);

    res.status(200).json({
      success: true,
      count: result.recordset.length,
      data: result.recordset.map(mh => ({
        ...mh,
        avg_rating: parseFloat((mh.avg_rating || 0).toFixed(2))
      }))
    });

  } catch (error) {
    console.error('Get mess halls error:', error);
    next(error);
  }
});

// @desc    Create mess hall
// @route   POST /api/admin/mess-halls
// @access  Private (Admin only)
router.post('/mess-halls', authorize('admin'), [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('location')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('manager_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Manager ID must be a valid integer')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, location, capacity, manager_id } = req.body;

    const pool = await getPool();

    // Check if manager exists and has correct role
    if (manager_id) {
      const managerResult = await pool.request()
        .input('managerId', sql.Int, manager_id)
        .query(`
          SELECT id FROM users 
          WHERE id = @managerId AND role IN ('admin', 'mess_manager') AND is_active = 1
        `);

      if (managerResult.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manager ID or user is not authorized to manage mess halls'
        });
      }
    }

    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('location', sql.NVarChar, location || null)
      .input('capacity', sql.Int, capacity || null)
      .input('managerId', sql.Int, manager_id || null)
      .query(`
        INSERT INTO mess_halls (name, location, capacity, manager_id)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.location, 
               INSERTED.capacity, INSERTED.manager_id, INSERTED.created_at
        VALUES (@name, @location, @capacity, @managerId)
      `);

    res.status(201).json({
      success: true,
      message: 'Mess hall created successfully',
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Create mess hall error:', error);
    next(error);
  }
});

// @desc    Update mess hall
// @route   PUT /api/admin/mess-halls/:id
// @access  Private (Admin only)
router.put('/mess-halls/:id', authorize('admin'), [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('location')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('manager_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Manager ID must be a valid integer'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Active status must be boolean')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const messHallId = req.params.id;
    const { name, location, capacity, manager_id, is_active } = req.body;

    const pool = await getPool();

    // Get current mess hall data
    const currentResult = await pool.request()
      .input('messHallId', sql.Int, messHallId)
      .query('SELECT * FROM mess_halls WHERE id = @messHallId');

    if (currentResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mess hall not found'
      });
    }

    const current = currentResult.recordset[0];

    // Check manager if provided
    if (manager_id && manager_id !== current.manager_id) {
      const managerResult = await pool.request()
        .input('managerId', sql.Int, manager_id)
        .query(`
          SELECT id FROM users 
          WHERE id = @managerId AND role IN ('admin', 'mess_manager') AND is_active = 1
        `);

      if (managerResult.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manager ID or user is not authorized to manage mess halls'
        });
      }
    }

    const result = await pool.request()
      .input('messHallId', sql.Int, messHallId)
      .input('name', sql.NVarChar, name !== undefined ? name : current.name)
      .input('location', sql.NVarChar, location !== undefined ? location : current.location)
      .input('capacity', sql.Int, capacity !== undefined ? capacity : current.capacity)
      .input('managerId', sql.Int, manager_id !== undefined ? manager_id : current.manager_id)
      .input('isActive', sql.Bit, is_active !== undefined ? is_active : current.is_active)
      .query(`
        UPDATE mess_halls 
        SET name = @name, location = @location, capacity = @capacity,
            manager_id = @managerId, is_active = @isActive
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.location, 
               INSERTED.capacity, INSERTED.manager_id, INSERTED.is_active
        WHERE id = @messHallId
      `);

    res.status(200).json({
      success: true,
      message: 'Mess hall updated successfully',
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Update mess hall error:', error);
    next(error);
  }
});

// @desc    Get detailed feedback report
// @route   GET /api/admin/feedback/report
// @access  Private (Admin/Manager)
router.get('/feedback/report', [
  query('mess_hall_id').optional().isInt({ min: 1 }).withMessage('Invalid mess hall ID'),
  query('start_date').optional().isISO8601().withMessage('Invalid start date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date'),
  query('rating_filter').optional().isInt({ min: 1, max: 5 }).withMessage('Rating filter must be between 1 and 5')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { mess_hall_id, start_date, end_date, rating_filter } = req.query;

    const pool = await getPool();

    let whereClause = 'WHERE 1=1';
    const request = pool.request();

    if (mess_hall_id) {
      whereClause += ' AND f.mess_hall_id = @messHallId';
      request.input('messHallId', sql.Int, mess_hall_id);
    }

    if (start_date) {
      whereClause += ' AND f.created_at >= @startDate';
      request.input('startDate', sql.DateTime2, start_date);
    }

    if (end_date) {
      whereClause += ' AND f.created_at <= @endDate';
      request.input('endDate', sql.DateTime2, end_date);
    }

    if (rating_filter) {
      whereClause += ' AND f.overall_rating = @ratingFilter';
      request.input('ratingFilter', sql.Int, rating_filter);
    }

    const result = await request.query(`
      SELECT 
        f.id, f.overall_rating, f.food_quality_rating, f.service_rating,
        f.cleanliness_rating, f.value_rating, f.comments, f.suggestions,
        f.is_anonymous, f.created_at,
        mh.name as mess_hall_name, mh.location as mess_hall_location,
        CASE 
          WHEN f.is_anonymous = 1 THEN 'Anonymous'
          ELSE u.first_name + ' ' + u.last_name
        END as reviewer_name,
        u.student_id, u.hostel, u.year_of_study, u.department,
        dm.meal_type, dm.menu_date
      FROM feedback f
      JOIN mess_halls mh ON f.mess_hall_id = mh.id
      JOIN users u ON f.user_id = u.id
      LEFT JOIN daily_menus dm ON f.daily_menu_id = dm.id
      ${whereClause}
      ORDER BY f.created_at DESC
    `);

    res.status(200).json({
      success: true,
      count: result.recordset.length,
      filters: {
        mess_hall_id,
        start_date,
        end_date,
        rating_filter
      },
      data: result.recordset
    });

  } catch (error) {
    console.error('Get feedback report error:', error);
    next(error);
  }
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
router.get('/users', authorize('admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['student', 'admin', 'mess_manager']).withMessage('Invalid role'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be 1-100 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { role, search } = req.query;

    const pool = await getPool();

    let whereClause = 'WHERE 1=1';
    const request = pool.request();

    if (role) {
      whereClause += ' AND u.role = @role';
      request.input('role', sql.VarChar, role);
    }

    if (search) {
      whereClause += ' AND (u.username LIKE @search OR u.email LIKE @search OR up.full_name LIKE @search)';
      request.input('search', sql.VarChar, `%${search}%`);
    }

    // Get total count
    const countResult = await request.query(`SELECT COUNT(*) as total FROM users u ${whereClause}`);
    const total = countResult.recordset[0].total;

    // Get users with pagination
    const result = await pool.request()
      .input('role', sql.VarChar, role)
      .input('search', sql.VarChar, search ? `%${search}%` : null)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at,
               up.full_name, up.department, up.year_of_study, up.student_id,
               uc.total_points, uc.level_name,
               COUNT(fs.id) as total_feedback_sessions
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_credits uc ON u.id = uc.user_id
        LEFT JOIN feedback_sessions fs ON u.id = fs.user_id
        ${whereClause}
        GROUP BY u.id, u.username, u.email, u.role, u.is_active, u.created_at,
                 up.full_name, up.department, up.year_of_study, up.student_id,
                 uc.total_points, uc.level_name
        ORDER BY u.created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

    res.status(200).json({
      success: true,
      count: result.recordset.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: result.recordset
    });

  } catch (error) {
    console.error('Get users error:', error);
    next(error);
  }
});

// @desc    Create new user
// @route   POST /api/admin/users
// @access  Private (Admin)
router.post('/users', authorize('admin'), [
  body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'admin', 'mess_manager']).withMessage('Invalid role'),
  body('full_name').optional().isLength({ min: 2, max: 255 }).withMessage('Full name must be 2-255 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password, role, full_name } = req.body;
    const bcrypt = require('bcryptjs');

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Check if user already exists
    const existingUser = await transaction.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, email)
      .query('SELECT id FROM users WHERE username = @username OR email = @email');

    if (existingUser.recordset.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'User with this username or email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userResult = await transaction.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, hashedPassword)
      .input('role', sql.VarChar, role)
      .query(`
        INSERT INTO users (username, email, password, role)
        OUTPUT INSERTED.id
        VALUES (@username, @email, @password, @role)
      `);

    const userId = userResult.recordset[0].id;

    // Create user profile if full_name provided
    if (full_name) {
      await transaction.request()
        .input('userId', sql.Int, userId)
        .input('fullName', sql.VarChar, full_name)
        .query(`
          INSERT INTO user_profiles (user_id, full_name)
          VALUES (@userId, @fullName)
        `);
    }

    // Initialize user credits
    await transaction.request()
      .input('userId', sql.Int, userId)
      .query(`
        INSERT INTO user_credits (user_id, total_points, level_name)
        VALUES (@userId, 0, 'Bronze')
      `);

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: userId, username, email, role }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create user error:', error);
    next(error);
  }
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
router.delete('/users/:id', authorize('admin'), async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const pool = await getPool();

    // Check if user exists
    const userResult = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT id, username FROM users WHERE id = @userId');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete user (set is_active = 0)
    await pool.request()
      .input('userId', sql.Int, userId)
      .query('UPDATE users SET is_active = 0, updated_at = GETDATE() WHERE id = @userId');

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    next(error);
  }
});

// @desc    Get all feedback sessions (Admin view)
// @route   GET /api/admin/feedback
// @access  Private (Admin)
router.get('/feedback', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('mess_hall_id').optional().isInt({ min: 1 }).withMessage('Invalid mess hall ID'),
  query('date_from').optional().isISO8601().withMessage('Invalid date format'),
  query('date_to').optional().isISO8601().withMessage('Invalid date format')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { mess_hall_id, date_from, date_to } = req.query;

    const pool = await getPool();

    let whereClause = 'WHERE 1=1';
    const request = pool.request();

    if (mess_hall_id) {
      whereClause += ' AND fs.mess_hall_id = @messHallId';
      request.input('messHallId', sql.Int, mess_hall_id);
    }

    if (date_from) {
      whereClause += ' AND fs.feedback_date >= @dateFrom';
      request.input('dateFrom', sql.Date, date_from);
    }

    if (date_to) {
      whereClause += ' AND fs.feedback_date <= @dateTo';
      request.input('dateTo', sql.Date, date_to);
    }

    // Get total count
    const countResult = await request.query(`SELECT COUNT(*) as total FROM feedback_sessions fs ${whereClause}`);
    const total = countResult.recordset[0].total;

    // Get feedback sessions with details
    const result = await pool.request()
      .input('messHallId', sql.Int, mess_hall_id)
      .input('dateFrom', sql.Date, date_from)
      .input('dateTo', sql.Date, date_to)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT fs.id, fs.meal_type, fs.feedback_date, fs.overall_comments,
               fs.points_earned, fs.is_anonymous, fs.created_at,
               mh.name as mess_hall_name, mh.location as mess_hall_location,
               CASE WHEN fs.is_anonymous = 1 THEN 'Anonymous' ELSE u.username END as username,
               COUNT(if_items.id) as items_rated,
               AVG(CAST(if_items.rating AS FLOAT)) as avg_item_rating,
               dsr.service_rating, dsr.cleanliness_rating, dsr.ambience_rating
        FROM feedback_sessions fs
        JOIN mess_halls mh ON fs.mess_hall_id = mh.id
        LEFT JOIN users u ON fs.user_id = u.id
        LEFT JOIN item_feedback if_items ON fs.id = if_items.feedback_session_id
        LEFT JOIN daily_service_ratings dsr ON fs.user_id = dsr.user_id 
          AND fs.mess_hall_id = dsr.mess_hall_id 
          AND fs.feedback_date = dsr.rating_date
        ${whereClause}
        GROUP BY fs.id, fs.meal_type, fs.feedback_date, fs.overall_comments,
                 fs.points_earned, fs.is_anonymous, fs.created_at,
                 mh.name, mh.location, u.username,
                 dsr.service_rating, dsr.cleanliness_rating, dsr.ambience_rating
        ORDER BY fs.created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

    res.status(200).json({
      success: true,
      count: result.recordset.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: result.recordset
    });

  } catch (error) {
    console.error('Get admin feedback error:', error);
    next(error);
  }
});

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin)
router.get('/dashboard-stats', async (req, res, next) => {
  try {
    const pool = await getPool();

    // Get real statistics from database
    const statsResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as totalUsers,
        (SELECT COUNT(*) FROM feedback_sessions WHERE created_at >= DATEADD(day, -30, GETDATE())) as totalFeedback,
        (SELECT AVG(CAST(rating AS FLOAT)) FROM item_feedback WHERE created_at >= DATEADD(day, -30, GETDATE())) as avgRating,
        (SELECT COUNT(DISTINCT user_id) FROM feedback_sessions WHERE feedback_date = CAST(GETDATE() AS DATE)) as activeToday
    `);

    const stats = statsResult.recordset[0];

    // Calculate trends (compare with previous month)
    const trendsResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = 1 AND created_at >= DATEADD(day, -60, GETDATE()) AND created_at < DATEADD(day, -30, GETDATE())) as prevUsers,
        (SELECT COUNT(*) FROM feedback_sessions WHERE created_at >= DATEADD(day, -60, GETDATE()) AND created_at < DATEADD(day, -30, GETDATE())) as prevFeedback,
        (SELECT AVG(CAST(rating AS FLOAT)) FROM item_feedback WHERE created_at >= DATEADD(day, -60, GETDATE()) AND created_at < DATEADD(day, -30, GETDATE())) as prevRating
    `);

    const trends = trendsResult.recordset[0];

    // Calculate percentage changes
    const usersTrend = trends.prevUsers > 0 ? 
      { direction: stats.totalUsers > trends.prevUsers ? 'up' : 'down', percentage: Math.abs(((stats.totalUsers - trends.prevUsers) / trends.prevUsers * 100)).toFixed(1) } :
      { direction: 'up', percentage: '100.0' };

    const feedbackTrend = trends.prevFeedback > 0 ? 
      { direction: stats.totalFeedback > trends.prevFeedback ? 'up' : 'down', percentage: Math.abs(((stats.totalFeedback - trends.prevFeedback) / trends.prevFeedback * 100)).toFixed(1) } :
      { direction: 'up', percentage: '100.0' };

    const ratingTrend = trends.prevRating > 0 ? 
      { direction: stats.avgRating > trends.prevRating ? 'up' : 'down', percentage: Math.abs(((stats.avgRating - trends.prevRating) / trends.prevRating * 100)).toFixed(1) } :
      { direction: 'up', percentage: '0.0' };

    res.status(200).json({
      success: true,
      totalUsers: stats.totalUsers || 0,
      totalFeedback: stats.totalFeedback || 0,
      avgRating: parseFloat((stats.avgRating || 0).toFixed(1)),
      activeToday: stats.activeToday || 0,
      usersTrend,
      feedbackTrend,
      ratingTrend,
      activeTrend: { direction: 'up', percentage: '5.2' }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    next(error);
  }
});

// @desc    Send notification to users
// @route   POST /api/admin/send-notification
// @access  Private (Admin)
router.post('/send-notification', authorize('admin'), [
  body('title').isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('message').isLength({ min: 1, max: 1000 }).withMessage('Message is required and must be less than 1000 characters'),
  body('type').optional().isIn(['info', 'warning', 'success', 'error']).withMessage('Invalid notification type'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, message, type = 'info', priority = 'normal', recipients = 'all_students' } = req.body;
    const pool = await getPool();

    // Get target users based on recipients
    let targetUsers = [];
    if (recipients === 'all_students') {
      const usersResult = await pool.request().query(`
        SELECT id, username, email FROM users 
        WHERE role = 'student' AND is_active = 1
      `);
      targetUsers = usersResult.recordset;
    }

    // Create notification record
    const notificationResult = await pool.request()
      .input('title', sql.NVarChar, title)
      .input('message', sql.NVarChar, message)
      .input('type', sql.NVarChar, type)
      .input('priority', sql.NVarChar, priority)
      .input('sentBy', sql.Int, req.user.id)
      .query(`
        INSERT INTO notifications (title, message, type, priority, sent_by, created_at)
        OUTPUT INSERTED.id
        VALUES (@title, @message, @type, @priority, @sentBy, GETDATE())
      `);

    const notificationId = notificationResult.recordset[0].id;

    // Send to each target user
    for (const user of targetUsers) {
      await pool.request()
        .input('notificationId', sql.Int, notificationId)
        .input('userId', sql.Int, user.id)
        .query(`
          INSERT INTO user_notifications (notification_id, user_id, is_read, created_at)
          VALUES (@notificationId, @userId, 0, GETDATE())
        `);
    }

    res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      recipientCount: targetUsers.length,
      notificationId
    });

  } catch (error) {
    console.error('Send notification error:', error);
    next(error);
  }
});

module.exports = router;
