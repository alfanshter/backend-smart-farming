# 🚀 Deployment Guide - Smart Farming Backend

## 📋 Prerequisites

1. **Git** installed
2. **Docker** & **Docker Compose** installed
3. **SSH** access to VPS

---

## 🏠 Local Development

### 1. Setup Environment

```bash
# Copy example env
cp .env.example .env

# Edit dengan nilai Anda
nano .env
```

### 2. Run with Docker

```bash
# Development mode (dengan hot-reload)
docker-compose -f docker-compose.dev.yml up -d

# Production mode (local testing)
docker-compose -f docker-compose.yml up -d
```

### 3. Check Logs

```bash
# Lihat logs backend
docker-compose logs -f backend

# Lihat logs database
docker-compose logs -f timescaledb
```

---

## 🌐 VPS Production Deployment

### 1. Connect to VPS

```bash
ssh root@your-vps-ip
# atau
ssh username@your-vps-ip
```

### 2. Clone Repository

```bash
cd /home
git clone https://github.com/yourusername/backend-smart-farming.git
cd backend-smart-farming
```

### 3. Setup Environment

```bash
# .env.production sudah ada di repo dengan nilai production
# Jika ingin edit password/credentials:
nano .env.production
```

**Important Variables di .env.production:**

```bash
# Database - Sama dengan lokal untuk konsistensi
DATABASE_PASSWORD=smartfarming123!

# JWT Secrets - Jangan ubah kecuali perlu regenerate
JWT_ACCESS_SECRET=8cb3e1edbaade429342810ed20fbc27be235dec06b7b241b86d92fa6bf43d546
JWT_REFRESH_SECRET=0466eaed82b030fe0c3c0689d5106bb8e5bdd73a596a17b4dc7de90f0f3d2f40

# MQTT - Sudah configured ke HiveMQ Cloud
MQTT_BROKER_URL=mqtts://6da97578cebb460eab0c5e7cff55862d.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=alfanshter
MQTT_PASSWORD=Alfan@Dinda123

# Timezone - WIB (Indonesia)
TZ=Asia/Jakarta
```

### 4. Deploy

```bash
# Make script executable
chmod +x deploy-vps.sh

# Run deployment
./deploy-vps.sh
```

Script akan otomatis:
- ✅ Check .env.production
- ✅ Stop containers lama
- ✅ Build images baru
- ✅ Start containers
- ✅ Wait services ready
- ✅ Health check
- ✅ Show status

### 5. Verify Deployment

```bash
# Check status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Run diagnostics
chmod +x vps-check.sh
./vps-check.sh
```

---

## 🔄 Update Deployment (Pull Changes)

```bash
# Di VPS
cd /home/backend-smart-farming

# Pull latest changes
git pull

# Redeploy
./deploy-vps.sh
```

---

## 🛠️ Troubleshooting

### Container tidak start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check database
docker-compose -f docker-compose.prod.yml logs timescaledb
```

### Database connection error - `EAI_AGAIN timescaledb`

**Symptoms:**
```
Error: getaddrinfo EAI_AGAIN timescaledb
```

**Cause:** DNS resolution race condition saat container baru start. Backend mencoba connect sebelum Docker DNS ready.

**Solution:** 

1. **Automatic Retry** - Backend akan retry otomatis, biasanya berhasil dalam 1-2 detik
2. **Wait for DB Script** - Script `wait-for-db.sh` sudah menghandle ini
3. **Restart jika persist:**
   ```bash
   docker-compose -f docker-compose.prod.yml restart backend
   ```

**Prevention:** Pastikan `depends_on` dengan `service_healthy` sudah configured di docker-compose.prod.yml

### Database connection error (general)

```bash
# Masuk ke container backend
docker exec -it smartfarming-backend sh

# Test DB connection
nc -zv timescaledb 5432

# Check environment variables
env | grep DATABASE
```

### MQTT connection error

```bash
# Check MQTT credentials di .env.production
cat .env.production | grep MQTT

# Check logs for MQTT connection
docker-compose -f docker-compose.prod.yml logs backend | grep -i mqtt
```

### Auto drip tidak jalan

```bash
# Check timezone
docker exec -it smartfarming-backend date

# Harus output: ... WIB (GMT+7)

# Check scheduler logs
docker-compose -f docker-compose.prod.yml logs backend | grep -i "AutoDrip"
```

---

## 📊 Monitoring

### Check Container Resources

```bash
docker stats
```

### Check Disk Space

```bash
df -h
docker system df
```

### Clean Up Old Images

```bash
docker system prune -a
```

---

## 🔐 Security Checklist

- ✅ Ubah JWT secrets di production
- ✅ Gunakan strong password untuk database
- ✅ Jangan expose port 5432 (database) ke public
- ✅ Gunakan firewall (ufw atau iptables)
- ✅ Setup SSL/TLS untuk API (nginx reverse proxy)
- ✅ Regular backup database

---

## 📝 Environment Variable Reference

### Perbedaan Lokal vs VPS

| Variable | Local (.env) | VPS (.env.production) |
|----------|-------------|----------------------|
| `DATABASE_HOST` | `localhost` atau `timescaledb` | `timescaledb` |
| `DATABASE_PASSWORD` | `smartfarming123!` | `smartfarming123!` (SAMA) |
| `JWT_ACCESS_SECRET` | generated | generated (SAMA) |
| `MQTT_*` | HiveMQ credentials | HiveMQ credentials (SAMA) |
| `TZ` | `Asia/Jakarta` | `Asia/Jakarta` (SAMA) |
| `NODE_ENV` | `development` | `production` |

**KONSEP:** Password dan credentials SAMA antara lokal dan VPS untuk kemudahan development dan deployment. Hanya `NODE_ENV` yang berbeda.

---

## 🎯 Quick Commands

```bash
# Start production
./deploy-vps.sh

# Monitor real-time (auto refresh every 5s)
./monitor-vps.sh

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# View logs (last 100 lines)
docker-compose -f docker-compose.prod.yml logs --tail=100 backend

# Stop all
docker-compose -f docker-compose.prod.yml down

# Restart backend only
docker-compose -f docker-compose.prod.yml restart backend

# Check resource usage
docker stats

# Database backup
docker exec smartfarming-timescaledb pg_dump -U smartfarming smartfarming > backup_$(date +%Y%m%d).sql

# Database restore
docker exec -i smartfarming-timescaledb psql -U smartfarming smartfarming < backup_20260219.sql
```

---

## 📞 Support

Jika ada masalah:

1. Jalankan diagnostic: `./vps-check.sh`
2. Check logs: `docker-compose -f docker-compose.prod.yml logs -f`
3. Verify .env.production values
4. Check VPS resources: `docker stats` dan `df -h`

---

**Last Updated:** 2026-02-19
**Version:** 1.0
