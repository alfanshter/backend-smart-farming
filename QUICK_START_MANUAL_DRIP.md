# 🚰 Quick Start - Manual Drip Irrigation Control

## ✅ Sistem Sudah Siap!

Backend untuk **manual drip irrigation** sudah lengkap dan running dengan fitur:

### 🎯 Fitur Utama
- ✅ **Multiple Zones** - Kontrol penyiraman per zona (Zona A, B, C, dst)
- ✅ **ON/OFF Control** - Start/stop penyiraman per zona
- ✅ **Duration Timer** - Set durasi penyiraman (menit + detik)
- ✅ **Auto-Stop** - Otomatis stop setelah durasi selesai
- ✅ **Real-time Countdown** - Monitor sisa waktu penyiraman
- ✅ **Parallel Zones** - Bisa nyiram beberapa zona bersamaan
- ✅ **Emergency Stop** - Stop semua zona sekaligus
- ✅ **MQTT Integration** - Command ke ESP32 via MQTT

---

## 🧪 Test Cepat dengan Script

```bash
# Test otomatis semua fitur
./test-manual-drip.sh
```

Script ini akan test:
1. Login
2. List semua zona
3. Start penyiraman 30 detik
4. Monitor countdown real-time
5. Stop manual
6. Test parallel watering
7. Emergency stop

---

## 📱 Test Manual di Postman

### 1. Login
```http
POST http://localhost:3001/auth/login
{
  "email": "admin@smartfarming.com",
  "password": "Admin123!"
}
```
**Simpan `accessToken` dari response!**

### 2. Lihat Semua Zona
```http
GET http://localhost:3001/zones
Authorization: Bearer {accessToken}
```

Response:
```json
[
  {
    "id": "a0000000-0000-0000-0000-000000000001",
    "name": "Zona A",
    "deviceId": "f17ee499-c275-4197-8fef-2a30271a3380",
    "isActive": false,
    "durationMinutes": 8,
    "durationSeconds": 20
  }
]
```

### 3. Mulai Penyiraman (Misal: 10 menit 5 detik)
```http
POST http://localhost:3001/zones/control
Authorization: Bearer {accessToken}

{
  "zoneId": "a0000000-0000-0000-0000-000000000001",
  "action": "start",
  "durationMinutes": 10,
  "durationSeconds": 5
}
```

Response:
```json
{
  "success": true,
  "message": "Zone Zona A watering started for 10 minutes 5 seconds",
  "zone": {
    "isActive": true,
    "startedAt": "2026-02-09T03:00:00.000Z",
    "remainingSeconds": 605
  },
  "mqttPublished": {
    "topic": "Smartfarming/device1/control",
    "payload": {
      "command": "START_WATERING",
      "durationSeconds": 605
    }
  }
}
```

**Yang Terjadi:**
- ✅ Database update: zona aktif
- ✅ MQTT kirim command ke ESP32
- ✅ Timer countdown mulai
- ⏰ Setelah 10 menit 5 detik → auto-stop!

### 4. Cek Status Real-time (Countdown)
```http
GET http://localhost:3001/zones/{zoneId}/status
Authorization: Bearer {accessToken}
```

Response:
```json
{
  "isActive": true,
  "remainingSeconds": 423,
  "progress": 30.08,
  "estimatedEndTime": "2026-02-09T03:10:05.000Z"
}
```

**Frontend bisa polling endpoint ini setiap 1 detik untuk update countdown!**

### 5. Stop Manual (Kalau Mau Stop Sebelum Selesai)
```http
POST http://localhost:3001/zones/control
Authorization: Bearer {accessToken}

{
  "zoneId": "a0000000-0000-0000-0000-000000000001",
  "action": "stop"
}
```

### 6. Emergency Stop (Matikan Semua Zona)
```http
POST http://localhost:3001/zones/emergency-stop
Authorization: Bearer {accessToken}
```

---

## 💡 Contoh Use Case

### Use Case 1: Penyiraman Pagi (15 menit)
```bash
curl -X POST http://localhost:3001/zones/control \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "zoneId": "a0000000-0000-0000-0000-000000000001",
    "action": "start",
    "durationMinutes": 15,
    "durationSeconds": 0
  }'
```

