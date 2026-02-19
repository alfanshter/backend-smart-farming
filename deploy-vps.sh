#!/bin/bash

# VPS Production Deployment Script
# Smart Farming Backend

set -e  # Exit on error

echo "🚀 Smart Farming Backend - VPS Production Deployment"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production file not found!${NC}"
    echo "Please create .env.production file first."
    echo "You can copy from .env.docker and modify:"
    echo "  cp .env.docker .env.production"
    echo "  nano .env.production"
    exit 1
fi

echo "✅ Found .env.production file"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down
echo ""

# Build images
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
echo ""

# Start containers
echo "🚀 Starting containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
echo ""

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 15
echo ""

# Check container status
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""

# Check database connection
echo "🔍 Checking database connection..."
if docker-compose -f docker-compose.prod.yml exec -T timescaledb psql -U smartfarming -d smartfarming -c "SELECT NOW();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection: OK${NC}"
    
    # Show current time with timezone
    DB_TIME=$(docker-compose -f docker-compose.prod.yml exec -T timescaledb psql -U smartfarming -d smartfarming -c "SELECT NOW();" | grep -A 1 "now" | tail -1 | xargs)
    echo "   Current DB time: $DB_TIME"
else
    echo -e "${RED}❌ Database connection: FAILED${NC}"
fi
echo ""

# Check backend health
echo "🔍 Checking backend health..."
sleep 5
if docker-compose -f docker-compose.prod.yml exec -T backend curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend health: OK${NC}"
else
    echo -e "${YELLOW}⚠️  Backend might still be starting...${NC}"
fi
echo ""

# Check MQTT connection
echo "🔍 Checking MQTT connection..."
if docker-compose -f docker-compose.prod.yml logs backend | grep "MQTT Client connected" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MQTT connection: OK${NC}"
else
    echo -e "${YELLOW}⚠️  MQTT might still be connecting...${NC}"
fi
echo ""

# Check Auto Drip Scheduler
echo "🔍 Checking Auto Drip Scheduler..."
if docker-compose -f docker-compose.prod.yml logs backend | grep "Auto Drip Scheduler Service initialized" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Auto Drip Scheduler: OK${NC}"
else
    echo -e "${YELLOW}⚠️  Auto Drip Scheduler might still be initializing...${NC}"
fi
echo ""

echo "=================================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "📝 Useful Commands:"
echo "  - View logs:           docker-compose -f docker-compose.prod.yml logs -f"
echo "  - View backend logs:   docker-compose -f docker-compose.prod.yml logs -f backend"
echo "  - Check status:        docker-compose -f docker-compose.prod.yml ps"
echo "  - Stop services:       docker-compose -f docker-compose.prod.yml down"
echo "  - Database shell:      docker-compose -f docker-compose.prod.yml exec timescaledb psql -U smartfarming -d smartfarming"
echo ""
echo "🌐 API should be available at: http://$(hostname -I | awk '{print $1}'):3001"
echo ""
