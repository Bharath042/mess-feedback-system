# 🚀 QUICK REFERENCE GUIDE - MESS FEEDBACK SYSTEM

## ⚡ INSTANT START

```bash
cd "d:\Cloud Computing2"
npm install
npm start
```

**Access URLs:**
- Student: http://localhost:3000/student-login
- Admin: http://localhost:3000/admin-login

---

## 🔑 CRITICAL CREDENTIALS

### Database (Azure SQL)
```
Server: messfeedbacksqlserver.database.windows.net
Database: messfeedbacksqlserver
Username: sqladmin
Password: Kavi@1997
Port: 1433
```

### Application Login
| User | Password | Role |
|------|----------|------|
| admin | AdminPass123 | Admin |
| student001 | StudentPass123 | Student |
| student002 | StudentPass123 | Student |

---

## 📁 KEY FILES

| File | Purpose |
|------|---------|
| `server-simple.js` | **MAIN SERVER** (3665 lines) |
| `config/database-simple.js` | Database connection config |
| `.env.production` | Environment variables |
| `package.json` | Dependencies & scripts |

---

## 🗄️ CORE DATABASE TABLES

1. **users** - Authentication (id, username, password, role)
2. **Feedback** - Basic feedback (StudentName, Roll, Meal, Rating)
3. **feedback_submissions** - Detailed feedback (user_id, ratings, comments)
4. **complaints** - Complaint system (user_id, title, status, severity)
5. **notifications** - User notifications (user_id, title, message)
6. **user_profiles** - Extended user info (full_name, credit_points)
7. **user_points** - Points tracking (user_id, points, total_earned)
8. **mess_halls** - Mess hall management
9. **menu_items** - Food items database
10. **daily_menus** - Daily menu planning
11. **meal_types** - Meal type definitions

---

## 🔌 ESSENTIAL API ENDPOINTS

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register

### Feedback
- `POST /api/feedback/submit` - Submit feedback
- `GET /api/feedback/user/:userId` - Get user feedback

### Complaints
- `POST /api/complaints/submit` - Submit complaint
- `GET /api/complaints/user/:userId` - Get user complaints

### Admin
- `GET /api/admin/dashboard-stats` - Dashboard stats
- `GET /api/admin/users` - All users
- `POST /api/admin/notifications/send` - Send notifications

### Student Dashboard
- `GET /api/dashboard/stats?userId={id}` - Student stats
- `GET /api/notifications/user/:userId` - User notifications

### Health
- `GET /health` - Server health check

---

## 📦 NPM COMMANDS

```bash
npm start              # Start production server
npm run dev            # Start with nodemon (auto-reload)
npm test               # Run tests
npm run pm2:start      # Start with PM2
npm run pm2:logs       # View PM2 logs
npm run pm2:stop       # Stop PM2
```

---

## 🛠️ DATABASE SETUP SCRIPTS

Run in this order:

1. `scripts/setup-database.sql` - Core tables
2. `scripts/create-additional-tables.sql` - Extended tables
3. `scripts/seed-data.sql` - Sample data (optional)
4. `notifications_table.sql` - Notifications table

---

## 🏗️ PROJECT STRUCTURE

```
d:\Cloud Computing2\
├── server-simple.js          ⭐ MAIN SERVER
├── config/
│   └── database-simple.js    ⭐ DB CONFIG
├── routes/                   API routes
├── views/                    HTML pages
├── scripts/                  SQL scripts
├── middleware/               Auth & error handling
├── package.json              ⭐ DEPENDENCIES
└── .env.production           ⭐ CONFIG
```

---

## 🎯 FEATURES SUMMARY

### Student Portal
✅ Login/Register  
✅ Submit feedback (ratings 1-5)  
✅ File complaints  
✅ View feedback history  
✅ Earn points (10 per feedback)  
✅ Receive notifications  
✅ Anonymous feedback option  

### Admin Portal
✅ Dashboard with statistics  
✅ User management  
✅ View all feedback  
✅ Manage complaints  
✅ Send notifications  
✅ Generate reports  
✅ Mess hall management  

---

## 🔐 AUTHENTICATION FLOW

