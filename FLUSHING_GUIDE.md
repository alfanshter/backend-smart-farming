# Flushing System - Pembilasan Pipa Irigasi Otomatis

## 📖 Overview

**Flushing System** adalah fitur untuk membersihkan pipa irigasi secara otomatis dengan mengalirkan air bertekanan tinggi untuk menghilangkan:
- Kotoran dan lumut
- Endapan mineral
- Aliran air tersumbat

Sistem ini mengontrol semua valve/zone secara bersamaan untuk melancarkan air.

---

## 🎯 Features

### 1. **Mulai Flushing**
- Set durasi pembilasan (1-180 menit)
- Otomatis buka semua valve
- Timer countdown di frontend
- Auto-complete saat durasi habis

### 2. **Stop Flushing**
- Stop manual kapan saja
- Otomatis tutup semua valve
- Catat durasi aktual

### 3. **Riwayat Flushing**
- List semua sesi flushing
- Status: running, completed, stopped, failed
- Durasi dan timestamp

### 4. **Statistik**
- Total flushing dilakukan
- Jumlah selesai normal
- Total durasi (dalam menit)
- Last flushing date

---

## 🚀 API Endpoints

### Base URL
```
http://localhost:3001/flushing
```

---

### 1. **Start Flushing**

**Endpoint:** `POST /flushing/start`

**Auth:** Required (Admin, Farmer)

**Request Body:**
```json
{
  "durationMinutes": 15,
  "notes": "Pembilasan rutin mingguan"
}
```

**Validation:**
- `durationMinutes`: 1-180 (required)
- `notes`: max 500 karakter (optional)

**Response:**
```json
{
  "success": true,
  "message": "Flushing dimulai untuk 15 menit",
  "data": {
    "id": "uuid-session",
    "userId": "uuid-user",
    "durationMinutes": 15,
    "status": "running",
    "startedAt": "2026-02-11T06:48:00.000Z",
    "notes": "Pembilasan rutin mingguan",
    "createdAt": "2026-02-11T06:48:00.000Z"
  }
}
```

**Error:**
```json
{
  "statusCode": 400,
  "message": "Flushing sedang berjalan. Stop flushing yang aktif terlebih dahulu."
}
```

---

### 2. **Stop Flushing**

**Endpoint:** `POST /flushing/stop`

**Auth:** Required (Admin, Farmer)

**Request Body:**
```json
{
  "notes": "Dihentikan karena sudah bersih"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Flushing dihentikan",
  "data": {
    "id": "uuid-session",
    "userId": "uuid-user",
    "durationMinutes": 15,
    "status": "stopped",
    "startedAt": "2026-02-11T06:48:00.000Z",
    "completedAt": "2026-02-11T06:58:00.000Z",
    "totalDurationMinutes": 10,
    "notes": "Dihentikan karena sudah bersih",
    "createdAt": "2026-02-11T06:48:00.000Z",
    "updatedAt": "2026-02-11T06:58:00.000Z"
  }
}
```

---

### 3. **Get Current Session**

**Endpoint:** `GET /flushing/current`

**Auth:** Required (All roles)

**Response (Running):**
```json
{
  "success": true,
  "message": "Flushing sedang berjalan",
  "data": {
    "id": "uuid-session",
    "userId": "uuid-user",
    "durationMinutes": 15,
    "status": "running",
    "startedAt": "2026-02-11T06:48:00.000Z"
  }
}
```

**Response (No Active Session):**
```json
{
  "success": true,
  "message": "Tidak ada flushing yang sedang berjalan",
  "data": null
}
```

---

### 4. **Get History**

**Endpoint:** `GET /flushing/history?limit=10`

**Auth:** Required (All roles)