### Use Case 2: Test Cepat (30 detik)
```bash
curl -X POST http://localhost:3001/zones/control \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "zoneId": "a0000000-0000-0000-0000-000000000001",
    "action": "start",
    "durationMinutes": 0,
    "durationSeconds": 30
  }'
```

### Use Case 3: Parallel Watering (Zona A & B)
```bash
# Start Zona A (10 menit)
curl -X POST http://localhost:3001/zones/control \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"zoneId": "a0000000-0000-0000-0000-000000000001", "action": "start", "durationMinutes": 10, "durationSeconds": 0}'

# Start Zona B (15 menit) - parallel!
curl -X POST http://localhost:3001/zones/control \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"zoneId": "a0000000-0000-0000-0000-000000000002", "action": "start", "durationMinutes": 15, "durationSeconds": 0}'
```

---

## 📊 Database

### Zones yang Tersedia
```
Zona A → ESP32 Device 1
Zona B → ESP32 Device 2
Zona C → ESP32 Device 3
```

### Check Database
```bash
PGPASSWORD=smartfarming123 psql -h localhost -p 5432 -U smartfarming -d smartfarming \
  -c "SELECT name, is_active, duration_minutes, duration_seconds FROM zones;"
```

### Check Devices
```bash
PGPASSWORD=smartfarming123 psql -h localhost -p 5432 -U smartfarming -d smartfarming \
  -c "SELECT name, status, last_seen FROM devices;"
```

---

## 🔌 ESP32 Integration

### MQTT Topics
```
Subscribe (ESP32):
- Smartfarming/device1/control
- Smartfarming/device2/control
- Smartfarming/device3/control

Publish (ESP32):
- Smartfarming/device1/status
```

### Command Format
```json
// START_WATERING
{
  "command": "START_WATERING",
  "zoneId": "a0000000-0000-0000-0000-000000000001",
  "zoneName": "Zona A",
  "durationSeconds": 605
}

// STOP_WATERING
{
  "command": "STOP_WATERING",
  "zoneId": "a0000000-0000-0000-0000-000000000001"
}
```

### ESP32 Code (Contoh)
```cpp
void callback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);
  
  String command = doc["command"];
  
  if (command == "START_WATERING") {
    digitalWrite(RELAY_PIN, HIGH);  // Pompa ON
    Serial.println("✅ Watering started");
  }
  else if (command == "STOP_WATERING") {
    digitalWrite(RELAY_PIN, LOW);  // Pompa OFF
    Serial.println("🛑 Watering stopped");
  }
}
```

---

## 📚 Dokumentasi Lengkap

1. **MANUAL_DRIP_CONTROL_GUIDE.md** - Panduan lengkap semua fitur
2. **ZONE_CONTROL_DOCUMENTATION.md** - Detail API endpoints
3. **Smart-Farming-Complete-API.postman_collection.json** - Postman collection

---

## ✅ Status Sistem

### Backend
- ✅ Server running di `http://localhost:3001`
- ✅ MQTT connected ke HiveMQ
- ✅ Database ready (users, zones, devices, sensor_data)
- ✅ ESP32 Device 1 ONLINE dan terdeteksi
- ✅ No errors!

### Database Tables
- ✅ `users` - Authentication (admin user ready)
- ✅ `zones` - 3 zones configured
- ✅ `devices` - 3 ESP32 devices registered
- ✅ `sensor_data` - Sensor readings

### API Endpoints Ready
- ✅ `POST /auth/login` - Login
- ✅ `GET /zones` - List zones
- ✅ `POST /zones/control` - Start/stop watering
- ✅ `GET /zones/:id/status` - Real-time countdown
- ✅ `POST /zones/emergency-stop` - Stop all zones

---

## 🎉 Ready to Use!

Sistem manual drip irrigation sudah **100% siap digunakan**!

**Next Steps:**
1. Test di Postman
2. Integrate frontend React component
3. Deploy ke ESP32 dengan MQTT subscriber
4. Test penyiraman real dengan relay

**Happy Smart Farming! 🌱💧**
