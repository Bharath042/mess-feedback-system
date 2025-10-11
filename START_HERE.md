# 🚀 How to Run the Mess Feedback System

## Prerequisites

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **Azure SQL Database** - Already configured with your credentials
3. **Git** (optional) - For version control

## 📋 Step-by-Step Setup

### Step 1: Install Dependencies
```bash
# Navigate to your project directory
cd "c:\7Th sem\Cloud Computing"

# Install all required packages
npm install
```

### Step 2: Set up Database
1. Open **Azure Data Studio** or **SQL Server Management Studio**
2. Connect to your Azure SQL Database:
   - Server: `messfeedbacksqlserver.database.windows.net`
   - Database: `messfeedbacksqlserver`
   - Username: `sqladmin`
   - Password: `Kavi@1997`
3. Run the setup script:
   ```sql
   -- Copy and paste the contents of scripts/setup-database.sql
   -- This will create tables and default users
   ```

### Step 3: Configure Environment (Optional)
```bash
# Copy the production environment file
copy .env.production .env

# Edit .env file if needed (optional - defaults are already set)
```

### Step 4: Start the Application

#### Option A: Development Mode (Recommended for testing)
```bash
npm run dev
```

#### Option B: Production Mode with PM2
```bash
# Install PM2 globally (one-time setup)
npm install -g pm2

# Start with PM2
npm run pm2:start

# View logs
npm run pm2:logs

# Stop the application
npm run pm2:stop
```

#### Option C: Simple Start
```bash
npm start
```

## 🌐 Access the Application

Once started, open your web browser and navigate to:

### 🎓 Student Portal
- **URL**: http://localhost:3000/student-login
- **Default Login**: 
  - Username: `student001`
  - Password: `StudentPass123`

### 👨‍💼 Admin Portal  
- **URL**: http://localhost:3000/admin-login
- **Default Login**:
  - Username: `admin`
  - Password: `AdminPass123`

### 🔍 System Health
- **Health Check**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000/api/docs (if implemented)

## 📊 Features Available

### For Students:
- ✅ Secure login with account lockout protection
- ✅ Submit feedback with ratings (1-5 stars)
- ✅ Multiple rating categories (food quality, service, cleanliness)
- ✅ Anonymous feedback option
- ✅ View personal feedback history
- ✅ Real-time notifications

### For Admins:
- ✅ Secure admin portal with enhanced security
- ✅ Real-time feedback monitoring
- ✅ Power BI dashboard integration
- ✅ System health monitoring
- ✅ User management
- ✅ Comprehensive analytics and reports
- ✅ Data export capabilities

## 🛠️ Troubleshooting

### Common Issues:

1. **Port 3000 already in use**
   ```bash
   # Use a different port
   set PORT=3001 && npm start
   ```

2. **Database connection error**
   - Verify your internet connection
   - Check if Azure SQL Database is accessible
   - Confirm credentials in database.js

3. **Module not found errors**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules
   npm install
   ```

4. **PM2 not found**
   ```bash
   # Install PM2 globally
   npm install -g pm2
   ```

## 📝 Default Test Data

The system comes with pre-configured test accounts:

| Role | Username | Password | Purpose |
|------|----------|----------|---------|
| Admin | admin | AdminPass123 | Full system access |
| Student | student001 | StudentPass123 | Testing feedback submission |
| Student | student002 | StudentPass123 | Testing multiple users |

## 🔧 Advanced Configuration

### Environment Variables (.env file):
```env
# Database (already configured)
DB_SERVER=messfeedbacksqlserver.database.windows.net
DB_DATABASE=messfeedbacksqlserver
DB_USER=sqladmin
DB_PASSWORD=Kavi@1997

# Server
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-secret-key
```

### Power BI Integration:
To enable Power BI dashboard, configure these in your .env:
```env
POWERBI_CLIENT_ID=your-client-id
POWERBI_CLIENT_SECRET=your-client-secret
POWERBI_TENANT_ID=your-tenant-id
```

## 📊 Monitoring & Logs

### View Real-time Logs:
```bash
# PM2 logs
npm run pm2:logs

# Or check log files directly
tail -f logs/combined-2024-01-08.log
```

### System Monitoring:
- Visit: http://localhost:3000/api/monitoring/health
- Check system metrics and performance

## 🚀 Production Deployment

For production deployment on Azure:
1. Use the provided `azure-pipelines.yml`
2. Configure Azure App Service
3. Set up environment variables in Azure
4. Enable Application Insights for monitoring

## 📞 Support

If you encounter any issues:
1. Check the logs in the `logs/` directory
2. Verify database connectivity
3. Ensure all dependencies are installed
4. Check if the port is available

## 🎉 Success!

If everything is working correctly, you should see:
- ✅ Server running on http://localhost:3000
- ✅ Database connected successfully
- ✅ Real-time features active
- ✅ Both login portals accessible

**Happy Testing! 🎊**
