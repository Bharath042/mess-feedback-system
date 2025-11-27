// Quick database verification script
const { getPool, sql } = require('./config/database');

async function verifyDatabase() {
  try {
    console.log('🔍 Connecting to database...');
    const pool = await getPool();
    
    // Check users table
    console.log('\n📋 Users in database:');
    const usersResult = await pool.request().query('SELECT id, username, role FROM users');
    console.table(usersResult.recordset);
    
    // Check feedback table
    console.log('\n📋 Feedback in database:');
    const feedbackResult = await pool.request().query('SELECT TOP 10 id, StudentName, Roll, Meal, Rating, created_at FROM Feedback ORDER BY created_at DESC');
    console.table(feedbackResult.recordset);
    
    // Check complaints table
    console.log('\n📋 Complaints in database:');
    const complaintsResult = await pool.request().query('SELECT TOP 10 id, title, user_id, status, created_at FROM complaints ORDER BY created_at DESC');
    console.table(complaintsResult.recordset);
    
    console.log('\n✅ Database verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyDatabase();
