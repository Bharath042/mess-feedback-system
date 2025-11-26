const express = require('express');
const router = express.Router();

// Mock chatbot responses
const chatbotResponses = {
  'hello': 'Hello! Welcome to the Mess Feedback System. How can I help you today?',
  'hi': 'Hi there! I\'m here to help with any questions about the mess.',
  'menu': 'Today\'s menu includes: Breakfast - Tea, Biscuits, Samosa, Banana | Lunch - Rice, Dal, Vegetables, Salad | Dinner - Roti, Curry, Vegetables',
  'feedback': 'You can submit feedback about your meal experience. Just go to the Feedback section and rate your meal on service, cleanliness, and ambience.',
  'complaint': 'To file a complaint, go to the Complaints section. You can describe your issue and we\'ll get back to you soon.',
  'rating': 'You can rate meals on a scale of 1-5 for service, cleanliness, and ambience.',
  'points': 'You earn points for submitting feedback and participating in the system. Check your profile to see your current points.',
  'help': 'I can help you with: menu, feedback, complaints, ratings, points, and more. What would you like to know?',
  'thanks': 'You\'re welcome! Feel free to ask if you have any other questions.',
  'thank you': 'You\'re welcome! Feel free to ask if you have any other questions.',
  'bye': 'Goodbye! Have a great day!',
  'default': 'I\'m here to help! You can ask me about the menu, feedback, complaints, ratings, or points. What would you like to know?'
};

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }
  next();
};

/**
 * POST /api/chatbot/chat or /api/ai/chat
 * Simple chatbot endpoint that works without Azure OpenAI
 */
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Convert message to lowercase for matching
    const lowerMessage = message.toLowerCase().trim();
    
    // Find matching response
    let response = chatbotResponses['default'];
    
    for (const [key, value] of Object.entries(chatbotResponses)) {
      if (key !== 'default' && lowerMessage.includes(key)) {
        response = value;
        break;
      }
    }

    // Add some context-aware responses
    if (lowerMessage.includes('how') && lowerMessage.includes('submit')) {
      response = 'To submit feedback: 1. Go to the Feedback section 2. Select your meal type 3. Rate the service, cleanliness, and ambience 4. Add comments if you\'d like 5. Click Submit. Your feedback helps us improve!';
    }
    
    if (lowerMessage.includes('what') && lowerMessage.includes('today')) {
      response = 'Today\'s menu includes: Breakfast - Tea, Biscuits, Samosa, Banana | Lunch - Rice, Dal, Vegetables, Salad | Dinner - Roti, Curry, Vegetables. Enjoy your meal!';
    }

    if (lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
      response = 'Sorry to hear you\'re having an issue! You can file a complaint in the Complaints section. Please describe the problem in detail so we can help you resolve it quickly.';
    }

    res.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in chatbot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chatbot response',
      error: error.message
    });
  }
});

/**
 * GET /api/chatbot/status or /api/ai/status
 * Check if chatbot is available
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'available',
    message: 'Chatbot is ready to help!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
