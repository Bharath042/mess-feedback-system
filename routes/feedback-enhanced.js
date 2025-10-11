const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getPool, sql } = require('../config/database');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @desc    Submit feedback
// @route   POST /api/feedback
// @access  Private (Students only)
router.post('/', protect, [
  body('StudentName')
    .isLength({ min: 2, max: 255 })
    .withMessage('Student name must be between 2 and 255 characters'),
  body('Roll')
    .isLength({ min: 1, max: 50 })
    .withMessage('Roll number is required and must be less than 50 characters'),
  body('Meal')
    .isIn(['breakfast', 'lunch', 'dinner', 'snacks'])
    .withMessage('Meal must be one of: breakfast, lunch, dinner, snacks'),
  body('Rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('Emotion')
    .optional()
    .isIn(['very_happy', 'happy', 'neutral', 'sad', 'very_sad'])
    .withMessage('Emotion must be one of: very_happy, happy, neutral, sad, very_sad'),
  body('Comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment must be less than 1000 characters'),
  body('mess_hall')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Mess hall name must be less than 100 characters'),
  body('meal_time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Meal time must be in HH:MM format'),
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

    // Only allow students to submit feedback
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can submit feedback'
      });
    }

    const {
      StudentName,
      Roll,
      Meal,
      Rating,
      Emotion,
      Comment,
      mess_hall,
      meal_time,
      food_quality_rating,
      service_rating,
      cleanliness_rating,
      is_anonymous
    } = req.body;

    const logger = require('../config/logging').setupLogging();
    const pool = await getPool();

    // Check if user already submitted feedback for this meal today
    const today = new Date().toISOString().split('T')[0];
    const existingFeedback = await pool.request()
      .input('roll', sql.VarChar, Roll)
      .input('meal', sql.VarChar, Meal)
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

    // Insert feedback using your provided schema
    const startTime = Date.now();
    const result = await pool.request()
      .input('StudentName', sql.VarChar, StudentName)
      .input('Roll', sql.VarChar, Roll)
      .input('Meal', sql.VarChar, Meal)
      .input('Rating', sql.Int, Rating)
      .input('Emotion', sql.VarChar, Emotion || null)
      .input('Comment', sql.NVarChar, Comment || null)
      .input('mess_hall', sql.VarChar, mess_hall || null)
      .input('meal_time', sql.VarChar, meal_time || null)
      .input('food_quality_rating', sql.Int, food_quality_rating || null)
      .input('service_rating', sql.Int, service_rating || null)
      .input('cleanliness_rating', sql.Int, cleanliness_rating || null)
      .input('is_anonymous', sql.Bit, is_anonymous || false)
      .query(`
        INSERT INTO Feedback (
          StudentName, Roll, Meal, Rating, Emotion, Comment,
          mess_hall, meal_time, food_quality_rating, service_rating, 
          cleanliness_rating, is_anonymous
        )
        OUTPUT INSERTED.id, INSERTED.created_at
        VALUES (
          @StudentName, @Roll, @Meal, @Rating, @Emotion, @Comment,
          @mess_hall, @meal_time, @food_quality_rating, @service_rating,
          @cleanliness_rating, @is_anonymous
        )
      `);

    const duration = Date.now() - startTime;
    const feedback = result.recordset[0];

    // Log the feedback submission
    logger.logDatabase('INSERT', 'Feedback', duration, true);
    logger.info('FEEDBACK_SUBMITTED', {
      feedbackId: feedback.id,
      user: req.user.username,
      meal: Meal,
      rating: Rating,
      anonymous: is_anonymous || false
    });

    // Broadcast real-time update to admin dashboard
    const io = req.app.get('io');
    if (io && global.broadcastFeedback) {
      const feedbackData = {
        id: feedback.id,
        studentName: is_anonymous ? 'Anonymous' : StudentName,
        roll: is_anonymous ? 'Hidden' : Roll,
        meal: Meal,
        rating: Rating,
        emotion: Emotion,
        comment: Comment,
        timestamp: feedback.created_at,
        mess_hall: mess_hall
      };
      
      global.broadcastFeedback(feedbackData);
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: feedback.id,
        created_at: feedback.created_at
      }
    });

  } catch (error) {
    const logger = require('../config/logging').setupLogging();
    logger.logDatabase('INSERT', 'Feedback', Date.now(), false, error);
    console.error('Submit feedback error:', error);
    next(error);
  }
});

// @desc    Get user's feedback history
// @route   GET /api/feedback/my-feedback
// @access  Private (Students only)
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

    // Only allow students to view their own feedback
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view their feedback history'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const pool = await getPool();

    // Get total count
    const countResult = await pool.request()
      .input('username', sql.VarChar, req.user.username)
      .query(`
        SELECT COUNT(*) as total 
        FROM Feedback f
        INNER JOIN users u ON f.Roll = u.username
        WHERE u.username = @username
      `);

    const total = countResult.recordset[0].total;

    // Get feedback with pagination
    const result = await pool.request()
      .input('username', sql.VarChar, req.user.username)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT f.id, f.StudentName, f.Roll, f.Meal, f.Rating, f.Emotion, 
               f.Comment, f.created_at, f.mess_hall, f.meal_time,
               f.food_quality_rating, f.service_rating, f.cleanliness_rating,
               f.is_anonymous
        FROM Feedback f
        INNER JOIN users u ON f.Roll = u.username
        WHERE u.username = @username
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

