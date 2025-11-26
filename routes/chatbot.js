const express = require('express');
const router = express.Router();
const { AzureOpenAI } = require('openai');

// Initialize Azure OpenAI
let azureOpenAI = null;
if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
  azureOpenAI = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: '2024-02-15-preview',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'
  });
  console.log('✅ Azure OpenAI initialized for chatbot');
} else {
  console.warn('⚠️  Azure OpenAI not configured, using fallback responses');
}

// Fallback responses for when Azure OpenAI is not available
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
  'account': 'To create a new account, you need to register through the registration page. You\'ll need to provide your username, password, and other details. Contact the administrator if you need help.',
  'register': 'To register a new account, go to the registration page and fill in your details. Make sure to use a strong password.',
  'sign up': 'To sign up, visit the registration page and provide your information. You\'ll receive a confirmation and can start using the system.',
  'default': 'I\'m here to help! You can ask me about the menu, feedback, complaints, ratings, points, registration, or anything else about the mess system. What would you like to know?'
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
 * Chatbot endpoint with Azure OpenAI integration
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

    let response;

    // Try to use Azure OpenAI if available
    if (azureOpenAI) {
      try {
        console.log('🤖 Using Azure OpenAI for response');
        
        // Build conversation history for context
        const messages = [
          {
            role: 'system',
            content: `You are a helpful AI assistant for a Mess (cafeteria) Feedback System. You help students with:
- Submitting feedback about meals
- Filing complaints
- Understanding the rating system
- Earning and checking points
- Creating accounts and registration
- General questions about the mess system

Be friendly, concise, and helpful. Keep responses to 2-3 sentences unless more detail is needed.`
          },
          ...(conversationHistory || []).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: 'user',
            content: message
          }
        ];

        const completion = await azureOpenAI.chat.completions.create({
          model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
          messages: messages,
          max_tokens: 200,
          temperature: 0.7
        });

        response = completion.choices[0].message.content;
        console.log('✅ Azure OpenAI response received');
      } catch (azureError) {
        console.error('❌ Azure OpenAI error:', azureError.message);
        console.log('⚠️  Falling back to predefined responses');
        response = getFallbackResponse(message);
      }
    } else {
      // Use fallback responses
      response = getFallbackResponse(message);
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
 * Get fallback response when Azure OpenAI is not available
 */
function getFallbackResponse(message) {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for specific keywords
  for (const [key, value] of Object.entries(chatbotResponses)) {
    if (key !== 'default' && lowerMessage.includes(key)) {
      return value;
    }
  }

  // Check for common question patterns
  if ((lowerMessage.includes('how') || lowerMessage.includes('how to')) && lowerMessage.includes('submit')) {
    return 'To submit feedback: 1. Go to the Feedback section 2. Select your meal type 3. Rate the service, cleanliness, and ambience 4. Add comments if you\'d like 5. Click Submit. Your feedback helps us improve!';
  }
  
  if ((lowerMessage.includes('what') || lowerMessage.includes('what\'s')) && lowerMessage.includes('menu')) {
    return 'Today\'s menu includes: Breakfast - Tea, Biscuits, Samosa, Banana | Lunch - Rice, Dal, Vegetables, Salad | Dinner - Roti, Curry, Vegetables. Enjoy your meal!';
  }

  if ((lowerMessage.includes('how') || lowerMessage.includes('how to')) && (lowerMessage.includes('create') || lowerMessage.includes('account') || lowerMessage.includes('register') || lowerMessage.includes('sign up'))) {
    return 'To create a new account, you need to register through the registration page. You\'ll need to provide your username, password, and other details. Contact the administrator if you need help.';
  }

  if (lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
    return 'Sorry to hear you\'re having an issue! You can file a complaint in the Complaints section. Please describe the problem in detail so we can help you resolve it quickly.';
  }

  // Default response
  return chatbotResponses['default'];
}

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
