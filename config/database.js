const sql = require('mssql');
const winston = require('winston');

// Production database configuration
const config = {
  server: process.env.DB_SERVER || "messfeedback-sqlserver-bharath.database.windows.net",
  database: process.env.DB_DATABASE || "messfeedbacksqlserver", 
  user: process.env.DB_USER || "sqladmin@messfeedback-sqlserver-bharath",
  password: process.env.DB_PASSWORD || "Kavi@1997",
  port: 1433,
  options: {
    encrypt: true, // Use encryption for Azure SQL
    trustServerCertificate: false,
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000,
  },
  pool: {
    max: 20, // Increased for better performance
    min: 5,  // Keep minimum connections
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
};

let poolPromise;

const connectDB = async () => {
  try {
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(config).connect();
    }
    
    const pool = await poolPromise;
    console.log('Connected to Azure SQL Database');
    
    // Skip table initialization - tables should already exist
    // await initializeTables(pool);
    
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

const initializeTables = async (pool) => {
  try {
    console.log('🔧 Checking database tables...');
    
    // Check if users table exists
    const usersTableCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'users'
    `);

    if (usersTableCheck.recordset[0].count === 0) {
      console.log('📝 Creating users table...');
      await pool.request().query(`
        CREATE TABLE users (
          id INT IDENTITY(1,1) PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'student',
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          is_active BIT DEFAULT 1,
          last_login DATETIME2,
          login_attempts INT DEFAULT 0,
          locked_until DATETIME2
        )
      `);
      console.log('✅ Users table created successfully');
    } else {
      console.log('✅ Users table already exists');
    }

    // Check if Feedback table exists
    const feedbackTableCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Feedback'
    `);

    if (feedbackTableCheck.recordset[0].count === 0) {
      console.log('📝 Creating Feedback table...');
      await pool.request().query(`
        CREATE TABLE Feedback (
          id INT IDENTITY(1,1) PRIMARY KEY,
          StudentName VARCHAR(255) NOT NULL,
          Roll VARCHAR(50) NOT NULL,
          Meal VARCHAR(100) NOT NULL,
          Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
          Emotion VARCHAR(50),
          Comment NVARCHAR(1000),
          created_at DATETIME2 DEFAULT GETDATE(),
          mess_hall VARCHAR(100),
          meal_time VARCHAR(20),
          food_quality_rating INT CHECK (food_quality_rating BETWEEN 1 AND 5),
          service_rating INT CHECK (service_rating BETWEEN 1 AND 5),
          cleanliness_rating INT CHECK (cleanliness_rating BETWEEN 1 AND 5),
          is_anonymous BIT DEFAULT 0
        )
      `);
      console.log('✅ Feedback table created successfully');
    } else {
      console.log('✅ Feedback table already exists');
    }

    // Check the structure of existing users table
    const tableStructure = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('📋 Existing users table structure:', tableStructure.recordset);

    // Get the next available ID for manual insertion
    const maxIdResult = await pool.request().query(`
      SELECT ISNULL(MAX(id), 0) + 1 as next_id FROM users
    `);
    const nextId = maxIdResult.recordset[0].next_id;

    // Create default admin user if not exists
    const adminCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM users WHERE username = 'admin'
    `);

    if (adminCheck.recordset[0].count === 0) {
      console.log('👤 Creating default admin user...');
      await pool.request().query(`
        INSERT INTO users (id, username, password, role) VALUES 
        (${nextId}, 'admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'admin')
      `);
      console.log('✅ Default admin user created (username: admin, password: AdminPass123)');
    }

    // Create sample student users if not exist
    const studentCheck = await pool.request().query(`
      SELECT COUNT(*) as count FROM users WHERE username = 'student001'
    `);

    if (studentCheck.recordset[0].count === 0) {
      console.log('👤 Creating sample student users...');
      const nextId2 = nextId + (adminCheck.recordset[0].count === 0 ? 1 : 0);
      const nextId3 = nextId2 + 1;
      
      await pool.request().query(`
        INSERT INTO users (id, username, password, role) VALUES 
        (${nextId2}, 'student001', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'student'),
        (${nextId3}, 'student002', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'student')
      `);
      console.log('✅ Sample student users created');
    }

    // Mess halls table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='mess_halls' AND xtype='U')
      CREATE TABLE mess_halls (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        location NVARCHAR(255),
        capacity INT,
        manager_id INT,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (manager_id) REFERENCES users(id)
      )
    `);

    // Menu items table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='menu_items' AND xtype='U')
      CREATE TABLE menu_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        category NVARCHAR(50) NOT NULL CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snacks')),
        description NVARCHAR(500),
        is_vegetarian BIT DEFAULT 0,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE()
      )
    `);

    // Daily menus table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='daily_menus' AND xtype='U')
      CREATE TABLE daily_menus (
        id INT IDENTITY(1,1) PRIMARY KEY,
        mess_hall_id INT NOT NULL,
        menu_date DATE NOT NULL,
        meal_type NVARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (mess_hall_id) REFERENCES mess_halls(id),
        UNIQUE(mess_hall_id, menu_date, meal_type)
      )
    `);

    // Daily menu items junction table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='daily_menu_items' AND xtype='U')
      CREATE TABLE daily_menu_items (
        id INT IDENTITY(1,1) PRIMARY KEY,
        daily_menu_id INT NOT NULL,
        menu_item_id INT NOT NULL,
        FOREIGN KEY (daily_menu_id) REFERENCES daily_menus(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
        UNIQUE(daily_menu_id, menu_item_id)
      )
    `);

    // Feedback table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='feedback' AND xtype='U')
      CREATE TABLE feedback (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        mess_hall_id INT NOT NULL,
        daily_menu_id INT,
        overall_rating INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
        food_quality_rating INT CHECK (food_quality_rating BETWEEN 1 AND 5),
        service_rating INT CHECK (service_rating BETWEEN 1 AND 5),
        cleanliness_rating INT CHECK (cleanliness_rating BETWEEN 1 AND 5),
        value_rating INT CHECK (value_rating BETWEEN 1 AND 5),
        comments NVARCHAR(1000),
        suggestions NVARCHAR(1000),
        is_anonymous BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (mess_hall_id) REFERENCES mess_halls(id),
        FOREIGN KEY (daily_menu_id) REFERENCES daily_menus(id)
      )
    `);

    // Feedback images table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='feedback_images' AND xtype='U')
      CREATE TABLE feedback_images (
        id INT IDENTITY(1,1) PRIMARY KEY,
        feedback_id INT NOT NULL,
        image_url NVARCHAR(500) NOT NULL,
        image_name NVARCHAR(255),
        uploaded_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_feedback_mess_hall_date')
      CREATE INDEX IX_feedback_mess_hall_date ON feedback (mess_hall_id, created_at DESC)
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_feedback_user_date')
      CREATE INDEX IX_feedback_user_date ON feedback (user_id, created_at DESC)
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
};

const getPool = () => {
  if (!poolPromise) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return poolPromise;
};

module.exports = {
  connectDB,
  getPool,
  sql
};
