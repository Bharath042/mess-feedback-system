const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getPool, sql } = require('../config/database');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all mess halls
// @route   GET /api/feedback/mess-halls
// @access  Public
router.get('/mess-halls', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT mh.id, mh.name, mh.location, mh.capacity, mh.is_active,
             mh.operating_hours, mh.contact_number, mh.facilities
      FROM mess_halls mh
      WHERE mh.is_active = 1
      ORDER BY mh.name
    `);

    res.status(200).json({
      success: true,
      count: result.recordset.length,
      data: result.recordset
    });
  } catch (error) {
    console.error('Get mess halls error:', error);
    next(error);
  }
});

// @desc    Get today's menu for a mess hall
// @route   GET /api/feedback/mess-halls/:id/menu
// @access  Public
router.get('/mess-halls/:id/menu', [
  query('date').optional().isISO8601().withMessage('Invalid date format'),
  query('meal_type').optional().isIn(['breakfast', 'lunch', 'dinner', 'snacks']).withMessage('Invalid meal type')
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
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const mealType = req.query.meal_type;

    const pool = await getPool();
    
    let query = `
      SELECT dm.id as daily_menu_id, dm.meal_type, dm.menu_date,
             mi.id as menu_item_id, mi.name, mi.category, mi.description,
             mi.is_vegetarian, mi.is_vegan, mi.spice_level, mi.allergens,
             dm.is_available
      FROM daily_menus dm
      JOIN menu_items mi ON dm.menu_item_id = mi.id
      WHERE dm.mess_hall_id = @messHallId 
        AND dm.menu_date = @date
        AND dm.is_available = 1
    `;
    
    const request = pool.request()
      .input('messHallId', sql.Int, messHallId)
      .input('date', sql.Date, date);

    if (mealType) {
      query += ' AND dm.meal_type = @mealType';
      request.input('mealType', sql.VarChar, mealType);
    }

    query += ' ORDER BY dm.meal_type, mi.category, mi.name';

    const result = await request.query(query);

    // Group by meal type
    const menuByMealType = {};
    result.recordset.forEach(item => {
      if (!menuByMealType[item.meal_type]) {
        menuByMealType[item.meal_type] = [];
      }
      menuByMealType[item.meal_type].push({
        id: item.menu_item_id,
        daily_menu_id: item.daily_menu_id,
        name: item.name,
        category: item.category,
        description: item.description,
        is_vegetarian: item.is_vegetarian,
        is_vegan: item.is_vegan,
        spice_level: item.spice_level,
        allergens: item.allergens,
        is_available: item.is_available
      });
    });

    res.status(200).json({
      success: true,
      data: {
        mess_hall_id: parseInt(messHallId),
        date: date,
        menu: menuByMealType
      }
    });

  } catch (error) {
    console.error('Get menu error:', error);
    next(error);
  }
});

// @desc    Submit comprehensive feedback
// @route   POST /api/feedback/submit
// @access  Private
router.post('/submit', protect, [
  body('mess_hall_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid mess hall ID is required'),
  body('meal_type')
    .optional()
    .isIn(['breakfast', 'lunch', 'dinner', 'snacks'])
    .withMessage('Valid meal type is required'),
  body('overall_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  body('service_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Service rating must be between 1 and 5'),
  body('cleanliness_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Cleanliness rating must be between 1 and 5'),
  body('overall_comments')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comments must be less than 1000 characters'),
  body('item_ratings')
    .optional()
    .isArray()
    .withMessage('Item ratings must be an array'),
  body('is_anonymous')
    .optional()
    .isBoolean()
    .withMessage('Anonymous flag must be boolean')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      mess_hall_id,
      meal_type,
      overall_rating,
      service_rating,
      cleanliness_rating,
      overall_comments,
      item_ratings = [],
      is_anonymous = false
    } = req.body;

    const pool = await getPool();
    const today = new Date().toISOString().split('T')[0];

    // Check if user already submitted feedback for this exact meal type and mess hall today
    // Allow multiple submissions for different meals on the same day
    const existingFeedback = await pool.request()
      .input('roll', sql.VarChar, req.user.username)
      .input('meal', sql.VarChar, meal_type)
      .input('messHall', sql.VarChar, `Mess Hall ${mess_hall_id}`)
      .input('today', sql.Date, today)
      .query(`
        SELECT id FROM Feedback 
        WHERE Roll = @roll 
          AND Meal = @meal 
          AND mess_hall = @messHall
          AND CAST(created_at AS DATE) = @today
      `);

    if (existingFeedback.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted feedback for this meal at this mess hall today. Please try again tomorrow.'
      });
    }

    // Insert feedback using the Feedback table schema
    const result = await pool.request()
      .input('StudentName', sql.VarChar, req.user.username)
      .input('Roll', sql.VarChar, req.user.username)
      .input('Meal', sql.VarChar, meal_type)
      .input('Rating', sql.Int, overall_rating)
      .input('Comment', sql.NVarChar, overall_comments || null)
      .input('mess_hall', sql.VarChar, `Mess Hall ${mess_hall_id}`)
      .input('food_quality_rating', sql.Int, overall_rating || null)
      .input('service_rating', sql.Int, service_rating || null)
      .input('cleanliness_rating', sql.Int, cleanliness_rating || null)
      .input('is_anonymous', sql.Bit, is_anonymous || false)
      .query(`
        INSERT INTO Feedback (
          StudentName, Roll, Meal, Rating, Comment,
          mess_hall, food_quality_rating, service_rating, 
          cleanliness_rating, is_anonymous
        )
        OUTPUT INSERTED.id, INSERTED.created_at
        VALUES (
          @StudentName, @Roll, @Meal, @Rating, @Comment,
          @mess_hall, @food_quality_rating, @service_rating,
          @cleanliness_rating, @is_anonymous
        )
      `);

    const feedback = result.recordset[0];

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: feedback.id,
        created_at: feedback.created_at
      }
    });

  } catch (error) {
    console.error('Submit feedback error:', error);
    next(error);
  }
});


module.exports = router;
