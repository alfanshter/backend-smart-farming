# 🐳 Docker Setup - Smart Farming Backend

## 📦 What's Included

Docker setup untuk menjalankan seluruh aplikasi Smart Farming Backend tanpa perlu install dependencies manual.

### Services:
1. **Backend NestJS** - API Server (Port 3001)
2. **TimescaleDB** - PostgreSQL Database (Port 5432)
3. **pgAdmin** - Database GUI (Port 5050)

---

## 🚀 Quick Start

### Option 1: Production Mode (Recommended)
```bash
# Start semua services
./docker-start.sh

# Backend akan jalan di: http://localhost:3001
# pgAdmin di: http://localhost:5050
```

### Option 2: Development Mode (Hot Reload)
```bash
# Start dengan auto-reload ketika code berubah
./docker-start-dev.sh

# Code changes akan auto-restart backend
```

---

## 📝 Available Commands

### Start Services
```bash
# Production mode
./docker-start.sh

# Development mode (hot reload)
./docker-start-dev.sh
```

### Stop Services
```bash
# Stop production services
./docker-stop.sh

# Stop development services
./docker-stop.sh dev
```

### View Logs
```bash
# Production logs
./docker-logs.sh

# Development logs
./docker-logs.sh dev

# Specific service
./docker-logs.sh prod timescaledb
./docker-logs.sh dev pgadmin
```

### Manual Docker Commands
```bash
# Build services
docker-compose build

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend

# Rebuild from scratch
docker-compose up --build --force-recreate
```

---

## 🔧 Configuration

### Environment Variables

Semua environment variables sudah di-set di `docker-compose.yml`:

**Database:**
- `DB_HOST=timescaledb`
- `DB_PORT=5432`
- `DB_USERNAME=smartfarming`
- `DB_PASSWORD=smartfarming123`
- `DB_NAME=smartfarming`

**JWT:**
- `JWT_SECRET` - Change in production!
- `JWT_EXPIRES_IN=15m`
- `JWT_REFRESH_SECRET` - Change in production!
- `JWT_REFRESH_EXPIRES_IN=7d`

**MQTT:**
- `MQTT_BROKER_URL` - HiveMQ Cloud
- `MQTT_USERNAME=smartfarming`
- `MQTT_PASSWORD=Smartfarming123`

### Custom Environment Variables

Buat file `.env` di root folder untuk override:
```bash
JWT_SECRET=your-custom-secret
MQTT_BROKER_URL=your-mqtt-broker
```

---

## 📊 Accessing Services

### Backend API
- **URL:** http://localhost:3001
- **Health Check:** http://localhost:3001
- **API Endpoints:** Import Postman collection

### pgAdmin (Database GUI)
- **URL:** http://localhost:5050
- **Email:** admin@smartfarming.com
- **Password:** admin123

**Add TimescaleDB Server:**
1. Login ke pgAdmin
2. Right-click "Servers" → "Register" → "Server"
3. **General Tab:**
   - Name: `Smart Farming DB`
4. **Connection Tab:**
   - Host: `timescaledb`
   - Port: `5432`
   - Username: `smartfarming`
   - Password: `smartfarming123`
   - Database: `smartfarming`

### TimescaleDB (Direct Connection)
```bash
# Via Docker exec
docker exec -it smartfarming-timescaledb psql -U smartfarming -d smartfarming

# Via local psql client
psql -h localhost -p 5432 -U smartfarming -d smartfarming
```

---

## 🔄 Development Workflow

### Production Mode
1. Code changes require rebuild:
   ```bash
   docker-compose up --build
   ```

2. Services restart automatically on crash
3. Optimized for performance

### Development Mode
1. Code changes auto-reload (hot reload enabled)
2. Source code mounted as volume
3. Faster iteration cycle

**Recommended Workflow:**
- Use **dev mode** saat development
- Use **production mode** untuk testing final build
- Deploy dengan production mode

---

## 📂 File Structure

```
backend-smart-farming/
├── Dockerfile                 # Production build
├── Dockerfile.dev            # Development build (hot reload)
├── docker-compose.yml        # Production compose
├── docker-compose.dev.yml    # Development compose
├── .dockerignore             # Files to ignore in Docker build
├── docker-start.sh           # Start production
├── docker-start-dev.sh       # Start development
├── docker-stop.sh            # Stop services
├── docker-logs.sh            # View logs
└── DOCKER_SETUP.md          # This file
```

---

## 🐛 Troubleshooting

### Port sudah dipakai
```bash
# Check apa yang pakai port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Atau stop manual pnpm
pkill -f "pnpm run start:dev"
```

### Database connection error
```bash
# Check TimescaleDB running
docker ps | grep timescaledb

# View database logs
docker logs smartfarming-timescaledb

# Restart database
docker-compose restart timescaledb
```

### Backend tidak start
```bash
# View backend logs
docker logs smartfarming-backend

# Rebuild backend
docker-compose up --build backend

# Check environment variables
docker exec smartfarming-backend env
```

### Clear everything and restart
```bash
# Stop all services
docker-compose down

# Remove volumes (⚠️ akan hapus database!)
docker-compose down -v

# Rebuild from scratch
docker-compose up --build --force-recreate
```

---

## 🔐 Security Notes

### Production Deployment

**⚠️ CHANGE THESE BEFORE DEPLOY:**

1. **JWT Secrets:**
   ```env
   JWT_SECRET=<generate-secure-random-string>
   JWT_REFRESH_SECRET=<generate-secure-random-string>
   ```

2. **Database Password:**
   ```env
   POSTGRES_PASSWORD=<strong-password>
   DB_PASSWORD=<strong-password>
   ```

3. **pgAdmin Password:**
   ```env
   PGADMIN_DEFAULT_PASSWORD=<strong-password>
   ```

4. **MQTT Credentials:**
   ```env
   MQTT_USERNAME=<your-username>
   MQTT_PASSWORD=<your-password>
   ```

**Generate secure secrets:**
```bash
# Generate random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📈 Performance Tips

### Production
- Backend build sudah optimized (multi-stage build)
- Only production dependencies included
- TypeScript compiled to JavaScript

### Development
- Source code mounted as volume
- Hot reload enabled
- All dev dependencies included

### Database
- TimescaleDB auto-tuned for time-series data
- Healthcheck configured
- Data persisted in Docker volumes

---

## 🎯 Next Steps

1. **Start Services:**
   ```bash
   ./docker-start-dev.sh
   ```

2. **Test API:**
   - Import Postman collection
   - Login: POST http://localhost:3001/auth/login
   - Test endpoints

3. **View Database:**
   - Open pgAdmin: http://localhost:5050
   - Connect to TimescaleDB

4. **Monitor Logs:**
   ```bash
   ./docker-logs.sh dev
   ```

---

## 📞 Support

**Issues:**
- Check logs: `./docker-logs.sh`
- View containers: `docker ps -a`
- Inspect service: `docker inspect smartfarming-backend`

**Cleanup:**
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune
```

---

**Ready to Go!** 🚀

Sekarang kamu bisa jalankan backend dengan:
```bash
./docker-start-dev.sh
```

Tidak perlu lagi `pnpm run start:dev` manual! 🎉
