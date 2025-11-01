const express = require('express');
const router = express.Router();
const azureOpenAI = require('../services/azureOpenAI');
const { getPool } = require('../config/database-simple');

// Middleware to check if AI is configured
const checkAIConfigured = (req, res, next) => {
    if (!azureOpenAI.isConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'AI service is not configured. Please contact administrator.'
        });
    }
    next();
};

// Middleware to verify token (supports both JWT and simple Base64 tokens)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    try {
        // Try JWT first
        const jwt = require('jsonwebtoken');
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            req.user = decoded;
            return next();
        } catch (jwtError) {
            // If JWT fails, try simple Base64 token (used by student dashboard)
            try {
                const decoded = Buffer.from(token, 'base64').toString('utf-8');
                const [id, username, role] = decoded.split(':');
                
                if (id && username && role) {
                    req.user = {
                        id: parseInt(id),
                        username: username,
                        role: role
                    };
                    return next();
                }
            } catch (base64Error) {
                // Both failed
            }
        }
        
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

/**
 * POST /api/ai/chat
 * Student chat with AI assistant
 */
router.post('/chat', verifyToken, checkAIConfigured, async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        // Format conversation history
        const formattedHistory = (conversationHistory || []).map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Fetch real-time context data from database
        const pool = await getPool();
        const contextData = {};

        try {
            // Get today's menu
            const menuResult = await pool.request().query(`
                SELECT 
                    mt.name as meal_type,
                    dm.items as food_items
                FROM daily_menus dm
                JOIN meal_types mt ON dm.meal_type_id = mt.id
                WHERE CAST(dm.menu_date as DATE) = CAST(GETDATE() as DATE)
                ORDER BY mt.id
            `);
            contextData.todayMenu = menuResult.recordset;

            // Get user's points
            const pointsResult = await pool.request()
                .input('userId', req.user.id)
                .query(`
                    SELECT COALESCE(SUM(points), 0) as total_points
                    FROM user_points
                    WHERE user_id = @userId
                `);
            contextData.userPoints = pointsResult.recordset[0]?.total_points || 0;

            // Get user's feedback count
            const feedbackResult = await pool.request()
                .input('userId', req.user.id)
                .query(`
                    SELECT COUNT(*) as feedback_count
                    FROM feedback_submissions
                    WHERE user_id = @userId
                `);
            contextData.feedbackCount = feedbackResult.recordset[0]?.feedback_count || 0;

            // Get user's recent complaints
            const complaintsResult = await pool.request()
                .input('userId', req.user.id)
                .query(`
                    SELECT TOP 3 
                        category,
                        status,
                        created_at
                    FROM complaints
                    WHERE user_id = @userId
                    ORDER BY created_at DESC
                `);
            contextData.recentComplaints = complaintsResult.recordset;

            // Get comprehensive user info with profile
            const userResult = await pool.request()
                .input('userId', req.user.id)
                .query(`
                    SELECT 
                        u.username, 
                        u.role,
                        up.full_name,
                        up.department,
                        up.year_of_study,
                        up.hostel_name,
                        up.room_number
                    FROM users u
                    LEFT JOIN user_profiles up ON u.id = up.user_id
                    WHERE u.id = @userId
                `);
            const userInfo = userResult.recordset[0];
            contextData.userName = userInfo?.username || 'Student';
            contextData.fullName = userInfo?.full_name;
            contextData.department = userInfo?.department;
            contextData.yearOfStudy = userInfo?.year_of_study;
            contextData.hostelName = userInfo?.hostel_name;
            contextData.roomNumber = userInfo?.room_number;

            // Get user's feedback history with details
            const feedbackHistory = await pool.request()
                .input('userId', req.user.id)
                .query(`
                    SELECT TOP 5
                        mt.name as meal_type,
                        fs.service_rating,
                        fs.cleanliness_rating,
                        fs.ambience_rating,
                        fs.overall_comments,
                        fs.created_at
                    FROM feedback_submissions fs
                    JOIN meal_types mt ON fs.meal_type_id = mt.id
                    WHERE fs.user_id = @userId
                    ORDER BY fs.created_at DESC
                `);
            contextData.feedbackHistory = feedbackHistory.recordset;

            // Get available mess halls
            const messHalls = await pool.request().query(`
                SELECT name, location, capacity
                FROM mess_halls
            `);
            contextData.messHalls = messHalls.recordset;

            // Get meal timings from database
            const mealTimings = await pool.request().query(`
                SELECT name, time_start, time_end
                FROM meal_types
                ORDER BY id
            `);
            contextData.mealTimings = mealTimings.recordset;

            // Get user's rank/position
            const userRank = await pool.request()
                .input('userId', req.user.id)
                .query(`
                    SELECT 
                        (SELECT COUNT(*) + 1 
                         FROM user_points up2 
                         WHERE up2.total_points > up1.total_points) as rank,
                        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students
                    FROM user_points up1
                    WHERE up1.user_id = @userId
                `);
            contextData.userRank = userRank.recordset[0];

        } catch (dbError) {
            console.error('Error fetching context data:', dbError);
            // Continue with empty context if database fails
        }

        const response = await azureOpenAI.chatWithStudent(message, formattedHistory, contextData);

        res.json({
            success: true,
            response: response,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in AI chat:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get AI response',
            error: error.message
        });
    }
});

