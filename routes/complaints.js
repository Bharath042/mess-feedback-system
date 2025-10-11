const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getPool, sql } = require('../config/database');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Submit a complaint
// @route   POST /api/complaints
// @access  Private
router.post('/', protect, [
  body('mess_hall_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid mess hall ID is required'),
  body('complaint_type')
    .isIn(['food_quality', 'service', 'cleanliness', 'staff_behavior', 'facilities', 'other'])
    .withMessage('Valid complaint type is required'),
  body('title')
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be 5-255 characters'),
  body('description')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be 10-1000 characters'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
  body('incident_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid incident date'),
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
      complaint_type,
      title,
      description,
      severity = 'medium',
      incident_date,
      is_anonymous = false
    } = req.body;

    const pool = await getPool();

    // Calculate priority score based on severity
    const priorityScores = {
      low: 25,
      medium: 50,
      high: 75,
      critical: 100
    };

    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('messHallId', sql.Int, mess_hall_id || null)
      .input('complaintType', sql.VarChar, complaint_type)
      .input('title', sql.VarChar, title)
      .input('description', sql.NVarChar, description)
      .input('severity', sql.VarChar, severity)
      .input('incidentDate', sql.DateTime2, incident_date ? new Date(incident_date) : new Date())
      .input('priorityScore', sql.Int, priorityScores[severity])
      .input('isAnonymous', sql.Bit, is_anonymous)
      .query(`
        INSERT INTO complaints (
          user_id, mess_hall_id, complaint_type, title, description,
          severity, incident_date, priority_score, is_anonymous
        )
        OUTPUT INSERTED.id, INSERTED.created_at
        VALUES (
          @userId, @messHallId, @complaintType, @title, @description,
          @severity, @incidentDate, @priorityScore, @isAnonymous
        )
      `);

    const complaint = result.recordset[0];

    // Log user activity
    await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('activityType', sql.VarChar, 'complaint_submission')
      .input('activityDescription', sql.VarChar, `Submitted complaint: ${title}`)
      .input('referenceId', sql.Int, complaint.id)
      .input('referenceTable', sql.VarChar, 'complaints')
      .query(`
        INSERT INTO user_activity_log (
          user_id, activity_type, activity_description,
          reference_id, reference_table
        )
        VALUES (
          @userId, @activityType, @activityDescription,
          @referenceId, @referenceTable
        )
      `);

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: {
        id: complaint.id,
        created_at: complaint.created_at
      }
    });

  } catch (error) {
    console.error('Submit complaint error:', error);
    next(error);
  }
});

// @desc    Get user's complaints
// @route   GET /api/complaints/my-complaints
// @access  Private
router.get('/my-complaints', protect, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status')
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
    const status = req.query.status;

    const pool = await getPool();

    let whereClause = 'WHERE c.user_id = @userId';
    const request = pool.request().input('userId', sql.Int, req.user.id);

    if (status) {
      whereClause += ' AND c.status = @status';
      request.input('status', sql.VarChar, status);
    }

    // Get total count
    const countResult = await request.query(`SELECT COUNT(*) as total FROM complaints c ${whereClause}`);
    const total = countResult.recordset[0].total;

    // Get complaints with pagination
    const result = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .input('status', sql.VarChar, status)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT c.id, c.complaint_type, c.title, c.description, c.severity,
               c.status, c.incident_date, c.priority_score, c.is_anonymous,
               c.created_at, c.updated_at,
               mh.name as mess_hall_name, mh.location as mess_hall_location,
               COUNT(cr.id) as response_count
        FROM complaints c
        LEFT JOIN mess_halls mh ON c.mess_hall_id = mh.id
        LEFT JOIN complaint_responses cr ON c.id = cr.complaint_id AND cr.is_internal = 0
        ${whereClause}
        GROUP BY c.id, c.complaint_type, c.title, c.description, c.severity,
                 c.status, c.incident_date, c.priority_score, c.is_anonymous,
                 c.created_at, c.updated_at, mh.name, mh.location
        ORDER BY c.created_at DESC
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
    console.error('Get user complaints error:', error);
    next(error);
  }
});

