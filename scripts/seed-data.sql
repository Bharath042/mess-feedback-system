-- Mess Feedback System - Initial Data Seeding Script
-- This script populates the database with initial data for testing and production

-- =============================================
-- Mess Halls Data
-- =============================================
INSERT INTO mess_halls (name, location, capacity, is_active) VALUES
('Main Mess Hall', 'Campus Center Building', 500, 1),
('North Campus Mess', 'North Campus Residential Area', 300, 1),
('South Campus Mess', 'South Campus Hostel Block', 250, 1),
('Engineering Block Mess', 'Engineering Department', 200, 1),
('Medical College Mess', 'Medical College Campus', 180, 1);

-- =============================================
-- Menu Items Data
-- =============================================

-- Breakfast Items
INSERT INTO menu_items (name, category, description, is_vegetarian, is_active) VALUES
-- Vegetarian Breakfast
('Idli', 'breakfast', 'Steamed rice cakes served with sambar and chutney', 1, 1),
('Dosa', 'breakfast', 'Crispy rice and lentil crepe', 1, 1),
('Upma', 'breakfast', 'Semolina breakfast dish with vegetables', 1, 1),
('Poha', 'breakfast', 'Flattened rice with onions and spices', 1, 1),
('Paratha', 'breakfast', 'Stuffed Indian flatbread', 1, 1),
('Bread Toast', 'breakfast', 'Toasted bread with butter and jam', 1, 1),
('Cornflakes', 'breakfast', 'Breakfast cereal with milk', 1, 1),
('Tea', 'breakfast', 'Indian spiced tea', 1, 1),
('Coffee', 'breakfast', 'Filter coffee', 1, 1),
('Milk', 'breakfast', 'Fresh milk', 1, 1),

-- Non-Vegetarian Breakfast
('Egg Curry', 'breakfast', 'Boiled eggs in spicy curry', 0, 1),
('Omelette', 'breakfast', 'Beaten eggs cooked with vegetables', 0, 1),
('Chicken Sandwich', 'breakfast', 'Grilled chicken sandwich', 0, 1);

-- Lunch Items
INSERT INTO menu_items (name, category, description, is_vegetarian, is_active) VALUES
-- Vegetarian Lunch
('Steamed Rice', 'lunch', 'Plain steamed white rice', 1, 1),
('Chapati', 'lunch', 'Indian flatbread', 1, 1),
('Dal Tadka', 'lunch', 'Tempered lentil curry', 1, 1),
('Sambar', 'lunch', 'South Indian lentil curry with vegetables', 1, 1),
('Rasam', 'lunch', 'Tangy tomato-based soup', 1, 1),
('Vegetable Curry', 'lunch', 'Mixed vegetable curry', 1, 1),
('Aloo Gobi', 'lunch', 'Potato and cauliflower curry', 1, 1),
('Palak Paneer', 'lunch', 'Spinach curry with cottage cheese', 1, 1),
('Rajma', 'lunch', 'Kidney bean curry', 1, 1),
('Curd Rice', 'lunch', 'Rice mixed with yogurt', 1, 1),
('Pickle', 'lunch', 'Indian pickled vegetables', 1, 1),
('Papad', 'lunch', 'Crispy lentil wafer', 1, 1),
('Salad', 'lunch', 'Fresh vegetable salad', 1, 1),

-- Non-Vegetarian Lunch
('Chicken Curry', 'lunch', 'Spicy chicken curry', 0, 1),
('Mutton Curry', 'lunch', 'Tender mutton in rich gravy', 0, 1),
('Fish Curry', 'lunch', 'Fresh fish in coconut curry', 0, 1),
('Egg Curry', 'lunch', 'Hard-boiled eggs in curry', 0, 1),
('Chicken Biryani', 'lunch', 'Aromatic rice dish with chicken', 0, 1);

-- Dinner Items
INSERT INTO menu_items (name, category, description, is_vegetarian, is_active) VALUES
-- Vegetarian Dinner
('Jeera Rice', 'dinner', 'Cumin flavored rice', 1, 1),
('Butter Naan', 'dinner', 'Leavened bread with butter', 1, 1),
('Dal Makhani', 'dinner', 'Creamy black lentil curry', 1, 1),
('Paneer Butter Masala', 'dinner', 'Cottage cheese in rich tomato gravy', 1, 1),
('Mixed Vegetable', 'dinner', 'Seasonal mixed vegetables', 1, 1),
('Aloo Matar', 'dinner', 'Potato and green pea curry', 1, 1),
('Bhindi Masala', 'dinner', 'Spiced okra curry', 1, 1),
('Raita', 'dinner', 'Yogurt with cucumber and spices', 1, 1),

-- Non-Vegetarian Dinner
('Butter Chicken', 'dinner', 'Chicken in creamy tomato sauce', 0, 1),
('Chicken Tikka', 'dinner', 'Grilled marinated chicken', 0, 1),
('Fish Fry', 'dinner', 'Crispy fried fish', 0, 1),
('Mutton Biryani', 'dinner', 'Aromatic rice with mutton', 0, 1);

