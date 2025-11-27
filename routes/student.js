const express = require('express');
const { getPool, sql } = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
router.get('/user/profile', protect, async (req, res, next) => {
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT id, username, role, is_active, created_at
        FROM users
        WHERE id = @userId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = result.recordset[0];
    
    res.status(200).json({
      success: true,
      profile: {
        fullName: user.username,
        email: '',
        phone: '',
        studentId: '',
        department: '',
        yearOfStudy: '',
        hostelName: '',
        roomNumber: '',
        dietaryPreferences: '',
        allergies: ''
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    next(error);
  }
});

// @desc    Get today's menu
// @route   GET /api/menu/today
// @access  Public
router.get('/menu/today', async (req, res, next) => {
  try {
    const today = new Date();
    const day = today.toLocaleDateString('en-US', { weekday: 'long' });
    const date = today.toLocaleDateString();
    
    res.status(200).json({
      success: true,
      day: day,
      date: date,
      currentMeal: 'breakfast',
      currentMealItems: 'Tea, Biscuits, Samosa, Banana',
      breakfast: ['Tea', 'Biscuits', 'Samosa', 'Banana'],
      lunch: ['Rice', 'Dal', 'Vegetables', 'Roti'],
      dinner: ['Bread', 'Butter', 'Jam', 'Milk']
    });
  } catch (error) {
    console.error('Get menu error:', error);
    next(error);
  }
});

// @desc    Get mess halls
// @route   GET /api/mess-halls
// @access  Public
router.get('/mess-halls', async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: [
        { id: 1, name: 'Mess Hall 1', location: 'Block A' },
        { id: 2, name: 'Mess Hall 2', location: 'Block B' },
        { id: 3, name: 'Mess Hall 3', location: 'Block C' }
      ]
    });
  } catch (error) {
    console.error('Get mess halls error:', error);
    next(error);
  }
});

// @desc    Get current meal time
// @route   GET /api/current-meal-time
// @access  Public
router.get('/current-meal-time', async (req, res, next) => {
  try {
    const hour = new Date().getHours();
    let currentMeal = 'breakfast';
    
    if (hour >= 12 && hour < 16) {
      currentMeal = 'lunch';
    } else if (hour >= 18) {
      currentMeal = 'dinner';
    }
    
    res.status(200).json({
      success: true,
      data: {
        current_meal: currentMeal,
        breakfast: { start: '07:00', end: '09:00' },
        lunch: { start: '12:00', end: '14:00' },
        dinner: { start: '18:00', end: '20:00' }
      }
    });
  } catch (error) {
    console.error('Get current meal time error:', error);
    next(error);
  }
});

// @desc    Get meal types
// @route   GET /api/meal-types
// @access  Public
router.get('/meal-types', async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: ['breakfast', 'lunch', 'dinner']
    });
  } catch (error) {
    console.error('Get meal types error:', error);
    next(error);
  }
});

// @desc    Get daily submissions
// @route   GET /api/daily-submissions/:userId
// @access  Public (no auth required for this endpoint)
router.get('/daily-submissions/:userId', async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        total_submissions: 0,
        submitted_meals: [],
        remaining_submissions: 4
      }
    });
  } catch (error) {
    console.error('Get daily submissions error:', error);
    next(error);
  }
});

// @desc    Get notifications
// @route   GET /api/notifications/:username
// @access  Public
router.get('/notifications/:username', async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    next(error);
  }
});

module.exports = router;
