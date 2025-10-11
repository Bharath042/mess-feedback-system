#!/bin/bash

# Docker Build Script for Mess Feedback System
# This script builds and manages Docker containers

set -e

echo "🐳 Building Mess Feedback System Docker Container..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running ✅"

# Build the Docker image
print_status "Building Docker image..."
docker build -t mess-feedback-system:latest .

if [ $? -eq 0 ]; then
    print_success "Docker image built successfully!"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    mkdir logs
    print_status "Created logs directory"
fi

# Show available commands
echo ""
print_status "Available commands:"
echo "  🚀 Start application:     docker-compose up -d"
echo "  📊 View logs:            docker-compose logs -f"
echo "  🛑 Stop application:     docker-compose down"
echo "  🔄 Restart application:  docker-compose restart"
echo "  🧹 Clean up:            docker-compose down -v --rmi all"
echo ""

print_success "Build complete! You can now run 'docker-compose up -d' to start the application."