/**
 * POST /api/ai/insights
 * Generate insights from feedback data (Admin only)
 */
router.post('/insights', verifyToken, checkAIConfigured, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const { startDate, endDate, mealType } = req.body;
        const pool = await getPool();

        // Build query to fetch feedback data
        let query = `
            SELECT 
                f.id,
                f.rating,
                f.comments,
                f.meal_type,
                f.created_at,
                u.username as student_name
            FROM feedback_submissions f
            LEFT JOIN users u ON f.user_id = u.id
            WHERE 1=1
        `;

        const request = pool.request();

        if (startDate) {
            query += ` AND f.created_at >= @startDate`;
            request.input('startDate', startDate);
        }

        if (endDate) {
            query += ` AND f.created_at <= @endDate`;
            request.input('endDate', endDate);
        }

        if (mealType) {
            query += ` AND f.meal_type = @mealType`;
            request.input('mealType', mealType);
        }

        query += ` ORDER BY f.created_at DESC`;

        const result = await request.query(query);
        const feedbackData = result.recordset;

        if (feedbackData.length === 0) {
            return res.json({
                success: true,
                insights: {
                    summary: 'No feedback data available for the selected period.',
                    concerns: [],
                    highlights: [],
                    recommendations: []
                }
            });
        }

        const insights = await azureOpenAI.generateFeedbackInsights(feedbackData);

        res.json({
            success: true,
            insights: insights,
            dataPoints: feedbackData.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error generating insights:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate insights',
            error: error.message
        });
    }
});

/**
 * POST /api/ai/complaint-response
 * Get AI-suggested response for a complaint (Admin only)
 */
router.post('/complaint-response', verifyToken, checkAIConfigured, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const { complaintId, category, description, priority } = req.body;

        if (!description) {
            return res.status(400).json({
                success: false,
                message: 'Complaint description is required'
            });
        }

        const complaint = {
            category: category || 'General',
            description: description,
            priority: priority || 'Medium'
        };

        const suggestedResponse = await azureOpenAI.suggestComplaintResponse(complaint);

        res.json({
            success: true,
            suggestedResponse: suggestedResponse,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error generating complaint response:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate response',
            error: error.message
        });
    }
});

/**
 * POST /api/ai/menu-suggestions
 * Get AI-generated menu suggestions based on feedback (Admin only)
 */
router.post('/menu-suggestions', verifyToken, checkAIConfigured, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const { days } = req.body;
        const daysToAnalyze = days || 7;
        const pool = await getPool();

        // Fetch recent feedback
        const result = await pool.request()
            .input('days', daysToAnalyze)
            .query(`
                SELECT TOP 100
                    f.service_rating,
                    f.item_comments,
                    mt.name as meal_type,
                    dm.items as food_item
                FROM feedback_submissions f
                LEFT JOIN daily_menus dm ON f.meal_type_id = dm.meal_type_id 
                    AND CAST(f.created_at as DATE) = CAST(dm.menu_date as DATE)
                LEFT JOIN meal_types mt ON f.meal_type_id = mt.id
                WHERE f.created_at >= DATEADD(day, -@days, GETDATE())
                ORDER BY f.created_at DESC
            `);

        const feedbackData = result.recordset;

        if (feedbackData.length === 0) {
            return res.json({
                success: true,
                suggestions: {
                    improvements: ['Not enough feedback data to generate suggestions'],
                    newItems: [],
                    removeItems: []
                }
            });
        }

        const suggestions = await azureOpenAI.generateMenuSuggestions(feedbackData);

        res.json({
            success: true,
            suggestions: suggestions,
            basedOnFeedback: feedbackData.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error generating menu suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate menu suggestions',
            error: error.message
        });
    }
});