// @desc    Get complaint details with responses
// @route   GET /api/complaints/:id
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const complaintId = req.params.id;
    const pool = await getPool();

    // Get complaint details
    const complaintResult = await pool.request()
      .input('complaintId', sql.Int, complaintId)
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT c.id, c.complaint_type, c.title, c.description, c.severity,
               c.status, c.incident_date, c.priority_score, c.is_anonymous,
               c.created_at, c.updated_at,
               mh.name as mess_hall_name, mh.location as mess_hall_location,
               u.username as complainant_username
        FROM complaints c
        LEFT JOIN mess_halls mh ON c.mess_hall_id = mh.id
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = @complaintId 
          AND (c.user_id = @userId OR @userId IN (
            SELECT id FROM users WHERE role IN ('admin', 'mess_manager')
          ))
      `);

    if (complaintResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found or access denied'
      });
    }

    // Get complaint responses
    const responsesResult = await pool.request()
      .input('complaintId', sql.Int, complaintId)
      .query(`
        SELECT cr.id, cr.response_text, cr.response_type, cr.old_status,
               cr.new_status, cr.is_internal, cr.created_at,
               u.username as responder_username, u.role as responder_role
        FROM complaint_responses cr
        JOIN users u ON cr.responder_id = u.id
        WHERE cr.complaint_id = @complaintId
          AND (cr.is_internal = 0 OR @userId IN (
            SELECT id FROM users WHERE role IN ('admin', 'mess_manager')
          ))
        ORDER BY cr.created_at ASC
      `);

    const complaint = complaintResult.recordset[0];
    const responses = responsesResult.recordset;

    res.status(200).json({
      success: true,
      data: {
        complaint,
        responses
      }
    });

  } catch (error) {
    console.error('Get complaint details error:', error);
    next(error);
  }
});

// @desc    Get all complaints (Admin/Manager only)
// @route   GET /api/complaints
// @access  Private (Admin/Manager)
router.get('/', protect, authorize(['admin', 'mess_manager']), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  query('complaint_type').optional().isIn(['food_quality', 'service', 'cleanliness', 'staff_behavior', 'facilities', 'other']).withMessage('Invalid complaint type')
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
    const { status, severity, complaint_type } = req.query;

    const pool = await getPool();

    let whereClause = 'WHERE 1=1';
    const request = pool.request();

    if (status) {
      whereClause += ' AND c.status = @status';
      request.input('status', sql.VarChar, status);
    }

    if (severity) {
      whereClause += ' AND c.severity = @severity';
      request.input('severity', sql.VarChar, severity);
    }

    if (complaint_type) {
      whereClause += ' AND c.complaint_type = @complaintType';
      request.input('complaintType', sql.VarChar, complaint_type);
    }

    // Get total count
    const countResult = await request.query(`SELECT COUNT(*) as total FROM complaints c ${whereClause}`);
    const total = countResult.recordset[0].total;

    // Get complaints with pagination
    const result = await pool.request()
      .input('status', sql.VarChar, status)
      .input('severity', sql.VarChar, severity)
      .input('complaintType', sql.VarChar, complaint_type)
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT c.id, c.complaint_type, c.title, c.description, c.severity,
               c.status, c.incident_date, c.priority_score, c.is_anonymous,
               c.created_at, c.updated_at,
               mh.name as mess_hall_name, mh.location as mess_hall_location,
               CASE WHEN c.is_anonymous = 1 THEN 'Anonymous' ELSE u.username END as complainant_username,
               COUNT(cr.id) as response_count,
               MAX(cr.created_at) as last_response_date
        FROM complaints c
        LEFT JOIN mess_halls mh ON c.mess_hall_id = mh.id
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN complaint_responses cr ON c.id = cr.complaint_id
        ${whereClause}
        GROUP BY c.id, c.complaint_type, c.title, c.description, c.severity,
                 c.status, c.incident_date, c.priority_score, c.is_anonymous,
                 c.created_at, c.updated_at, mh.name, mh.location, u.username
        ORDER BY c.priority_score DESC, c.created_at DESC
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
    console.error('Get all complaints error:', error);
    next(error);
  }
});

// @desc    Respond to a complaint (Admin/Manager only)
// @route   POST /api/complaints/:id/respond
// @access  Private (Admin/Manager)
router.post('/:id/respond', protect, authorize(['admin', 'mess_manager']), [
  body('response_text')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Response text must be 5-1000 characters'),
  body('response_type')
    .optional()
    .isIn(['comment', 'status_update', 'resolution'])
    .withMessage('Invalid response type'),
  body('new_status')
    .optional()
    .isIn(['open', 'in_progress', 'resolved', 'closed'])
    .withMessage('Invalid status'),
  body('is_internal')
    .optional()
    .isBoolean()
    .withMessage('Internal flag must be boolean')
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

    const complaintId = req.params.id;
    const {
      response_text,
      response_type = 'comment',
      new_status,
      is_internal = false
    } = req.body;

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Get current complaint status
    const complaintResult = await transaction.request()
      .input('complaintId', sql.Int, complaintId)
      .query('SELECT status FROM complaints WHERE id = @complaintId');

    if (complaintResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    const oldStatus = complaintResult.recordset[0].status;

    // Insert response
    await transaction.request()
      .input('complaintId', sql.Int, complaintId)
      .input('responderId', sql.Int, req.user.id)
      .input('responseText', sql.NVarChar, response_text)
      .input('responseType', sql.VarChar, response_type)
      .input('oldStatus', sql.VarChar, oldStatus)
      .input('newStatus', sql.VarChar, new_status || oldStatus)
      .input('isInternal', sql.Bit, is_internal)
      .query(`
        INSERT INTO complaint_responses (
          complaint_id, responder_id, response_text, response_type,
          old_status, new_status, is_internal
        )
        VALUES (
          @complaintId, @responderId, @responseText, @responseType,
          @oldStatus, @newStatus, @isInternal
        )
      `);

    // Update complaint status if provided
    if (new_status && new_status !== oldStatus) {
      await transaction.request()
        .input('complaintId', sql.Int, complaintId)
        .input('newStatus', sql.VarChar, new_status)
        .query(`
          UPDATE complaints 
          SET status = @newStatus, updated_at = GETDATE()
          WHERE id = @complaintId
        `);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Response added successfully'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Add complaint response error:', error);
    next(error);
  }
});

// @desc    Get complaint statistics (Admin only)
// @route   GET /api/complaints/stats
// @access  Private (Admin)
router.get('/stats', protect, authorize(['admin']), async (req, res, next) => {
  try {
    const pool = await getPool();

    // Get overall statistics
    const statsResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total_complaints,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_complaints,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_complaints,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_complaints,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_complaints,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_complaints,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_complaints,
        COUNT(CASE WHEN created_at >= DATEADD(day, -7, GETDATE()) THEN 1 END) as complaints_this_week,
        COUNT(CASE WHEN created_at >= DATEADD(day, -30, GETDATE()) THEN 1 END) as complaints_this_month
      FROM complaints
    `);

    // Get complaints by type
    const typeStatsResult = await pool.request().query(`
      SELECT complaint_type, COUNT(*) as count
      FROM complaints
      GROUP BY complaint_type
      ORDER BY count DESC
    `);

    // Get complaints by mess hall
    const messHallStatsResult = await pool.request().query(`
      SELECT mh.name as mess_hall_name, COUNT(c.id) as complaint_count
      FROM complaints c
      LEFT JOIN mess_halls mh ON c.mess_hall_id = mh.id
      GROUP BY mh.name
      ORDER BY complaint_count DESC
    `);

    // Get average response time
    const responseTimeResult = await pool.request().query(`
      SELECT AVG(DATEDIFF(hour, c.created_at, cr.created_at)) as avg_response_time_hours
      FROM complaints c
      JOIN complaint_responses cr ON c.id = cr.complaint_id
      WHERE cr.id = (
        SELECT TOP 1 id FROM complaint_responses 
        WHERE complaint_id = c.id 
        ORDER BY created_at ASC
      )
    `);

    res.status(200).json({
      success: true,
      data: {
        overall: statsResult.recordset[0],
        by_type: typeStatsResult.recordset,
        by_mess_hall: messHallStatsResult.recordset,
        avg_response_time_hours: responseTimeResult.recordset[0]?.avg_response_time_hours || 0
      }
    });

  } catch (error) {
    console.error('Get complaint statistics error:', error);
    next(error);
  }
});

module.exports = router;
