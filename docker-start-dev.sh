#!/bin/bash

echo "🚀 Starting Smart Farming Backend - DEVELOPMENT MODE (Hot Reload)"
echo ""
echo "Services that will start:"
echo "  - TimescaleDB (PostgreSQL) on port 5432"
echo "  - Backend API with Hot Reload on port 3001"
echo "  - pgAdmin on port 5050"
echo ""

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Show logs
echo ""
echo "✅ Services started! Showing logs..."
echo "   Hot reload is ENABLED - code changes will auto-restart"
echo "   Press Ctrl+C to stop following logs (services will keep running)"
echo ""
docker-compose -f docker-compose.dev.yml logs -f backend
