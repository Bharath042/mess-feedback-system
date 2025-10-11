const { connectDB } = require('./config/database');

async function startApplication() {
  console.log('🚀 Starting Mess Feedback System...');
  console.log('📅 Time:', new Date().toLocaleString());
  
  try {
    // Test database connection first
    console.log('🔗 Connecting to Azure SQL Database...');
    await connectDB();
    console.log('✅ Database connection successful!');
    
    // Start the main server
    console.log('🌟 Starting enhanced server...');
    require('./server-enhanced');
    
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your internet connection');
    console.log('2. Verify Azure SQL Database is accessible');
    console.log('3. Confirm database credentials are correct');
    console.log('4. Try running: npm install');
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down...');
  process.exit(0);
});

startApplication();
