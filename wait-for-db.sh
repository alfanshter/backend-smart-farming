#!/bin/bash
# ================================================================
# 🔄 WAIT FOR DATABASE SCRIPT
# ================================================================
# This script waits for the database to be ready before starting the app
# Used in Docker containers to ensure database is accessible
# ================================================================

set -e

host="${DB_HOST:-timescaledb}"
port="${DB_PORT:-5432}"
user="${DB_USER:-smartfarming}"
database="${DB_NAME:-smartfarming}"

echo "🔍 Waiting for database at $host:$port..."
echo "📊 Database: $database"
echo "👤 User: $user"

# Wait for PostgreSQL to be ready
until PGPASSWORD="${DB_PASSWORD}" psql -h "$host" -U "$user" -d "$database" -c '\q' 2>/dev/null; do
  >&2 echo "⏳ Database is unavailable - sleeping for 2 seconds..."
  sleep 2
done

>&2 echo "✅ Database is up and ready!"
echo "🚀 Starting application: $@"
echo "=========================================="

# Execute the command passed as arguments
exec "$@"
