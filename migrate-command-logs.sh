#!/bin/bash

# Script untuk menjalankan migration watering_command_logs

echo "🚀 Running migration for watering_command_logs table..."

# Detect database type and credentials
if docker ps | grep -q postgres; then
    echo "📊 Using PostgreSQL..."
    DB_CONTAINER="postgres"
    DB_USER="${POSTGRES_USER:-postgres}"
    DB_NAME="${POSTGRES_DB:-smart_farming}"
    
    docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < migrations/010_create_watering_command_logs.sql
    
elif docker ps | grep -q timescaledb; then
    echo "📊 Using TimescaleDB..."
    DB_CONTAINER="timescaledb"
    DB_USER="${POSTGRES_USER:-postgres}"
    DB_NAME="${POSTGRES_DB:-smart_farming}"
    
    docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < migrations/010_create_watering_command_logs.sql
    
else
    echo "❌ No database container found!"
    echo "Please start PostgreSQL or TimescaleDB first."
    exit 1
fi

echo "✅ Migration completed!"
echo ""
echo "📊 Verifying table creation..."
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "\dt watering_command_logs"

echo ""
echo "📊 Checking view creation..."
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "\dv v_problematic_commands"

echo ""
echo "✅ All done! Table and view created successfully."
echo ""
echo "💡 You can now query:"
echo "   SELECT * FROM watering_command_logs;"
echo "   SELECT * FROM v_problematic_commands;"
