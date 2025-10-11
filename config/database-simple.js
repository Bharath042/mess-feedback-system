const sql = require('mssql');

// Production database configuration
const config = {
    server: 'messfeedbacksqlserver.database.windows.net',
    database: 'messfeedbacksqlserver',
    user: 'sqladmin',
    password: 'Kavi@1997',
    port: 1433,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise;

const connectDB = async () => {
  try {
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(config).connect();
    }
    
    const pool = await poolPromise;
    console.log('✅ Connected to Azure SQL Database');
    
    // Just verify tables exist, don't create users automatically
    await verifyTables(pool);
    
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

const verifyTables = async (pool) => {
  try {
    console.log('🔍 Verifying database tables...');
    
    // Check if users table exists
    const usersTableCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'users'
    `);

    if (usersTableCheck.recordset[0].count > 0) {
      console.log('✅ Users table found');
      
      // Show existing users
      const existingUsers = await pool.request().query(`
        SELECT id, username, role FROM users
      `);
      console.log('👥 Existing users:', existingUsers.recordset);
    } else {
      console.log('⚠️  Users table not found - you may need to create it manually');
    }

    // Check if Feedback table exists
    const feedbackTableCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Feedback'
    `);

    if (feedbackTableCheck.recordset[0].count > 0) {
      console.log('✅ Feedback table found');
    } else {
      console.log('⚠️  Feedback table not found - you may need to create it manually');
    }

    console.log('🎯 Database verification complete');
    
  } catch (error) {
    console.error('⚠️  Error verifying tables:', error.message);
    // Don't throw error - let the server start anyway
  }
};

const getPool = async () => {
  if (!poolPromise) {
    await connectDB();
  }
  return poolPromise;
};

module.exports = {
  connectDB,
  getPool,
  sql
};
