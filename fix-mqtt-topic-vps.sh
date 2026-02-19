#!/bin/bash

# Fix MQTT Topic di VPS Production Database
# Script ini akan update mqtt_topic dari 'Smartfarming/device1' 
# menjadi 'Smartfarming/device1/command'

echo "🔧 Fix MQTT Topic - Smart Farming VPS"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running in correct directory
if [ ! -f docker-compose.prod.yml ]; then
    echo -e "${RED}❌ Error: docker-compose.prod.yml not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check if TimescaleDB container is running
if ! docker ps | grep -q smartfarming-timescaledb; then
    echo -e "${RED}❌ Error: TimescaleDB container is not running!${NC}"
    echo "Please start the containers first:"
    echo "  docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo "📋 Current MQTT Topics:"
echo "----------------------"
docker exec smartfarming-timescaledb psql -U smartfarming -d smartfarming -c \
  "SELECT id, name, mqtt_topic FROM devices ORDER BY name;"
echo ""

echo -e "${YELLOW}⚠️  This script will update mqtt_topic to include '/command' suffix${NC}"
echo ""
echo "Changes:"
echo "  Smartfarming/device1 → Smartfarming/device1/command"
echo "  Smartfarming/device2 → Smartfarming/device2/command"
echo "  Smartfarming/device3 → Smartfarming/device3/command"
echo ""

read -p "Continue with update? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled by user"
    exit 0
fi

echo ""
echo "🔄 Updating MQTT topics..."

# Update device1
docker exec smartfarming-timescaledb psql -U smartfarming -d smartfarming -c \
  "UPDATE devices SET mqtt_topic = 'Smartfarming/device1/command', updated_at = NOW() 
   WHERE id = 'f17ee499-c275-4197-8fef-2a30271a3380';"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Updated device1${NC}"
else
    echo -e "${RED}❌ Failed to update device1${NC}"
fi

# Update device2
docker exec smartfarming-timescaledb psql -U smartfarming -d smartfarming -c \
  "UPDATE devices SET mqtt_topic = 'Smartfarming/device2/command', updated_at = NOW() 
   WHERE id = 'd17ee499-c275-4197-8fef-2a30271a3381';"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Updated device2${NC}"
else
    echo -e "${RED}❌ Failed to update device2${NC}"
fi

# Update device3
docker exec smartfarming-timescaledb psql -U smartfarming -d smartfarming -c \
  "UPDATE devices SET mqtt_topic = 'Smartfarming/device3/command', updated_at = NOW() 
   WHERE id = 'd17ee499-c275-4197-8fef-2a30271a3382';"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Updated device3${NC}"
else
    echo -e "${RED}❌ Failed to update device3${NC}"
fi

echo ""
echo "📋 Updated MQTT Topics:"
echo "----------------------"
docker exec smartfarming-timescaledb psql -U smartfarming -d smartfarming -c \
  "SELECT id, name, mqtt_topic, updated_at FROM devices ORDER BY name;"
echo ""

echo -e "${GREEN}✅ MQTT topics updated successfully!${NC}"
echo ""
echo "🔄 Restarting backend to apply changes..."
docker-compose -f docker-compose.prod.yml restart backend

echo ""
echo "⏳ Waiting for backend to start..."
sleep 5

echo ""
echo "📊 Checking backend logs..."
docker-compose -f docker-compose.prod.yml logs --tail=20 backend | grep -i "mqtt\|started"

echo ""
echo -e "${GREEN}🎉 Done! Manual drip sekarang akan publish ke 'Smartfarming/device1/command'${NC}"
echo ""
echo "💡 Test manual drip:"
echo "   1. Jalankan manual drip via API"
echo "   2. Check logs: docker-compose -f docker-compose.prod.yml logs -f backend"
echo "   3. Lihat di MQTT broker: topic 'Smartfarming/device1/command'"
