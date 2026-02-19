#!/bin/bash

# Quick Status Check - Smart Farming VPS
# Shows current status in one screen

echo "🚀 Smart Farming Backend - Status Summary"
echo "=========================================="
date
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Container Status
echo "1️⃣  CONTAINER STATUS"
echo "-------------------"
docker-compose -f docker-compose.prod.yml ps
echo ""

# 2. Backend Health
echo "2️⃣  BACKEND HEALTH"
echo "-----------------"
if docker exec smartfarming-backend curl -s http://localhost:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API: Responding${NC}"
else
    echo -e "${RED}❌ Backend API: Not responding${NC}"
fi

# Check MQTT
mqtt_ok=$(docker-compose -f docker-compose.prod.yml logs --tail=20 backend 2>/dev/null | grep -c "MQTT Client connected")
if [ $mqtt_ok -gt 0 ]; then
    echo -e "${GREEN}✅ MQTT: Connected${NC}"
else
    echo -e "${RED}❌ MQTT: Disconnected${NC}"
fi

# Check scheduler
scheduler_ok=$(docker-compose -f docker-compose.prod.yml logs --tail=20 backend 2>/dev/null | grep -c "Checking schedules")
if [ $scheduler_ok -gt 0 ]; then
    echo -e "${GREEN}✅ Auto Drip Scheduler: Active${NC}"
else
    echo -e "${YELLOW}⚠️  Auto Drip Scheduler: No recent activity${NC}"
fi
echo ""

# 3. Database Health
echo "3️⃣  DATABASE HEALTH"
echo "------------------"
if docker exec smartfarming-timescaledb pg_isready -U smartfarming > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL: Ready${NC}"
    
    # Get connection count
    conn_count=$(docker exec smartfarming-timescaledb psql -U smartfarming -d smartfarming -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' ')
    echo "   Active connections: $conn_count"
    
    # Get database size
    db_size=$(docker exec smartfarming-timescaledb psql -U smartfarming -d smartfarming -t -c "SELECT pg_size_pretty(pg_database_size('smartfarming'));" 2>/dev/null | tr -d ' ')
    echo "   Database size: $db_size"
else
    echo -e "${RED}❌ PostgreSQL: Not ready${NC}"
fi
echo ""

# 4. ESP32 Status
echo "4️⃣  ESP32 DEVICE STATUS"
echo "----------------------"
esp32_msg=$(docker-compose -f docker-compose.prod.yml logs --tail=20 backend 2>/dev/null | grep "Device.*status updated to ONLINE" | tail -1)
if [ ! -z "$esp32_msg" ]; then
    echo -e "${GREEN}✅ ESP32: Online & Sending Data${NC}"
    
    # Extract last seen time
    last_seen=$(echo $esp32_msg | grep -oP 'Last seen: \K[^"]+' | head -1)
    if [ ! -z "$last_seen" ]; then
        echo "   Last heartbeat: $last_seen"
    fi
else
    echo -e "${YELLOW}⚠️  ESP32: No recent heartbeat (check logs)${NC}"
fi
echo ""

# 5. Recent Errors
echo "5️⃣  RECENT ERRORS (Last 5 minutes)"
echo "-----------------------------------"
errors=$(docker-compose -f docker-compose.prod.yml logs --since=5m backend 2>/dev/null | grep -i "error\|failed\|exception" | grep -v "EAI_AGAIN" | tail -5)
if [ -z "$errors" ]; then
    echo -e "${GREEN}✅ No critical errors${NC}"
else
    echo -e "${RED}Found errors:${NC}"
    echo "$errors"
fi
echo ""

# 6. Resource Usage
echo "6️⃣  RESOURCE USAGE"
echo "-----------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep -E "NAME|smartfarming"
echo ""

# 7. Disk Space
echo "7️⃣  DISK SPACE"
echo "-------------"
df -h / | tail -1 | awk '{print "   Root: "$3" used / "$2" total ("$5" used)"}'
docker_size=$(docker system df --format "{{.Size}}" | head -1)
echo "   Docker: $docker_size"
echo ""

# 8. Network
echo "8️⃣  NETWORK STATUS"
echo "-----------------"
if docker network ls | grep -q smartfarming-network; then
    echo -e "${GREEN}✅ Docker network: smartfarming-network exists${NC}"
else
    echo -e "${RED}❌ Docker network: smartfarming-network NOT found${NC}"
fi
echo ""

# 9. Quick Actions
echo "💡 QUICK ACTIONS"
echo "----------------"
echo "   View logs:         docker-compose -f docker-compose.prod.yml logs -f backend"
echo "   Restart backend:   docker-compose -f docker-compose.prod.yml restart backend"
echo "   Monitor live:      ./monitor-vps.sh"
echo "   Full diagnostics:  ./vps-check.sh"
echo ""

echo "=========================================="
echo "Status check completed at $(date +%H:%M:%S)"
