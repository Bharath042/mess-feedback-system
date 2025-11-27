-- Mess Feedback System - Database Setup Script
-- Run this script in your Azure SQL Database to set up the required tables

-- Create Users table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
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
);

-- Create Feedback table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Feedback' AND xtype='U')
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
);

-- Create indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_users_username' AND object_id = OBJECT_ID('users'))
CREATE INDEX IX_users_username ON users (username);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_users_role' AND object_id = OBJECT_ID('users'))
CREATE INDEX IX_users_role ON users (role);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_feedback_roll_date' AND object_id = OBJECT_ID('Feedback'))
CREATE INDEX IX_feedback_roll_date ON Feedback (Roll, created_at DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_feedback_meal_rating' AND object_id = OBJECT_ID('Feedback'))
CREATE INDEX IX_feedback_meal_rating ON Feedback (Meal, Rating);

-- Insert default admin user
IF NOT EXISTS (SELECT * FROM users WHERE username = 'admin')
INSERT INTO users (username, password, role) VALUES 
('admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'admin');

-- Insert sample student users
IF NOT EXISTS (SELECT * FROM users WHERE username = 'student001')
INSERT INTO users (username, password, role) VALUES 
('student001', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'student');

IF NOT EXISTS (SELECT * FROM users WHERE username = 'student002')
INSERT INTO users (username, password, role) VALUES 
('student002', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'student');

-- Insert sample feedback data
INSERT INTO Feedback (StudentName, Roll, Meal, Rating, Emotion, Comment, mess_hall, food_quality_rating, service_rating, cleanliness_rating) VALUES
('John Doe', 'student001', 'lunch', 4, 'happy', 'Good food quality today', 'Main Mess', 4, 3, 4),
('Jane Smith', 'student002', 'breakfast', 5, 'very_happy', 'Excellent breakfast!', 'Main Mess', 5, 5, 4),
('Anonymous', 'student001', 'dinner', 3, 'neutral', 'Average dinner, could be better', 'Main Mess', 3, 3, 3);

PRINT 'Database setup completed successfully!';
PRINT 'Default Users Created:';
PRINT 'Admin: username=admin, password=AdminPass123';
PRINT 'Student: username=student001, password=StudentPass123';
PRINT 'Student: username=student002, password=StudentPass123';
