@echo off
REM Docker Build Script for Mess Feedback System (Windows)
REM This script builds and manages Docker containers on Windows

echo 🐳 Building Mess Feedback System Docker Container...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)

echo ✅ Docker is running

REM Build the Docker image
echo 🔨 Building Docker image...
docker build -t mess-feedback-system:latest .

if %errorlevel% neq 0 (
    echo ❌ Failed to build Docker image
    pause
    exit /b 1
)

echo ✅ Docker image built successfully!

REM Create logs directory if it doesn't exist
if not exist "logs" (
    mkdir logs
    echo 📁 Created logs directory
)

echo.
echo 📋 Available commands:
echo   🚀 Start application:     docker-compose up -d
echo   📊 View logs:            docker-compose logs -f
echo   🛑 Stop application:     docker-compose down
echo   🔄 Restart application:  docker-compose restart
echo   🧹 Clean up:            docker-compose down -v --rmi all
echo.

echo ✅ Build complete! You can now run 'docker-compose up -d' to start the application.
pause
