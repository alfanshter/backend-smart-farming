# 🚀 VPS Quick Reference Card

## 📦 Deployment

### Initial Setup (First Time Only)
```bash
# 1. Clone repository
git clone https://github.com/alfanshter/backend-smart-farming.git
cd backend-smart-farming

# 2. Create production env file
cp .env.docker .env.production
nano .env.production  # Edit with your production credentials

# 3. Deploy
./deploy-vps.sh
```

### Update/Redeploy
```bash
# Pull latest code
git pull origin main

# Redeploy
./deploy-vps.sh
```

## 🔍 Troubleshooting

### Run Health Check
```bash
./vps-check.sh
```

### Quick Commands

**View Logs:**
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Backend only
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

**Container Status:**
```bash
docker-compose -f docker-compose.prod.yml ps
```

**Restart Services:**
```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart backend only
docker-compose -f docker-compose.prod.yml restart backend

# Restart database only
docker-compose -f docker-compose.prod.yml restart timescaledb
```

**Stop/Start:**
```bash
# Stop
docker-compose -f docker-compose.prod.yml down

# Start
docker-compose -f docker-compose.prod.yml up -d

# Stop and remove volumes (DANGER!)
docker-compose -f docker-compose.prod.yml down -v
```

## 🗄️ Database Commands

**Connect to Database:**
```bash
docker-compose -f docker-compose.prod.yml exec timescaledb psql -U smartfarming -d smartfarming
```

**Run SQL Query:**
```bash
docker-compose -f docker-compose.prod.yml exec -T timescaledb psql -U smartfarming -d smartfarming -c "SELECT NOW();"
```

**Backup Database:**
```bash
docker-compose -f docker-compose.prod.yml exec -T timescaledb pg_dump -U smartfarming smartfarming > backup-$(date +%Y%m%d-%H%M%S).sql
```

**Restore Database:**
```bash
cat backup-20260219-153000.sql | docker-compose -f docker-compose.prod.yml exec -T timescaledb psql -U smartfarming -d smartfarming
```

**Check Auto Drip Schedules:**
```bash
docker-compose -f docker-compose.prod.yml exec -T timescaledb psql -U smartfarming -d smartfarming -c "SELECT * FROM auto_drip_schedules;"
```

## 🔧 Common Issues & Fixes

### Issue: TimescaleDB not connecting

```bash
# Check if container is running
docker-compose -f docker-compose.prod.yml ps timescaledb

# Check logs
docker-compose -f docker-compose.prod.yml logs timescaledb

# Restart
docker-compose -f docker-compose.prod.yml restart timescaledb
```

### Issue: Backend can't connect to database

```bash
# Check environment variables
docker-compose -f docker-compose.prod.yml exec backend env | grep DB

# Test database connection from backend
docker-compose -f docker-compose.prod.yml exec backend sh -c "psql -h timescaledb -U smartfarming -d smartfarming -c 'SELECT 1'"

# Check wait-for-db logs
docker-compose -f docker-compose.prod.yml logs backend | grep "wait-for-db"
```

### Issue: Port 3001 not accessible

```bash
# Check if port is listening
sudo netstat -tulpn | grep 3001

# Check firewall
sudo ufw status

# Open port
sudo ufw allow 3001/tcp
sudo ufw reload
```

### Issue: MQTT not connecting

```bash
# Check MQTT logs
docker-compose -f docker-compose.prod.yml logs backend | grep -i mqtt

# Verify credentials in .env.production
cat .env.production | grep MQTT

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Issue: Auto Drip not running

```bash
# Check scheduler logs
docker-compose -f docker-compose.prod.yml logs backend | grep -i "AutoDripScheduler"

# Check timezone
docker-compose -f docker-compose.prod.yml exec backend date

# Check schedules in database
docker-compose -f docker-compose.prod.yml exec -T timescaledb psql -U smartfarming -d smartfarming -c "SELECT id, is_active, time_slots FROM auto_drip_schedules;"
```

## 📊 Monitoring

**Container Resource Usage:**
```bash
docker stats
```

**Disk Space:**
```bash
df -h
docker system df
```

**Clean Up:**
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (CAREFUL!)
docker system prune -a --volumes
```

## 🔐 Security

**Change Database Password:**
```bash
# 1. Update .env.production
nano .env.production
# Change POSTGRES_PASSWORD and DATABASE_PASSWORD

# 2. Recreate containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

**Firewall Setup:**
```bash
# Enable firewall
sudo ufw enable

# Allow SSH (IMPORTANT!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow API port
sudo ufw allow 3001/tcp

# Check status
sudo ufw status
```

## 🌐 API Endpoints

### Health Check
```bash
curl http://localhost:3001
```

### Test Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartfarming.com","password":"admin123"}'
```

### Check Auto Drip
```bash
curl http://localhost:3001/auto-drip \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📞 Emergency Commands

**Complete Restart:**
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

**View All Errors:**
```bash
docker-compose -f docker-compose.prod.yml logs | grep -i error
```

**Stop Everything:**
```bash
docker-compose -f docker-compose.prod.yml down
```

---

**Need Help?** Run `./vps-check.sh` for detailed system diagnostics.
