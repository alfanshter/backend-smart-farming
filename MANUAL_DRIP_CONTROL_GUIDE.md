# 🌱 Manual Drip Irrigation Control - Panduan Lengkap

## 📋 Overview

Sistem manual drip irrigation memungkinkan kontrol penyiraman per zona dengan timer otomatis. Setiap zona memiliki:
- **Device ESP32** tersendiri untuk kontrol relay
- **Durasi penyiraman** yang bisa diatur (menit + detik)
- **Countdown timer** real-time
- **Auto-stop** setelah durasi selesai

---

## 🏗️ Struktur Database

### Zones Table
```sql
- id (UUID) - ID unik zona
- name (VARCHAR) - Nama zona (Zona A, Zona B, dll)
- description (TEXT) - Deskripsi zona
- device_id (UUID) - ID ESP32 device untuk zona ini
- is_active (BOOLEAN) - Status penyiraman (true = sedang nyiram)
- duration_minutes (INTEGER) - Durasi menit
- duration_seconds (INTEGER) - Durasi detik
- started_at (TIMESTAMP) - Waktu mulai penyiraman
- remaining_seconds (INTEGER) - Sisa waktu (countdown)
- user_id (UUID) - User yang membuat zona
- created_at, updated_at (TIMESTAMP)
```

### Sample Data (Sudah Ada)
```
Zona A → ESP32 Device 1 (f17ee499-c275-4197-8fef-2a30271a3380)
Zona B → ESP32 Device 2 (d17ee499-c275-4197-8fef-2a30271a3381)
Zona C → ESP32 Device 3 (d17ee499-c275-4197-8fef-2a30271a3382)
```

---

## 🎮 Cara Penggunaan

### 1️⃣ **Login Dulu**
```http
POST http://localhost:3001/auth/login

Body:
{
  "email": "admin@smartfarming.com",
  "password": "Admin123!"
}

Response:
{
  "user": { "id": "...", "email": "...", "role": "admin" },
  "accessToken": "eyJhbGc...",
  "refreshToken": "..."
}
```
**Simpan `accessToken` untuk request selanjutnya!**

---

### 2️⃣ **Lihat Semua Zona**
```http
GET http://localhost:3001/zones
Authorization: Bearer {accessToken}

Response:
[
  {
    "id": "a0000000-0000-0000-0000-000000000001",
    "name": "Zona A",
    "description": "Zona penyiraman area A - Greenhouse utara",
    "deviceId": "f17ee499-c275-4197-8fef-2a30271a3380",
    "isActive": false,
    "durationMinutes": 8,
    "durationSeconds": 20
  },
  ...
]
```

---

### 3️⃣ **Mulai Penyiraman Zona**

**Contoh 1: Nyiram Zona A selama 10 menit 5 detik**
```http
POST http://localhost:3001/zones/control
Authorization: Bearer {accessToken}

Body:
{
  "zoneId": "a0000000-0000-0000-0000-000000000001",
  "action": "start",
  "durationMinutes": 10,
  "durationSeconds": 5
}

Response:
{
  "success": true,
  "message": "Zone Zona A watering started for 10 minutes 5 seconds",
  "zone": {
    "id": "a0000000-0000-0000-0000-000000000001",
    "name": "Zona A",
    "isActive": true,
    "durationMinutes": 10,
    "durationSeconds": 5,
    "startedAt": "2026-02-09T02:30:00.000Z",
    "remainingSeconds": 605
  },
  "mqttPublished": {
    "topic": "Smartfarming/device1/control",
    "payload": {
      "command": "START_WATERING",
      "zoneId": "a0000000-0000-0000-0000-000000000001",
      "zoneName": "Zona A",
      "durationSeconds": 605
    }
  }
}
```

**Yang Terjadi di Backend:**
1. ✅ Database update: `is_active = true`, `started_at = NOW()`
2. ✅ Hitung total detik: `10 * 60 + 5 = 605 detik`
3. ✅ MQTT publish ke ESP32: `START_WATERING`
4. ✅ NodeJS setTimeout untuk auto-stop setelah 605 detik
5. ✅ Countdown timer mulai berjalan

