const express = require('express');
const { getPool, sql } = require('../config/database');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
router.get('/stats', protect, async (req, res, next) => {
  try {
    const pool = await getPool();
    
    // Get feedback count
    const feedbackResult = await pool.request()
      .input('roll', sql.VarChar, req.user.username)
      .query(`
        SELECT COUNT(*) as total_feedback FROM Feedback 
        WHERE Roll = @roll
      `);
    
    // Get complaints count
    const complaintsResult = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT COUNT(*) as total_complaints FROM complaints 
        WHERE user_id = @userId
      `);
    
    const totalFeedback = feedbackResult.recordset[0]?.total_feedback || 0;
    const totalComplaints = complaintsResult.recordset[0]?.total_complaints || 0;
    
    // Calculate points (5 points per feedback, 2 points per complaint)
    const totalPoints = (totalFeedback * 5) + (totalComplaints * 2);
    
    res.status(200).json({
      success: true,
      data: {
        total_points: totalPoints,
        feedback_given: totalFeedback,
        complaints_lodged: totalComplaints
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    next(error);
  }
});

// @desc    Get dashboard history (feedback and complaints)
// @route   GET /api/dashboard/history
// @access  Private
router.get('/history', protect, async (req, res, next) => {
  try {
    const pool = await getPool();
    
    // Get recent feedback
    const feedbackResult = await pool.request()
      .input('roll', sql.VarChar, req.user.username)
      .query(`
        SELECT TOP 10 
          id, StudentName, Meal, Rating, Comment, created_at
        FROM Feedback 
        WHERE Roll = @roll
        ORDER BY created_at DESC
      `);
    
    // Get recent complaints
    const complaintsResult = await pool.request()
      .input('userId', sql.Int, req.user.id)
      .query(`
        SELECT TOP 10 
          id, title, description, status, severity, created_at
        FROM complaints 
        WHERE user_id = @userId
        ORDER BY created_at DESC
      `);
    
    res.status(200).json({
      success: true,
      data: {
        feedback: feedbackResult.recordset || [],
        complaints: complaintsResult.recordset || []
      }
    });
  } catch (error) {
    console.error('Get dashboard history error:', error);
    next(error);
  }
});

module.exports = router;
