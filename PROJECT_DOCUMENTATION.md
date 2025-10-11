# 🎓 MESS FEEDBACK SYSTEM - COMPLETE PROJECT DOCUMENTATION

**Last Updated:** October 10, 2025  
**Version:** 1.0.0  
**Status:** Production Ready

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Database Configuration](#database-configuration)
3. [Database Schema](#database-schema)
4. [Application Architecture](#application-architecture)
5. [API Endpoints](#api-endpoints)
6. [Authentication System](#authentication-system)
7. [Setup Instructions](#setup-instructions)
8. [Default Credentials](#default-credentials)
9. [File Structure](#file-structure)
10. [Features Overview](#features-overview)

---

## 🎯 PROJECT OVERVIEW

### What is this project?
A comprehensive web application for students to rate and provide feedback on mess (cafeteria) food quality. Built with Node.js, Express, and Azure SQL Database.

### Technology Stack
- **Backend:** Node.js v16+ with Express.js
- **Database:** Azure SQL Database (Cloud-hosted)
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Authentication:** JWT (JSON Web Tokens) + bcrypt
- **Real-time:** Socket.IO for live updates
- **Security:** Helmet.js, CORS, Rate Limiting
- **Process Management:** PM2

### Key Features
- ✅ Student & Admin portals
- ✅ Feedback submission with ratings
- ✅ Complaint management system
- ✅ Real-time notifications
- ✅ Credit points reward system
- ✅ Analytics dashboard
- ✅ Anonymous feedback option

---

## 🔐 DATABASE CONFIGURATION

### Azure SQL Database Details

**IMPORTANT: These are production credentials - keep them secure!**

```
Server: messfeedbacksqlserver.database.windows.net
Database Name: messfeedbacksqlserver
Port: 1433
Username: sqladmin
Password: Kavi@1997
```

### Connection String Format
```
Server=messfeedbacksqlserver.database.windows.net,1433;
Database=messfeedbacksqlserver;
User Id=sqladmin;
Password=Kavi@1997;
Encrypt=true;
TrustServerCertificate=false;
```

### Configuration Files
- **Primary Config:** `config/database-simple.js`
- **Environment File:** `.env.production`
- **Full Config:** `config/database.js` (advanced features)

---

## 🗄️ DATABASE SCHEMA

### Core Tables

#### 1. **users** Table
Primary authentication and user management table.

```sql
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,          -- bcrypt hashed
    role VARCHAR(50) DEFAULT 'student',      -- 'student' or 'admin'
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    is_active BIT DEFAULT 1,
    last_login DATETIME2,
    login_attempts INT DEFAULT 0,
    locked_until DATETIME2
);
```

**Default Users:**
- Admin: `admin` / `AdminPass123`
- Student: `student001` / `StudentPass123`
- Student: `student002` / `StudentPass123`

#### 2. **Feedback** Table
Main feedback storage table.

```sql
CREATE TABLE Feedback (
    id INT IDENTITY(1,1) PRIMARY KEY,
    StudentName VARCHAR(255) NOT NULL,
    Roll VARCHAR(50) NOT NULL,
    Meal VARCHAR(100) NOT NULL,              -- 'breakfast', 'lunch', 'dinner'
    Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Emotion VARCHAR(50),                     -- 'happy', 'neutral', 'sad', etc.
    Comment NVARCHAR(1000),
    created_at DATETIME2 DEFAULT GETDATE(),
    mess_hall VARCHAR(100),
    meal_time VARCHAR(20),
    food_quality_rating INT CHECK (food_quality_rating BETWEEN 1 AND 5),
    service_rating INT CHECK (service_rating BETWEEN 1 AND 5),
    cleanliness_rating INT CHECK (cleanliness_rating BETWEEN 1 AND 5),
    is_anonymous BIT DEFAULT 0
);
```

#### 3. **feedback_submissions** Table
Enhanced feedback with detailed ratings.

```sql
CREATE TABLE feedback_submissions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    submission_date DATE DEFAULT CAST(GETDATE() AS DATE),
    meal_type VARCHAR(50) NOT NULL,
    mess_hall VARCHAR(100),
    service_rating INT CHECK (service_rating BETWEEN 1 AND 5),
    cleanliness_rating INT CHECK (cleanliness_rating BETWEEN 1 AND 5),
    ambience_rating INT CHECK (ambience_rating BETWEEN 1 AND 5),
    food_quality_rating INT CHECK (food_quality_rating BETWEEN 1 AND 5),
    comments NVARCHAR(1000),
    suggestions NVARCHAR(1000),
    is_anonymous BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 4. **complaints** Table
Student complaint management system.

```sql
CREATE TABLE complaints (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    complaint_type VARCHAR(50) NOT NULL,     -- 'ambience', 'service', 'food_quality', etc.
    title VARCHAR(255) NOT NULL,
    description NVARCHAR(2000) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',   -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) DEFAULT 'open',       -- 'open', 'in_progress', 'resolved', 'closed'
    mess_hall VARCHAR(100),
    meal_time VARCHAR(20),
    incident_date DATETIME2,
    priority_level INT DEFAULT 3,
    assigned_to INT,
    resolution_notes NVARCHAR(1000),
    resolved_at DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 5. **notifications** Table
System notifications for users.

```sql
CREATE TABLE notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    sender_id INT NULL,
    sender_name VARCHAR(255) NULL,
    title VARCHAR(500) NOT NULL,
    message NVARCHAR(2000) NOT NULL,
    type VARCHAR(50) DEFAULT 'info',         -- 'info', 'warning', 'success', 'error'
    priority VARCHAR(50) DEFAULT 'normal',   -- 'normal', 'high', 'urgent'
    is_read BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    expires_at DATETIME2 NULL,               -- Auto-expire after 7 days
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 6. **user_profiles** Table
Extended user information.

```sql
CREATE TABLE user_profiles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    department VARCHAR(100),
    year_of_study INT,
    mess_preference VARCHAR(100),
    dietary_restrictions NVARCHAR(500),
    credit_points INT DEFAULT 0,             -- Reward points
    total_feedback_given INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 7. **user_points** Table
Credit points tracking system.

```sql
CREATE TABLE user_points (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    points INT DEFAULT 0,
    total_earned INT DEFAULT 0,
    total_spent INT DEFAULT 0,
    last_updated DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 8. **mess_halls** Table
Mess hall management.

```sql
CREATE TABLE mess_halls (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    capacity INT,
    manager_id INT,
    operating_hours VARCHAR(100),
    contact_number VARCHAR(20),
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (manager_id) REFERENCES users(id)
);
```

#### 9. **menu_items** Table
Food items database.

```sql
CREATE TABLE menu_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),                    -- 'breakfast', 'lunch', 'dinner', 'snacks'
    description NVARCHAR(500),
    is_vegetarian BIT DEFAULT 0,
    is_vegan BIT DEFAULT 0,
    spice_level VARCHAR(20),
    calories_per_serving INT,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);
```

#### 10. **daily_menus** Table
Daily menu planning.

```sql
CREATE TABLE daily_menus (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mess_hall_id INT NOT NULL,
    menu_date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (mess_hall_id) REFERENCES mess_halls(id)
);
```

#### 11. **meal_types** Table
Meal type definitions.

```sql
CREATE TABLE meal_types (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    time_range VARCHAR(50),
    is_active BIT DEFAULT 1
);
```

### Database Setup Scripts

**Location:** `scripts/` folder

1. **setup-database.sql** - Creates core tables (users, Feedback)
2. **create-additional-tables.sql** - Creates extended tables
3. **seed-data.sql** - Inserts sample data
4. **notifications_table.sql** - Creates notifications table
5. **reset-users.sql** - Resets user passwords

---

## 🏗️ APPLICATION ARCHITECTURE

### Main Server File
**File:** `server-simple.js` (3665 lines)

### Key Components

#### 1. Express Server Setup
```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
```

#### 2. Middleware Stack
- `cors()` - Cross-Origin Resource Sharing
- `express.json()` - JSON body parser
- `express.urlencoded()` - URL-encoded body parser
- `express.static()` - Static file serving
- Socket.IO - Real-time communication

#### 3. Database Connection
```javascript
const { connectDB, getPool, sql } = require('./config/database-simple');
```

### Directory Structure

```
d:\Cloud Computing2\
├── config/
│   ├── database-simple.js      # Simple DB config (ACTIVE)
│   ├── database.js             # Full DB config with pooling
│   ├── logging.js              # Winston logger setup
│   └── monitoring.js           # Health monitoring
│
├── routes/
│   ├── auth.js                 # Authentication routes
│   ├── auth-enhanced.js        # Enhanced auth with lockout
│   ├── feedback.js             # Feedback endpoints
│   ├── feedback-enhanced.js    # Enhanced feedback features
│   ├── feedback-complete.js    # Complete feedback system
│   ├── complaints.js           # Complaint management
│   ├── admin.js                # Admin dashboard routes
│   └── powerbi.js              # Power BI integration
│
├── middleware/
│   ├── auth.js                 # JWT authentication middleware
│   └── errorHandler.js         # Error handling middleware
│
├── views/
│   ├── student-login.html      # Student login page
│   ├── student-register.html   # Student registration
│   ├── student-dashboard.html  # Student dashboard (100KB+)
│   ├── admin-login.html        # Admin login page
│   ├── admin-register.html     # Admin registration
│   └── admin-dashboard.html    # Admin dashboard (474KB+)
│
├── scripts/
│   ├── setup-database.sql      # Initial DB setup
│   ├── create-additional-tables.sql
│   ├── seed-data.sql           # Sample data
│   └── reset-users.sql         # Reset passwords
│
├── public/                     # Static assets (CSS, JS, images)
├── tests/                      # Test files
├── docs/                       # Documentation
│
├── server-simple.js            # MAIN SERVER FILE (ACTIVE)
├── server.js                   # Alternative server
├── package.json                # Dependencies
├── .env.production             # Production config
├── ecosystem.config.js         # PM2 configuration
└── azure-pipelines.yml         # CI/CD pipeline

```

---

## 🔌 API ENDPOINTS

### Authentication Endpoints

#### POST `/api/auth/login`
Student/Admin login endpoint.

**Request Body:**
```json
{
  "username": "student001",
  "password": "StudentPass123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "base64_encoded_token",
  "user": {
    "id": 2,
    "username": "student001",
    "role": "student"
  }
}
```

#### POST `/api/auth/register`
New user registration.

**Request Body:**
```json
{
  "username": "newstudent",
  "password": "SecurePass123",
  "role": "student"
}
```

### Feedback Endpoints

#### POST `/api/feedback/submit`
Submit new feedback.

**Request Body:**
```json
{
  "userId": 2,
  "mealType": "lunch",
  "messHall": "Main Mess",
  "serviceRating": 4,
  "cleanlinessRating": 5,
  "ambienceRating": 4,
  "foodQualityRating": 5,
  "comments": "Excellent food today!",
  "suggestions": "Add more variety",
  "isAnonymous": false
}
```

#### GET `/api/feedback/user/:userId`
Get user's feedback history.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "meal_type": "lunch",
      "service_rating": 4,
      "created_at": "2025-10-10T10:30:00"
    }
  ]
}
```

### Complaint Endpoints

#### POST `/api/complaints/submit`
Submit a complaint.

**Request Body:**
```json
{
  "userId": 2,
  "complaintType": "food_quality",
  "title": "Cold food served",
  "description": "The food was cold when served",
  "severity": "medium",
  "messHall": "Main Mess",
  "mealTime": "lunch"
}
```

#### GET `/api/complaints/user/:userId`
Get user's complaints.

### Admin Endpoints

#### GET `/api/admin/dashboard-stats`
Get dashboard statistics.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "totalUsers": 15,
  "totalFeedback": 45,
  "totalComplaints": 8,
  "avgRating": 4.2,
  "activeToday": 5
}
```

#### GET `/api/admin/users`
Get all users (admin only).

#### POST `/api/admin/notifications/send`
Send notifications to users.

**Request Body:**
```json
{
  "title": "Important Notice",
  "message": "Mess will be closed tomorrow",
  "type": "warning",
  "priority": "high",
  "recipients": "all"
}
```

### Student Dashboard Endpoints

#### GET `/api/dashboard/stats?userId={id}`
Get student statistics.

**Response:**
```json
{
  "success": true,
  "totalFeedback": 12,
  "totalComplaints": 2,
  "totalPoints": 120
}
```

#### GET `/api/notifications/user/:userId`
Get user notifications.

### Health Check

#### GET `/health`
Server health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-10T21:55:28Z",
  "database": "connected"
}
```

---

## 🔐 AUTHENTICATION SYSTEM

### Token-Based Authentication

The system uses a simple Base64 token encoding for development:

```javascript
// Token Format: base64(id:username:role)
const token = Buffer.from(`${id}:${username}:${role}`).toString('base64');
```

### Password Hashing

Passwords are hashed using bcrypt with 12 salt rounds:

```javascript
const hashedPassword = await bcrypt.hash(password, 12);
```

**Default Password Hash:** `$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq/VjVe`  
**Plaintext:** `AdminPass123` or `StudentPass123`

### Role-Based Access Control

Two main roles:
- **student** - Can submit feedback, view own data
- **admin** - Full system access, user management

### Account Lockout Protection

After 5 failed login attempts:
- Account locked for 15 minutes
- `locked_until` timestamp set in database

---

## 🚀 SETUP INSTRUCTIONS

### Prerequisites
1. Node.js v16 or higher
2. npm v8 or higher
3. Azure SQL Database access (already configured)

### Step-by-Step Setup

#### 1. Install Dependencies
```bash
cd "d:\Cloud Computing2"
npm install
```

#### 2. Database Setup
Run these SQL scripts in order:

```sql
-- 1. Create core tables
-- Run: scripts/setup-database.sql

-- 2. Create additional tables
-- Run: scripts/create-additional-tables.sql

-- 3. Insert sample data (optional)
-- Run: scripts/seed-data.sql

-- 4. Create notifications table
-- Run: notifications_table.sql
```

#### 3. Environment Configuration (Optional)
```bash
# Copy production config
copy .env.production .env

# Edit if needed (default values work)
```

#### 4. Start the Application

**Option A: Development Mode**
```bash
npm run dev
```

**Option B: Production Mode**
```bash
npm start
```

**Option C: PM2 Process Manager**
```bash
npm install -g pm2
npm run pm2:start
npm run pm2:logs
```

#### 5. Access the Application

**Student Portal:**
- URL: http://localhost:3000/student-login
- Username: `student001`
- Password: `StudentPass123`

**Admin Portal:**
- URL: http://localhost:3000/admin-login
- Username: `admin`
- Password: `AdminPass123`

---

## 🔑 DEFAULT CREDENTIALS

### Admin Accounts
| Username | Password | Role | Description |
|----------|----------|------|-------------|
| admin | AdminPass123 | admin | System administrator |

### Student Accounts
| Username | Password | Role | Description |
|----------|----------|------|-------------|
| student001 | StudentPass123 | student | Test student 1 |
| student002 | StudentPass123 | student | Test student 2 |

### Database Credentials
| Field | Value |
|-------|-------|
| Server | messfeedbacksqlserver.database.windows.net |
| Database | messfeedbacksqlserver |
| Username | sqladmin |
| Password | Kavi@1997 |
| Port | 1433 |

---

## ✨ FEATURES OVERVIEW

### Student Features
1. **Secure Login** - JWT authentication with account lockout
2. **Feedback Submission** - Multi-criteria ratings (1-5 stars)
3. **Complaint System** - Report issues with severity levels
4. **Points System** - Earn 10 points per feedback
5. **Feedback History** - View past submissions
6. **Anonymous Option** - Submit feedback anonymously
7. **Real-time Notifications** - Receive updates from admin
8. **Dashboard** - Personal statistics and insights

### Admin Features
1. **Dashboard** - Real-time system statistics
2. **User Management** - View and manage all users
3. **Feedback Analytics** - View all feedback with filters
4. **Complaint Management** - Track and resolve complaints
5. **Notification System** - Send targeted notifications
6. **Reports** - Generate detailed reports
7. **Mess Hall Management** - Manage mess halls and menus
8. **Power BI Integration** - Advanced analytics

### Technical Features
1. **Real-time Updates** - Socket.IO integration
2. **Rate Limiting** - Prevent abuse
3. **Security Headers** - Helmet.js protection
4. **Error Handling** - Comprehensive error management
5. **Logging** - Winston logger for debugging
6. **Health Monitoring** - System health checks
7. **Database Pooling** - Efficient connection management
8. **CORS Support** - Cross-origin requests

---

## 📦 NPM PACKAGES

### Production Dependencies
```json
{
  "express": "^4.18.2",
  "express-rate-limit": "^6.7.0",
  "helmet": "^6.1.5",
  "cors": "^2.8.5",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.0",
  "mssql": "^9.1.1",
  "dotenv": "^16.0.3",
  "express-validator": "^6.15.0",
  "compression": "^1.7.4",
  "morgan": "^1.10.0",
  "cookie-parser": "^1.4.6",
  "socket.io": "^4.7.2",
  "node-cron": "^3.0.2",
  "winston": "^3.10.0",
  "pm2": "^5.3.0",
  "axios": "^1.4.0"
}
```

### Development Dependencies
```json
{
  "nodemon": "^2.0.22",
  "jest": "^29.5.0",
  "supertest": "^6.3.3",
  "eslint": "^8.42.0"
}
```

---

## 🐛 TROUBLESHOOTING

### Common Issues

#### 1. Port 3000 Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
set PORT=3001 && npm start
```

#### 2. Database Connection Failed
- Check internet connection
- Verify Azure SQL firewall rules
- Confirm credentials in `config/database-simple.js`
- Test connection with Azure Data Studio

#### 3. Module Not Found
```bash
# Reinstall dependencies
rmdir /s node_modules
npm install
```

#### 4. Login Not Working
- Check if users table exists
- Verify password hash matches
- Check browser console for errors
- Verify token generation

---

## 📊 DATABASE QUERIES

### Useful Queries

#### Check All Users
```sql
SELECT id, username, role, is_active, created_at 
FROM users 
ORDER BY id;
```

#### Count Feedback
```sql
SELECT COUNT(*) as total_feedback 
FROM feedback_submissions;
```

#### Get Recent Feedback
```sql
SELECT TOP 10 * 
FROM feedback_submissions 
ORDER BY created_at DESC;
```

#### Check Complaints
```sql
SELECT id, title, status, severity, created_at 
FROM complaints 
ORDER BY created_at DESC;
```

#### User Statistics
```sql
SELECT 
    u.username,
    COUNT(f.id) as feedback_count,
    AVG(CAST(f.service_rating as FLOAT)) as avg_rating
FROM users u
LEFT JOIN feedback_submissions f ON u.id = f.user_id
GROUP BY u.username;
```

---

## 🔄 DEPLOYMENT

### Local Development
```bash
npm run dev
```

### Production Deployment
```bash
# Using PM2
npm run pm2:start

# Or direct
npm start
```

### Azure Deployment
The project includes `azure-pipelines.yml` for CI/CD:
- Automated testing
- Build process
- Deployment to Azure App Service

---

## 📝 NOTES FOR YOUR FRIEND

### Important Points

1. **Database is Cloud-Hosted** - No local SQL Server needed
2. **Credentials are in Code** - Already configured in `database-simple.js`
3. **Main Server File** - `server-simple.js` (not server.js)
4. **Port** - Application runs on port 3000
5. **No JWT Secret Needed** - Uses simple Base64 encoding for development

### Quick Start Commands
```bash
# Install
npm install

# Run
npm start

# Access
# Student: http://localhost:3000/student-login
# Admin: http://localhost:3000/admin-login
```

### Testing Credentials
- **Student:** student001 / StudentPass123
- **Admin:** admin / AdminPass123

### Database Access
Use Azure Data Studio or SSMS:
- Server: messfeedbacksqlserver.database.windows.net
- Database: messfeedbacksqlserver
- Login: sqladmin / Kavi@1997

---

## 📞 SUPPORT

### Log Files
- Location: `logs/` directory
- Format: `combined-YYYY-MM-DD.log`

### Health Check
- URL: http://localhost:3000/health
- Shows database connection status

### Debug Mode
```bash
# Set environment variable
set DEBUG=* && npm start
```

---

## ✅ CHECKLIST FOR PARALLEL WORK

- [ ] Clone/Copy project to your machine
- [ ] Run `npm install`
- [ ] Test database connection (automatic on start)
- [ ] Access student portal (http://localhost:3000/student-login)
- [ ] Access admin portal (http://localhost:3000/admin-login)
- [ ] Submit test feedback
- [ ] Check admin dashboard
- [ ] Review database tables in Azure Data Studio
- [ ] Read API endpoints documentation
- [ ] Test notification system
- [ ] Review code structure

---

**END OF DOCUMENTATION**

*For questions or issues, refer to README.md or START_HERE.md*
