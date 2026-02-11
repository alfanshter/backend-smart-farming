# 🌊 Zone Control API - Manual Watering System

Complete API documentation untuk sistem kontrol manual penyiraman berdasarkan zona dengan countdown timer.

## 📋 Overview

Sistem ini memungkinkan kontrol manual penyiraman per zona dengan fitur:
- ✅ **Manual Start/Stop** - Kontrol manual untuk setiap zona
- ✅ **Countdown Timer** - Timer otomatis dengan durasi yang bisa diatur
- ✅ **Multi-Zone Support** - Kelola multiple zona secara bersamaan
- ✅ **Real-time Status** - Monitor status dan countdown setiap zona
- ✅ **Emergency Stop** - Hentikan semua zona sekaligus
- ✅ **MQTT Integration** - Kirim command ke IoT devices
- ✅ **Role-Based Access** - Admin/Farmer control, User read-only

---

## 🎯 Use Case (Berdasarkan Frontend UI)

### UI Frontend Reference:
```
┌─────────────────────────────────────────────────┐
│  Zona A                          [Toggle ON/OFF]│
│  Tidak Aktif                                    │
│                                                 │
│  Atur durasi penyiraman                         │
│  ┌─────────┐ menit    ┌─────────┐ detik        │
│  │    8    │          │   20    │              │
│  └─────────┘          └─────────┘              │
│                                                 │
│  Total Durasi: 8 menit 20 detik                │
│                                                 │
│  💡 Aktifkan zona untuk memulai countdown timer │
└─────────────────────────────────────────────────┘
```

### Flow:
1. User set durasi: **8 menit 20 detik** (Total: 500 detik)
2. User toggle zona **ON**
3. Backend:
   - Activate zona
   - Send MQTT command ke device
   - Start countdown timer (500 detik)
4. Frontend:
   - Show countdown: "8:20" → "8:19" → ... → "0:00"
   - Auto-stop saat timer habis
5. User bisa manual **OFF** kapan saja

---

## 🔐 Authentication

**Semua endpoints require JWT authentication.**

```http
Authorization: Bearer <access_token>
```

### Role Permissions:

| Endpoint | Admin | Farmer | User |
|----------|-------|--------|------|
| Create Zone | ✅ | ✅ | ❌ |
| View Zones | ✅ | ✅ | ✅ |
| Control Zone (Start/Stop) | ✅ | ✅ | ❌ |
| Update Zone Config | ✅ | ✅ | ❌ |
| Delete Zone | ✅ | ❌ | ❌ |
| Emergency Stop | ✅ | ✅ | ❌ |

---

## 📡 API Endpoints

### 1. Create Zone

**POST** `/zones`

Create zona penyiraman baru.

**Required Role:** Admin atau Farmer

**Request Body:**
```json
{
  "name": "Zona A",
  "description": "Zona penyiraman area A - Greenhouse utara",
  "deviceId": "uuid-device-pump-or-valve",
  "durationMinutes": 8,
  "durationSeconds": 20
}
```

**Response:** `201 Created`
```json
{
  "id": "a0000000-0000-0000-0000-000000000001",
  "name": "Zona A",
  "description": "Zona penyiraman area A - Greenhouse utara",
  "deviceId": "uuid-device-pump-or-valve",
  "isActive": false,
  "durationMinutes": 8,
  "durationSeconds": 20,
  "userId": "uuid-user-creator",
  "createdAt": "2024-02-02T10:00:00.000Z",
  "updatedAt": "2024-02-02T10:00:00.000Z"
}
```

---

### 2. Get All Zones

**GET** `/zones`

Mendapatkan semua zona.

**Required:** Authentication (any role)

**Response:** `200 OK`
```json
[
  {
    "id": "a0000000-0000-0000-0000-000000000001",
    "name": "Zona A",
    "description": "Zona penyiraman area A",
    "deviceId": "uuid-device",
    "isActive": false,
    "durationMinutes": 8,
    "durationSeconds": 20,
    "userId": "uuid-user",
    "createdAt": "2024-02-02T10:00:00.000Z",
    "updatedAt": "2024-02-02T10:00:00.000Z"
  },
  {
    "id": "a0000000-0000-0000-0000-000000000002",
    "name": "Zona B",
    "description": "Zona penyiraman area B",
    "deviceId": "uuid-device",
    "isActive": true,
    "durationMinutes": 10,
    "durationSeconds": 0,
    "startedAt": "2024-02-02T10:05:00.000Z",
    "remainingSeconds": 450,
    "userId": "uuid-user",
    "createdAt": "2024-02-02T09:00:00.000Z",
    "updatedAt": "2024-02-02T10:05:00.000Z"
  }
]
```

