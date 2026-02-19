#!/bin/bash

# VPS Troubleshooting Script
# Smart Farming Backend

echo "🔍 Smart Farming Backend - VPS Troubleshooting"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section header
print_section() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

# 1. Container Status
print_section "1. Container Status"
docker-compose -f docker-compose.prod.yml ps

# 2. Resource Usage
print_section "2. Resource Usage"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# 3. TimescaleDB Health
print_section "3. TimescaleDB Health Check"
if docker-compose -f docker-compose.prod.yml exec -T timescaledb pg_isready -U smartfarming > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TimescaleDB is ready${NC}"
    
    # Test query
    echo ""
    echo "Current database time:"
    docker-compose -f docker-compose.prod.yml exec -T timescaledb psql -U smartfarming -d smartfarming -c "SELECT NOW();"
    
    echo ""
    echo "Database size:"
    docker-compose -f docker-compose.prod.yml exec -T timescaledb psql -U smartfarming -d smartfarming -c "SELECT pg_size_pretty(pg_database_size('smartfarming')) as size;"
    
    echo ""
    echo "Active connections:"
    docker-compose -f docker-compose.prod.yml exec -T timescaledb psql -U smartfarming -d smartfarming -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = 'smartfarming';"
else
    echo -e "${RED}❌ TimescaleDB is NOT ready${NC}"
    echo "Showing database logs:"
    docker-compose -f docker-compose.prod.yml logs --tail=20 timescaledb
fi

# 4. Backend Health
print_section "4. Backend Health Check"
if docker-compose -f docker-compose.prod.yml ps backend | grep "Up" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend container is running${NC}"
    
    # Check if API responds
    echo ""
    echo "Testing API endpoint:"
    if docker-compose -f docker-compose.prod.yml exec -T backend curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API is responding${NC}"
    else
        echo -e "${RED}❌ API is NOT responding${NC}"
    fi
    
    # Check environment variables
    echo ""
    echo "Environment check:"
    echo -n "NODE_ENV: "
    docker-compose -f docker-compose.prod.yml exec -T backend sh -c 'echo $NODE_ENV'
    echo -n "DATABASE_HOST: "
    docker-compose -f docker-compose.prod.yml exec -T backend sh -c 'echo $DATABASE_HOST'
    echo -n "TZ (Timezone): "
    docker-compose -f docker-compose.prod.yml exec -T backend sh -c 'echo $TZ'
else
    echo -e "${RED}❌ Backend container is NOT running${NC}"
    echo "Showing backend logs:"
    docker-compose -f docker-compose.prod.yml logs --tail=30 backend
fi

# 5. MQTT Connection
print_section "5. MQTT Connection Check"
if docker-compose -f docker-compose.prod.yml logs backend | grep "MQTT Client connected" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MQTT is connected${NC}"
    echo ""
    echo "Recent MQTT logs:"
    docker-compose -f docker-compose.prod.yml logs backend | grep -i mqtt | tail -5
else
    echo -e "${RED}❌ MQTT connection not found${NC}"
    echo "MQTT error logs:"
    docker-compose -f docker-compose.prod.yml logs backend | grep -i "mqtt.*error\|mqtt.*fail" | tail -5
fi

# 6. Auto Drip Scheduler
print_section "6. Auto Drip Scheduler Check"
if docker-compose -f docker-compose.prod.yml logs backend | grep "Auto Drip Scheduler Service initialized" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Auto Drip Scheduler is initialized${NC}"
    echo ""
    echo "Recent scheduler activity:"
    docker-compose -f docker-compose.prod.yml logs backend | grep -i "checking schedules\|matched\|triggering" | tail -10
else
    echo -e "${YELLOW}⚠️  Auto Drip Scheduler logs not found${NC}"
fi

# 7. Disk Space
print_section "7. Disk Space Check"
df -h | grep -E "Filesystem|/$|/var"
echo ""
echo "Docker disk usage:"
docker system df

# 8. Network Ports
print_section "8. Network Ports Check"
echo "Listening ports:"
sudo netstat -tulpn | grep -E "3001|5432|5050" || ss -tulpn | grep -E "3001|5432|5050"

# 9. Recent Errors
print_section "9. Recent Errors (Last 20 lines)"
docker-compose -f docker-compose.prod.yml logs --tail=50 backend | grep -i "error\|fail\|exception" | tail -20 || echo "No recent errors found"

# 10. Summary
print_section "10. Summary & Recommendations"

# Check if all critical services are healthy
TIMESCALE_OK=$(docker-compose -f docker-compose.prod.yml ps timescaledb | grep "healthy" && echo "yes" || echo "no")
BACKEND_OK=$(docker-compose -f docker-compose.prod.yml ps backend | grep "Up" && echo "yes" || echo "no")

if [ "$TIMESCALE_OK" == "yes" ] && [ "$BACKEND_OK" == "yes" ]; then
    echo -e "${GREEN}✅ System appears to be healthy!${NC}"
else
    echo -e "${RED}⚠️  System has issues:${NC}"
    [ "$TIMESCALE_OK" != "yes" ] && echo "  - TimescaleDB is not healthy"
    [ "$BACKEND_OK" != "yes" ] && echo "  - Backend is not running"
fi

echo ""
echo "📝 Common Commands:"
echo "  - Restart all:         docker-compose -f docker-compose.prod.yml restart"
echo "  - View live logs:      docker-compose -f docker-compose.prod.yml logs -f backend"
echo "  - Database shell:      docker-compose -f docker-compose.prod.yml exec timescaledb psql -U smartfarming -d smartfarming"
echo "  - Backend shell:       docker-compose -f docker-compose.prod.yml exec backend sh"
echo "  - Clean restart:       docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d"
echo ""