1. User submits username/password
2. Server validates against `users` table
3. Password checked with bcrypt
4. Token generated: `base64(id:username:role)`
5. Token sent to client
6. Client includes token in `Authorization: Bearer {token}` header

---

## 💾 DATABASE CONNECTION CODE

```javascript
// config/database-simple.js
const sql = require('mssql');

const config = {
    server: 'messfeedbacksqlserver.database.windows.net',
    database: 'messfeedbacksqlserver',
    user: 'sqladmin',
    password: 'Kavi@1997',
    port: 1433,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};
```

---

## 🐛 QUICK TROUBLESHOOTING

### Port Already in Use
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Failed
- Check internet connection
- Verify Azure SQL firewall allows your IP
- Test with Azure Data Studio

### Login Not Working
- Verify users table exists
- Check password: `AdminPass123` or `StudentPass123`
- Clear browser cache/cookies

### Module Not Found
```bash
rmdir /s node_modules
npm install
```

---

## 📊 USEFUL SQL QUERIES

### Check Users
```sql
SELECT * FROM users;
```

### Count Feedback
```sql
SELECT COUNT(*) FROM feedback_submissions;
```

### Recent Complaints
```sql
SELECT TOP 10 * FROM complaints ORDER BY created_at DESC;
```

### User Stats
```sql
SELECT 
    u.username,
    COUNT(f.id) as feedback_count
FROM users u
LEFT JOIN feedback_submissions f ON u.id = f.user_id
GROUP BY u.username;
```

---

## 🔄 REAL-TIME FEATURES

The app uses **Socket.IO** for:
- Live notification updates
- Real-time dashboard stats
- Instant feedback updates

Connection: `ws://localhost:3000`

---

## 📝 FEEDBACK SUBMISSION EXAMPLE

```javascript
// POST /api/feedback/submit
{
  "userId": 2,
  "mealType": "lunch",
  "messHall": "Main Mess",
  "serviceRating": 4,
  "cleanlinessRating": 5,
  "ambienceRating": 4,
  "foodQualityRating": 5,
  "comments": "Great food!",
  "suggestions": "Add more variety",
  "isAnonymous": false
}
```

---

## 🎨 FRONTEND PAGES

| Page | File | Size |
|------|------|------|
| Student Login | `views/student-login.html` | 20KB |
| Student Dashboard | `views/student-dashboard.html` | 100KB |
| Admin Login | `views/admin-login.html` | 30KB |
| Admin Dashboard | `views/admin-dashboard.html` | 474KB |

---

## 🔢 POINTS SYSTEM

- **Feedback Submission:** +10 points
- **Complaint Resolution:** +5 points
- **Survey Completion:** +15 points

Points tracked in `user_points` table.

---

## 🌐 DEPLOYMENT OPTIONS

### Local Development
```bash
npm run dev
```

### Production (PM2)
```bash
npm install -g pm2
npm run pm2:start
```

### Azure App Service
- Uses `azure-pipelines.yml`
- Auto-deploys on push
- Environment variables in Azure Portal

---

## 📞 HEALTH CHECK

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-10T21:55:28Z",
  "database": "connected"
}
```

---

## ⚠️ IMPORTANT NOTES

1. **Database is Cloud-Hosted** - No local setup needed
2. **Credentials in Code** - Already configured
3. **Port 3000** - Default application port
4. **Simple Auth** - Base64 tokens (dev mode)
5. **Auto-Create Tables** - Some tables created on first run

---

## 📚 FULL DOCUMENTATION

For complete details, see:
- `PROJECT_DOCUMENTATION.md` - Full technical docs
- `README.md` - Project overview
- `START_HERE.md` - Setup guide
- `ROUTING_FIXES.md` - Routing information

---

## ✅ PARALLEL WORK CHECKLIST

- [ ] Install Node.js v16+
- [ ] Clone project
- [ ] Run `npm install`
- [ ] Start server: `npm start`
- [ ] Test student login
- [ ] Test admin login
- [ ] Submit test feedback
- [ ] Check database tables
- [ ] Review API endpoints
- [ ] Read full documentation

---

**READY TO CODE! 🚀**

*Last Updated: October 10, 2025*
