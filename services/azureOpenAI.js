const { AzureOpenAI } = require('openai');
require('dotenv').config();

class AzureOpenAIService {
    constructor() {
        this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        this.apiKey = process.env.AZURE_OPENAI_API_KEY;
        this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4';
        this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
        
        if (!this.endpoint || !this.apiKey) {
            console.warn('⚠️  Azure OpenAI credentials not configured. AI features will be disabled.');
            this.client = null;
        } else {
            this.client = new AzureOpenAI({
                apiKey: this.apiKey,
                endpoint: this.endpoint,
                apiVersion: this.apiVersion,
                deployment: this.deploymentName
            });
            console.log('✅ Azure OpenAI service initialized');
        }
    }

    isConfigured() {
        return this.client !== null;
    }

    /**
     * Chat with AI assistant for students
     * @param {string} userMessage - The user's message
     * @param {Array} conversationHistory - Previous messages in the conversation
     * @param {Object} contextData - Real-time data from database (menu, user info, etc.)
     * @returns {Promise<string>} - AI response
     */
    async chatWithStudent(userMessage, conversationHistory = [], contextData = {}) {
        if (!this.isConfigured()) {
            throw new Error('Azure OpenAI is not configured');
        }

        try {
            // Build context from real database data
            let systemContext = `You are a helpful AI assistant for a mess (cafeteria) feedback system.
            
IMPORTANT: Use the following REAL DATA from the database to answer questions:

`;

            // Add today's menu if available
            if (contextData.todayMenu && contextData.todayMenu.length > 0) {
                systemContext += `\nTODAY'S MENU:\n`;
                contextData.todayMenu.forEach(menu => {
                    systemContext += `- ${menu.meal_type}: ${menu.food_items}\n`;
                });
            }

            // Add comprehensive user profile
            if (contextData.userName) {
                systemContext += `\n👤 USER PROFILE:\n`;
                systemContext += `- Username: ${contextData.userName}\n`;
                if (contextData.fullName) systemContext += `- Full Name: ${contextData.fullName}\n`;
                if (contextData.department) systemContext += `- Department: ${contextData.department}\n`;
                if (contextData.yearOfStudy) systemContext += `- Year of Study: ${contextData.yearOfStudy}\n`;
                if (contextData.hostelName) systemContext += `- Hostel: ${contextData.hostelName}\n`;
                if (contextData.roomNumber) systemContext += `- Room: ${contextData.roomNumber}\n`;
            }

            // Add user points and rank
            if (contextData.userPoints !== undefined) {
                systemContext += `\n🏆 POINTS & RANKING:\n`;
                systemContext += `- Current Points: ${contextData.userPoints} points\n`;
                if (contextData.userRank) {
                    systemContext += `- Your Rank: #${contextData.userRank.rank} out of ${contextData.userRank.total_students} students\n`;
                }
            }

            // Add feedback statistics
            if (contextData.feedbackCount !== undefined) {
                systemContext += `\n📊 YOUR ACTIVITY:\n`;
                systemContext += `- Total Feedback Submitted: ${contextData.feedbackCount}\n`;
            }

            // Add feedback history
            if (contextData.feedbackHistory && contextData.feedbackHistory.length > 0) {
                systemContext += `\n📝 YOUR RECENT FEEDBACK:\n`;
                contextData.feedbackHistory.forEach((fb, i) => {
                    const date = new Date(fb.created_at).toLocaleDateString();
                    systemContext += `${i + 1}. ${fb.meal_type} (${date}) - Service: ${fb.service_rating}/5, Cleanliness: ${fb.cleanliness_rating}/5\n`;
                    if (fb.overall_comments) {
                        systemContext += `   Comment: "${fb.overall_comments}"\n`;
                    }
                });
            }

            // Add recent complaints
            if (contextData.recentComplaints && contextData.recentComplaints.length > 0) {
                systemContext += `\n⚠️ YOUR RECENT COMPLAINTS:\n`;
                contextData.recentComplaints.forEach((complaint, index) => {
                    const date = new Date(complaint.created_at).toLocaleDateString();
                    systemContext += `${index + 1}. ${complaint.category} - Status: ${complaint.status} (${date})\n`;
                });
            }

            // Add mess halls information
            if (contextData.messHalls && contextData.messHalls.length > 0) {
                systemContext += `\n🏢 AVAILABLE MESS HALLS:\n`;
                contextData.messHalls.forEach(mh => {
                    systemContext += `- ${mh.name} at ${mh.location} (Capacity: ${mh.capacity})\n`;
                });
            }

            // Add meal timings from database
            if (contextData.mealTimings && contextData.mealTimings.length > 0) {
                systemContext += `\n⏰ MEAL TIMINGS:\n`;
                contextData.mealTimings.forEach(mt => {
                    systemContext += `- ${mt.name}: ${mt.time_start} - ${mt.time_end}\n`;
                });
            }

            systemContext += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You help students with:
- Showing today's actual menu from the database
- Providing their complete profile information
- Showing their points, rank, and activity statistics
- Displaying their feedback and complaint history
- Explaining how to navigate the app and give feedback
- Helping lodge complaints with specific guidance
- Answering questions about mess halls and timings
- Providing personalized insights based on their history

IMPORTANT INSTRUCTIONS:
1. When asked about "today's menu", use the ACTUAL menu data provided above
2. When asked about "my profile" or "my info", show their complete profile details
3. When asked about "my points", show actual points AND their rank among students
4. When asked about "my feedback", show their recent feedback history with dates and ratings
5. When asked about "my complaints", show their recent complaints with status
6. When asked "how to give feedback", explain: "Click 'Give Feedback' in the sidebar, select meal type, rate service/cleanliness/ambience, add comments, and submit to earn 10 points!"
7. When asked about "mess timings", use the ACTUAL timings from the database
8. When asked about "mess halls", list all available mess halls with locations
9. Be specific and use REAL DATA - include names, numbers, dates, and details
10. Be friendly, helpful, and personalized in your responses
11. Reference their past activity when relevant (e.g., "Based on your 5 feedback submissions...")
12. Keep responses comprehensive but well-organized with bullet points`;

            const messages = [
                {
                    role: 'system',
                    content: systemContext
                },
                ...conversationHistory,
                {
                    role: 'user',
                    content: userMessage
                }
            ];

            const response = await this.client.chat.completions.create({
                model: this.deploymentName,
                messages: messages,
                max_tokens: 300,
                temperature: 0.7,
                top_p: 0.95,
                frequency_penalty: 0,
                presence_penalty: 0
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error in chatWithStudent:', error);
            throw new Error('Failed to get AI response');
        }
    }

    /**
     * Generate insights from feedback data for admin
     * @param {Array} feedbackData - Array of feedback records
     * @returns {Promise<Object>} - AI-generated insights
     */
    async generateFeedbackInsights(feedbackData) {
        if (!this.isConfigured()) {
            throw new Error('Azure OpenAI is not configured');
        }

        try {
            const feedbackSummary = this.prepareFeedbackSummary(feedbackData);
            
            const messages = [
                {
                    role: 'system',
                    content: `You are an AI analytics assistant for a mess feedback system. 
                    Analyze feedback data and provide actionable insights for administrators.
                    Focus on:
                    - Overall trends and patterns
                    - Areas needing immediate attention
                    - Positive highlights
                    - Specific recommendations for improvement
                    
                    Provide insights in a structured JSON format with keys: summary, concerns, highlights, recommendations.`
                },
                {
                    role: 'user',
                    content: `Analyze this feedback data and provide insights:\n\n${feedbackSummary}`
                }
            ];

            const response = await this.client.chat.completions.create({
                model: this.deploymentName,
                messages: messages,
                max_tokens: 800,
                temperature: 0.5,
                top_p: 0.9
            });

            const content = response.choices[0].message.content;
            
            // Try to parse as JSON, fallback to text if not valid JSON
            try {
                return JSON.parse(content);
            } catch {
                return {
                    summary: content,
                    concerns: [],
                    highlights: [],
                    recommendations: []
                };
            }
        } catch (error) {
            console.error('Error in generateFeedbackInsights:', error);
            throw new Error('Failed to generate insights');
        }
    }

    /**
     * Analyze complaints and suggest responses
     * @param {Object} complaint - Complaint data
     * @returns {Promise<string>} - Suggested response
     */
    async suggestComplaintResponse(complaint) {
        if (!this.isConfigured()) {
            throw new Error('Azure OpenAI is not configured');
        }

        try {
            const messages = [
                {
                    role: 'system',
                    content: `You are an AI assistant helping administrators respond to student complaints about mess food and services.
                    Generate professional, empathetic, and solution-oriented responses.
                    Keep responses concise (under 100 words) and actionable.`
                },
                {
                    role: 'user',
                    content: `Generate a response for this complaint:
                    Category: ${complaint.category || 'General'}
                    Description: ${complaint.description}
                    Priority: ${complaint.priority || 'Medium'}`
                }
            ];

            const response = await this.client.chat.completions.create({
                model: this.deploymentName,
                messages: messages,
                max_tokens: 250,
                temperature: 0.7
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('Error in suggestComplaintResponse:', error);
            throw new Error('Failed to generate complaint response');
        }
    }

    /**
     * Generate menu suggestions based on feedback
     * @param {Array} feedbackData - Recent feedback on menu items
     * @returns {Promise<Object>} - Menu suggestions
     */
    async generateMenuSuggestions(feedbackData) {
        if (!this.isConfigured()) {
            throw new Error('Azure OpenAI is not configured');
        }

        try {
            const feedbackSummary = feedbackData.map(f => 
                `${f.food_item}: Rating ${f.rating}/5 - ${f.comments || 'No comments'}`
            ).join('\n');

            const messages = [
                {
                    role: 'system',
                    content: `You are a culinary AI assistant for a mess management system.
                    Based on student feedback, suggest menu improvements and new items.
                    Consider nutritional balance, variety, and student preferences.
                    Provide suggestions in JSON format with keys: improvements, newItems, removeItems.`
                },
                {
                    role: 'user',
                    content: `Based on this feedback, suggest menu improvements:\n\n${feedbackSummary}`
                }
            ];

            const response = await this.client.chat.completions.create({
                model: this.deploymentName,
                messages: messages,
                max_tokens: 500,
                temperature: 0.8
            });

            const content = response.choices[0].message.content;
            
            try {
                return JSON.parse(content);
            } catch {
                return {
                    improvements: [content],
                    newItems: [],
                    removeItems: []
                };
            }
        } catch (error) {
            console.error('Error in generateMenuSuggestions:', error);
            throw new Error('Failed to generate menu suggestions');
        }
    }

    /**
     * Prepare feedback summary for AI analysis
     * @param {Array} feedbackData - Raw feedback data
     * @returns {string} - Formatted summary
     */
    prepareFeedbackSummary(feedbackData) {
        if (!feedbackData || feedbackData.length === 0) {
            return 'No feedback data available';
        }

        const summary = {
            totalFeedback: feedbackData.length,
            averageRating: (feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackData.length).toFixed(2),
            byMealType: {},
            commonComments: []
        };

        // Group by meal type
        feedbackData.forEach(f => {
            const mealType = f.meal_type || 'Unknown';
            if (!summary.byMealType[mealType]) {
                summary.byMealType[mealType] = { count: 0, totalRating: 0 };
            }
            summary.byMealType[mealType].count++;
            summary.byMealType[mealType].totalRating += (f.rating || 0);
        });

        // Calculate averages
        Object.keys(summary.byMealType).forEach(mealType => {
            const data = summary.byMealType[mealType];
            data.averageRating = (data.totalRating / data.count).toFixed(2);
        });

        // Collect comments
        summary.commonComments = feedbackData
            .filter(f => f.comments && f.comments.trim())
            .slice(0, 10)
            .map(f => f.comments);

        return JSON.stringify(summary, null, 2);
    }

    /**
     * Sentiment analysis on feedback comments
     * @param {string} comment - Feedback comment
     * @returns {Promise<Object>} - Sentiment analysis result
     */
    async analyzeSentiment(comment) {
        if (!this.isConfigured()) {
            throw new Error('Azure OpenAI is not configured');
        }

        try {
            const messages = [
                {
                    role: 'system',
                    content: `Analyze the sentiment of feedback comments. 
                    Respond with JSON: {"sentiment": "positive|negative|neutral", "score": 0-1, "keywords": []}
                    Score: 0 = very negative, 0.5 = neutral, 1 = very positive`
                },
                {
                    role: 'user',
                    content: comment
                }
            ];

            const response = await this.client.chat.completions.create({
                model: this.deploymentName,
                messages: messages,
                max_tokens: 150,
                temperature: 0.3
            });

            const content = response.choices[0].message.content;
            
            try {
                return JSON.parse(content);
            } catch {
                return {
                    sentiment: 'neutral',
                    score: 0.5,
                    keywords: []
                };
            }
        } catch (error) {
            console.error('Error in analyzeSentiment:', error);
            throw new Error('Failed to analyze sentiment');
        }
    }
}

// Export singleton instance
module.exports = new AzureOpenAIService();
