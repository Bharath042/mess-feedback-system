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
             u.first_name + ' ' + u.last_name as manager_name
      FROM mess_halls mh
      LEFT JOIN users u ON mh.manager_id = u.id
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
  query('date').optional().isISO8601().withMessage('Invalid date format')
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

    const pool = await getPool();
    const result = await pool.request()
      .input('messHallId', sql.Int, messHallId)
      .input('date', sql.Date, date)
      .query(`
        SELECT dm.id as daily_menu_id, dm.meal_type, dm.menu_date,
               mi.id as item_id, mi.name as item_name, mi.category, 
               mi.description, mi.is_vegetarian
        FROM daily_menus dm
        JOIN daily_menu_items dmi ON dm.id = dmi.daily_menu_id
        JOIN menu_items mi ON dmi.menu_item_id = mi.id
        WHERE dm.mess_hall_id = @messHallId 
          AND dm.menu_date = @date
          AND mi.is_active = 1
        ORDER BY dm.meal_type, mi.category, mi.name
      `);

    // Group by meal type
    const menuByMealType = result.recordset.reduce((acc, item) => {
      if (!acc[item.meal_type]) {
        acc[item.meal_type] = {
          daily_menu_id: item.daily_menu_id,
          meal_type: item.meal_type,
          menu_date: item.menu_date,
          items: []
        };
      }
      acc[item.meal_type].items.push({
        id: item.item_id,
        name: item.item_name,
        category: item.category,
        description: item.description,
        is_vegetarian: item.is_vegetarian
      });
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: Object.values(menuByMealType)
    });
  } catch (error) {
    console.error('Get menu error:', error);
    next(error);
  }
});

