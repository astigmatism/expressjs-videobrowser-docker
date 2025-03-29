#!/bin/bash

# Stop and remove containers
echo "🔻 Stopping and removing Docker containers..."
docker-compose down

# Pull latest changes from Git
echo "📥 Pulling latest changes from Git..."
git pull

# Build Docker images
echo "🔧 Building Docker images..."
docker-compose build

# Start containers in detached mode
echo "🚀 Starting Docker containers..."
docker-compose up -d

echo "✅ Deployment complete."