**Query Parameters:**
- `limit`: Number of records (default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Riwayat flushing berhasil diambil",
  "data": [
    {
      "id": "uuid-1",
      "userId": "uuid-user",
      "durationMinutes": 15,
      "status": "completed",
      "startedAt": "2026-02-11T06:48:00.000Z",
      "completedAt": "2026-02-11T07:03:00.000Z",
      "totalDurationMinutes": 15,
      "notes": "Pembilasan rutin",
      "createdAt": "2026-02-11T06:48:00.000Z"
    },
    {
      "id": "uuid-2",
      "userId": "uuid-user",
      "durationMinutes": 20,
      "status": "stopped",
      "startedAt": "2026-02-10T06:00:00.000Z",
      "completedAt": "2026-02-10T06:12:00.000Z",
      "totalDurationMinutes": 12,
      "notes": "Dihentikan manual",
      "createdAt": "2026-02-10T06:00:00.000Z"
    }
  ],
  "count": 2
}
```

---

### 5. **Get Statistics**

**Endpoint:** `GET /flushing/statistics`

**Auth:** Required (All roles)

**Response:**
```json
{
  "success": true,
  "message": "Statistik flushing berhasil diambil",
  "data": {
    "totalSessions": 5,
    "completedSessions": 3,
    "stoppedSessions": 2,
    "totalDurationMinutes": 75,
    "averageDurationMinutes": 15,
    "lastFlushingDate": "2026-02-11T06:48:00.000Z"
  }
}
```

**Frontend Mapping:**
```javascript
// Dari response statistics:
{
  totalFlushing: data.totalSessions,        // Total Flushing = 5
  selesaiNormal: data.completedSessions,    // Selesai Normal = 3
  totalDurasi: data.totalDurationMinutes    // Total Durasi = 75 min
}
```

---

## 🎨 Frontend Integration

### React Example - Panel Kontrol

```jsx
function FlushingPanel() {
  const [duration, setDuration] = useState(15);
  const [currentSession, setCurrentSession] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Check current session on mount
  useEffect(() => {
    fetchCurrentSession();
    fetchStatistics();
  }, []);
  
  // Fetch current running session
  const fetchCurrentSession = async () => {
    const response = await fetch('/flushing/current', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    setCurrentSession(result.data);
  };
  
  // Fetch statistics
  const fetchStatistics = async () => {
    const response = await fetch('/flushing/statistics', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    setStats(result.data);
  };
  
  // Start flushing
  const handleStart = async () => {
    try {
      const response = await fetch('/flushing/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ durationMinutes: duration })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCurrentSession(result.data);
        alert(`Flushing dimulai untuk ${duration} menit`);
      }
    } catch (error) {
      alert('Gagal memulai flushing');
    }
  };
  
  // Stop flushing
  const handleStop = async () => {
    try {
      const response = await fetch('/flushing/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCurrentSession(null);
        fetchStatistics(); // Refresh statistics
        alert('Flushing dihentikan');
      }
    } catch (error) {
      alert('Gagal menghentikan flushing');
    }
  };
  
  return (
    <div className="flushing-panel">
      <h2>Panel Kontrol</h2>
      
      <div className="duration-input">
        <label>Durasi Flushing (menit)</label>
        <input 
          type="number" 
          min="1" 
          max="180"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          disabled={currentSession !== null}
        />
        <p className="hint">
          Sistem akan melakukan pembilasan selama {duration} menit
        </p>
      </div>
      
      <div className="buttons">
        <button 
          className="btn-start"
          onClick={handleStart}
          disabled={currentSession !== null}
        >
          ▶ Mulai Flushing
        </button>
        
        <button 
          className="btn-stop"
          onClick={handleStop}
          disabled={currentSession === null}
        >
          ⏹ Stop
        </button>
      </div>
      
      <div className="info-box">
        <h4>ℹ️ Tentang Flushing System</h4>
        <p>
          Sistem ini secara otomatis membersihkan pipa irigasi dengan
          mengalirkan air bertekanan tinggi untuk menghilangkan
          kotoran, lumut, dan endapan mineral yang dapat menghambat
          aliran air.
        </p>
      </div>
      
      {/* Statistics */}
      <div className="stats">
        <h3>Statistik Flushing</h3>
        <div className="stat-item blue">
          <span className="icon">🔄</span>
          <span className="label">Total Flushing</span>
          <span className="value">{stats?.totalSessions || 0}</span>
        </div>
        <div className="stat-item green">
          <span className="icon">✓</span>
          <span className="label">Selesai Normal</span>
          <span className="value">{stats?.completedSessions || 0}</span>
        </div>
        <div className="stat-item purple">
          <span className="icon">⏱</span>
          <span className="label">Total Durasi</span>
          <span className="value">{stats?.totalDurationMinutes || 0} min</span>
        </div>
      </div>
    </div>
  );
}
```

---

### Riwayat Flushing (History)

```jsx
function FlushingHistory() {
  const [history, setHistory] = useState([]);
  
  useEffect(() => {
    fetchHistory();
  }, []);
  
  const fetchHistory = async () => {
    const response = await fetch('/flushing/history?limit=20', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    setHistory(result.data);
  };
  
  const getStatusBadge = (status) => {
    const badges = {
      'running': { label: 'Sedang Berjalan', color: 'orange' },
      'completed': { label: 'Selesai', color: 'green' },
      'stopped': { label: 'Dihentikan', color: 'gray' },
      'failed': { label: 'Gagal', color: 'red' }
    };
    return badges[status] || { label: status, color: 'gray' };
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID');
  };
  
  return (
    <div className="flushing-history">
      <div className="header">
        <h3>Riwayat Flushing</h3>
        <button onClick={() => window.location.href = '#'}>Hapus Semua</button>
      </div>
      
      <div className="history-list">
        {history.length === 0 ? (
          <div className="empty-state">
            <p>Belum ada riwayat flushing</p>
          </div>
        ) : (
          history.map((session) => {
            const badge = getStatusBadge(session.status);
            
            return (
              <div key={session.id} className={`history-item ${badge.color}`}>
                <div className="status-icon">
                  {badge.color === 'orange' && '⚠️'}
                  {badge.color === 'green' && '✓'}
                  {badge.color === 'gray' && '⏹'}
                </div>
                
                <div className="details">
                  <div className="status-label" style={{ color: badge.color }}>
                    {badge.label}
                  </div>
                  <div className="time-info">
                    <span>▶ Mulai: {formatDate(session.startedAt)}</span>
                    {session.completedAt && (
                      <span>⏹ Selesai: {formatDate(session.completedAt)}</span>
                    )}
                  </div>
                  <div className="duration-info">
                    Durasi: {session.totalDurationMinutes || session.durationMinutes} menit
                  </div>
                </div>
                
                <button className="delete-btn">🗑️</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

---

## 🤖 MQTT Integration

### Topics

**Backend → ESP32 (Control):**
```
smartfarm/flushing/control
```

**ESP32 → Backend (Feedback):**
```
smartfarm/flushing/event
```

---

### ESP32 Implementation

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Pin untuk mengontrol semua valve
#define VALVE_1_PIN 25
#define VALVE_2_PIN 26
#define VALVE_3_PIN 27

String sessionId = "";
unsigned long flushingStartTime = 0;
unsigned long flushingDuration = 0;
bool isFlushingActive = false;

WiFiClient espClient;
PubSubClient mqtt(espClient);

void setup() {
  Serial.begin(115200);
  
  pinMode(VALVE_1_PIN, OUTPUT);
  pinMode(VALVE_2_PIN, OUTPUT);
  pinMode(VALVE_3_PIN, OUTPUT);
  
  // Close all valves initially
  closeAllValves();
  
  // Connect to MQTT
  mqtt.setServer("your-broker.com", 8883);
  mqtt.setCallback(handleMQTTMessage);
  mqtt.subscribe("smartfarm/flushing/control");
}

void handleMQTTMessage(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  StaticJsonDocument<256> doc;
  deserializeJson(doc, message);
  
  String command = doc["command"];
  
  if (command == "FLUSHING_START") {
    sessionId = doc["sessionId"].as<String>();
    int durationMinutes = doc["durationMinutes"];
    
    // Open all valves
    openAllValves();
    
    // Set timer
    flushingStartTime = millis();
    flushingDuration = durationMinutes * 60UL * 1000UL;
    isFlushingActive = true;
    
    Serial.printf("✅ Flushing started for %d minutes\n", durationMinutes);
  }
  
  else if (command == "FLUSHING_STOP") {
    // Close all valves
    closeAllValves();
    isFlushingActive = false;
    
    // Send completion event
    sendFlushingEvent("FLUSHING_STOPPED");
    
    Serial.println("⛔ Flushing stopped manually");
  }
}

void loop() {
  mqtt.loop();
  
  // Auto-complete flushing when timer expires
  if (isFlushingActive && (millis() - flushingStartTime >= flushingDuration)) {
    closeAllValves();
    isFlushingActive = false;
    
    // Send completion event to backend
    sendFlushingEvent("FLUSHING_COMPLETED");
    
    Serial.println("✅ Flushing completed - timer finished");
  }
}

void openAllValves() {
  digitalWrite(VALVE_1_PIN, HIGH);
  digitalWrite(VALVE_2_PIN, HIGH);
  digitalWrite(VALVE_3_PIN, HIGH);
  Serial.println("🔓 All valves opened");
}

void closeAllValves() {
  digitalWrite(VALVE_1_PIN, LOW);
  digitalWrite(VALVE_2_PIN, LOW);
  digitalWrite(VALVE_3_PIN, LOW);
  Serial.println("🔒 All valves closed");
}

void sendFlushingEvent(String eventType) {
  StaticJsonDocument<128> doc;
  doc["sessionId"] = sessionId;
  doc["event"] = eventType;
  
  String payload;
  serializeJson(doc, payload);
  
  mqtt.publish("smartfarm/flushing/event", payload.c_str());
  Serial.println("📤 Event sent: " + eventType);
}
```

---

## 📊 Database Schema

```sql
-- flushing_sessions table
CREATE TABLE flushing_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (1-180),
  status VARCHAR(20) CHECK ('running', 'completed', 'stopped', 'failed'),
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  total_duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- flushing_logs table  
CREATE TABLE flushing_logs (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES flushing_sessions(id),
  event_type VARCHAR(50),
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✅ Testing Checklist

- [ ] Start flushing dengan durasi 15 menit
- [ ] Check current session - status running
- [ ] Stop flushing manual
- [ ] Check history - muncul session stopped
- [ ] Start flushing lagi, tunggu selesai otomatis
- [ ] Check statistics - total flushing bertambah
- [ ] Test validasi: durasi < 1 atau > 180
- [ ] Test: start flushing saat sudah ada running session

---

**Created:** February 11, 2026  
**Feature:** Flushing System for Smart Farming Irrigation
