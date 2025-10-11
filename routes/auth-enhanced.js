const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getPool, sql } = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res, req) => {
  const token = generateToken(user.id, user.role);

  const options = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Log successful login
  const logger = require('../config/logging').setupLogging();
  logger.logSecurity('LOGIN_SUCCESS', user, { role: user.role }, req);

  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
};

// Account lockout check
const checkAccountLockout = async (pool, username) => {
  const result = await pool.request()
    .input('username', sql.VarChar, username)
    .query(`
      SELECT login_attempts, locked_until 
      FROM users 
      WHERE username = @username
    `);

  if (result.recordset.length === 0) return { locked: false };

  const user = result.recordset[0];
  const now = new Date();
  
  if (user.locked_until && new Date(user.locked_until) > now) {
    return { locked: true, until: user.locked_until };
  }

  return { locked: false, attempts: user.login_attempts || 0 };
};

// Update login attempts
const updateLoginAttempts = async (pool, username, success) => {
  if (success) {
    await pool.request()
      .input('username', sql.VarChar, username)
      .query(`
        UPDATE users 
        SET login_attempts = 0, locked_until = NULL, last_login = GETDATE()
        WHERE username = @username
      `);
  } else {
    await pool.request()
      .input('username', sql.VarChar, username)
      .query(`
        UPDATE users 
        SET login_attempts = ISNULL(login_attempts, 0) + 1,
            locked_until = CASE 
              WHEN ISNULL(login_attempts, 0) + 1 >= 5 
              THEN DATEADD(minute, 30, GETDATE())
              ELSE locked_until 
            END
        WHERE username = @username
      `);
  }
};

// @desc    Student Login
// @route   POST /api/auth/student/login
// @access  Public
router.post('/student/login', [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be between 3 and 100 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

    const { username, password } = req.body;
    const logger = require('../config/logging').setupLogging();

    const pool = await getPool();

    // Check account lockout
    const lockoutStatus = await checkAccountLockout(pool, username);
    if (lockoutStatus.locked) {
      logger.logSecurity('LOGIN_ATTEMPT_LOCKED', { username }, { until: lockoutStatus.until }, req);
      return res.status(423).json({
        success: false,
        message: `Account locked until ${new Date(lockoutStatus.until).toLocaleString()}`
      });
    }

    // Find user
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query(`
        SELECT id, username, password, role, is_active
        FROM users 
        WHERE username = @username AND role = 'student' AND is_active = 1
      `);

    if (result.recordset.length === 0) {
      await updateLoginAttempts(pool, username, false);
      logger.logSecurity('LOGIN_FAILURE', { username }, { reason: 'user_not_found' }, req);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.recordset[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      await updateLoginAttempts(pool, username, false);
      logger.logSecurity('LOGIN_FAILURE', user, { reason: 'invalid_password' }, req);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    await updateLoginAttempts(pool, username, true);
    sendTokenResponse(user, 200, res, req);

  } catch (error) {
    console.error('Student login error:', error);
    next(error);
  }
});

// @desc    Admin Login
// @route   POST /api/auth/admin/login
// @access  Public
router.post('/admin/login', [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be between 3 and 100 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

    const { username, password } = req.body;
    const logger = require('../config/logging').setupLogging();

    const pool = await getPool();

    // Check account lockout
    const lockoutStatus = await checkAccountLockout(pool, username);
    if (lockoutStatus.locked) {
      logger.logSecurity('ADMIN_LOGIN_ATTEMPT_LOCKED', { username }, { until: lockoutStatus.until }, req);
      return res.status(423).json({
        success: false,
        message: `Account locked until ${new Date(lockoutStatus.until).toLocaleString()}`
      });
    }

    // Find admin user
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query(`
        SELECT id, username, password, role, is_active
        FROM users 
        WHERE username = @username AND role = 'admin' AND is_active = 1
      `);

    if (result.recordset.length === 0) {
      await updateLoginAttempts(pool, username, false);
      logger.logSecurity('ADMIN_LOGIN_FAILURE', { username }, { reason: 'user_not_found' }, req);
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const user = result.recordset[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      await updateLoginAttempts(pool, username, false);
      logger.logSecurity('ADMIN_LOGIN_FAILURE', user, { reason: 'invalid_password' }, req);
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    await updateLoginAttempts(pool, username, true);
    sendTokenResponse(user, 200, res, req);

  } catch (error) {
    console.error('Admin login error:', error);
    next(error);
  }
});

// @desc    Register Student
// @route   POST /api/auth/student/register
// @access  Public
router.post('/student/register', [
  body('username')
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
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

    const { username, password } = req.body;
    const logger = require('../config/logging').setupLogging();

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

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, hashedPassword)
      .input('role', sql.VarChar, 'student')
      .query(`
        INSERT INTO users (username, password, role)
        OUTPUT INSERTED.id, INSERTED.username, INSERTED.role
        VALUES (@username, @password, @role)
      `);

    const user = result.recordset[0];
    logger.logSecurity('USER_REGISTERED', user, { role: 'student' }, req);
    
    sendTokenResponse(user, 201, res, req);

  } catch (error) {
    console.error('Student registration error:', error);
    next(error);
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, (req, res) => {
  const logger = require('../config/logging').setupLogging();
  logger.logSecurity('LOGOUT', req.user, {}, req);

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
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

    const { currentPassword, newPassword } = req.body;
    const logger = require('../config/logging').setupLogging();

    const pool = await getPool();

    // Get current password
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query('SELECT password FROM users WHERE id = @userId');

    const user = result.recordset[0];

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      logger.logSecurity('PASSWORD_CHANGE_FAILURE', req.user, { reason: 'invalid_current_password' }, req);
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('password', sql.VarChar, hashedPassword)
      .query('UPDATE users SET password = @password, updated_at = GETDATE() WHERE id = @userId');

    logger.logSecurity('PASSWORD_CHANGED', req.user, {}, req);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    next(error);
  }
});

module.exports = router;
