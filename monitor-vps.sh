#!/bin/bash

# Monitor VPS Backend - Real-time Health Check
# Smart Farming Backend

echo "🔍 Smart Farming Backend - Live Monitor"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running on VPS
if [ ! -f docker-compose.prod.yml ]; then
    echo -e "${RED}❌ docker-compose.prod.yml not found!${NC}"
    echo "Are you in the correct directory?"
    exit 1
fi

# Function to check service
check_service() {
    local service=$1
    local status=$(docker-compose -f docker-compose.prod.yml ps -q $service 2>/dev/null)
    
    if [ -z "$status" ]; then
        echo -e "${RED}❌ $service: NOT RUNNING${NC}"
        return 1
    else
        local health=$(docker inspect --format='{{.State.Health.Status}}' $(docker-compose -f docker-compose.prod.yml ps -q $service) 2>/dev/null)
        if [ "$health" == "healthy" ] || [ -z "$health" ]; then
            echo -e "${GREEN}✅ $service: RUNNING${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  $service: UNHEALTHY ($health)${NC}"
            return 1
        fi
    fi
}

# Main monitoring loop
while true; do
    clear
    echo "🔍 Smart Farming Backend - Live Monitor"
    echo "========================================"
    date
    echo ""
    
    # Check services
    echo "📊 Service Status:"
    check_service "timescaledb"
    check_service "backend"
    echo ""
    
    # Check MQTT connection
    echo "🔌 MQTT Status:"
    mqtt_connected=$(docker-compose -f docker-compose.prod.yml logs --tail=10 backend 2>/dev/null | grep -c "MQTT Client connected")
    if [ $mqtt_connected -gt 0 ]; then
        echo -e "${GREEN}✅ MQTT: Connected${NC}"
    else
        echo -e "${RED}❌ MQTT: Disconnected${NC}"
    fi
    echo ""
    
    # Check database connection
    echo "🗄️  Database Status:"
    db_ready=$(docker exec smartfarming-timescaledb pg_isready -U smartfarming 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database: Ready${NC}"
    else
        echo -e "${RED}❌ Database: Not Ready${NC}"
    fi
    echo ""
    
    # Check Auto Drip Scheduler
    echo "⏰ Auto Drip Scheduler:"
    scheduler_active=$(docker-compose -f docker-compose.prod.yml logs --tail=20 backend 2>/dev/null | grep -c "Checking schedules at")
    if [ $scheduler_active -gt 0 ]; then
        last_check=$(docker-compose -f docker-compose.prod.yml logs --tail=20 backend 2>/dev/null | grep "Checking schedules at" | tail -1 | awk '{print $5}')
        echo -e "${GREEN}✅ Scheduler: Active (Last: $last_check)${NC}"
    else
        echo -e "${YELLOW}⚠️  Scheduler: No recent activity${NC}"
    fi
    echo ""
    
    # Check errors
    echo "❌ Recent Errors:"
    errors=$(docker-compose -f docker-compose.prod.yml logs --tail=50 backend 2>/dev/null | grep -i "error" | tail -3)
    if [ -z "$errors" ]; then
        echo -e "${GREEN}No errors in last 50 lines${NC}"
    else
        echo "$errors" | while IFS= read -r line; do
            echo -e "${RED}$line${NC}"
        done
    fi
    echo ""
    
    # Resource usage
    echo "💻 Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep smartfarming
    echo ""
    
    # ESP32 Status
    echo "📱 ESP32 Device Status:"
    esp32_online=$(docker-compose -f docker-compose.prod.yml logs --tail=10 backend 2>/dev/null | grep "Device.*status updated to ONLINE" | tail -1)
    if [ ! -z "$esp32_online" ]; then
        echo -e "${GREEN}✅ ESP32: Online${NC}"
        last_seen=$(echo $esp32_online | grep -oP 'Last seen: \K[^"]+')
        echo "   Last seen: $last_seen"
    else
        echo -e "${YELLOW}⚠️  ESP32: No recent heartbeat${NC}"
    fi
    echo ""
    
    echo "Press Ctrl+C to exit | Refreshing every 5 seconds..."
    sleep 5
done