/**
 * POST /api/ai/sentiment
 * Analyze sentiment of a comment
 */
router.post('/sentiment', verifyToken, checkAIConfigured, async (req, res) => {
    try {
        const { comment } = req.body;

        if (!comment || comment.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Comment is required'
            });
        }

        const sentiment = await azureOpenAI.analyzeSentiment(comment);

        res.json({
            success: true,
            sentiment: sentiment,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze sentiment',
            error: error.message
        });
    }
});

/**
 * POST /api/ai/admin-chat
 * Admin chat with AI assistant - provides real-time admin analytics
 */
router.post('/admin-chat', verifyToken, checkAIConfigured, async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        // Format conversation history
        const formattedHistory = (conversationHistory || []).map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Fetch real-time admin data from database
        const pool = await getPool();
        const adminContext = {};

        try {
            // Get ALL comprehensive statistics
            
            // 1. Feedback statistics - TODAY
            const feedbackStatsToday = await pool.request().query(`
                SELECT 
                    COUNT(*) as total_feedback_today,
                    AVG(CAST(service_rating as FLOAT)) as avg_service_rating,
                    AVG(CAST(cleanliness_rating as FLOAT)) as avg_cleanliness_rating,
                    AVG(CAST(ambience_rating as FLOAT)) as avg_ambience_rating,
                    COUNT(DISTINCT user_id) as unique_users_today
                FROM feedback_submissions
                WHERE CAST(created_at as DATE) = CAST(GETDATE() as DATE)
            `);
            adminContext.feedbackStatsToday = feedbackStatsToday.recordset[0];
            
            // 2. Detailed feedback by meal type - TODAY
            const feedbackByMealToday = await pool.request().query(`
                SELECT 
                    mt.name as meal_type,
                    COUNT(*) as count,
                    AVG(CAST(service_rating as FLOAT)) as avg_service,
                    AVG(CAST(cleanliness_rating as FLOAT)) as avg_cleanliness,
                    AVG(CAST(ambience_rating as FLOAT)) as avg_ambience
                FROM feedback_submissions fs
                JOIN meal_types mt ON fs.meal_type_id = mt.id
                WHERE CAST(fs.created_at as DATE) = CAST(GETDATE() as DATE)
                GROUP BY mt.name
            `);
            adminContext.feedbackByMealToday = feedbackByMealToday.recordset;
            
            // 3. Recent feedback with comments
            const recentFeedback = await pool.request().query(`
                SELECT TOP 10
                    u.username,
                    mt.name as meal_type,
                    fs.service_rating,
                    fs.cleanliness_rating,
                    fs.ambience_rating,
                    fs.overall_comments,
                    fs.suggestions,
                    fs.created_at
                FROM feedback_submissions fs
                JOIN users u ON fs.user_id = u.id
                JOIN meal_types mt ON fs.meal_type_id = mt.id
                ORDER BY fs.created_at DESC
            `);
            adminContext.recentFeedback = recentFeedback.recordset;

            // Get feedback statistics - LAST 7 DAYS
            const feedbackStats = await pool.request().query(`
                SELECT 
                    COUNT(*) as total_feedback,
                    AVG(CAST(service_rating as FLOAT)) as avg_service_rating,
                    AVG(CAST(cleanliness_rating as FLOAT)) as avg_cleanliness_rating,
                    AVG(CAST(ambience_rating as FLOAT)) as avg_ambience_rating,
                    COUNT(DISTINCT user_id) as unique_users
                FROM feedback_submissions
                WHERE created_at >= DATEADD(day, -7, GETDATE())
            `);
            adminContext.feedbackStats = feedbackStats.recordset[0];

            // Get complaint statistics
            const complaintStats = await pool.request().query(`
                SELECT 
                    complaint_type,
                    COUNT(*) as count,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_complaints,
                    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_complaints
                FROM complaints
                WHERE created_at >= DATEADD(day, -30, GETDATE())
                GROUP BY complaint_type
                ORDER BY count DESC
            `);
            adminContext.complaintStats = complaintStats.recordset;

            // Get top complaints
            const topComplaints = await pool.request().query(`
                SELECT TOP 5
                    complaint_type,
                    description,
                    status,
                    severity,
                    created_at
                FROM complaints
                ORDER BY created_at DESC
            `);
            adminContext.topComplaints = topComplaints.recordset;

            // Get user activity
            const userActivity = await pool.request().query(`
                SELECT 
                    COUNT(DISTINCT id) as total_users,
                    SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
                FROM users
            `);
            adminContext.userActivity = userActivity.recordset[0];

            // Get menu performance
            const menuPerformance = await pool.request().query(`
                SELECT TOP 5
                    dm.items,
                    mt.name as meal_type,
                    AVG(CAST(fs.service_rating as FLOAT)) as avg_service_rating,
                    AVG(CAST(fs.cleanliness_rating as FLOAT)) as avg_cleanliness_rating,
                    COUNT(fs.id) as feedback_count
                FROM daily_menus dm
                JOIN meal_types mt ON dm.meal_type_id = mt.id
                LEFT JOIN feedback_submissions fs ON CAST(fs.created_at as DATE) = CAST(dm.menu_date as DATE) 
                    AND fs.meal_type_id = dm.meal_type_id
                WHERE dm.menu_date >= DATEADD(day, -7, GETDATE())
                GROUP BY dm.items, mt.name
                ORDER BY avg_service_rating DESC
            `);
            adminContext.menuPerformance = menuPerformance.recordset;

            // Get notifications sent today
            const notificationsToday = await pool.request().query(`
                SELECT COUNT(*) as notifications_sent_today
                FROM notifications
                WHERE CAST(created_at as DATE) = CAST(GETDATE() as DATE)
            `);
            adminContext.notificationsToday = notificationsToday.recordset[0]?.notifications_sent_today || 0;
            
            // Get detailed user statistics with profiles
            const userDetails = await pool.request().query(`
                SELECT 
                    u.id,
                    u.username,
                    u.role,
                    up.full_name,
                    up.department,
                    up.year_of_study,
                    up.hostel_name,
                    (SELECT COUNT(*) FROM feedback_submissions WHERE user_id = u.id) as feedback_count,
                    (SELECT COUNT(*) FROM complaints WHERE user_id = u.id) as complaint_count,
                    (SELECT COALESCE(SUM(total_points), 0) FROM user_points WHERE user_id = u.id) as total_points
                FROM users u
                LEFT JOIN user_profiles up ON u.id = up.user_id
                WHERE u.role = 'student'
                ORDER BY feedback_count DESC
            `);
            adminContext.userDetails = userDetails.recordset;
            
            // Get mess hall statistics
            const messHallStats = await pool.request().query(`
                SELECT 
                    mh.name as mess_hall,
                    mh.location,
                    mh.capacity,
                    (SELECT COUNT(*) FROM feedback_submissions fs 
                     WHERE fs.mess_hall_id = mh.id 
                     AND CAST(fs.created_at as DATE) = CAST(GETDATE() as DATE)) as feedback_today,
                    (SELECT COUNT(*) FROM complaints c 
                     WHERE c.mess_hall_id = mh.id 
                     AND c.status = 'pending') as pending_complaints
                FROM mess_halls mh
            `);
            adminContext.messHallStats = messHallStats.recordset;
            
            // Get today's menu across all mess halls
            const todayMenuAll = await pool.request().query(`
                SELECT 
                    mh.name as mess_hall,
                    mt.name as meal_type,
                    dm.items,
                    dm.menu_date
                FROM daily_menus dm
                JOIN meal_types mt ON dm.meal_type_id = mt.id
                JOIN mess_halls mh ON dm.mess_hall_id = mh.id
                WHERE CAST(dm.menu_date as DATE) = CAST(GETDATE() as DATE)
                ORDER BY mh.name, mt.id
            `);
            adminContext.todayMenuAll = todayMenuAll.recordset;
            
            // Get complaint trends
            const complaintTrends = await pool.request().query(`
                SELECT 
                    CAST(created_at as DATE) as date,
                    COUNT(*) as count,
                    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
                FROM complaints
                WHERE created_at >= DATEADD(day, -7, GETDATE())
                GROUP BY CAST(created_at as DATE)
                ORDER BY date DESC
            `);
            adminContext.complaintTrends = complaintTrends.recordset;
            
            // Get top active users
            const topUsers = await pool.request().query(`
                SELECT TOP 5
                    u.username,
                    COUNT(fs.id) as feedback_count,
                    AVG(CAST(fs.service_rating as FLOAT)) as avg_rating,
                    (SELECT COALESCE(SUM(total_points), 0) FROM user_points WHERE user_id = u.id) as points
                FROM users u
                JOIN feedback_submissions fs ON u.id = fs.user_id
                WHERE fs.created_at >= DATEADD(day, -30, GETDATE())
                GROUP BY u.id, u.username
                ORDER BY feedback_count DESC
            `);
            adminContext.topUsers = topUsers.recordset;

        } catch (dbError) {
            console.error('Error fetching admin context:', dbError);
        }

        // Build admin-specific system context
        let systemContext = `You are an AI assistant for mess administrators. You have access to REAL-TIME data from the database.

CURRENT STATISTICS:

📊 TODAY'S ACTIVITY:
- Feedback Submissions Today: ${adminContext.feedbackStatsToday?.total_feedback_today || 0}
- Active Users Today: ${adminContext.feedbackStatsToday?.unique_users_today || 0}
- Notifications Sent Today: ${adminContext.notificationsToday || 0}
- Today's Average Ratings:
  * Service: ${adminContext.feedbackStatsToday?.avg_service_rating?.toFixed(2) || 'N/A'}/5
  * Cleanliness: ${adminContext.feedbackStatsToday?.avg_cleanliness_rating?.toFixed(2) || 'N/A'}/5
  * Ambience: ${adminContext.feedbackStatsToday?.avg_ambience_rating?.toFixed(2) || 'N/A'}/5

📈 FEEDBACK DATA (Last 7 days):
- Total Feedback: ${adminContext.feedbackStats?.total_feedback || 0}
- Active Users: ${adminContext.feedbackStats?.unique_users || 0}
- Average Ratings:
  * Service: ${adminContext.feedbackStats?.avg_service_rating?.toFixed(2) || 'N/A'}/5
  * Cleanliness: ${adminContext.feedbackStats?.avg_cleanliness_rating?.toFixed(2) || 'N/A'}/5
  * Ambience: ${adminContext.feedbackStats?.avg_ambience_rating?.toFixed(2) || 'N/A'}/5

⚠️ COMPLAINT DATA (Last 30 days):
`;

        if (adminContext.complaintStats && adminContext.complaintStats.length > 0) {
            const totalComplaints = adminContext.complaintStats.reduce((sum, c) => sum + c.count, 0);
            const pending = adminContext.complaintStats.reduce((sum, c) => sum + (c.pending_complaints || 0), 0);
            systemContext += `- Total Complaints: ${totalComplaints}
- Pending: ${pending}
- By Type:\n`;
            adminContext.complaintStats.forEach(c => {
                systemContext += `  * ${c.complaint_type}: ${c.count}\n`;
            });
        }

        systemContext += `
USER STATISTICS:
- Total Users: ${adminContext.userActivity?.total_users || 0}
- Students: ${adminContext.userActivity?.students || 0}
- Admins: ${adminContext.userActivity?.admins || 0}
`;

        if (adminContext.topComplaints && adminContext.topComplaints.length > 0) {
            systemContext += `\n🔴 RECENT COMPLAINTS:\n`;
            adminContext.topComplaints.forEach((c, i) => {
                systemContext += `${i + 1}. [${c.severity}] ${c.complaint_type} - ${c.status}\n`;
            });
        }

        if (adminContext.menuPerformance && adminContext.menuPerformance.length > 0) {
            systemContext += `\n⭐ TOP RATED MENU ITEMS (Last 7 days):\n`;
            adminContext.menuPerformance.forEach((m, i) => {
                const avgRating = ((m.avg_service_rating || 0) + (m.avg_cleanliness_rating || 0)) / 2;
                systemContext += `${i + 1}. ${m.meal_type}: ${m.items} - ${avgRating.toFixed(2)}/5 (${m.feedback_count} reviews)\n`;
            });
        }

        // Add feedback by meal type today
        if (adminContext.feedbackByMealToday && adminContext.feedbackByMealToday.length > 0) {
            systemContext += `\n📊 TODAY'S FEEDBACK BY MEAL:\n`;
            adminContext.feedbackByMealToday.forEach(m => {
                systemContext += `- ${m.meal_type}: ${m.count} submissions (Service: ${m.avg_service?.toFixed(2)}/5, Cleanliness: ${m.avg_cleanliness?.toFixed(2)}/5)\n`;
            });
        }

        // Add recent feedback comments
        if (adminContext.recentFeedback && adminContext.recentFeedback.length > 0) {
            systemContext += `\n💬 RECENT FEEDBACK COMMENTS:\n`;
            adminContext.recentFeedback.slice(0, 5).forEach((f, i) => {
                if (f.overall_comments || f.suggestions) {
                    systemContext += `${i + 1}. ${f.username} (${f.meal_type}): "${f.overall_comments || f.suggestions}"\n`;
                }
            });
        }

        // Add mess hall statistics
        if (adminContext.messHallStats && adminContext.messHallStats.length > 0) {
            systemContext += `\n🏢 MESS HALL STATISTICS:\n`;
            adminContext.messHallStats.forEach(mh => {
                systemContext += `- ${mh.mess_hall} (${mh.location}): Capacity ${mh.capacity}, Today's Feedback: ${mh.feedback_today}, Pending Complaints: ${mh.pending_complaints}\n`;
            });
        }

        // Add today's complete menu
        if (adminContext.todayMenuAll && adminContext.todayMenuAll.length > 0) {
            systemContext += `\n🍽️ TODAY'S COMPLETE MENU:\n`;
            let currentHall = '';
            adminContext.todayMenuAll.forEach(menu => {
                if (menu.mess_hall !== currentHall) {
                    systemContext += `\n${menu.mess_hall}:\n`;
                    currentHall = menu.mess_hall;
                }
                systemContext += `  - ${menu.meal_type}: ${menu.items}\n`;
            });
        }

        // Add complaint trends
        if (adminContext.complaintTrends && adminContext.complaintTrends.length > 0) {
            systemContext += `\n📉 COMPLAINT TRENDS (Last 7 days):\n`;
            adminContext.complaintTrends.forEach(trend => {
                const date = new Date(trend.date).toLocaleDateString();
                systemContext += `- ${date}: ${trend.count} complaints (${trend.resolved} resolved, ${trend.pending} pending)\n`;
            });
        }

        // Add top active users
        if (adminContext.topUsers && adminContext.topUsers.length > 0) {
            systemContext += `\n⭐ TOP ACTIVE USERS (Last 30 days):\n`;
            adminContext.topUsers.forEach((user, i) => {
                systemContext += `${i + 1}. ${user.username}: ${user.feedback_count} feedback (Avg: ${user.avg_rating?.toFixed(2)}/5, Points: ${user.points})\n`;
            });
        }

        // Add user details summary
        if (adminContext.userDetails && adminContext.userDetails.length > 0) {
            const totalStudents = adminContext.userDetails.length;
            const activeStudents = adminContext.userDetails.filter(u => u.feedback_count > 0).length;
            const avgFeedbackPerUser = (adminContext.userDetails.reduce((sum, u) => sum + u.feedback_count, 0) / totalStudents).toFixed(2);
            systemContext += `\n👥 USER ENGAGEMENT:\n`;
            systemContext += `- Total Students: ${totalStudents}\n`;
            systemContext += `- Active Students: ${activeStudents} (${((activeStudents/totalStudents)*100).toFixed(1)}%)\n`;
            systemContext += `- Average Feedback per User: ${avgFeedbackPerUser}\n`;
        }

        systemContext += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You help administrators with:
- Analyzing feedback trends and patterns across all mess halls
- Identifying urgent issues and complaints with specific details
- Providing actionable recommendations based on real data
- Showing real-time statistics with exact numbers
- Suggesting improvements for specific meals or services
- Tracking user engagement and participation
- Monitoring mess hall performance
- Analyzing complaint resolution trends

IMPORTANT INSTRUCTIONS:
1. Use the REAL DATA provided above - be specific with numbers, names, and facts
2. When asked about users, provide actual usernames and statistics
3. When asked about menu, show the complete menu with mess hall names
4. When asked about complaints, provide specific details and trends
5. When asked about feedback, break down by meal type and mess hall
6. Provide actionable insights with specific recommendations
7. Be comprehensive and detailed in your responses
8. Reference actual comments and suggestions from users when relevant`;

        const messages = [
            {
                role: 'system',
                content: systemContext
            },
            ...formattedHistory,
            {
                role: 'user',
                content: message
            }
        ];

        const response = await azureOpenAI.client.chat.completions.create({
            model: azureOpenAI.deploymentName,
            messages: messages,
            max_tokens: 500,
            temperature: 0.7
        });

        res.json({
            success: true,
            response: response.choices[0].message.content,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in admin AI chat:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get AI response',
            error: error.message
        });
    }
});

/**
 * GET /api/ai/status
 * Check if AI service is configured and available
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        configured: azureOpenAI.isConfigured(),
        message: azureOpenAI.isConfigured() ? 
            'AI service is available' : 
            'AI service is not configured'
    });
});

module.exports = router;
