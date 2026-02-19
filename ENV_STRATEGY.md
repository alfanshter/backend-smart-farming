# 🔐 Environment Configuration Strategy

## 📖 Konsep Unified Environment

Smart Farming Backend menggunakan **strategi unified environment** di mana credentials dan konfigurasi penting **SAMA** antara local development dan VPS production.

### ✅ Keuntungan

1. **Konsistensi** - Tidak bingung password berbeda-beda
2. **Kemudahan Deploy** - Copy .env langsung bisa dipakai
3. **Testing Akurat** - Environment lokal sama dengan production
4. **Troubleshooting Mudah** - Jika works lokal, pasti works di VPS

### ⚠️ Yang Berbeda

Hanya **1 variable** yang berbeda:

| Variable | Local | VPS Production |
|----------|-------|----------------|
| `NODE_ENV` | `development` | `production` |

Sisanya? **SAMA SEMUA!**

---

## 📂 File Environment Structure

```
backend-smart-farming/
├── .env.example          # Template (reference untuk semua env)
├── .env                  # Local development (gitignored)
├── .env.docker           # Docker local dev (gitignored)
├── .env.production       # VPS production (committed, tapi bisa diganti)
└── docker-compose files
```

### .env.example (Template)

```bash
# TEMPLATE - Copy ke .env dan sesuaikan
DATABASE_PASSWORD=CHANGE_THIS_PASSWORD_123
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this-in-production
```

### .env (Local Development)

```bash
# ACTUAL VALUES - Jangan commit ke git!
DATABASE_PASSWORD=smartfarming123!
JWT_ACCESS_SECRET=8cb3e1edbaade429342810ed20fbc27be235dec06b7b241b86d92fa6bf43d546
```

### .env.production (VPS)

```bash
# SAMA dengan .env lokal!
DATABASE_PASSWORD=smartfarming123!
JWT_ACCESS_SECRET=8cb3e1edbaade429342810ed20fbc27be235dec06b7b241b86d92fa6bf43d546
NODE_ENV=production  # <-- INI YANG BEDA
```

---

## 🔄 Workflow Development → Production

### 1️⃣ Setup Lokal (Pertama Kali)

```bash
# Copy template
cp .env.example .env

# Edit dengan credentials
nano .env

# Set database password
DATABASE_PASSWORD=smartfarming123!

# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste ke JWT_ACCESS_SECRET dan JWT_REFRESH_SECRET
```

### 2️⃣ Test Lokal

```bash
# Run dengan Docker
docker-compose -f docker-compose.dev.yml up -d

# Check works
curl http://localhost:3001/health
```

### 3️⃣ Deploy ke VPS

```bash
# SSH ke VPS
ssh root@your-vps-ip

# Clone repo
git clone ... && cd backend-smart-farming

# .env.production sudah ready dengan credentials SAMA!
# Langsung deploy
./deploy-vps.sh
```

**TIDAK PERLU** edit .env.production karena sudah sama dengan lokal! 🎉

---

## 🗂️ Variable Categories

### 1. Database Credentials (SAMA)

```bash
DATABASE_HOST=timescaledb       # Docker service name
DATABASE_PASSWORD=smartfarming123!  # SAMA lokal & VPS
POSTGRES_PASSWORD=smartfarming123!  # SAMA lokal & VPS
```

**Why SAMA?**
- Testing lokal = testing production environment
- Restore database backup dari VPS ke lokal works langsung
- Developer tidak perlu hafal 2 password berbeda

### 2. JWT Secrets (SAMA)

```bash
JWT_ACCESS_SECRET=8cb3e1edbaade429342810ed20fbc27be235dec06b7b241b86d92fa6bf43d546
JWT_REFRESH_SECRET=0466eaed82b030fe0c3c0689d5106bb8e5bdd73a596a17b4dc7de90f0f3d2f40
```

**Why SAMA?**
- Token generated di lokal bisa ditest di VPS
- Tidak perlu re-login saat pindah environment
- Testing authentication flow lebih mudah

### 3. MQTT Credentials (SAMA)

```bash
MQTT_BROKER_URL=mqtts://6da97578cebb460eab0c5e7cff55862d.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=alfanshter
MQTT_PASSWORD=Alfan@Dinda123
```

**Why SAMA?**
- HiveMQ Cloud single account untuk dev & prod
- Testing MQTT message flow works sama persis
- ESP32 device connect ke broker yang sama

### 4. Timezone (SAMA)

```bash
TZ=Asia/Jakarta
PGTZ=Asia/Jakarta
```

**Why SAMA?**
- Auto drip schedule based on Indonesian time (WIB)
- Database timestamp consistent
- Log timestamp mudah dibaca (no UTC confusion)

---

## 🎯 Kapan Perlu Berbeda?

### Production Security Best Practice

Jika project **production serius** dengan **security critical**, bisa buat berbeda:

```bash
# Local .env
DATABASE_PASSWORD=dev_password_123
JWT_ACCESS_SECRET=dev_secret_abc

# VPS .env.production
DATABASE_PASSWORD=super_secure_prod_password_XyZ!@#
JWT_ACCESS_SECRET=prod_secret_very_long_random_string
```