-- Snacks
INSERT INTO menu_items (name, category, description, is_vegetarian, is_active) VALUES
('Samosa', 'snacks', 'Fried pastry with spiced filling', 1, 1),
('Pakora', 'snacks', 'Deep-fried vegetable fritters', 1, 1),
('Sandwich', 'snacks', 'Vegetable sandwich', 1, 1),
('Biscuits', 'snacks', 'Tea biscuits', 1, 1),
('Fruit', 'snacks', 'Seasonal fresh fruit', 1, 1),
('Juice', 'snacks', 'Fresh fruit juice', 1, 1);

-- =============================================
-- Sample Daily Menus (Current Week)
-- =============================================

-- Get current date and create menus for the week
DECLARE @CurrentDate DATE = CAST(GETDATE() AS DATE);
DECLARE @MessHallId INT;

-- Create daily menus for Main Mess Hall
SELECT @MessHallId = id FROM mess_halls WHERE name = 'Main Mess Hall';

-- Monday Menu
INSERT INTO daily_menus (mess_hall_id, menu_date, meal_type) VALUES
(@MessHallId, @CurrentDate, 'breakfast'),
(@MessHallId, @CurrentDate, 'lunch'),
(@MessHallId, @CurrentDate, 'dinner');

-- Tuesday Menu
INSERT INTO daily_menus (mess_hall_id, menu_date, meal_type) VALUES
(@MessHallId, DATEADD(day, 1, @CurrentDate), 'breakfast'),
(@MessHallId, DATEADD(day, 1, @CurrentDate), 'lunch'),
(@MessHallId, DATEADD(day, 1, @CurrentDate), 'dinner');

-- Wednesday Menu
INSERT INTO daily_menus (mess_hall_id, menu_date, meal_type) VALUES
(@MessHallId, DATEADD(day, 2, @CurrentDate), 'breakfast'),
(@MessHallId, DATEADD(day, 2, @CurrentDate), 'lunch'),
(@MessHallId, DATEADD(day, 2, @CurrentDate), 'dinner');

-- =============================================
-- Sample Daily Menu Items (Monday)
-- =============================================

-- Monday Breakfast
INSERT INTO daily_menu_items (daily_menu_id, menu_item_id)
SELECT dm.id, mi.id
FROM daily_menus dm, menu_items mi
WHERE dm.mess_hall_id = @MessHallId 
  AND dm.menu_date = @CurrentDate 
  AND dm.meal_type = 'breakfast'
  AND mi.name IN ('Idli', 'Dosa', 'Sambar', 'Chutney', 'Tea', 'Coffee');

-- Monday Lunch
INSERT INTO daily_menu_items (daily_menu_id, menu_item_id)
SELECT dm.id, mi.id
FROM daily_menus dm, menu_items mi
WHERE dm.mess_hall_id = @MessHallId 
  AND dm.menu_date = @CurrentDate 
  AND dm.meal_type = 'lunch'
  AND mi.name IN ('Steamed Rice', 'Chapati', 'Dal Tadka', 'Vegetable Curry', 'Chicken Curry', 'Pickle', 'Salad');

-- Monday Dinner
INSERT INTO daily_menu_items (daily_menu_id, menu_item_id)
SELECT dm.id, mi.id
FROM daily_menus dm, menu_items mi
WHERE dm.mess_hall_id = @MessHallId 
  AND dm.menu_date = @CurrentDate 
  AND dm.meal_type = 'dinner'
  AND mi.name IN ('Jeera Rice', 'Butter Naan', 'Dal Makhani', 'Paneer Butter Masala', 'Butter Chicken', 'Raita');

