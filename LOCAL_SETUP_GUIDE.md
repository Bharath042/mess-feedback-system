# Local Setup Guide - Alternative to Docker

Since Docker registry connectivity is having issues, here's how to run your Mess Feedback System locally without Docker.

## 🚀 Quick Local Setup

### Step 1: Prerequisites Check
```bash
# Check if Node.js is installed
node --version
npm --version

# If not installed, download from: https://nodejs.org/
```

### Step 2: Install Dependencies
```bash
# Install all project dependencies
npm install
```

### Step 3: Environment Setup
```bash
# Copy environment template
copy env.example .env

# Edit .env file with your actual database credentials
# Update these values:
# - DB_PASSWORD=your_actual_password
# - JWT_SECRET=your_jwt_secret_key
```

### Step 4: Start the Application
```bash
# Start the application
npm start

# Or for development with auto-restart
npm run dev
```

### Step 5: Access Your Application
- **Main Application**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Admin Login**: http://localhost:3000/admin-login
- **Student Login**: http://localhost:3000/student-login

## 🔧 Detailed Setup Instructions

### 1. Node.js Installation
If Node.js is not installed:
1. Go to [nodejs.org](https://nodejs.org/)
2. Download the LTS version (18.x or higher)
3. Install with default settings
4. Restart your terminal

### 2. Project Dependencies
```bash
# Install dependencies
npm install

# This will install all packages from package.json:
# - express (web framework)
# - mssql (Azure SQL Database driver)
# - bcryptjs (password hashing)
# - jsonwebtoken (JWT authentication)
# - And all other dependencies
```

### 3. Environment Configuration
Create a `.env` file with your actual values:

```env
# Application Configuration
NODE_ENV=development
PORT=3000

# Database Configuration (Azure SQL Database)
DB_SERVER=messfeedbacksqlserver.database.windows.net
DB_DATABASE=messfeedbacksqlserver
DB_USER=sqladmin
DB_PASSWORD=your_actual_password_here
DB_PORT=1433

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_here
```

### 4. Database Connection Test
```bash
# Test database connection
node -e "
const { connectDB } = require('./config/database');
connectDB().then(() => {
  console.log('✅ Database connection successful');
  process.exit(0);
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
"
```

### 5. Start the Application
```bash
# Production mode
npm start

# Development mode (with auto-restart)
npm run dev

# Or directly with node
node server-simple.js
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the process or change port in .env
PORT=3001
```

#### 2. Database Connection Issues
- Verify Azure SQL Database firewall rules
- Check database credentials in `.env`
- Ensure your IP is whitelisted in Azure

#### 3. Module Not Found Errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 4. Permission Issues
```bash
# On Windows, run as Administrator if needed
# On Linux/Mac, check file permissions
```

## 📊 Application Features

Your Mess Feedback System includes:

### Student Features:
- Student registration and login
- Submit feedback for meals
- Rate food quality, service, and cleanliness
- View feedback history
- Anonymous feedback option

### Admin Features:
- Admin login and dashboard
- View all feedback submissions
- Analytics and reports
- User management
- Mess hall management

### Security Features:
- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation
- CORS protection

## 🔍 Monitoring and Logs

### View Application Logs
```bash
# Application logs are written to:
# - Console output
# - ./logs/ directory (if configured)

# Check if logs directory exists
ls logs/

# View recent logs
tail -f logs/app.log
```

### Health Check
```bash
# Test application health
curl http://localhost:3000/health

# Or visit in browser:
# http://localhost:3000/health
```

## 🚀 Production Deployment

### Using PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
npm run pm2:start

# View PM2 status
npm run pm2:logs

# Stop PM2
npm run pm2:stop
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
DB_SERVER=your_production_db_server
DB_DATABASE=your_production_db
DB_USER=your_production_user
DB_PASSWORD=your_production_password
JWT_SECRET=your_production_jwt_secret
```

## 📝 Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 🔄 Docker Alternative (When Network Issues Resolve)

Once your Docker registry connectivity is fixed, you can use:

```bash
# Build and run with Docker
docker-compose up --build -d

# Or use the alternative Dockerfile
docker build -f Dockerfile.alternative -t mess-feedback-system .
docker run -p 3000:3000 mess-feedback-system
```

## 📞 Support

If you encounter issues:

1. **Check the logs** in the console output
2. **Verify database credentials** in `.env`
3. **Ensure Node.js version** is 16+ (check with `node --version`)
4. **Check port availability** (3000 should be free)
5. **Verify Azure SQL Database** firewall settings

## 🎉 Success!

Once running, you'll have:
- ✅ Full Mess Feedback System functionality
- ✅ Azure SQL Database integration
- ✅ Student and Admin dashboards
- ✅ Secure authentication
- ✅ Real-time feedback submission
- ✅ Analytics and reporting

The application works identically whether running in Docker or locally - all features are preserved!