---

### 3. Get My Zones

**GET** `/zones/my`

Mendapatkan zona milik user yang sedang login.

**Required:** Authentication

**Response:** `200 OK`
```json
[
  {
    "id": "uuid-zone",
    "name": "Zona A",
    "isActive": false,
    ...
  }
]
```

---

### 4. Get Active Zones

**GET** `/zones/active`

Mendapatkan semua zona yang sedang aktif (penyiraman berjalan).

**Required:** Authentication

**Response:** `200 OK`
```json
[
  {
    "zoneId": "uuid-zone-1",
    "name": "Zona A",
    "isActive": true,
    "totalDurationSeconds": 500,
    "remainingSeconds": 320,
    "elapsedSeconds": 180,
    "startedAt": "2024-02-02T10:05:00.000Z",
    "estimatedEndTime": "2024-02-02T10:13:20.000Z",
    "message": "Zone is active with 320s remaining"
  },
  {
    "zoneId": "uuid-zone-2",
    "name": "Zona B",
    "isActive": true,
    "totalDurationSeconds": 600,
    "remainingSeconds": 540,
    "elapsedSeconds": 60,
    "startedAt": "2024-02-02T10:10:00.000Z",
    "estimatedEndTime": "2024-02-02T10:20:00.000Z",
    "message": "Zone is active with 540s remaining"
  }
]
```

---

### 5. Get Zone by ID

**GET** `/zones/:id`

Mendapatkan detail zona by ID.

**Required:** Authentication

**Response:** `200 OK`
```json
{
  "id": "uuid-zone",
  "name": "Zona A",
  "description": "Zona penyiraman area A",
  "deviceId": "uuid-device",
  "isActive": false,
  "durationMinutes": 8,
  "durationSeconds": 20,
  "userId": "uuid-user",
  "createdAt": "2024-02-02T10:00:00.000Z",
  "updatedAt": "2024-02-02T10:00:00.000Z"
}
```

**Error Response:** `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Zone with ID <id> not found"
}
```

---

### 6. Get Zone Status (Real-time Countdown)

**GET** `/zones/:id/status`

Mendapatkan status real-time zona dengan countdown timer.

**Required:** Authentication

**Use Case:** Frontend poll endpoint ini setiap 1 detik untuk update countdown display.

**Response (Zone Active):** `200 OK`
```json
{
  "zoneId": "uuid-zone",
  "name": "Zona A",
  "isActive": true,
  "totalDurationSeconds": 500,
  "remainingSeconds": 320,
  "elapsedSeconds": 180,
  "startedAt": "2024-02-02T10:05:00.000Z",
  "estimatedEndTime": "2024-02-02T10:13:20.000Z",
  "message": "Zone is active. Remaining: 5m 20s"
}
```

**Response (Zone Inactive):** `200 OK`
```json
{
  "zoneId": "uuid-zone",
  "name": "Zona A",
  "isActive": false,
  "totalDurationSeconds": 0,
  "remainingSeconds": 0,
  "elapsedSeconds": 0,
  "message": "Zone is not active"
}
```

**Frontend Implementation:**
```javascript
// Poll setiap 1 detik untuk update countdown
setInterval(async () => {
  const response = await fetch('/zones/zona-a-id/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const status = await response.json();
  
  if (status.isActive) {
    const minutes = Math.floor(status.remainingSeconds / 60);
    const seconds = status.remainingSeconds % 60;
    updateDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }
}, 1000);
```

---

### 7. Control Zone (Start/Stop Watering)

**POST** `/zones/control`

Aktivasi atau deaktivasi zona penyiraman.

**Required Role:** Admin atau Farmer

**Request Body (Start Watering):**
```json
{
  "zoneId": "uuid-zone",
  "isActive": true,
  "durationMinutes": 8,
  "durationSeconds": 20
}
```

**Request Body (Stop Watering):**
```json
{
  "zoneId": "uuid-zone",
  "isActive": false
}
```

