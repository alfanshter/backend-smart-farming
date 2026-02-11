#!/bin/bash

echo "🛑 Stopping Smart Farming Backend Services..."
echo ""

# Check which docker-compose file to use
if [ "$1" == "dev" ]; then
    echo "Stopping DEVELOPMENT services..."
    docker-compose -f docker-compose.dev.yml down
else
    echo "Stopping PRODUCTION services..."
    docker-compose down
fi

echo ""
echo "✅ All services stopped!"
echo ""
echo "Services status:"
docker ps -a | grep smartfarming || echo "  No smartfarming containers running"
