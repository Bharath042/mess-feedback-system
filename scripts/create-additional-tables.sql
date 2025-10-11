-- Additional Tables for Enhanced Mess Feedback System
-- Run this script to create user profiles, complaints, and credit system tables

-- User Profiles table (extends user information)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_profiles' AND xtype='U')
CREATE TABLE user_profiles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    department VARCHAR(100),
    year_of_study INT,
    employee_id VARCHAR(50), -- For admin users
    mess_preference VARCHAR(100),
    dietary_restrictions NVARCHAR(500),
    profile_picture_url VARCHAR(500),
    date_of_birth DATE,
    gender VARCHAR(10),
    address NVARCHAR(500),
    emergency_contact VARCHAR(20),
    credit_points INT DEFAULT 0,
    total_feedback_given INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Complaints table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='complaints' AND xtype='U')
CREATE TABLE complaints (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    complaint_type VARCHAR(50) NOT NULL, -- 'ambience', 'service', 'food_quality', 'hygiene', 'staff_behavior', 'facility', 'other'
    title VARCHAR(255) NOT NULL,
    description NVARCHAR(2000) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    mess_hall VARCHAR(100),
    meal_time VARCHAR(20), -- 'breakfast', 'lunch', 'dinner', 'snacks'
    incident_date DATETIME2,
    priority_level INT DEFAULT 3, -- 1-5 scale
    assigned_to INT, -- Admin user ID
    resolution_notes NVARCHAR(1000),
    resolved_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Enhanced Feedback table (additional to existing Feedback table)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='feedback_detailed' AND xtype='U')