// @desc    Submit feedback
// @route   POST /api/feedback
// @access  Private
router.post('/', protect, [
  body('mess_hall_id')
    .isInt({ min: 1 })
    .withMessage('Valid mess hall ID is required'),
  body('daily_menu_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Daily menu ID must be a valid integer'),
  body('overall_rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  body('food_quality_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Food quality rating must be between 1 and 5'),
  body('service_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Service rating must be between 1 and 5'),
  body('cleanliness_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Cleanliness rating must be between 1 and 5'),
  body('value_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Value rating must be between 1 and 5'),
  body('comments')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comments must be less than 1000 characters'),
  body('suggestions')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Suggestions must be less than 1000 characters'),
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
      daily_menu_id,
      overall_rating,
      food_quality_rating,
      service_rating,
      cleanliness_rating,
      value_rating,
      comments,
      suggestions,
      is_anonymous
    } = req.body;

    const pool = await getPool();

    // Check if user already submitted feedback for this mess hall today
    const existingFeedback = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('messHallId', sql.Int, mess_hall_id)
      .input('today', sql.Date, new Date().toISOString().split('T')[0])
      .query(`
        SELECT id FROM feedback 
        WHERE user_id = @userId 
          AND mess_hall_id = @messHallId 
          AND CAST(created_at AS DATE) = @today
      `);

    if (existingFeedback.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted feedback for this mess hall today'
      });
    }

    // Insert feedback
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('messHallId', sql.Int, mess_hall_id)
      .input('dailyMenuId', sql.Int, daily_menu_id || null)
      .input('overallRating', sql.Int, overall_rating)
      .input('foodQualityRating', sql.Int, food_quality_rating || null)
      .input('serviceRating', sql.Int, service_rating || null)
      .input('cleanlinessRating', sql.Int, cleanliness_rating || null)
      .input('valueRating', sql.Int, value_rating || null)
      .input('comments', sql.NVarChar, comments || null)
      .input('suggestions', sql.NVarChar, suggestions || null)
      .input('isAnonymous', sql.Bit, is_anonymous || false)
      .query(`
        INSERT INTO feedback (
          user_id, mess_hall_id, daily_menu_id, overall_rating,
          food_quality_rating, service_rating, cleanliness_rating,
          value_rating, comments, suggestions, is_anonymous
        )
        OUTPUT INSERTED.id, INSERTED.created_at
        VALUES (
          @userId, @messHallId, @dailyMenuId, @overallRating,
          @foodQualityRating, @serviceRating, @cleanlinessRating,
          @valueRating, @comments, @suggestions, @isAnonymous
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
// @route   GET /api/feedback/my-feedback
// @access  Private
router.get('/my-feedback', protect, [
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
      .query('SELECT COUNT(*) as total FROM feedback WHERE user_id = @userId');

    const total = countResult.recordset[0].total;

    // Get feedback with pagination
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT f.id, f.overall_rating, f.food_quality_rating, f.service_rating,
               f.cleanliness_rating, f.value_rating, f.comments, f.suggestions,
               f.is_anonymous, f.created_at, f.updated_at,
               mh.name as mess_hall_name, mh.location as mess_hall_location,
               dm.meal_type, dm.menu_date
        FROM feedback f
        JOIN mess_halls mh ON f.mess_hall_id = mh.id
        LEFT JOIN daily_menus dm ON f.daily_menu_id = dm.id
        WHERE f.user_id = @userId
        ORDER BY f.created_at DESC
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
    console.error('Get user feedback error:', error);
    next(error);
  }
});

// @desc    Get feedback statistics for a mess hall
// @route   GET /api/feedback/mess-halls/:id/stats
// @access  Public
router.get('/mess-halls/:id/stats', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
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
    const days = parseInt(req.query.days) || 30;

    const pool = await getPool();

    // Get average ratings and feedback count
    const statsResult = await pool.request()
      .input('messHallId', sql.Int, messHallId)
      .input('days', sql.Int, days)
      .query(`
        SELECT 
          COUNT(*) as total_feedback,
          AVG(CAST(overall_rating AS FLOAT)) as avg_overall_rating,
          AVG(CAST(food_quality_rating AS FLOAT)) as avg_food_quality_rating,
          AVG(CAST(service_rating AS FLOAT)) as avg_service_rating,
          AVG(CAST(cleanliness_rating AS FLOAT)) as avg_cleanliness_rating,
          AVG(CAST(value_rating AS FLOAT)) as avg_value_rating
        FROM feedback 
        WHERE mess_hall_id = @messHallId 
          AND created_at >= DATEADD(day, -@days, GETDATE())
      `);

    // Get rating distribution
    const distributionResult = await pool.request()
      .input('messHallId', sql.Int, messHallId)
      .input('days', sql.Int, days)
      .query(`
        SELECT 
          overall_rating,
          COUNT(*) as count
        FROM feedback 
        WHERE mess_hall_id = @messHallId 
          AND created_at >= DATEADD(day, -@days, GETDATE())
        GROUP BY overall_rating
        ORDER BY overall_rating
      `);

    // Get recent feedback trends (daily averages)
    const trendsResult = await pool.request()
      .input('messHallId', sql.Int, messHallId)
      .input('days', sql.Int, Math.min(days, 30)) // Limit trends to 30 days max
      .query(`
        SELECT 
          CAST(created_at AS DATE) as date,
          AVG(CAST(overall_rating AS FLOAT)) as avg_rating,
          COUNT(*) as feedback_count
        FROM feedback 
        WHERE mess_hall_id = @messHallId 
          AND created_at >= DATEADD(day, -@days, GETDATE())
        GROUP BY CAST(created_at AS DATE)
        ORDER BY date DESC
      `);

    const stats = statsResult.recordset[0];
    
    res.status(200).json({
      success: true,
      data: {
        period_days: days,
        total_feedback: stats.total_feedback,
        average_ratings: {
          overall: parseFloat((stats.avg_overall_rating || 0).toFixed(2)),
          food_quality: parseFloat((stats.avg_food_quality_rating || 0).toFixed(2)),
          service: parseFloat((stats.avg_service_rating || 0).toFixed(2)),
          cleanliness: parseFloat((stats.avg_cleanliness_rating || 0).toFixed(2)),
          value: parseFloat((stats.avg_value_rating || 0).toFixed(2))
        },
        rating_distribution: distributionResult.recordset,
        daily_trends: trendsResult.recordset
      }
    });

  } catch (error) {
    console.error('Get feedback stats error:', error);
    next(error);
  }
});

// @desc    Get recent feedback for a mess hall
// @route   GET /api/feedback/mess-halls/:id/recent
// @access  Public
router.get('/mess-halls/:id/recent', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const pool = await getPool();

    const result = await pool.request()
      .input('messHallId', sql.Int, messHallId)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT 
          f.id, f.overall_rating, f.food_quality_rating, f.service_rating,
          f.cleanliness_rating, f.value_rating, f.comments, f.suggestions,
          f.is_anonymous, f.created_at,
          CASE 
            WHEN f.is_anonymous = 1 THEN 'Anonymous'
            ELSE u.first_name + ' ' + LEFT(u.last_name, 1) + '.'
          END as reviewer_name,
          u.year_of_study, u.department,
          dm.meal_type, dm.menu_date
        FROM feedback f
        JOIN users u ON f.user_id = u.id
        LEFT JOIN daily_menus dm ON f.daily_menu_id = dm.id
        WHERE f.mess_hall_id = @messHallId
        ORDER BY f.created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

    res.status(200).json({
      success: true,
      count: result.recordset.length,
      page,
      data: result.recordset
    });

  } catch (error) {
    console.error('Get recent feedback error:', error);
    next(error);
  }
});

module.exports = router;
