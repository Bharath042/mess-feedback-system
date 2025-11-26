const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getPool, sql } = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user.id);

  const options = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

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

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('student_id')
    .isLength({ min: 3, max: 20 })
    .withMessage('Student ID must be between 3 and 20 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('first_name')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('last_name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('hostel')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Hostel name must be less than 100 characters'),
  body('year_of_study')
    .optional()
    .isInt({ min: 1, max: 6 })
    .withMessage('Year of study must be between 1 and 6'),
  body('department')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters')
], async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      student_id,
      email,
      password,
      first_name,
      last_name,
      hostel,
      year_of_study,
      department
    } = req.body;

    const pool = await getPool();

    // Check if user already exists
    const existingUser = await pool.request()
      .input('student_id', sql.NVarChar, student_id)
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT id FROM users 
        WHERE student_id = @student_id OR email = @email
      `);

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this student ID or email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const result = await pool.request()
      .input('student_id', sql.NVarChar, student_id)
      .input('email', sql.NVarChar, email)
      .input('password_hash', sql.NVarChar, password_hash)
      .input('first_name', sql.NVarChar, first_name)
      .input('last_name', sql.NVarChar, last_name)
      .input('hostel', sql.NVarChar, hostel || null)
      .input('year_of_study', sql.Int, year_of_study || null)
      .input('department', sql.NVarChar, department || null)
      .query(`
        INSERT INTO users (student_id, email, password_hash, first_name, last_name, hostel, year_of_study, department)
        OUTPUT INSERTED.id, INSERTED.student_id, INSERTED.email, INSERTED.first_name, 
               INSERTED.last_name, INSERTED.role, INSERTED.hostel, INSERTED.year_of_study, INSERTED.department
        VALUES (@student_id, @email, @password_hash, @first_name, @last_name, @hostel, @year_of_study, @department)
      `);

    const user = result.recordset[0];
    sendTokenResponse(user, 201, res);

  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('login')
    .notEmpty()
    .withMessage('Please provide student ID or email'),
  body('password')
    .notEmpty()
    .withMessage('Please provide password')
], async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { login, password } = req.body;

    const pool = await getPool();

    // Find user by username
    const result = await pool.request()
      .input('login', sql.NVarChar, login)
      .query(`
        SELECT id, username, password, role, is_active
        FROM users 
        WHERE username = @login AND is_active = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.recordset[0];

    // Check password
    console.log('🔐 DEBUG: Comparing password');
    console.log('🔐 DEBUG: Provided password:', password);
    console.log('🔐 DEBUG: Stored hash:', user.password);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔐 DEBUG: Password match result:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    sendTokenResponse(user, 200, res);

  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, [
  body('first_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('last_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('hostel')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Hostel name must be less than 100 characters'),
  body('year_of_study')
    .optional()
    .isInt({ min: 1, max: 6 })
    .withMessage('Year of study must be between 1 and 6'),
  body('department')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters')
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

    const { first_name, last_name, hostel, year_of_study, department } = req.body;
    const pool = await getPool();

    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('first_name', sql.NVarChar, first_name || req.user.first_name)
      .input('last_name', sql.NVarChar, last_name || req.user.last_name)
      .input('hostel', sql.NVarChar, hostel !== undefined ? hostel : req.user.hostel)
      .input('year_of_study', sql.Int, year_of_study !== undefined ? year_of_study : req.user.year_of_study)
      .input('department', sql.NVarChar, department !== undefined ? department : req.user.department)
      .query(`
        UPDATE users 
        SET first_name = @first_name, last_name = @last_name, hostel = @hostel,
            year_of_study = @year_of_study, department = @department, updated_at = GETDATE()
        OUTPUT INSERTED.id, INSERTED.student_id, INSERTED.email, INSERTED.first_name,
               INSERTED.last_name, INSERTED.role, INSERTED.hostel, INSERTED.year_of_study, INSERTED.department
        WHERE id = @userId
      `);

    res.status(200).json({
      success: true,
      user: result.recordset[0]
    });

  } catch (error) {
    console.error('Profile update error:', error);
    next(error);
  }
});

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', protect, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Please provide current password'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
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
    const pool = await getPool();

    // Get current password hash
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query('SELECT password_hash FROM users WHERE id = @userId');

    const user = result.recordset[0];

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('password_hash', sql.NVarChar, newPasswordHash)
      .query(`
        UPDATE users 
        SET password_hash = @password_hash, updated_at = GETDATE()
        WHERE id = @userId
      `);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    next(error);
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

module.exports = router;
