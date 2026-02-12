#!/bin/bash

# ================================================================
# 🔧 CORS FIX & DEPLOY SCRIPT
# ================================================================
# This script rebuilds and deploys the backend with CORS fix
# Usage: ./fix-cors-and-deploy.sh
# ================================================================

set -e  # Exit on error

echo "=================================================="
echo "🔧 Smart Farming Backend - CORS Fix & Deploy"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ================================================================
# Step 1: Check if .env exists
# ================================================================
echo -e "${YELLOW}📋 Step 1: Checking environment file...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please create .env file first. Example:"
    echo ""
    echo "POSTGRES_PASSWORD=your_password"
    echo "JWT_ACCESS_SECRET=your_jwt_secret"
    echo "JWT_REFRESH_SECRET=your_refresh_secret"
    echo "MQTT_BROKER_URL=mqtt://your-mqtt-broker"
    echo "MQTT_USERNAME=your_mqtt_user"
    echo "MQTT_PASSWORD=your_mqtt_password"
    exit 1
fi
echo -e "${GREEN}✅ .env file found${NC}"
echo ""

# ================================================================
# Step 2: Stop running containers
# ================================================================
echo -e "${YELLOW}🛑 Step 2: Stopping running containers...${NC}"
docker-compose -f docker-compose.prod.yml down || true
echo -e "${GREEN}✅ Containers stopped${NC}"
echo ""

# ================================================================
# Step 3: Remove old images (optional, uncomment to force rebuild)
# ================================================================
# echo -e "${YELLOW}🗑️  Step 3: Removing old images...${NC}"
# docker rmi smartfarming-backend || true
# echo -e "${GREEN}✅ Old images removed${NC}"
# echo ""

# ================================================================
# Step 4: Build with no cache
# ================================================================
echo -e "${YELLOW}🏗️  Step 4: Building backend with CORS fix...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache backend
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# ================================================================
# Step 5: Start containers
# ================================================================
echo -e "${YELLOW}🚀 Step 5: Starting containers...${NC}"
docker-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✅ Containers started${NC}"
echo ""

# ================================================================
# Step 6: Wait for backend to be ready
# ================================================================
echo -e "${YELLOW}⏳ Step 6: Waiting for backend to be ready...${NC}"
sleep 10

# Check if backend is running
if docker ps | grep -q smartfarming-backend; then
    echo -e "${GREEN}✅ Backend container is running${NC}"
else
    echo -e "${RED}❌ Backend container failed to start${NC}"
    echo "Showing logs..."
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi
echo ""

# ================================================================
# Step 7: Test backend health
# ================================================================
echo -e "${YELLOW}🏥 Step 7: Testing backend health...${NC}"

# Test localhost
if curl -s http://localhost:3001 > /dev/null; then
    echo -e "${GREEN}✅ Backend responding on localhost:3001${NC}"
else
    echo -e "${RED}❌ Backend not responding on localhost${NC}"
    echo "Showing logs..."
    docker-compose -f docker-compose.prod.yml logs --tail=50 backend
    exit 1
fi
echo ""

# ================================================================
# Step 8: Test CORS headers
# ================================================================
echo -e "${YELLOW}🔍 Step 8: Testing CORS headers...${NC}"

CORS_TEST=$(curl -s -I http://localhost:3001/auth/login \
    -H "Origin: http://agrogonta.ptpws.id" \
    -H "Access-Control-Request-Method: POST" \
    2>&1 || true)

if echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✅ CORS headers present${NC}"
    echo "$CORS_TEST" | grep "Access-Control"
else
    echo -e "${YELLOW}⚠️  Warning: CORS headers not detected in preflight${NC}"
    echo "This might be normal. Test with actual POST request."
fi
echo ""

# ================================================================
# Step 9: Show logs
# ================================================================
echo -e "${YELLOW}📋 Step 9: Showing recent logs...${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=30 backend
echo ""

# ================================================================
# Step 10: Display summary
# ================================================================
echo "=================================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "🌐 Backend URL: http://localhost:3001"
echo "🌐 Public URL: http://agrogonta.ptpws.id:3001"
echo ""
echo "📝 Next Steps:"
echo "  1. Check firewall: sudo ufw status"
echo "  2. Open port if needed: sudo ufw allow 3001/tcp"
echo "  3. Test from browser: http://agrogonta.ptpws.id:3001"
echo "  4. View logs: docker-compose -f docker-compose.prod.yml logs -f backend"
echo ""
echo "🔧 Troubleshooting:"
echo "  - If still getting CORS error, check VPS_CORS_FIX.md"
echo "  - Make sure frontend URL matches allowed origins in src/main.ts"
echo "  - Clear browser cache (Ctrl+Shift+R)"
echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Happy Farming!${NC}"
echo "=================================================="
