const express = require('express');
const axios = require('axios');
const { protect, authorize } = require('../middleware/auth');
const { getPool, sql } = require('../config/database');

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(protect);
router.use(authorize('admin'));

// Power BI Configuration
const POWERBI_CONFIG = {
  clientId: process.env.POWERBI_CLIENT_ID,
  clientSecret: process.env.POWERBI_CLIENT_SECRET,
  tenantId: process.env.POWERBI_TENANT_ID,
  workspaceId: process.env.POWERBI_WORKSPACE_ID,
  reportId: process.env.POWERBI_REPORT_ID,
  scope: 'https://analysis.windows.net/powerbi/api/.default'
};

// Get Azure AD access token for Power BI
const getAccessToken = async () => {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${POWERBI_CONFIG.tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', POWERBI_CONFIG.clientId);
    params.append('client_secret', POWERBI_CONFIG.clientSecret);
    params.append('scope', POWERBI_CONFIG.scope);
    params.append('grant_type', 'client_credentials');

    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Power BI access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Power BI');
  }
};

// @desc    Get Power BI embed token and URL
// @route   GET /api/powerbi/embed-info
// @access  Private (Admin only)
router.get('/embed-info', async (req, res, next) => {
  try {
    const logger = require('../config/logging').setupLogging();
    
    // Get access token
    const accessToken = await getAccessToken();

    // Get embed token for the report
    const embedTokenUrl = `https://api.powerbi.com/v1.0/myorg/groups/${POWERBI_CONFIG.workspaceId}/reports/${POWERBI_CONFIG.reportId}/GenerateToken`;
    
    const embedTokenResponse = await axios.post(embedTokenUrl, {
      accessLevel: 'View',
      allowSaveAs: false
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Get report details
    const reportUrl = `https://api.powerbi.com/v1.0/myorg/groups/${POWERBI_CONFIG.workspaceId}/reports/${POWERBI_CONFIG.reportId}`;
    
    const reportResponse = await axios.get(reportUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const embedInfo = {
      reportId: POWERBI_CONFIG.reportId,
      embedUrl: reportResponse.data.embedUrl,
      embedToken: embedTokenResponse.data.token,
      tokenExpiry: embedTokenResponse.data.expiration,
      reportName: reportResponse.data.name
    };

    logger.info('POWERBI_EMBED_TOKEN_GENERATED', {
      user: req.user.username,
      reportId: POWERBI_CONFIG.reportId,
      expiry: embedTokenResponse.data.expiration
    });

    res.status(200).json({
      success: true,
      data: embedInfo
    });

  } catch (error) {
    next(error);
  }
});

// @desc    Refresh Power BI dataset
// @route   POST /api/powerbi/refresh/:datasetId
// @access  Private (Admin only)
router.post('/refresh/:datasetId', async (req, res, next) => {
  try {
    const { datasetId } = req.params;
    
    // SECURITY FIX: Validate datasetId format to prevent SSRF
    // Only allow alphanumeric characters and hyphens (valid UUID/GUID format)
    const datasetIdRegex = /^[a-zA-Z0-9-]{36}$/;
    if (!datasetIdRegex.test(datasetId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dataset ID format'
      });
    }
    
    // Validate dataset ID exists in our database
    const pool = await getPool();
    const result = await pool.request()
      .input('datasetId', sql.VarChar, datasetId)
      .query('SELECT COUNT(*) as count FROM PowerBIDatasets WHERE dataset_id = @datasetId');

    if (result.recordset[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }

    // SECURITY FIX: Use URL encoding for user input
    const encodedDatasetId = encodeURIComponent(datasetId);
    const refreshUrl = `https://api.powerbi.com/v1.0/myorg/groups/${POWERBI_CONFIG.workspaceId}/datasets/${encodedDatasetId}/refreshes`;
    
    await axios.post(refreshUrl, {
      type: 'full',
      commitMode: 'transactional',
      maxParallelism: 2,
      retryCount: 3
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    logger.info('POWERBI_DATASET_REFRESH_TRIGGERED', {
      user: req.user.username,
      datasetId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Dataset refresh initiated successfully'
    });

  } catch (error) {
    console.error('Power BI dataset refresh error:', error);
    next(error);
  }
});

// @desc    Get Power BI dataset refresh history
// @route   GET /api/powerbi/refresh-history/:datasetId
// @access  Private (Admin only)
router.get('/refresh-history/:datasetId', async (req, res, next) => {
  try {
    const { datasetId } = req.params;
    
    // SECURITY FIX: Validate datasetId format to prevent SSRF
    // Only allow alphanumeric characters and hyphens (valid UUID/GUID format)
    const datasetIdRegex = /^[a-zA-Z0-9-]{36}$/;
    if (!datasetIdRegex.test(datasetId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dataset ID format'
      });
    }
    
    // Get access token
    const accessToken = await getAccessToken();

    // SECURITY FIX: Use URL encoding for user input
    const encodedDatasetId = encodeURIComponent(datasetId);
    const historyUrl = `https://api.powerbi.com/v1.0/myorg/groups/${POWERBI_CONFIG.workspaceId}/datasets/${encodedDatasetId}/refreshes?$top=10`;
    
    const response = await axios.get(historyUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.status(200).json({
      success: true,
      data: response.data.value
    });

  } catch (error) {
    console.error('Power BI refresh history error:', error);
    next(error);
  }
});

// @desc    Export feedback data for Power BI
// @route   GET /api/powerbi/export-data
// @access  Private (Admin only)
router.get('/export-data', async (req, res, next) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const logger = require('../config/logging').setupLogging();

    const pool = await getPool();

    let whereClause = '';
    const request = pool.request();

    if (startDate) {
      whereClause += ' AND f.created_at >= @startDate';
      request.input('startDate', sql.DateTime2, startDate);
    }

    if (endDate) {
      whereClause += ' AND f.created_at <= @endDate';
      request.input('endDate', sql.DateTime2, endDate);
    }

    // Export comprehensive feedback data
    const result = await request.query(`
      SELECT 
        f.id,
        f.StudentName,
        f.Roll,
        f.Meal,
        f.Rating,
        f.Emotion,
        f.Comment,
        f.mess_hall,
        f.meal_time,
        f.food_quality_rating,
        f.service_rating,
        f.cleanliness_rating,
        f.is_anonymous,
        f.created_at,
        DATEPART(year, f.created_at) as year,
        DATEPART(month, f.created_at) as month,
        DATEPART(day, f.created_at) as day,
        DATEPART(hour, f.created_at) as hour,
        DATENAME(weekday, f.created_at) as day_of_week,
        CASE 
          WHEN DATEPART(hour, f.created_at) BETWEEN 6 AND 11 THEN 'Morning'
          WHEN DATEPART(hour, f.created_at) BETWEEN 12 AND 17 THEN 'Afternoon'
          WHEN DATEPART(hour, f.created_at) BETWEEN 18 AND 22 THEN 'Evening'
          ELSE 'Night'
        END as time_period
      FROM Feedback f
      WHERE 1=1 ${whereClause}
      ORDER BY f.created_at DESC
    `);

    // Add calculated fields for Power BI analytics
    const enhancedData = result.recordset.map(row => ({
      ...row,
      satisfaction_level: row.Rating >= 4 ? 'Satisfied' : row.Rating >= 3 ? 'Neutral' : 'Dissatisfied',
      rating_category: row.Rating === 5 ? 'Excellent' : 
                      row.Rating === 4 ? 'Good' : 
                      row.Rating === 3 ? 'Average' : 
                      row.Rating === 2 ? 'Poor' : 'Very Poor',
      has_comment: row.Comment ? 'Yes' : 'No',
      feedback_length: row.Comment ? row.Comment.length : 0,
      is_weekend: ['Saturday', 'Sunday'].includes(row.day_of_week) ? 'Yes' : 'No'
    }));

    logger.info('POWERBI_DATA_EXPORT', {
      user: req.user.username,
      recordCount: enhancedData.length,
      startDate,
      endDate,
      format
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(enhancedData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=feedback-data.csv');
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        count: enhancedData.length,
        exportDate: new Date().toISOString(),
        filters: { startDate, endDate },
        data: enhancedData
      });
    }

  } catch (error) {
    console.error('Power BI data export error:', error);
    next(error);
  }
});

// @desc    Get Power BI dashboard metrics
// @route   GET /api/powerbi/metrics
// @access  Private (Admin only)
router.get('/metrics', async (req, res, next) => {
  try {
    const pool = await getPool();

    // Get comprehensive metrics for Power BI dashboard
    const metricsQuery = `
      SELECT 
        -- Overall Statistics
        (SELECT COUNT(*) FROM Feedback) as total_feedback,
        (SELECT COUNT(DISTINCT Roll) FROM Feedback) as unique_students,
        (SELECT AVG(CAST(Rating AS FLOAT)) FROM Feedback) as overall_avg_rating,
        
        -- Today's Statistics
        (SELECT COUNT(*) FROM Feedback WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)) as today_feedback,
        (SELECT AVG(CAST(Rating AS FLOAT)) FROM Feedback WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)) as today_avg_rating,
        
        -- This Week's Statistics
        (SELECT COUNT(*) FROM Feedback WHERE created_at >= DATEADD(week, -1, GETDATE())) as week_feedback,
        (SELECT AVG(CAST(Rating AS FLOAT)) FROM Feedback WHERE created_at >= DATEADD(week, -1, GETDATE())) as week_avg_rating,
        
        -- This Month's Statistics
        (SELECT COUNT(*) FROM Feedback WHERE created_at >= DATEADD(month, -1, GETDATE())) as month_feedback,
        (SELECT AVG(CAST(Rating AS FLOAT)) FROM Feedback WHERE created_at >= DATEADD(month, -1, GETDATE())) as month_avg_rating,
        
        -- Satisfaction Rates
        (SELECT COUNT(*) FROM Feedback WHERE Rating >= 4) as satisfied_count,
        (SELECT COUNT(*) FROM Feedback WHERE Rating <= 2) as dissatisfied_count,
        
        -- Meal-wise Statistics
        (SELECT AVG(CAST(Rating AS FLOAT)) FROM Feedback WHERE Meal = 'breakfast') as breakfast_avg_rating,
        (SELECT AVG(CAST(Rating AS FLOAT)) FROM Feedback WHERE Meal = 'lunch') as lunch_avg_rating,
        (SELECT AVG(CAST(Rating AS FLOAT)) FROM Feedback WHERE Meal = 'dinner') as dinner_avg_rating,
        
        -- Quality Ratings
        (SELECT AVG(CAST(food_quality_rating AS FLOAT)) FROM Feedback WHERE food_quality_rating IS NOT NULL) as avg_food_quality,
        (SELECT AVG(CAST(service_rating AS FLOAT)) FROM Feedback WHERE service_rating IS NOT NULL) as avg_service,
        (SELECT AVG(CAST(cleanliness_rating AS FLOAT)) FROM Feedback WHERE cleanliness_rating IS NOT NULL) as avg_cleanliness
    `;

    const result = await pool.request().query(metricsQuery);
    const metrics = result.recordset[0];

    // Calculate additional metrics
    const totalFeedback = metrics.total_feedback || 0;
    const satisfactionRate = totalFeedback > 0 ? (metrics.satisfied_count / totalFeedback * 100).toFixed(2) : 0;
    const dissatisfactionRate = totalFeedback > 0 ? (metrics.dissatisfied_count / totalFeedback * 100).toFixed(2) : 0;

    const dashboardMetrics = {
      ...metrics,
      satisfaction_rate: parseFloat(satisfactionRate),
      dissatisfaction_rate: parseFloat(dissatisfactionRate),
      response_rate: totalFeedback > 0 ? ((metrics.unique_students / totalFeedback) * 100).toFixed(2) : 0,
      last_updated: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: dashboardMetrics
    });

  } catch (error) {
    console.error('Power BI metrics error:', error);
    next(error);
  }
});

// Helper function to convert JSON to CSV
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
};

module.exports = router;
