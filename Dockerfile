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

# Install pnpm and postgresql-client
RUN npm install -g pnpm && \
    apk add --no-cache postgresql-client

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy wait script
COPY wait-for-db.sh /usr/local/bin/wait-for-db.sh
RUN chmod +x /usr/local/bin/wait-for-db.sh

# Expose port
EXPOSE 3001

# Wait for database then start the application
# CMD ["sh", "-c", "wait-for-db.sh timescaledb node dist/main.js"]
CMD ["/usr/local/bin/wait-for-db.sh", "node", "dist/main.js"]
