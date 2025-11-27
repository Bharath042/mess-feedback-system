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
    .isInt({ min: 1 })
    .withMessage('Valid mess hall ID is required'),
  body('meal_type')
    .isIn(['breakfast', 'lunch', 'dinner', 'snacks'])
    .withMessage('Valid meal type is required'),
  body('overall_rating')
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

    // Check if user already submitted feedback for this meal type today
    const existingFeedback = await pool.request()
      .input('roll', sql.VarChar, req.user.username)
      .input('meal', sql.VarChar, meal_type)
      .input('today', sql.Date, today)
      .query(`
        SELECT id FROM Feedback 
        WHERE Roll = @roll 
          AND Meal = @meal 
          AND CAST(created_at AS DATE) = @today
      `);

    if (existingFeedback.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted feedback for this meal today'
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

// @desc    Get user's feedback history
// @route   GET /api/feedback/history
// @access  Private
router.get('/history', protect, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const pool = await getPool();

    // Get total count
    const countResult = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query('SELECT COUNT(*) as total FROM feedback_sessions WHERE user_id = @userId');

    const total = countResult.recordset[0].total;

    // Get feedback with pagination
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT fs.id, fs.meal_type, fs.feedback_date, fs.overall_comments,
               fs.points_earned, fs.is_anonymous, fs.created_at,
               mh.name as mess_hall_name, mh.location as mess_hall_location,
               COUNT(if_items.id) as items_rated,
               AVG(CAST(if_items.rating AS FLOAT)) as avg_item_rating
        FROM feedback_sessions fs
        JOIN mess_halls mh ON fs.mess_hall_id = mh.id
        LEFT JOIN item_feedback if_items ON fs.id = if_items.feedback_session_id
        WHERE fs.user_id = @userId
        GROUP BY fs.id, fs.meal_type, fs.feedback_date, fs.overall_comments,
                 fs.points_earned, fs.is_anonymous, fs.created_at,
                 mh.name, mh.location
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
    console.error('Get user feedback history error:', error);
    next(error);
  }
});

// @desc    Get user profile and stats
// @route   GET /api/feedback/profile
// @access  Private
router.get('/profile', protect, async (req, res, next) => {
  try {
    const pool = await getPool();

    // Get user profile
    const profileResult = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT u.id, u.username, u.email, u.role, u.created_at,
               up.full_name, up.phone, up.department, up.year_of_study,
               up.student_id, up.hostel_name, up.room_number,
               up.dietary_preferences, up.allergies
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = @userId
      `);

    // Get user credits and stats
    const creditsResult = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT total_points, points_earned_today, points_spent,
               last_activity_date, streak_days, level_name
        FROM user_credits
        WHERE user_id = @userId
      `);

    // Get feedback stats
    const statsResult = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT 
          COUNT(fs.id) as total_feedback_sessions,
          COUNT(if_items.id) as total_items_rated,
          AVG(CAST(if_items.rating AS FLOAT)) as avg_rating,
          COUNT(DISTINCT fs.mess_hall_id) as mess_halls_visited
        FROM feedback_sessions fs
        LEFT JOIN item_feedback if_items ON fs.id = if_items.feedback_session_id
        WHERE fs.user_id = @userId
      `);

    const profile = profileResult.recordset[0];
    const credits = creditsResult.recordset[0] || {
      total_points: 0,
      points_earned_today: 0,
      points_spent: 0,
      last_activity_date: null,
      streak_days: 0,
      level_name: 'Bronze'
    };
    const stats = statsResult.recordset[0];

    res.status(200).json({
      success: true,
      data: {
        profile,
        credits,
        stats
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    next(error);
  }
});

// @desc    Update user profile
// @route   PUT /api/feedback/profile
// @access  Private
router.put('/profile', protect, [
  body('full_name').optional().isLength({ min: 2, max: 255 }).withMessage('Full name must be 2-255 characters'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('department').optional().isLength({ max: 100 }).withMessage('Department must be less than 100 characters'),
  body('year_of_study').optional().isInt({ min: 1, max: 6 }).withMessage('Year of study must be 1-6'),
  body('student_id').optional().isLength({ max: 50 }).withMessage('Student ID must be less than 50 characters'),
  body('hostel_name').optional().isLength({ max: 100 }).withMessage('Hostel name must be less than 100 characters'),
  body('room_number').optional().isLength({ max: 20 }).withMessage('Room number must be less than 20 characters'),
  body('dietary_preferences').optional().isIn(['vegetarian', 'vegan', 'non-vegetarian', 'jain']).withMessage('Invalid dietary preference'),
  body('allergies').optional().isLength({ max: 500 }).withMessage('Allergies must be less than 500 characters')
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

    const {
      full_name,
      phone,
      department,
      year_of_study,
      student_id,
      hostel_name,
      room_number,
      dietary_preferences,
      allergies
    } = req.body;

    const pool = await getPool();

    // Update or insert user profile
    await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('fullName', sql.NVarChar, full_name)
      .input('phone', sql.VarChar, phone)
      .input('department', sql.VarChar, department)
      .input('yearOfStudy', sql.Int, year_of_study)
      .input('studentId', sql.VarChar, student_id)
      .input('hostelName', sql.VarChar, hostel_name)
      .input('roomNumber', sql.VarChar, room_number)
      .input('dietaryPreferences', sql.VarChar, dietary_preferences)
      .input('allergies', sql.NVarChar, allergies)
      .query(`
        MERGE user_profiles AS target
        USING (SELECT @userId as user_id) AS source
        ON target.user_id = source.user_id
        WHEN MATCHED THEN
          UPDATE SET 
            full_name = @fullName,
            phone = @phone,
            department = @department,
            year_of_study = @yearOfStudy,
            student_id = @studentId,
            hostel_name = @hostelName,
            room_number = @roomNumber,
            dietary_preferences = @dietaryPreferences,
            allergies = @allergies,
            updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (user_id, full_name, phone, department, year_of_study,
                  student_id, hostel_name, room_number, dietary_preferences, allergies)
          VALUES (@userId, @fullName, @phone, @department, @yearOfStudy,
                  @studentId, @hostelName, @roomNumber, @dietaryPreferences, @allergies);
      `);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    next(error);
  }
});

module.exports = router;
