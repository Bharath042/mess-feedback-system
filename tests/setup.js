// Test setup file
const { connectDB } = require('../config/database');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DB_SERVER = process.env.TEST_DB_SERVER || 'localhost';
process.env.DB_DATABASE = process.env.TEST_DB_DATABASE || 'MessFeedbackTestDB';
process.env.DB_USER = process.env.TEST_DB_USER || 'testuser';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'testpassword';
process.env.DB_PORT = process.env.TEST_DB_PORT || '1433';

// Global test timeout
jest.setTimeout(30000);

// Global setup
beforeAll(async () => {
  // Connect to test database
  try {
    await connectDB();
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    process.exit(1);
  }
});

// Global teardown
afterAll(async () => {
  // Close database connections and cleanup
  console.log('🧹 Cleaning up test environment');
  
  // Add any cleanup logic here
  // For example, clearing test data, closing connections, etc.
  
  // Give some time for cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Suppress console.log during tests (optional)
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}