**Yang Terjadi di ESP32:**
1. 📥 Terima MQTT command `START_WATERING`
2. ⚡ Relay ON → Pompa/Valve nyala
3. ⏱️ ESP32 tracking durasi 605 detik
4. 🔴 LED indikator menyala (opsional)

---

### 4️⃣ **Cek Status Real-time**
```http
GET http://localhost:3001/zones/{zoneId}/status
Authorization: Bearer {accessToken}

Response:
{
  "id": "a0000000-0000-0000-0000-000000000001",
  "name": "Zona A",
  "isActive": true,
  "startedAt": "2026-02-09T02:30:00.000Z",
  "durationMinutes": 10,
  "durationSeconds": 5,
  "totalDurationSeconds": 605,
  "remainingSeconds": 423,  // ⏳ Countdown!
  "elapsedSeconds": 182,
  "progress": 30.08,  // 30% selesai
  "estimatedEndTime": "2026-02-09T02:40:05.000Z"
}
```

**Frontend bisa pooling endpoint ini setiap 1 detik untuk update countdown timer!**

---

### 5️⃣ **Stop Manual (Kalau Mau Stop Sebelum Selesai)**
```http
POST http://localhost:3001/zones/control
Authorization: Bearer {accessToken}

Body:
{
  "zoneId": "a0000000-0000-0000-0000-000000000001",
  "action": "stop"
}

Response:
{
  "success": true,
  "message": "Zone Zona A watering stopped",
  "zone": {
    "id": "a0000000-0000-0000-0000-000000000001",
    "name": "Zona A",
    "isActive": false,
    "remainingSeconds": null
  },
  "mqttPublished": {
    "topic": "Smartfarming/device1/control",
    "payload": {
      "command": "STOP_WATERING",
      "zoneId": "a0000000-0000-0000-0000-000000000001"
    }
  }
}
```

**Yang Terjadi:**
1. ✅ Batalkan timer countdown
2. ✅ Update database: `is_active = false`
3. ✅ MQTT publish: `STOP_WATERING`
4. ⚡ ESP32 relay OFF → Pompa/Valve mati

---

### 6️⃣ **Emergency Stop All Zones**
```http
POST http://localhost:3001/zones/emergency-stop
Authorization: Bearer {accessToken}

Response:
{
  "success": true,
  "message": "Emergency stop executed for 2 active zones",
  "stoppedZones": ["Zona A", "Zona B"]
}
```

**Untuk keadaan darurat! Stop semua zona sekaligus.**

---

## 🔄 Auto-Stop Mechanism

Ketika durasi selesai (misal 10 menit 5 detik), sistem **otomatis**:

1. ⏰ NodeJS setTimeout selesai
2. 🛑 Database update: `is_active = false`
3. 📤 MQTT publish: `STOP_WATERING` ke ESP32
4. ⚡ ESP32 relay OFF → Pompa mati
5. 📊 Log activity ke database

**Tidak perlu manual stop!** Sistem otomatis matikan setelah durasi habis.

---

## 📱 Contoh Use Case Real

### Scenario 1: Penyiraman Pagi Zona A dan B
```bash
# 1. Zona A - 15 menit
POST /zones/control
{
  "zoneId": "a0000000-0000-0000-0000-000000000001",
  "action": "start",
  "durationMinutes": 15,
  "durationSeconds": 0
}

# 2. Zona B - 10 menit 30 detik (bisa parallel)
POST /zones/control
{
  "zoneId": "a0000000-0000-0000-0000-000000000002",
  "action": "start",
  "durationMinutes": 10,
  "durationSeconds": 30
}

# 3. Monitor progress
GET /zones/a0000000-0000-0000-0000-000000000001/status
GET /zones/a0000000-0000-0000-0000-000000000002/status

# Hasil:
# - Zona A selesai otomatis setelah 15 menit
# - Zona B selesai otomatis setelah 10.5 menit
```

### Scenario 2: Test Singkat 30 Detik
```bash
POST /zones/control
{
  "zoneId": "a0000000-0000-0000-0000-000000000001",
  "action": "start",
  "durationMinutes": 0,
  "durationSeconds": 30
}

# Setelah 30 detik → otomatis stop
```

