# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Production
FROM node:20-alpine AS production

# Install pnpm, postgresql-client, and timezone data
RUN npm install -g pnpm && \
    apk add --no-cache postgresql-client tzdata

# Set timezone to WIB (Asia/Jakarta)
ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create wait-for-db script directly in the image
RUN echo '#!/bin/sh' > /app/wait-for-db.sh && \
    echo 'set -e' >> /app/wait-for-db.sh && \
    echo 'host="${DB_HOST:-timescaledb}"' >> /app/wait-for-db.sh && \
    echo 'port="${DB_PORT:-5432}"' >> /app/wait-for-db.sh && \
    echo 'user="${DB_USERNAME:-smartfarming}"' >> /app/wait-for-db.sh && \
    echo 'database="${DB_NAME:-smartfarming}"' >> /app/wait-for-db.sh && \
    echo 'echo "🔍 Waiting for database at $host:$port..."' >> /app/wait-for-db.sh && \
    echo 'echo "📊 Database: $database"' >> /app/wait-for-db.sh && \
    echo 'echo "👤 User: $user"' >> /app/wait-for-db.sh && \
    echo 'until PGPASSWORD="${DB_PASSWORD}" psql -h "$host" -U "$user" -d "$database" -c "\\q" 2>/dev/null; do' >> /app/wait-for-db.sh && \
    echo '  >&2 echo "⏳ Database is unavailable - sleeping for 2 seconds..."' >> /app/wait-for-db.sh && \
    echo '  sleep 2' >> /app/wait-for-db.sh && \
    echo 'done' >> /app/wait-for-db.sh && \
    echo '>&2 echo "✅ Database is up and ready!"' >> /app/wait-for-db.sh && \
    echo 'echo "🚀 Starting application..."' >> /app/wait-for-db.sh && \
    echo 'exec "$@"' >> /app/wait-for-db.sh && \
    chmod +x /app/wait-for-db.sh

# Expose port
EXPOSE 3001

# Wait for database then start the application
ENTRYPOINT ["/app/wait-for-db.sh"]
CMD ["node", "dist/main.js"]