CREATE TABLE feedback_detailed (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    feedback_id INT, -- Link to original Feedback table if needed
    meal_type VARCHAR(50) NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snacks'
    mess_hall VARCHAR(100) NOT NULL,
    
    -- Detailed Ratings (1-5 scale)
    food_taste_rating INT CHECK (food_taste_rating BETWEEN 1 AND 5),
    food_quality_rating INT CHECK (food_quality_rating BETWEEN 1 AND 5),
    food_temperature_rating INT CHECK (food_temperature_rating BETWEEN 1 AND 5),
    portion_size_rating INT CHECK (portion_size_rating BETWEEN 1 AND 5),
    service_speed_rating INT CHECK (service_speed_rating BETWEEN 1 AND 5),
    staff_behavior_rating INT CHECK (staff_behavior_rating BETWEEN 1 AND 5),
    cleanliness_rating INT CHECK (cleanliness_rating BETWEEN 1 AND 5),
    ambience_rating INT CHECK (ambience_rating BETWEEN 1 AND 5),
    value_for_money_rating INT CHECK (value_for_money_rating BETWEEN 1 AND 5),
    overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
    
    -- Specific feedback
    favorite_dish VARCHAR(255),
    least_favorite_dish VARCHAR(255),
    suggestions NVARCHAR(1000),
    comments NVARCHAR(1000),
    
    -- Sentiment Analysis
    sentiment_score DECIMAL(3,2), -- -1 to 1 scale
    sentiment_label VARCHAR(20), -- 'positive', 'negative', 'neutral'
    
    -- Additional Info
    wait_time_minutes INT,
    crowd_level VARCHAR(20), -- 'low', 'medium', 'high'
    would_recommend BIT DEFAULT 1,
    is_anonymous BIT DEFAULT 0,
    
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Credit Points History
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='credit_history' AND xtype='U')
CREATE TABLE credit_history (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    points_earned INT NOT NULL,
    points_spent INT DEFAULT 0,
    activity_type VARCHAR(50) NOT NULL, -- 'feedback_submission', 'complaint_resolution', 'survey_completion', 'reward_redemption'
    description VARCHAR(255),
    reference_id INT, -- ID of related feedback/complaint
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Mess Halls Management
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='mess_halls' AND xtype='U')
CREATE TABLE mess_halls (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    capacity INT,
    manager_id INT,
    operating_hours VARCHAR(100),
    contact_number VARCHAR(20),
    facilities NVARCHAR(500),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- Menu Items
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='menu_items' AND xtype='U')
CREATE TABLE menu_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50), -- 'main_course', 'side_dish', 'beverage', 'dessert', 'snack'
    description NVARCHAR(500),
    ingredients NVARCHAR(500),
    allergens VARCHAR(255),
    nutritional_info NVARCHAR(500),
    price DECIMAL(10,2),
    is_vegetarian BIT DEFAULT 0,
    is_vegan BIT DEFAULT 0,
    spice_level VARCHAR(20), -- 'mild', 'medium', 'spicy', 'very_spicy'
    calories_per_serving INT,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Daily Menu
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='daily_menu' AND xtype='U')
CREATE TABLE daily_menu (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mess_hall_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    meal_type VARCHAR(50) NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snacks'
    menu_date DATE NOT NULL,
    is_available BIT DEFAULT 1,
    special_notes VARCHAR(255),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (mess_hall_id) REFERENCES mess_halls(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Notifications
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notifications' AND xtype='U')
CREATE TABLE notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message NVARCHAR(1000) NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
    is_read BIT DEFAULT 0,
    action_url VARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IX_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX IX_complaints_user_id ON complaints (user_id);
CREATE INDEX IX_complaints_status ON complaints (status);
CREATE INDEX IX_complaints_type ON complaints (complaint_type);
CREATE INDEX IX_feedback_detailed_user_id ON feedback_detailed (user_id);
CREATE INDEX IX_feedback_detailed_meal_date ON feedback_detailed (created_at DESC);
CREATE INDEX IX_credit_history_user_id ON credit_history (user_id);
CREATE INDEX IX_daily_menu_date ON daily_menu (menu_date DESC);
CREATE INDEX IX_notifications_user_id ON notifications (user_id);

-- Insert sample data
-- Sample mess halls
INSERT INTO mess_halls (name, location, capacity, operating_hours, contact_number, facilities) VALUES
('Main Mess Hall', 'Central Campus', 500, '7:00 AM - 10:00 PM', '+91-9876543210', 'AC, WiFi, Wheelchair Accessible'),
('North Campus Mess', 'North Block', 300, '7:30 AM - 9:30 PM', '+91-9876543211', 'WiFi, Outdoor Seating'),
('Hostel Mess A', 'Boys Hostel Block A', 200, '6:30 AM - 10:30 PM', '+91-9876543212', 'Basic Facilities');

-- Sample menu items
INSERT INTO menu_items (name, category, description, is_vegetarian, is_vegan, spice_level, calories_per_serving) VALUES
('Chicken Curry', 'main_course', 'Spicy chicken curry with traditional spices', 0, 0, 'spicy', 350),
('Dal Tadka', 'main_course', 'Yellow lentils with tempering', 1, 1, 'mild', 180),
('Vegetable Biryani', 'main_course', 'Fragrant rice with mixed vegetables', 1, 1, 'medium', 280),
('Chapati', 'side_dish', 'Whole wheat flatbread', 1, 1, 'mild', 80),
('Mixed Vegetable Curry', 'main_course', 'Seasonal vegetables in curry', 1, 1, 'medium', 120),
('Rice', 'side_dish', 'Steamed basmati rice', 1, 1, 'mild', 150),
('Curd', 'side_dish', 'Fresh yogurt', 1, 0, 'mild', 60),
('Gulab Jamun', 'dessert', 'Sweet milk dumplings in syrup', 1, 0, 'mild', 200);

PRINT 'Additional tables created successfully!';
PRINT 'Tables created:';
PRINT '- user_profiles: Extended user information with credit points';
PRINT '- complaints: Complaint management system';
PRINT '- feedback_detailed: Enhanced feedback with sentiment analysis';
PRINT '- credit_history: Credit points tracking';
PRINT '- mess_halls: Mess hall management';
PRINT '- menu_items: Food items database';
PRINT '- daily_menu: Daily menu planning';
PRINT '- notifications: User notifications';
PRINT '';
PRINT 'Sample data inserted for mess halls and menu items';
PRINT 'Ready to create dashboards!';