### Scenario 3: Stop Manual
```bash
# Mulai penyiraman
POST /zones/control
{
  "zoneId": "a0000000-0000-0000-0000-000000000001",
  "action": "start",
  "durationMinutes": 20,
  "durationSeconds": 0
}

# Oh tidak! Hujan! Stop manual
POST /zones/control
{
  "zoneId": "a0000000-0000-0000-0000-000000000001",
  "action": "stop"
}
```

---

## 🎨 Integrasi Frontend

### React Component (Already Provided!)
```jsx
// File sudah ada di ZONE_CONTROL_DOCUMENTATION.md
// Section: Frontend React Component Examples
// Fitur:
// - Select zone dropdown
// - Duration input (minutes + seconds)
// - Start/Stop button
// - Real-time countdown display
// - Progress bar
```

### Polling untuk Countdown
```javascript
// Update countdown setiap 1 detik
useEffect(() => {
  if (zone.isActive) {
    const interval = setInterval(async () => {
      const status = await fetch(`/zones/${zone.id}/status`);
      const data = await status.json();
      setRemainingSeconds(data.remainingSeconds);
      setProgress(data.progress);
    }, 1000);
    
    return () => clearInterval(interval);
  }
}, [zone.isActive]);
```

---

## 🔧 ESP32 Configuration

### MQTT Topics
```
Subscribe (ESP32 menerima):
- Smartfarming/device1/control
- Smartfarming/device2/control
- Smartfarming/device3/control

Publish (ESP32 kirim status):
- Smartfarming/device1/status
- Smartfarming/device1/sensor
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
  "zoneId": "a0000000-0000-0000-0000-000000000001",
  "zoneName": "Zona A"
}
```

### ESP32 Code Structure
```cpp
void callback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);
  
  String command = doc["command"];
  
  if (command == "START_WATERING") {
    int duration = doc["durationSeconds"];
    digitalWrite(RELAY_PIN, HIGH);  // Pompa ON
    startWateringTimer(duration);
  }
  else if (command == "STOP_WATERING") {
    digitalWrite(RELAY_PIN, LOW);  // Pompa OFF
    stopWateringTimer();
  }
}
```

---

## 📊 Database Queries

### Cek Zona yang Aktif
```sql
SELECT name, duration_minutes, duration_seconds, 
       EXTRACT(EPOCH FROM (NOW() - started_at)) as elapsed_seconds
FROM zones 
WHERE is_active = true;
```

### History Penyiraman (Bisa dikembangkan)
```sql
-- Tambah table watering_logs untuk history
CREATE TABLE watering_logs (
  id UUID PRIMARY KEY,
  zone_id UUID REFERENCES zones(id),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  stopped_by VARCHAR(50), -- 'auto' atau 'manual'
  user_id UUID
);
```

---

## ✅ Testing Checklist

- [ ] Login berhasil dapat token
- [ ] GET /zones tampil semua zona
- [ ] POST /zones/control start zona A (10 menit)
- [ ] GET /zones/{id}/status countdown berjalan
- [ ] Tunggu 10 menit → auto-stop
- [ ] POST /zones/control stop manual
- [ ] POST /zones/emergency-stop matikan semua
- [ ] Cek MQTT di HiveMQ console (message published)
- [ ] Test di ESP32 (relay ON/OFF)

---

## 🚀 Next Steps

1. **Test di Postman** - Gunakan collection yang sudah di-update
2. **Monitor MQTT** - Buka HiveMQ console untuk lihat messages
3. **Deploy ke ESP32** - Upload code ke ESP32 untuk test relay
4. **Build Frontend** - Gunakan React component yang sudah dibuat
5. **Add History Logging** - Simpan log penyiraman untuk analytics

---

## 📝 Notes

- **Max Duration**: Tidak ada limit, tapi recommended < 60 menit
- **Multiple Zones**: Bisa jalankan bersamaan (parallel watering)
- **Safety**: Emergency stop tersedia untuk keadaan darurat
- **Reliability**: Auto-stop tetap jalan meski server restart (data di database)
- **Real-time**: Countdown update real-time via polling atau websocket

---

**Happy Watering! 🌱💧**
