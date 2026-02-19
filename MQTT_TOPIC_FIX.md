# 🐛 MQTT Topic Issue - Troubleshooting Guide

## Problem

Manual drip di VPS publish ke topic **salah**:
- ❌ VPS: `Smartfarming/device1` (SALAH)
- ✅ Lokal: `Smartfarming/device1/command` (BENAR)

ESP32 subscribe ke `Smartfarming/device1/command`, jadi message tidak diterima di VPS.

## Root Cause

Database di VPS memiliki `mqtt_topic` yang tidak lengkap:
- Database VPS: `Smartfarming/device1` (tanpa `/command`)
- Database Lokal: `Smartfarming/device1/command` (dengan `/command`)

Karena code sudah di-fix untuk **TIDAK** append `/command` lagi, database harus menyimpan topic LENGKAP.

## Code History

### Sebelumnya (SALAH)
```typescript
// ZoneControlUseCase.ts
const commandTopic = `${device.mqttTopic}/command`; // ❌ Double append
await this.mqttClient.publish(commandTopic, payload);
```

Ini menyebabkan topic jadi `Smartfarming/device1/command/command` (double).

### Sesudah Fix (BENAR)
```typescript
// ZoneControlUseCase.ts
await this.mqttClient.publish(device.mqttTopic, payload); // ✅ Langsung pakai
```

Sekarang code langsung pakai `device.mqttTopic` dari database.

**JADI:** Database **HARUS** simpan topic lengkap dengan `/command`!

## Solution

### Option 1: Update Database di VPS (Quick Fix)

Jalankan script di VPS:

```bash
cd /var/www/agrogonta
chmod +x fix-mqtt-topic-vps.sh
./fix-mqtt-topic-vps.sh
```

Script akan:
1. Show current mqtt_topic
2. Confirm dengan user
3. Update semua devices (device1, device2, device3)
4. Restart backend
5. Verify changes

**Manual SQL** (jika prefer manual):

```bash
# Login ke database
docker exec -it smartfarming-timescaledb psql -U smartfarming -d smartfarming

# Update mqtt_topic
UPDATE devices 
SET mqtt_topic = 'Smartfarming/device1/command', 
    updated_at = NOW() 
WHERE id = 'f17ee499-c275-4197-8fef-2a30271a3380';

UPDATE devices 
SET mqtt_topic = 'Smartfarming/device2/command', 
    updated_at = NOW() 
WHERE id = 'd17ee499-c275-4197-8fef-2a30271a3381';

UPDATE devices 
SET mqtt_topic = 'Smartfarming/device3/command', 
    updated_at = NOW() 
WHERE id = 'd17ee499-c275-4197-8fef-2a30271a3382';

# Verify
SELECT id, name, mqtt_topic FROM devices;

# Exit
\q

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Option 2: Recreate Database (Clean Slate)

Jika mau start fresh:

```bash
# Backup dulu (jika ada data penting)
docker exec smartfarming-timescaledb pg_dump -U smartfarming smartfarming > backup_before_fix.sql

# Drop & recreate
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d

# init-db.sql sudah di-fix, jadi akan create dengan topic yang benar
```

## Verification

### 1. Check Database

```bash
docker exec smartfarming-timescaledb psql -U smartfarming -d smartfarming -c \
  "SELECT name, mqtt_topic FROM devices;"
```

**Expected:**
```
       name        |          mqtt_topic
-------------------+-------------------------------
 ESP32 Device 1    | Smartfarming/device1/command
 ESP32 Device 2    | Smartfarming/device2/command
 ESP32 Device 3    | Smartfarming/device3/command
```

### 2. Test Manual Drip

```bash
# Trigger manual drip via API
curl -X POST http://your-vps-ip:3001/watering/control \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "deviceId": "f17ee499-c275-4197-8fef-2a30271a3380",
    "action": "START_WATERING",
    "duration": 10,
    "zone": "A"
  }'

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

**Expected Log:**
```
📤 Published to Smartfarming/device1/command: {"command":"START_WATERING",...}
```

### 3. Monitor MQTT Broker

Di HiveMQ Cloud Console, subscribe ke `Smartfarming/+/command` dan lihat message masuk.

## Prevention

### Database Migration Files Fixed

File yang sudah di-update:
- ✅ `init-db.sql` - Device insert dengan `/command`
- ✅ `migrations/004_insert_initial_devices.sql` - Device insert dengan `/command`

**Future deployments** akan otomatis correct.

### Code Pattern

**ALWAYS** simpan topic lengkap di database:

```typescript
// ✅ BENAR - Save full topic
const device = new Device(
  id,
  name,
  'ESP32_WATERING_CONTROLLER',
  'Smartfarming/device1/command', // Full topic
  status
);

// ✅ BENAR - Use directly
await mqttClient.publish(device.mqttTopic, payload);
```

**NEVER** append suffix di code:

```typescript
// ❌ SALAH - Jangan append
const topic = `${device.mqttTopic}/command`; 
```

## Files Updated

1. `init-db.sql` - Line 97: `'Smartfarming/device1/command'`
2. `migrations/004_insert_initial_devices.sql`:
   - Line 18: `'Smartfarming/device1/command'`
   - Line 47: `'Smartfarming/device2/command'`
   - Line 61: `'Smartfarming/device3/command'`
3. `fix-mqtt-topic-vps.sh` - New script untuk update VPS database

## Related Issues

- ESP32_COMPLETE_FLOW.md - Documented correct topic format
- ZoneControlUseCase.ts - Fixed to use direct topic (no append)
- ControlWateringUseCase.ts - Fixed to use direct topic (no append)

## Summary

| Environment | Before | After | Status |
|-------------|--------|-------|--------|
| **Lokal** | `Smartfarming/device1/command` | `Smartfarming/device1/command` | ✅ OK |
| **VPS** | `Smartfarming/device1` ❌ | `Smartfarming/device1/command` | 🔧 Need Fix |

**Action Required:** Run `./fix-mqtt-topic-vps.sh` di VPS production server.

---

**Last Updated:** 2026-02-19  
**Issue:** MQTT topic mismatch VPS vs Local  
**Status:** Documented & Fix Script Ready
