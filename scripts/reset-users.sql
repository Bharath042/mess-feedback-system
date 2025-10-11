-- Quick script to add default users to your existing table
-- Run this in Azure Data Studio if the app still has issues

-- Check current users
SELECT * FROM users;

-- Add admin user (if not exists)
IF NOT EXISTS (SELECT * FROM users WHERE username = 'admin')
BEGIN
    DECLARE @NextId INT = (SELECT ISNULL(MAX(id), 0) + 1 FROM users);
    INSERT INTO users (id, username, password, role) VALUES 
    (@NextId, 'admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'admin');
    PRINT 'Admin user created with ID: ' + CAST(@NextId AS VARCHAR);
END
ELSE
    PRINT 'Admin user already exists';

-- Add student users (if not exist)
IF NOT EXISTS (SELECT * FROM users WHERE username = 'student001')
BEGIN
    DECLARE @NextId2 INT = (SELECT ISNULL(MAX(id), 0) + 1 FROM users);
    DECLARE @NextId3 INT = @NextId2 + 1;
    
    INSERT INTO users (id, username, password, role) VALUES 
    (@NextId2, 'student001', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'student'),
    (@NextId3, 'student002', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'student');
    
    PRINT 'Student users created with IDs: ' + CAST(@NextId2 AS VARCHAR) + ', ' + CAST(@NextId3 AS VARCHAR);
END
ELSE
    PRINT 'Student users already exist';

-- Show final result
SELECT id, username, role FROM users ORDER BY id;

PRINT 'Setup complete! Default passwords: AdminPass123 / StudentPass123';
