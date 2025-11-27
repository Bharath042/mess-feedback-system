const bcrypt = require('bcryptjs');
const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER || "messfeedback-sqlserver-bharath.database.windows.net",
  database: process.env.DB_DATABASE || "messfeedbacksqlserver",
  user: process.env.DB_USER || "sqladmin@messfeedback-sqlserver-bharath",
  password: process.env.DB_PASSWORD || "P@ssw0rd123456",
  port: 1433,
  authentication: {
    type: 'default'
  },
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function setupAdmin() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log('✅ Connected to database');
    
    // Generate new hash for AdminPass123
    const password = 'AdminPass123';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    console.log('Generated hash:', hashedPassword);
    
    // Check if admin exists
    const checkResult = await pool.request()
      .query(`SELECT id, username FROM users WHERE username = 'admin'`);
    
    if (checkResult.recordset.length > 0) {
      console.log('Admin user exists, updating password...');
      await pool.request()
        .input('username', sql.NVarChar, 'admin')
        .input('password', sql.NVarChar, hashedPassword)
        .query(`UPDATE users SET password = @password WHERE username = @username`);
      console.log('✅ Admin password updated');
    } else {
      console.log('Admin user does not exist, creating...');
      await pool.request()
        .input('username', sql.NVarChar, 'admin')
        .input('password', sql.NVarChar, hashedPassword)
        .input('role', sql.NVarChar, 'admin')
        .input('is_active', sql.Bit, 1)
        .query(`INSERT INTO users (username, password, role, is_active) VALUES (@username, @password, @role, @is_active)`);
      console.log('✅ Admin user created');
    }
    
    console.log('\n✅ Admin Setup Complete!');
    console.log('Username: admin');
    console.log('Password: AdminPass123');
    
    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupAdmin();