**Response (Started):** `200 OK`
```json
{
  "zoneId": "uuid-zone",
  "name": "Zona A",
  "isActive": true,
  "totalDurationSeconds": 500,
  "remainingSeconds": 500,
  "elapsedSeconds": 0,
  "startedAt": "2024-02-02T10:05:00.000Z",
  "estimatedEndTime": "2024-02-02T10:13:20.000Z",
  "message": "Zone Zona A activated for 8m 20s"
}
```

**Response (Stopped):** `200 OK`
```json
{
  "zoneId": "uuid-zone",
  "name": "Zona A",
  "isActive": false,
  "totalDurationSeconds": 0,
  "remainingSeconds": 0,
  "elapsedSeconds": 0,
  "message": "Zone Zona A deactivated"
}
```

**What Happens:**
1. **When Starting:**
   - Zone status → `isActive: true`
   - Backend starts countdown timer (8 min 20 sec = 500 seconds)
   - MQTT message sent to device:
     ```json
     {
       "command": "START_WATERING",
       "zoneId": "uuid",
       "zoneName": "Zona A",
       "duration": 500,
       "timestamp": "2024-02-02T10:05:00.000Z"
     }
     ```
   - Timer akan auto-stop setelah 500 detik

2. **When Stopping:**
   - Zone status → `isActive: false`
   - Countdown timer dihentikan
   - MQTT message sent:
     ```json
     {
       "command": "STOP_WATERING",
       "zoneId": "uuid",
       "zoneName": "Zona A",
       "timestamp": "2024-02-02T10:08:00.000Z"
     }
     ```

**Error Responses:**

`404 Not Found` - Zone tidak ditemukan:
```json
{
  "statusCode": 404,
  "message": "Zone with ID <id> not found"
}
```

`404 Not Found` - Device tidak ditemukan:
```json
{
  "statusCode": 404,
  "message": "Device <id> not found"
}
```

`400 Bad Request` - Device tidak aktif:
```json
{
  "statusCode": 400,
  "message": "Device <name> is not active. Please activate device first."
}
```

`400 Bad Request` - Durasi invalid:
```json
{
  "statusCode": 400,
  "message": "Duration must be greater than 0"
}
```

`403 Forbidden` - Insufficient permissions:
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

### 8. Update Zone Configuration

**PUT** `/zones/:id`

Update konfigurasi zona (nama, deskripsi, device, durasi default).

**Required Role:** Admin atau Farmer

**Request Body:**
```json
{
  "name": "Zona A - Updated",
  "description": "Updated description",
  "deviceId": "new-device-uuid",
  "durationMinutes": 10,
  "durationSeconds": 30
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid-zone",
  "name": "Zona A - Updated",
  "description": "Updated description",
  "deviceId": "new-device-uuid",
  "isActive": false,
  "durationMinutes": 10,
  "durationSeconds": 30,
  "userId": "uuid-user",
  "createdAt": "2024-02-02T10:00:00.000Z",
  "updatedAt": "2024-02-02T11:00:00.000Z"
}
```

---

### 9. Emergency Stop All Zones

**POST** `/zones/emergency-stop`

Hentikan semua zona yang sedang aktif sekaligus.

**Required Role:** Admin atau Farmer

**Use Case:** Tombol panic/emergency untuk stop semua penyiraman.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Emergency stop activated. 3 zones stopped.",
  "stopped": 3,
  "zones": ["Zona A", "Zona B", "Zona C"]
}
```

**What Happens:**
- Semua zona aktif di-stop
- Semua countdown timers dihentikan
- MQTT STOP command dikirim ke semua devices
- Logs dicatat

---

### 10. Delete Zone

**DELETE** `/zones/:id`

Hapus zona (permanent).

**Required Role:** Admin only

**Response:** `200 OK`
```json
{
  "message": "Zone Zona A deleted successfully"
}
```

**What Happens:**
- Jika zona sedang aktif, otomatis di-stop dulu
- MQTT STOP command dikirim
- Zona dihapus dari database

**Error Response:** `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Zone with ID <id> not found"
}
```

---

## 🔄 Frontend Integration Guide

### 1. Component State Management

```javascript
// React/Next.js Example
import { useState, useEffect } from 'react';

