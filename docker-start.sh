#!/bin/bash

echo "🚀 Starting Smart Farming Backend - PRODUCTION MODE"
echo ""
echo "Services that will start:"
echo "  - TimescaleDB (PostgreSQL) on port 5432"
echo "  - Backend API on port 3001"
echo "  - pgAdmin on port 5050"
echo ""

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Show logs
echo ""
echo "✅ Services started! Showing logs..."
echo "   Press Ctrl+C to stop following logs (services will keep running)"
echo ""
docker-compose logs -f backend
