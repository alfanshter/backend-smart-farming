#!/bin/bash

echo "📋 Smart Farming Docker Logs Viewer"
echo ""

# Check if dev or prod
if [ "$1" == "dev" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    MODE="DEVELOPMENT"
else
    COMPOSE_FILE="docker-compose.yml"
    MODE="PRODUCTION"
fi

# Get service name (default: backend)
SERVICE=${2:-backend}

echo "Mode: $MODE"
echo "Service: $SERVICE"
echo "Press Ctrl+C to exit"
echo ""
echo "-----------------------------------"
echo ""

docker-compose -f $COMPOSE_FILE logs -f $SERVICE