-- =============================================
-- Default Admin User
-- =============================================
-- Password: AdminPass123 (hashed with bcrypt)
INSERT INTO users (student_id, email, password_hash, first_name, last_name, role, is_active) VALUES
('ADMIN001', 'admin@mess.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'System', 'Administrator', 'admin', 1);

-- Sample Mess Manager
INSERT INTO users (student_id, email, password_hash, first_name, last_name, role, hostel, department, is_active) VALUES
('MGR001', 'manager@mess.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'John', 'Manager', 'mess_manager', 'Staff Quarters', 'Food Services', 1);

-- Update mess hall with manager
UPDATE mess_halls 
SET manager_id = (SELECT id FROM users WHERE student_id = 'MGR001')
WHERE name = 'Main Mess Hall';

-- =============================================
-- Sample Students for Testing
-- =============================================
INSERT INTO users (student_id, email, password_hash, first_name, last_name, role, hostel, year_of_study, department, is_active) VALUES
('STU001', 'student1@college.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'Alice', 'Johnson', 'student', 'Hostel A', 2, 'Computer Science', 1),
('STU002', 'student2@college.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'Bob', 'Smith', 'student', 'Hostel B', 3, 'Mechanical Engineering', 1),
('STU003', 'student3@college.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'Carol', 'Davis', 'student', 'Hostel A', 1, 'Electrical Engineering', 1),
('STU004', 'student4@college.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'David', 'Wilson', 'student', 'Hostel C', 4, 'Civil Engineering', 1),
('STU005', 'student5@college.edu', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe', 'Eva', 'Brown', 'student', 'Hostel B', 2, 'Chemical Engineering', 1);

-- =============================================
-- Sample Feedback Data
-- =============================================
DECLARE @UserId INT;
DECLARE @DailyMenuId INT;

-- Get sample user and daily menu IDs
SELECT @UserId = id FROM users WHERE student_id = 'STU001';
SELECT @DailyMenuId = id FROM daily_menus WHERE mess_hall_id = @MessHallId AND menu_date = @CurrentDate AND meal_type = 'lunch';

-- Sample feedback entries
INSERT INTO feedback (user_id, mess_hall_id, daily_menu_id, overall_rating, food_quality_rating, service_rating, cleanliness_rating, value_rating, comments, suggestions, is_anonymous, created_at) VALUES
(@UserId, @MessHallId, @DailyMenuId, 4, 4, 3, 5, 4, 'Food quality was good, especially the dal. Service could be faster.', 'Please add more variety in vegetables', 0, DATEADD(hour, -2, GETDATE()));

-- Get another user for more sample data
SELECT @UserId = id FROM users WHERE student_id = 'STU002';
INSERT INTO feedback (user_id, mess_hall_id, daily_menu_id, overall_rating, food_quality_rating, service_rating, cleanliness_rating, value_rating, comments, suggestions, is_anonymous, created_at) VALUES
(@UserId, @MessHallId, @DailyMenuId, 5, 5, 4, 4, 5, 'Excellent chicken curry today! Very satisfied with the meal.', 'Keep up the good work', 0, DATEADD(hour, -1, GETDATE()));

-- Anonymous feedback
SELECT @UserId = id FROM users WHERE student_id = 'STU003';
INSERT INTO feedback (user_id, mess_hall_id, daily_menu_id, overall_rating, food_quality_rating, service_rating, cleanliness_rating, value_rating, comments, suggestions, is_anonymous, created_at) VALUES
(@UserId, @MessHallId, @DailyMenuId, 3, 3, 2, 3, 3, 'Food was average. Service was slow and tables were not clean.', 'Improve cleanliness and service speed', 1, DATEADD(minute, -30, GETDATE()));

-- More sample feedback for statistics
SELECT @UserId = id FROM users WHERE student_id = 'STU004';
INSERT INTO feedback (user_id, mess_hall_id, daily_menu_id, overall_rating, food_quality_rating, service_rating, cleanliness_rating, value_rating, comments, suggestions, is_anonymous, created_at) VALUES
(@UserId, @MessHallId, NULL, 4, 4, 4, 4, 4, 'Consistent quality. Happy with the overall experience.', 'Maybe add some dessert options', 0, DATEADD(day, -1, GETDATE()));

SELECT @UserId = id FROM users WHERE student_id = 'STU005';
INSERT INTO feedback (user_id, mess_hall_id, daily_menu_id, overall_rating, food_quality_rating, service_rating, cleanliness_rating, value_rating, comments, suggestions, is_anonymous, created_at) VALUES
(@UserId, @MessHallId, NULL, 5, 5, 5, 5, 4, 'Outstanding food quality and service. Very clean dining area.', 'Perfect as is!', 0, DATEADD(day, -2, GETDATE()));

-- =============================================
-- Create indexes for better performance
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_feedback_mess_hall_date' AND object_id = OBJECT_ID('feedback'))
CREATE INDEX IX_feedback_mess_hall_date ON feedback (mess_hall_id, created_at DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_feedback_user_date' AND object_id = OBJECT_ID('feedback'))
CREATE INDEX IX_feedback_user_date ON feedback (user_id, created_at DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_daily_menus_hall_date' AND object_id = OBJECT_ID('daily_menus'))
CREATE INDEX IX_daily_menus_hall_date ON daily_menus (mess_hall_id, menu_date, meal_type);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_users_student_id' AND object_id = OBJECT_ID('users'))
CREATE INDEX IX_users_student_id ON users (student_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_users_email' AND object_id = OBJECT_ID('users'))
CREATE INDEX IX_users_email ON users (email);

-- =============================================
-- Print completion message
-- =============================================
PRINT 'Database seeding completed successfully!';
PRINT 'Created:';
PRINT '- 5 Mess Halls';
PRINT '- 40+ Menu Items';
PRINT '- Sample Daily Menus';
PRINT '- 1 Admin User (admin@mess.edu / AdminPass123)';
PRINT '- 1 Mess Manager (manager@mess.edu / AdminPass123)';
PRINT '- 5 Sample Students (student1-5@college.edu / AdminPass123)';
PRINT '- 5 Sample Feedback entries';
PRINT '- Performance indexes';
PRINT '';
PRINT 'You can now start the application and login with any of the created users.';
PRINT 'Default password for all users: AdminPass123';
