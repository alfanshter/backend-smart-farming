# 🚀 VPS Deployment Guide - Smart Farming Backend

## 📋 Checklist Deployment

### 1️⃣ Persiapan VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group (agar tidak perlu sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

### 2️⃣ Clone Repository

```bash
# Clone repository
git clone https://github.com/alfanshter/backend-smart-farming.git
cd backend-smart-farming

# Checkout ke branch yang benar
git checkout main
git pull origin main
```

### 3️⃣ Setup Environment Variables

```bash
# Copy example env file
cp .env.docker .env.production

# Edit .env.production dengan credentials yang aman
nano .env.production
```

**File `.env.production`:**
```bash
# Database Configuration
DATABASE_HOST=timescaledb
DATABASE_PORT=5432
DATABASE_USER=smartfarming
DATABASE_PASSWORD=GANTI_PASSWORD_YANG_KUAT_123!@#
DATABASE_NAME=smartfarming

# Database (untuk wait script)
DB_HOST=timescaledb
DB_PORT=5432
DB_USERNAME=smartfarming
DB_PASSWORD=GANTI_PASSWORD_YANG_KUAT_123!@#
DB_NAME=smartfarming

# JWT Configuration - WAJIB GANTI!
JWT_ACCESS_SECRET=GENERATE_RANDOM_STRING_64_CHARACTERS_HERE_12345678901234567890
JWT_ACCESS_EXPIRES_IN=7d
JWT_REFRESH_SECRET=GENERATE_ANOTHER_RANDOM_STRING_64_CHARACTERS_HERE_0987654321
JWT_REFRESH_EXPIRES_IN=30d

# MQTT Configuration (HiveMQ Cloud)
MQTT_BROKER_URL=mqtts://6da97578cebb460eab0c5e7cff55862d.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=alfanshter
MQTT_PASSWORD=Alfan@Dinda123

# Application
NODE_ENV=production
PORT=3001

# PostgreSQL Environment (untuk TimescaleDB container)
POSTGRES_DB=smartfarming
POSTGRES_USER=smartfarming
POSTGRES_PASSWORD=GANTI_PASSWORD_YANG_KUAT_123!@#
```

### 4️⃣ Update docker-compose.prod.yml

Pastikan `docker-compose.prod.yml` sudah benar dan menggunakan `.env.production`:

```bash
# Edit docker-compose.prod.yml
nano docker-compose.prod.yml
```

### 5️⃣ Deploy ke Production

```bash
# Stop container yang lama (jika ada)
docker-compose -f docker-compose.prod.yml down

# Build dan start dengan production config
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Cek status container
docker-compose -f docker-compose.prod.yml ps

# Cek logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 6️⃣ Verifikasi Deployment

**Cek TimescaleDB:**
```bash
docker-compose -f docker-compose.prod.yml exec timescaledb psql -U smartfarming -d smartfarming -c "SELECT NOW();"
```

**Cek Backend Health:**
```bash
curl http://localhost:3001
```

**Cek MQTT Connection:**
```bash
docker-compose -f docker-compose.prod.yml logs backend | grep MQTT
```

**Cek Auto Drip Scheduler:**
```bash
docker-compose -f docker-compose.prod.yml logs backend | grep "Auto Drip Scheduler"
```

### 7️⃣ Setup Nginx Reverse Proxy (Optional)

```bash
# Install Nginx
sudo apt install nginx -y

# Create config
sudo nano /etc/nginx/sites-available/smartfarming
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Ganti dengan domain Anda

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/smartfarming /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 8️⃣ Setup SSL dengan Let's Encrypt (Optional)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

## 🔧 Troubleshooting

### Problem: TimescaleDB tidak bisa connect

**Solution:**
```bash
# Cek status container
docker-compose -f docker-compose.prod.yml ps

# Cek logs database
docker-compose -f docker-compose.prod.yml logs timescaledb

# Restart database
docker-compose -f docker-compose.prod.yml restart timescaledb

# Wait for healthy
docker-compose -f docker-compose.prod.yml ps
```

### Problem: Backend error "Cannot connect to database"

**Solution:**
```bash
# Cek environment variables
docker-compose -f docker-compose.prod.yml exec backend env | grep DB

# Cek wait-for-db script
docker-compose -f docker-compose.prod.yml logs backend | grep "wait-for-db"

# Manual test connection
docker-compose -f docker-compose.prod.yml exec backend sh -c "psql -h timescaledb -U smartfarming -d smartfarming -c 'SELECT 1'"
```

### Problem: MQTT tidak connect

**Solution:**
```bash
# Cek MQTT credentials di .env.production
cat .env.production | grep MQTT

# Test MQTT connection
docker-compose -f docker-compose.prod.yml logs backend | grep "MQTT"

# Verify HiveMQ credentials di web console
# https://console.hivemq.cloud/
```

### Problem: Auto Drip tidak jalan

**Solution:**
```bash
# Cek scheduler logs
docker-compose -f docker-compose.prod.yml logs backend | grep "AutoDripScheduler"

# Cek timezone
docker-compose -f docker-compose.prod.yml exec backend date

# Cek schedules di database
docker-compose -f docker-compose.prod.yml exec timescaledb psql -U smartfarming -d smartfarming -c "SELECT * FROM auto_drip_schedules;"

# Set timezone jika salah (sudah di docker-compose.prod.yml)
# TZ=Asia/Jakarta
```

## 📊 Monitoring Commands

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f timescaledb

# Check resource usage
docker stats

# Check disk space
df -h
docker system df

# Clean up old images
docker system prune -a
```

## 🔄 Update/Redeploy

```bash
# Pull latest code
cd backend-smart-farming
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

## 🔐 Security Checklist

- [ ] Ganti semua default passwords
- [ ] Generate JWT secrets yang kuat (64+ characters)
- [ ] Database password yang kuat
- [ ] Disable pgAdmin di production (uncomment di docker-compose.prod.yml)
- [ ] Setup firewall (UFW)
- [ ] Setup SSL/HTTPS
- [ ] Restrict database port (jangan expose 5432 ke public)
- [ ] Setup backup database
- [ ] Enable Docker logging driver

## 🗄️ Backup Database

```bash
# Manual backup
docker-compose -f docker-compose.prod.yml exec timescaledb pg_dump -U smartfarming smartfarming > backup-$(date +%Y%m%d).sql

# Restore backup
cat backup-20260219.sql | docker-compose -f docker-compose.prod.yml exec -T timescaledb psql -U smartfarming -d smartfarming
```

## 📝 Firewall Setup (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (PENTING! Jangan sampai kunci diri sendiri)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow API port (jika tidak pakai Nginx)
sudo ufw allow 3001/tcp

# Check status
sudo ufw status
```

---

**Date:** 19 February 2026  
**Status:** ✅ PRODUCTION READY  
**Timezone:** WIB (Asia/Jakarta)
