#!/bin/sh
# wait-for-db.sh - Wait for database to be ready

set -e

DB_HOST="${DB_HOST:-timescaledb}"
DB_PORT="${DB_PORT:-5432}"

echo "🔄 Waiting for database at $DB_HOST:$DB_PORT..."

until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  echo "⏳ Postgres is unavailable - waiting..."
  sleep 2
done

echo "✅ Postgres is ready!"
echo "🚀 Starting application..."

# Execute the command passed as arguments
exec "$@"