**Trade-off:**
- ✅ Lebih secure (data production terisolasi)
- ❌ Lebih ribet manage credentials
- ❌ Testing tidak sama persis dengan production

**Untuk Smart Farming (IoT project, private VPS):**
- Password sama = **OK dan recommended** ✅
- Lebih praktis untuk development & maintenance

---

## 🛡️ Security Measures

Meski password sama, tetap aman karena:

### 1. Network Isolation

```yaml
# docker-compose.prod.yml
timescaledb:
  # ❌ TIDAK expose port ke public
  # ports:
  #   - "5432:5432"  # COMMENTED OUT!
```

Database **HANYA** accessible dari dalam Docker network. Public internet tidak bisa akses.

### 2. Strong Passwords

```bash
DATABASE_PASSWORD=smartfarming123!  # Kombinasi huruf, angka, simbol
JWT_ACCESS_SECRET=64_character_hex_string  # Cryptographically random
```

### 3. MQTT SSL/TLS

```bash
MQTT_BROKER_URL=mqtts://...  # mqtts = MQTT over TLS
```

Komunikasi MQTT encrypted.

### 4. Environment File Protection

```bash
# .gitignore
.env
.env.docker
```

Lokal .env files tidak masuk git. Hanya .env.production (opsional) yang committed.

---

## 📋 Checklist Setup

### ✅ Local Development

- [ ] Copy `.env.example` ke `.env`
- [ ] Set `DATABASE_PASSWORD`
- [ ] Generate & set `JWT_ACCESS_SECRET`
- [ ] Generate & set `JWT_REFRESH_SECRET`
- [ ] Verify `MQTT_*` credentials
- [ ] Set `TZ=Asia/Jakarta`
- [ ] Test dengan `docker-compose -f docker-compose.dev.yml up -d`

### ✅ VPS Production

- [ ] `.env.production` sudah ada di repo
- [ ] Verify credentials SAMA dengan lokal
- [ ] Verify `NODE_ENV=production`
- [ ] Run `./deploy-vps.sh`
- [ ] Check dengan `./vps-check.sh`
- [ ] Test API endpoint
- [ ] Test auto drip scheduler

---

## 🔍 Troubleshooting Environment

### Problem: "Password authentication failed"

```bash
# Check variable di container
docker exec -it smartfarming-backend env | grep DATABASE_PASSWORD

# Harus match dengan POSTGRES_PASSWORD di timescaledb container
docker exec -it smartfarming-timescaledb env | grep POSTGRES_PASSWORD
```

**Fix:** Pastikan `DATABASE_PASSWORD` dan `POSTGRES_PASSWORD` sama di .env file.

### Problem: "JWT malformed"

```bash
# Check JWT secrets
docker exec -it smartfarming-backend env | grep JWT

# Pastikan JWT_ACCESS_SECRET ada dan valid
```

**Fix:** Regenerate JWT secret dengan `crypto.randomBytes(32).toString('hex')`.

### Problem: "MQTT connection refused"

```bash
# Check MQTT config
docker exec -it smartfarming-backend env | grep MQTT

# Test MQTT dari container
docker exec -it smartfarming-backend sh
apk add mosquitto-clients
mosquitto_pub -h 6da97578cebb460eab0c5e7cff55862d.s1.eu.hivemq.cloud \
  -p 8883 --cafile /etc/ssl/certs/ca-certificates.crt \
  -u alfanshter -P 'Alfan@Dinda123' \
  -t 'test' -m 'hello'
```

**Fix:** Verify MQTT credentials di HiveMQ Cloud dashboard.

---

## 💡 Best Practices

### 1. Document Your Credentials

Buat file lokal (jangan commit) untuk track credentials:

```bash
# credentials.txt (add to .gitignore)
Database: smartfarming123!
JWT Access: 8cb3e1e...
JWT Refresh: 0466eae...
MQTT User: alfanshter
MQTT Pass: Alfan@Dinda123
```

### 2. Backup .env Files

```bash
# Backup sebelum update
cp .env .env.backup.$(date +%Y%m%d)
cp .env.production .env.production.backup.$(date +%Y%m%d)
```

### 3. Validate Environment

Buat script validate:

```bash
#!/bin/bash
# validate-env.sh

required_vars=(
  "DATABASE_PASSWORD"
  "JWT_ACCESS_SECRET"
  "JWT_REFRESH_SECRET"
  "MQTT_BROKER_URL"
  "MQTT_USERNAME"
  "MQTT_PASSWORD"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
    exit 1
  fi
done

echo "✅ All required variables set"
```

### 4. Use .env.example as Source of Truth

Setiap kali add variable baru:

1. Tambahkan ke `.env.example` dengan nilai placeholder
2. Tambahkan ke `.env` dengan nilai actual
3. Tambahkan ke `.env.production` dengan nilai actual
4. Update docker-compose files untuk read variable
5. Update documentation

---

## 📚 References

- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [Node.js crypto module](https://nodejs.org/api/crypto.html)
- [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/)

---

**Last Updated:** 2026-02-19  
**Strategy:** Unified Environment dengan Same Credentials  
**Security Level:** Medium (suitable untuk IoT private project)
