#!/bin/bash

# 🐳 Switch to Docker TimescaleDB
# Script ini akan stop PostgreSQL lokal dan start Docker TimescaleDB

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🐳 Switching to Docker TimescaleDB${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Stop PostgreSQL lokal
echo "📋 Step 1: Stopping local PostgreSQL..."
if brew services list | grep -q "postgresql.*started"; then
    POSTGRES_VERSION=$(brew services list | grep postgresql | awk '{print $1}')
    echo "   Found running PostgreSQL: $POSTGRES_VERSION"
    brew services stop $POSTGRES_VERSION
    echo -e "${GREEN}   ✅ PostgreSQL stopped${NC}"
else
    echo -e "${YELLOW}   ⚠️  PostgreSQL is not running (OK)${NC}"
fi
echo ""

# Step 2: Check Docker
echo "📋 Step 2: Checking Docker..."
if ! docker --version &> /dev/null; then
    echo -e "${RED}   ❌ Docker is not installed${NC}"
    echo ""
    echo "   Please install Docker Desktop:"
    echo "   https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}   ❌ Docker is not running${NC}"
    echo ""
    echo "   Please start Docker Desktop:"
    echo "   1. Open Docker Desktop from Applications"
    echo "   2. Wait for the whale icon 🐳 in menu bar"
    echo "   3. Run this script again"
    exit 1
fi

echo -e "${GREEN}   ✅ Docker is ready${NC}"
echo "      Docker version: $(docker --version | awk '{print $3}')"
echo "      Compose version: $(docker compose version | awk '{print $4}')"
echo ""

# Step 3: Stop & remove old containers (if any)
echo "📋 Step 3: Cleaning up old containers..."
if docker ps -a | grep -q smartfarming-timescaledb; then
    echo "   Removing old container..."
    docker compose down -v
    echo -e "${GREEN}   ✅ Old containers removed${NC}"
else
    echo -e "${YELLOW}   ⚠️  No old containers found (OK)${NC}"
fi
echo ""

# Step 4: Start TimescaleDB container
echo "📋 Step 4: Starting TimescaleDB container..."
docker compose up -d

# Wait for container to be ready
echo "   Waiting for database to initialize..."
sleep 5

# Check if container is running
if docker ps | grep -q smartfarming-timescaledb; then
    echo -e "${GREEN}   ✅ Container is running${NC}"
else
    echo -e "${RED}   ❌ Container failed to start${NC}"
    echo ""
    echo "   Check logs:"
    echo "   docker compose logs timescaledb"
    exit 1
fi
echo ""

# Step 5: Wait for PostgreSQL to be ready
echo "📋 Step 5: Waiting for PostgreSQL to be ready..."
RETRY=0
MAX_RETRY=30
until docker exec smartfarming-timescaledb pg_isready -U smartfarming &> /dev/null; do
    RETRY=$((RETRY+1))
    if [ $RETRY -gt $MAX_RETRY ]; then
        echo -e "${RED}   ❌ Timeout waiting for PostgreSQL${NC}"
        echo ""
        echo "   Check container logs:"
        echo "   docker compose logs timescaledb"
        exit 1
    fi
    echo "   Waiting... ($RETRY/$MAX_RETRY)"
    sleep 1
done
echo -e "${GREEN}   ✅ PostgreSQL is ready${NC}"
echo ""

# Step 6: Test connection
echo "📋 Step 6: Testing database connection..."
if node test-db-connection.js; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Docker TimescaleDB is ready!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "📝 Container Details:"
    echo "   Name: smartfarming-timescaledb"
    echo "   Image: timescale/timescaledb:latest-pg16"
    echo "   Port: 5432 (mapped to localhost:5432)"
    echo ""
    echo "📝 Database Details:"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo "   Database: smartfarming"
    echo "   User: smartfarming"
    echo "   Password: smartfarming123"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Start backend: npm run start:dev"
    echo "   2. Test API: curl http://localhost:3000/devices"
    echo ""
    echo "🛠️  Useful commands:"
    echo "   View logs: docker compose logs -f timescaledb"
    echo "   Stop container: docker compose down"
    echo "   Restart: docker compose restart"
    echo "   Connect to DB: docker exec -it smartfarming-timescaledb psql -U smartfarming -d smartfarming"
    echo ""
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ Connection test failed${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Check container logs: docker compose logs timescaledb"
    echo "   2. Check container status: docker ps"
    echo "   3. Restart container: docker compose restart"
    echo ""
    exit 1
fi
