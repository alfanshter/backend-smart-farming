#!/bin/bash

# 🔧 Setup PostgreSQL untuk Smart Farming Backend
# Script ini akan membuat user dan database di PostgreSQL lokal

set -e  # Exit on error

echo "🚀 Setting up PostgreSQL for Smart Farming..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo "📋 Checking PostgreSQL status..."
if ! pg_isready -q; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not running${NC}"
    echo "Starting PostgreSQL..."
    
    # Try to start PostgreSQL
    if command -v brew &> /dev/null; then
        # Check which PostgreSQL version is installed
        if brew services list | grep -q "postgresql@16"; then
            brew services start postgresql@16
        elif brew services list | grep -q "postgresql@15"; then
            brew services start postgresql@15
        elif brew services list | grep -q "postgresql@14"; then
            brew services start postgresql@14
        else
            brew services start postgresql
        fi
        
        # Wait for PostgreSQL to start
        sleep 3
    else
        echo -e "${RED}❌ Homebrew not found. Please start PostgreSQL manually.${NC}"
        exit 1
    fi
fi

# Verify PostgreSQL is running
if ! pg_isready -q; then
    echo -e "${RED}❌ Failed to start PostgreSQL${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}"
echo ""

# Create user
echo "👤 Creating user 'smartfarming'..."
if psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='smartfarming'" | grep -q 1; then
    echo -e "${YELLOW}⚠️  User 'smartfarming' already exists${NC}"
else
    psql postgres -c "CREATE USER smartfarming WITH PASSWORD 'smartfarming123';"
    echo -e "${GREEN}✅ User 'smartfarming' created${NC}"
fi
echo ""

# Create database
echo "🗄️  Creating database 'smartfarming'..."
if psql postgres -lqt | cut -d \| -f 1 | grep -qw smartfarming; then
    echo -e "${YELLOW}⚠️  Database 'smartfarming' already exists${NC}"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        psql postgres -c "DROP DATABASE smartfarming;"
        psql postgres -c "CREATE DATABASE smartfarming OWNER smartfarming;"
        echo -e "${GREEN}✅ Database 'smartfarming' recreated${NC}"
    fi
else
    psql postgres -c "CREATE DATABASE smartfarming OWNER smartfarming;"
    echo -e "${GREEN}✅ Database 'smartfarming' created${NC}"
fi
echo ""

# Initialize schema
echo "📊 Initializing database schema..."
if [ -f "init-db-postgres.sql" ]; then
    psql -U smartfarming -d smartfarming -f init-db-postgres.sql
    echo -e "${GREEN}✅ Schema initialized with init-db-postgres.sql${NC}"
elif [ -f "init-db.sql" ]; then
    echo -e "${YELLOW}⚠️  Using init-db.sql (requires TimescaleDB extension)${NC}"
    
    # Try to enable TimescaleDB extension
    if psql -U smartfarming -d smartfarming -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" 2>/dev/null; then
        echo -e "${GREEN}✅ TimescaleDB extension enabled${NC}"
        psql -U smartfarming -d smartfarming -f init-db.sql
        echo -e "${GREEN}✅ Schema initialized with TimescaleDB${NC}"
    else
        echo -e "${YELLOW}⚠️  TimescaleDB extension not available${NC}"
        echo "Using PostgreSQL-only schema instead..."
        psql -U smartfarming -d smartfarming -f init-db-postgres.sql
        echo -e "${GREEN}✅ Schema initialized without TimescaleDB${NC}"
    fi
else
    echo -e "${RED}❌ Schema file not found (init-db.sql or init-db-postgres.sql)${NC}"
    exit 1
fi
echo ""

# Test connection
echo "🧪 Testing database connection..."
if node test-db-connection.js; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ PostgreSQL setup completed successfully!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
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
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ Connection test failed${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Check PostgreSQL is running: brew services list | grep postgresql"
    echo "   2. Check connection manually: psql -U smartfarming -d smartfarming"
    echo "   3. Review logs above for errors"
    echo ""
    exit 1
fi