const ZoneControl = ({ zoneId }) => {
  const [zone, setZone] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load zone data
  useEffect(() => {
    fetchZone();
  }, [zoneId]);

  // Poll status every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      if (status?.isActive) {
        fetchStatus();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status?.isActive]);

  const fetchZone = async () => {
    const res = await fetch(`/zones/${zoneId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setZone(data);
  };

  const fetchStatus = async () => {
    const res = await fetch(`/zones/${zoneId}/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setStatus(data);
  };

  const handleToggle = async (isActive) => {
    setLoading(true);
    const res = await fetch('/zones/control', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        zoneId: zone.id,
        isActive,
        durationMinutes: zone.durationMinutes,
        durationSeconds: zone.durationSeconds
      })
    });
    const data = await res.json();
    setStatus(data);
    setLoading(false);
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="zone-control">
      <div className="zone-header">
        <h3>{zone?.name}</h3>
        <Toggle
          checked={status?.isActive || false}
          onChange={handleToggle}
          disabled={loading}
        />
      </div>

      <div className="zone-status">
        {status?.isActive ? (
          <p className="active">
            Countdown: {formatCountdown(status.remainingSeconds)}
          </p>
        ) : (
          <p className="inactive">Tidak Aktif</p>
        )}
      </div>

      <div className="zone-duration">
        <label>Atur durasi penyiraman</label>
        <input
          type="number"
          value={zone?.durationMinutes}
          onChange={(e) => updateDuration('minutes', e.target.value)}
          min="0"
          max="60"
        /> menit
        <input
          type="number"
          value={zone?.durationSeconds}
          onChange={(e) => updateDuration('seconds', e.target.value)}
          min="0"
          max="59"
        /> detik
      </div>

      <div className="total-duration">
        Total Durasi: {zone?.durationMinutes} menit {zone?.durationSeconds} detik
      </div>

      <p className="hint">
        💡 Aktifkan zona untuk memulai countdown timer
      </p>
    </div>
  );
};
```

---

### 2. Real-time Countdown Display

```javascript
// Countdown Timer Hook
const useZoneCountdown = (zoneId) => {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    let interval;

    const updateCountdown = async () => {
      try {
        const res = await fetch(`/zones/${zoneId}/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const status = await res.json();
        setCountdown(status);

        // Auto-refresh jika zona aktif
        if (status.isActive) {
          interval = setInterval(updateCountdown, 1000);
        } else {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error fetching zone status:', error);
      }
    };

    updateCountdown();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [zoneId]);

  return countdown;
};
```

---

### 3. Emergency Stop Button

```javascript
const EmergencyStopButton = () => {
  const [loading, setLoading] = useState(false);

  const handleEmergencyStop = async () => {
    if (!confirm('Stop semua zona yang sedang aktif?')) return;

    setLoading(true);
    try {
      const res = await fetch('/zones/emergency-stop', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      alert(`${data.stopped} zona berhasil dihentikan: ${data.zones.join(', ')}`);
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleEmergencyStop}
      disabled={loading}
      className="emergency-stop-btn"
    >
      🚨 Emergency Stop All Zones
    </button>
  );
};
```

---

## 🎯 Complete Frontend Flow

### Scenario: User Activate Zona A dengan 8 menit 20 detik

```
1. User opens page
   → Frontend: GET /zones/a0000000-0000-0000-0000-000000000001
   → Display: Zona A, Tidak Aktif, 8m 20s

2. User clicks Toggle ON
   → Frontend: POST /zones/control
     Body: { zoneId: "...", isActive: true, durationMinutes: 8, durationSeconds: 20 }
   → Backend: 
     - Save zone.isActive = true
     - Start timer 500 seconds
     - Send MQTT: START_WATERING
   → Response: { isActive: true, remainingSeconds: 500, ... }

3. Frontend starts polling every 1 second
   → setInterval(1000): GET /zones/.../status
   → Response: { remainingSeconds: 499 } → 498 → 497 → ...
   → Display: 8:19 → 8:18 → 8:17 → ...

4a. Timer reaches 0:00
   → Backend auto-stops zone
   → Send MQTT: STOP_WATERING
   → Frontend polling gets: { isActive: false }
   → Display: Tidak Aktif

4b. OR User clicks Toggle OFF (manual stop)
   → Frontend: POST /zones/control
     Body: { zoneId: "...", isActive: false }
   → Backend stops timer and sends MQTT STOP
   → Display: Tidak Aktif
```

---

## 📊 Database Schema

```sql
CREATE TABLE zones (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    device_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    duration_minutes INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    remaining_seconds INTEGER,
    user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_zones_user_id ON zones(user_id);
CREATE INDEX idx_zones_device_id ON zones(device_id);
CREATE INDEX idx_zones_is_active ON zones(is_active);
```

---

## 🔧 MQTT Integration

### Message Format

**Start Watering:**
```json
{
  "command": "START_WATERING",
  "zoneId": "uuid-zone",
  "zoneName": "Zona A",
  "duration": 500,
  "timestamp": "2024-02-02T10:05:00.000Z"
}
```

**Stop Watering:**
```json
{
  "command": "STOP_WATERING",
  "zoneId": "uuid-zone",
  "zoneName": "Zona A",
  "reason": "Manual stop" | "Timer completed",
  "timestamp": "2024-02-02T10:13:20.000Z"
}
```

### ESP32 Implementation

```cpp
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  DynamicJsonDocument doc(1024);
  deserializeJson(doc, message);

  String command = doc["command"];
  String zoneId = doc["zoneId"];
  String zoneName = doc["zoneName"];

  if (command == "START_WATERING") {
    int duration = doc["duration"]; // seconds
    Serial.printf("Starting watering for %s (%d seconds)\\n", zoneName.c_str(), duration);
    digitalWrite(PUMP_PIN, HIGH); // Turn on pump
    
    // Set timer to auto-stop
    wateringTimer = duration;
  }
  else if (command == "STOP_WATERING") {
    Serial.printf("Stopping watering for %s\\n", zoneName.c_str());
    digitalWrite(PUMP_PIN, LOW); // Turn off pump
    wateringTimer = 0;
  }
}
```

---

## ✅ Testing Checklist

### Manual Testing:
- [ ] Create zona baru
- [ ] Get semua zona
- [ ] Aktivasi zona dengan durasi custom
- [ ] Monitor countdown timer (poll status)
- [ ] Deaktivasi zona manual (before timer finish)
- [ ] Biarkan timer auto-complete
- [ ] Update durasi default zona
- [ ] Emergency stop multiple zones
- [ ] Test role-based access (User cannot control)
- [ ] Delete zona

### Integration Testing:
- [ ] MQTT command terkirim saat start
- [ ] MQTT command terkirim saat stop
- [ ] Timer accuracy (500 detik = 8m 20s)
- [ ] Multiple zones berjalan bersamaan
- [ ] Device status validation (inactive device cannot be controlled)

---

## 🚨 Error Handling

### Common Errors:

**1. Zone Not Found (404)**
```json
{
  "statusCode": 404,
  "message": "Zone with ID <id> not found"
}
```
→ Solution: Check zone ID exists

**2. Device Not Active (400)**
```json
{
  "statusCode": 400,
  "message": "Device Water Pump #1 is not active. Please activate device first."
}
```
→ Solution: Activate device terlebih dahulu via `/devices/:id/activate`

**3. Insufficient Permission (403)**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```
→ Solution: Login dengan role Admin atau Farmer

**4. Invalid Duration (400)**
```json
{
  "statusCode": 400,
  "message": "Duration must be greater than 0"
}
```
→ Solution: Set durationMinutes atau durationSeconds > 0

---

## 📝 Summary

### What This System Does:

1. ✅ **Manual Control** - User bisa start/stop penyiraman per zona
2. ✅ **Countdown Timer** - Auto-stop setelah durasi habis (8m 20s → 0:00)
3. ✅ **Real-time Status** - Frontend poll `/zones/:id/status` setiap detik
4. ✅ **MQTT Integration** - Command dikirim ke IoT device (ESP32)
5. ✅ **Multi-Zone** - Multiple zones bisa aktif bersamaan
6. ✅ **Emergency Stop** - Stop all zones dengan 1 klik
7. ✅ **Role-Based** - Admin/Farmer control, User read-only

### Perfect for UI Like:
```
Zona A [ON/OFF Toggle]
Status: Aktif - 5:20 remaining

Durasi: [8] menit [20] detik
Total: 8 menit 20 detik

💡 Toggle ON untuk mulai countdown
```

---

**Happy Coding! 🚀💧**