// @desc    Get feedback statistics
// @route   GET /api/feedback/stats
// @access  Public
router.get('/stats', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  query('meal').optional().isIn(['breakfast', 'lunch', 'dinner', 'snacks']).withMessage('Invalid meal type'),
  query('mess_hall').optional().isLength({ max: 100 }).withMessage('Mess hall name too long')
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

    const days = parseInt(req.query.days) || 30;
    const meal = req.query.meal;
    const mess_hall = req.query.mess_hall;

    const pool = await getPool();

    let whereClause = 'WHERE f.created_at >= DATEADD(day, @days, GETDATE())';
    const request = pool.request().input('days', sql.Int, -days);

    if (meal) {
      whereClause += ' AND f.Meal = @meal';
      request.input('meal', sql.VarChar, meal);
    }

    if (mess_hall) {
      whereClause += ' AND f.mess_hall = @mess_hall';
      request.input('mess_hall', sql.VarChar, mess_hall);
    }

    // Get overall statistics
    const statsResult = await request.query(`
      SELECT 
        COUNT(*) as total_feedback,
        AVG(CAST(f.Rating AS FLOAT)) as avg_overall_rating,
        AVG(CAST(f.food_quality_rating AS FLOAT)) as avg_food_quality_rating,
        AVG(CAST(f.service_rating AS FLOAT)) as avg_service_rating,
        AVG(CAST(f.cleanliness_rating AS FLOAT)) as avg_cleanliness_rating
      FROM Feedback f
      ${whereClause}
    `);

    // Get rating distribution
    const distributionResult = await pool.request()
      .input('days', sql.Int, -days)
      .query(`
        SELECT 
          Rating,
          COUNT(*) as count
        FROM Feedback f
        ${whereClause.replace('@days', '@days')}
        GROUP BY Rating
        ORDER BY Rating
      `);

    // Get daily trends
    const trendsResult = await pool.request()
      .input('days', sql.Int, Math.min(-days, -30))
      .query(`
        SELECT 
          CAST(created_at AS DATE) as date,
          AVG(CAST(Rating AS FLOAT)) as avg_rating,
          COUNT(*) as feedback_count
        FROM Feedback f
        WHERE f.created_at >= DATEADD(day, @days, GETDATE())
        GROUP BY CAST(created_at AS DATE)
        ORDER BY date DESC
      `);

    // Get meal-wise statistics
    const mealStatsResult = await pool.request()
      .input('days', sql.Int, -days)
      .query(`
        SELECT 
          Meal,
          COUNT(*) as count,
          AVG(CAST(Rating AS FLOAT)) as avg_rating
        FROM Feedback f
        ${whereClause}
        GROUP BY Meal
        ORDER BY Meal
      `);

    const stats = statsResult.recordset[0];

    res.status(200).json({
      success: true,
      data: {
        period_days: days,
        filters: { meal, mess_hall },
        total_feedback: stats.total_feedback,
        average_ratings: {
          overall: parseFloat((stats.avg_overall_rating || 0).toFixed(2)),
          food_quality: parseFloat((stats.avg_food_quality_rating || 0).toFixed(2)),
          service: parseFloat((stats.avg_service_rating || 0).toFixed(2)),
          cleanliness: parseFloat((stats.avg_cleanliness_rating || 0).toFixed(2))
        },
        rating_distribution: distributionResult.recordset,
        daily_trends: trendsResult.recordset,
        meal_statistics: mealStatsResult.recordset
      }
    });

  } catch (error) {
    console.error('Get feedback stats error:', error);
    next(error);
  }
});

// @desc    Get recent feedback
// @route   GET /api/feedback/recent
// @access  Public
router.get('/recent', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  query('meal').optional().isIn(['breakfast', 'lunch', 'dinner', 'snacks']).withMessage('Invalid meal type')
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
    const meal = req.query.meal;

    const pool = await getPool();

    let whereClause = '';
    const request = pool.request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit);

    if (meal) {
      whereClause = 'WHERE f.Meal = @meal';
      request.input('meal', sql.VarChar, meal);
    }

    const result = await request.query(`
      SELECT 
        f.id, f.Rating, f.Emotion, f.Comment, f.created_at, f.Meal,
        f.mess_hall, f.meal_time, f.food_quality_rating, f.service_rating, 
        f.cleanliness_rating,
        CASE 
          WHEN f.is_anonymous = 1 THEN 'Anonymous'
          ELSE f.StudentName
        END as student_name,
        CASE 
          WHEN f.is_anonymous = 1 THEN 'Hidden'
          ELSE f.Roll
        END as roll_number
      FROM Feedback f
      ${whereClause}
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

// @desc    Get real-time feedback updates (Server-Sent Events)
// @route   GET /api/feedback/live
// @access  Private (Admin only)
router.get('/live', protect, (req, res, next) => {
  try {
    // Only allow admin to access live feed
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access live feedback feed'
      });
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Live feedback feed connected' })}\n\n`);

    // Set up periodic heartbeat
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
    });

  } catch (error) {
    console.error('Live feedback error:', error);
    next(error);
  }
});

module.exports = router;
