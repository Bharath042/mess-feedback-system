# 🐳 Docker Containerization Guide
## Mess Feedback System

This document provides complete instructions for running the Mess Feedback System in Docker containers.

## 📋 Prerequisites

- **Docker Desktop** installed and running
- **1.5GB+ free disk space**
- **Internet connection** for Azure SQL Database

## 🚀 Quick Start

### Option 1: Using Docker Compose (Recommended)
```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### Option 2: Using Docker Build Scripts
```bash
# Windows
.\docker-build.bat

# Linux/Mac
./docker-build.sh
```

### Option 3: Manual Docker Commands
```bash
# Build the image
docker build -t mess-feedback-system:latest .

# Run the container
docker run -d --name mess-feedback-system -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_SERVER=messfeedbacksqlserver.database.windows.net \
  -e DB_DATABASE=messfeedbacksqlserver \
  -e DB_USER=sqladmin \
  -e DB_PASSWORD=Kavi@1997 \
  -e JWT_SECRET=your-super-secret-jwt-key-for-docker-deployment-2024 \
  mess-feedback-system:latest
```

## 🌐 Access Points

Once the container is running:

- **Main Application**: http://localhost:3000
- **Student Portal**: http://localhost:3000/student-login
- **Admin Portal**: http://localhost:3000/admin-login
- **Health Check**: http://localhost:3000/health

## 🔑 Default Credentials

### Students
- Username: `student001`
- Password: `StudentPass123`

### Administrators
- Username: `admin`
- Password: `AdminPass123`

## 📁 Docker Files Created

### Core Files
- `Dockerfile` - Main application container definition
- `docker-compose.yml` - Multi-service orchestration
- `.dockerignore` - Files excluded from Docker build
- `.env.docker` - Environment variables for Docker

### Additional Files
- `nginx.conf` - Reverse proxy configuration (for production)
- `docker-build.sh` - Linux/Mac build script
- `docker-build.bat` - Windows build script
- `Dockerfile.test` - Test container for validation

## 🛠️ Container Specifications

### Base Image
- **Node.js 18 Alpine** (lightweight Linux distribution)
- **Size**: ~150MB (optimized for production)

### Security Features
- **Non-root user**: Runs as `nodejs` user (UID: 1001)
- **Minimal attack surface**: Alpine Linux base
- **Health checks**: Built-in application monitoring

### Networking
- **Port**: 3000 (mapped to host)
- **Protocol**: HTTP/HTTPS ready
- **Socket.IO**: Real-time communication enabled

## 📊 Container Management

### View Container Status
```bash
docker ps
docker-compose ps
```

### View Logs
```bash
# All logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# Specific service logs
docker logs mess-feedback-system
```

### Container Health
```bash
# Check health status
docker inspect mess-feedback-system --format='{{.State.Health.Status}}'

# Manual health check
curl http://localhost:3000/health
```

### Resource Usage
```bash
# View resource consumption
docker stats mess-feedback-system

# Container details
docker inspect mess-feedback-system
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Use different port
docker run -p 3001:3000 mess-feedback-system:latest
```

#### 2. Database Connection Issues
- Verify internet connection
- Check Azure SQL Database firewall settings
- Confirm credentials in environment variables

#### 3. Container Won't Start
```bash
# Check container logs
docker logs mess-feedback-system

# Run in interactive mode for debugging
docker run -it mess-feedback-system:latest sh
```

#### 4. Build Failures
```bash
# Clean Docker cache
docker system prune -f

# Rebuild without cache
docker build --no-cache -t mess-feedback-system:latest .
```

### Performance Optimization

#### 1. Multi-stage Builds
The Dockerfile uses optimized layering for faster builds and smaller images.

#### 2. .dockerignore Optimization
Excludes unnecessary files to reduce build context and image size.

#### 3. Production Dependencies Only
Uses `npm ci --only=production` for minimal dependency installation.

## 🚀 Production Deployment

### With Nginx Reverse Proxy
```bash
# Start with production profile
docker-compose --profile production up -d
```

### Environment Variables for Production
```env
NODE_ENV=production
JWT_SECRET=your-production-secret-key
DB_SERVER=your-production-db-server
# ... other production settings
```

### SSL/HTTPS Setup
1. Place SSL certificates in `./ssl/` directory
2. Update `nginx.conf` with SSL configuration
3. Restart containers

## 📈 Monitoring & Logging

### Health Monitoring
- Built-in health checks every 30 seconds
- Automatic container restart on failure
- Health endpoint: `/health`

### Log Management
- Logs stored in `./logs/` directory (mounted volume)
- Structured logging with timestamps
- Log rotation configured

### Performance Metrics
```bash
# Container resource usage
docker stats

# Application metrics (if implemented)
curl http://localhost:3000/metrics
```

## 🔄 Updates & Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Database Migrations
```bash
# Run database scripts (if needed)
docker exec mess-feedback-system node scripts/migrate.js
```

### Backup & Recovery
```bash
# Backup logs
docker cp mess-feedback-system:/app/logs ./backup/

# Export container
docker export mess-feedback-system > backup/container-backup.tar
```

## 🎯 Success Indicators

✅ **Container Built Successfully**
✅ **Application Accessible on Port 3000**
✅ **Database Connection Established**
✅ **Health Checks Passing**
✅ **Real-time Features Working**
✅ **Authentication System Functional**

## 📞 Support

If you encounter issues:
1. Check container logs: `docker-compose logs`
2. Verify Docker is running: `docker info`
3. Ensure sufficient disk space: `docker system df`
4. Review this documentation for troubleshooting steps

---

**🎉 Containerization Complete!**

Your Mess Feedback System is now fully containerized and ready for deployment in any Docker-compatible environment.
