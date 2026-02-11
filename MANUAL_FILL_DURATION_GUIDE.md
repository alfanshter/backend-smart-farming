# Manual Fill dengan Durasi - Smart Farming Tank Control

## 📖 Overview

Fitur **Manual Fill** sekarang mendukung **2 mode operasi**:

1. **Time-based (Dengan Durasi)** - Pompa otomatis mati setelah durasi tertentu
2. **Manual Mode (Tanpa Durasi)** - Pompa nyala terus sampai di-stop manual atau pakai durasi dari tank settings

---

## 🎯 Use Cases

### Mode 1: Time-based (Dengan Durasi)

**Cocok untuk:**
- ✅ Tank tanpa sensor level otomatis
- ✅ Lokasi remote yang susah dipantau
- ✅ Kebutuhan isi cepat dengan waktu tertentu
- ✅ Pengisian terjadwal

**Contoh:**
```
"Isi tandon selama 5 menit, setelah itu otomatis mati"
```

### Mode 2: Manual Mode (Tanpa Durasi)

**Cocok untuk:**
- ✅ Tank dengan sensor level (auto-stop saat max level)
- ✅ Pengisian dengan monitoring langsung
- ✅ Fleksibilitas penuh - user yang tentukan kapan stop

**Contoh:**
```
"Nyalakan pompa, nanti saya matikan sendiri kalau sudah cukup"
```

---

## 🚀 Cara Pakai

### 1️⃣ Start Manual Fill dengan Durasi

**Endpoint:** `POST /tanks/:id/manual-fill/start`

**Request Body:**
```json
{
  "durationMinutes": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual fill started successfully",
  "data": {
    "id": "uuid-tank",
    "name": "Tandon Utama",
    "currentLevel": 45,
    "manualFillMaxLevel": 95,
    ...
  }
}
```

**MQTT Command yang dikirim ke ESP32:**
```json
{
  "command": "MANUAL_FILL_START",
  "tankId": "uuid-tank",
  "duration": 5    // ⬅️ Durasi dalam menit
}
```

**⚠️ PENTING - Arsitektur 2 Device:**
- **Device Kontrol (`deviceId`)**: ESP32 untuk pompa & agitator
  - Subscribe topic: `smartfarm/tank/{deviceId}/control`
  - Menerima command: MANUAL_FILL_START, MANUAL_FILL_STOP, AGITATOR_ON, dll
  - Tidak perlu tahu maxLevel (sensor terpisah)

- **Device Sensor (`sensorDeviceId`)**: ESP32 untuk sensor level (optional)
  - Publish topic: `smartfarm/tank/{sensorDeviceId}/level`
  - Kirim data level ke backend
  - Backend yang cek apakah sudah max level

**Behavior di ESP32 Kontrol:**
```cpp
// ESP32 akan:
1. Nyalakan relay pompa
2. Set timer 5 menit
3. Setelah 5 menit → Otomatis matikan pompa
4. Send confirmation via MQTT
```

---

### 2️⃣ Start Manual Fill tanpa Durasi (Manual Mode)

**Endpoint:** `POST /tanks/:id/manual-fill/start`

**Request Body (kosong atau tanpa durationMinutes):**
```json
{}
```

Atau tidak kirim body sama sekali.

**Response:**
```json
{
  "success": true,
  "message": "Manual fill started successfully",
  "data": {
    "id": "uuid-tank",
    "name": "Tandon Utama",
    "currentLevel": 45,
    "manualFillMaxLevel": 95,
    "manualFillDuration": 10,  // ⬅️ Default dari tank settings
    ...
  }
}
```

**MQTT Command yang dikirim ke ESP32:**
```json
{
  "command": "MANUAL_FILL_START",
  "tankId": "uuid-tank",
  "duration": 10    // ⬅️ Dari tank.manualFillDuration (jika ada)
  // atau undefined jika tank tidak set manualFillDuration
}
```

**Behavior di ESP32 Kontrol (jika duration ada):**
```cpp
// ESP32 Kontrol (deviceId) akan:
1. Nyalakan relay pompa
2. Set timer sesuai tank.manualFillDuration (10 menit)
3. Setelah 10 menit → Otomatis matikan pompa
```

**Behavior di ESP32 Kontrol (jika duration undefined):**
```cpp
// ESP32 Kontrol (deviceId) akan:
1. Nyalakan relay pompa
2. TIDAK set timer - pompa nyala terus
3. Menunggu command MANUAL_FILL_STOP dari backend
```

**Behavior di ESP32 Sensor (sensorDeviceId - parallel):**
```cpp
// ESP32 Sensor (sensorDeviceId) terus berjalan:
1. Baca sensor level setiap 5 detik
2. Publish ke topic: smartfarm/tank/{sensorDeviceId}/level
   {
     "tankId": "xxx",
     "level": 87  // Persentase
   }
3. Backend yang handle auto-stop jika level >= manualFillMaxLevel
```

---

### 3️⃣ Stop Manual Fill (Manual Stop)

**Endpoint:** `POST /tanks/:id/manual-fill/stop`

**Kapan dipakai:**
- Emergency stop
- User mau stop sebelum durasi habis
- Tank sudah cukup penuh

**Request:** No body needed

**MQTT Command:**
```json
{
  "command": "MANUAL_FILL_STOP",
  "tankId": "uuid-tank"
}
```

---

## 🔧 Konfigurasi Tank

### Tank dengan Sensor Level (Auto-stop)

**Create Tank:**
```json
{
  "name": "Tandon dengan Sensor",
  "deviceId": "TANK_PUMP_01",
  "sensorDeviceId": "TANK_SENSOR_01",  // ⬅️ Punya sensor
  "capacity": 5000,
  "currentLevel": 30,
  "manualFillMaxLevel": 95
  // Tidak perlu manualFillDuration
}
```

**Manual Fill Behavior:**
- Bisa pakai durasi custom: `{ "durationMinutes": 5 }`
- Atau tanpa durasi: `{}` → pompa nyala sampai sensor deteksi level 95%
- Atau manual stop

---

### Tank tanpa Sensor (Time-based)

**Create Tank:**
```json
{
  "name": "Tandon Tanpa Sensor",
  "deviceId": "TANK_PUMP_02",
  "capacity": 3000,
  "currentLevel": 20,
  "manualFillMaxLevel": 90,
  "manualFillDuration": 10  // ⬅️ Default durasi 10 menit
}
```

**Manual Fill Behavior:**
- Bisa override durasi: `{ "durationMinutes": 5 }` → pakai 5 menit
- Atau pakai default: `{}` → pakai 10 menit dari settings
- Manual stop tetap bisa dipakai

---

## 📊 Log dan Tracking

### Log dengan Durasi

```
Manual fill started (target: 95%) (duration: 5 minutes)
```

### Log tanpa Durasi

```
Manual fill started (target: 95%) (manual mode - stop manually)
```

---

## 🎮 Frontend Integration

### React Example - Start dengan Durasi

```javascript
const startManualFill = async (tankId, durationMinutes) => {
  const response = await fetch(`/tanks/${tankId}/manual-fill/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      durationMinutes: durationMinutes || undefined 
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    if (durationMinutes) {
      alert(`Pompa akan nyala selama ${durationMinutes} menit`);
    } else {
      alert('Pompa mulai isi - stop manual jika sudah cukup');
    }
  }
};

// Pakai durasi
startManualFill('tank-id', 5);  // 5 menit

// Tanpa durasi (manual mode)
startManualFill('tank-id', null);
```

### UI Component Example

```jsx
function ManualFillControl({ tank }) {
  const [duration, setDuration] = useState(5);
  const [useTimer, setUseTimer] = useState(true);
  
  const handleStart = () => {
    const payload = useTimer ? { durationMinutes: duration } : {};
    
    fetch(`/tanks/${tank.id}/manual-fill/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  };
  
  return (
    <div>
      <h3>Manual Fill Control</h3>
      
      <label>
        <input 
          type="checkbox" 
          checked={useTimer}
          onChange={(e) => setUseTimer(e.target.checked)}
        />
        Gunakan Timer
      </label>
      
      {useTimer && (
        <div>
          <label>Durasi (menit):</label>
          <input 
            type="number" 
            min="1" 
            max="180"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
          />
        </div>
      )}
      
      <button onClick={handleStart}>
        {useTimer 
          ? `Start (${duration} menit)` 
          : 'Start (Manual Stop)'
        }
      </button>
      
      <button onClick={stopManualFill}>
        Emergency Stop
      </button>
    </div>
  );
}
```

---

## 🤖 ESP32 Implementation Guide

### MQTT Topics

**Subscribe (Terima Command):**
- `smartfarm/tank/{deviceId}/control` - Command dari backend

**Publish (Kirim Feedback):**
- `smartfarm/tank/{deviceId}/event` - Event ke backend (OTOMATIS UPDATE)

---

### Arduino Code Example

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Pin definitions
#define PUMP_PIN 25

// MQTT topics
String deviceId = "TANK_DEVICE_01";
String tankId = "";  // Will be received from command
String controlTopic = "smartfarm/tank/" + deviceId + "/control";
String eventTopic = "smartfarm/tank/" + deviceId + "/event";

// Timer variables
bool timerMode = false;
unsigned long pumpStartTime = 0;
unsigned long pumpDuration = 0;
int currentDurationMinutes = 0;

WiFiClient espClient;
PubSubClient mqtt(espClient);

void setup() {
  Serial.begin(115200);
  pinMode(PUMP_PIN, LOW);
  
  // Connect to WiFi and MQTT
  connectWiFi();
  mqtt.setServer("your-mqtt-broker.com", 8883);
  mqtt.setCallback(handleMQTTMessage);
  connectMQTT();
  
  // Subscribe to control topic
  mqtt.subscribe(controlTopic.c_str());
  Serial.println("✅ Subscribed to: " + controlTopic);
}

void handleMQTTMessage(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.println("📩 Received: " + message);
  
  StaticJsonDocument<512> doc;
  deserializeJson(doc, message);
  
  String command = doc["command"];
  tankId = doc["tankId"].as<String>();  // Save tankId for feedback
  
  if (command == "MANUAL_FILL_START") {
    // Check jika ada durasi
    if (doc.containsKey("duration") && !doc["duration"].isNull()) {
      currentDurationMinutes = doc["duration"];
      
      // Start pompa dengan timer
      digitalWrite(PUMP_PIN, HIGH);
      pumpStartTime = millis();
      pumpDuration = currentDurationMinutes * 60UL * 1000UL; // Convert ke ms
      timerMode = true;
      
      Serial.printf("✅ Pompa ON - Timer %d menit\n", currentDurationMinutes);
      
    } else {
      // Start pompa tanpa timer (manual stop)
      digitalWrite(PUMP_PIN, HIGH);
      timerMode = false;
      
      Serial.println("✅ Pompa ON - Manual Stop Mode");
    }
  }
  
  else if (command == "MANUAL_FILL_STOP") {
    digitalWrite(PUMP_PIN, LOW);
    timerMode = false;
    
    // Send event ke backend
    sendTankEvent("MANUAL_FILL_COMPLETED", getCurrentLevel(), 0);
    Serial.println("⛔ Pompa OFF - Manual Stop");
  }
  
  else if (command == "AUTO_FILL_START") {
    digitalWrite(PUMP_PIN, HIGH);
    Serial.println("✅ Pompa ON - Auto Fill");
  }
  
  else if (command == "AUTO_FILL_STOP") {
    digitalWrite(PUMP_PIN, LOW);
    
    // Send event ke backend
    sendTankEvent("AUTO_FILL_COMPLETED", getCurrentLevel(), 0);
    Serial.println("⛔ Pompa OFF - Auto Fill Completed");
  }
  
  else if (command == "AGITATOR_ON") {
    // Kontrol agitator...
  }
  
  else if (command == "AGITATOR_OFF") {
    // Kontrol agitator...
  }
}

void loop() {
  mqtt.loop();
  
  // IMPORTANT: Auto-stop jika pakai timer dan durasi sudah habis
  if (timerMode && (millis() - pumpStartTime >= pumpDuration)) {
    digitalWrite(PUMP_PIN, LOW);
    timerMode = false;
    
    // OTOMATIS kirim event ke backend untuk update database
    sendTankEvent("MANUAL_FILL_COMPLETED", getCurrentLevel(), currentDurationMinutes);
    
    Serial.printf("✅ Pompa OFF - Timer selesai (%d menit)\n", currentDurationMinutes);
    Serial.println("📤 Event sent to backend - Database akan auto-update!");
  }
  
  // Optional: Kirim level update setiap 30 detik
  static unsigned long lastLevelUpdate = 0;
  if (millis() - lastLevelUpdate >= 30000) {
    sendTankEvent("LEVEL_UPDATE", getCurrentLevel(), 0);
    lastLevelUpdate = millis();
  }
}

// FUNCTION: Kirim event ke backend
void sendTankEvent(String event, float level, int duration) {
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["tankId"] = tankId;
  doc["event"] = event;
  doc["level"] = level;
  
  if (duration > 0) {
    doc["duration"] = duration;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  mqtt.publish(eventTopic.c_str(), payload.c_str());
  
  Serial.println("📤 Event published: " + event);
  Serial.println("   Topic: " + eventTopic);
  Serial.println("   Payload: " + payload);
}

// FUNCTION: Baca level dari sensor (sesuaikan dengan hardware Anda)
float getCurrentLevel() {
  // Jika pakai ultrasonic sensor
  // float distance = readUltrasonic();
  // float level = ((maxHeight - distance) / maxHeight) * 100.0;
  // return constrain(level, 0, 100);
  
  // Untuk testing, return dummy value
  return 75.5;
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqtt.connect(deviceId.c_str(), "mqtt_user", "mqtt_pass")) {
      Serial.println(" connected!");
    } else {
      Serial.print(" failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(" retrying in 5s");
      delay(5000);
    }
  }
}
```

---

### Backend Handler (Sudah Auto-Implemented!)

Backend sudah otomatis handle event dari ESP32:

```typescript
// MqttService.ts - Auto subscribe to: smartfarm/tank/+/event

private async handleTankEvent(message: string): Promise<void> {
  const data = JSON.parse(message);
  
  switch (data.event) {
    case 'MANUAL_FILL_COMPLETED':
      // Update level otomatis tanpa tunggu frontend!
      if (data.level !== undefined) {
        await this.tankControlUseCase.updateLevel(data.tankId, data.level);
      }
      break;
      
    case 'AUTO_FILL_COMPLETED':
      // Update level otomatis
      if (data.level !== undefined) {
        await this.tankControlUseCase.updateLevel(data.tankId, data.level);
      }
      break;
      
    case 'LEVEL_UPDATE':
      // Real-time level update dari sensor
      if (data.level !== undefined) {
        await this.tankControlUseCase.updateLevel(data.tankId, data.level);
      }
      break;
  }
}
```

**Keuntungan:**
- ✅ Database otomatis update saat durasi selesai
- ✅ Tidak perlu tunggu frontend
- ✅ Real-time level tracking
- ✅ Robust - tetap update meski frontend error/offline

---

## ✅ Validation Rules

**Duration:**
- ✅ Min: 1 menit
- ✅ Max: 180 menit (3 jam)
- ✅ Optional - boleh tidak diisi

**Tank Settings:**
- `manualFillDuration`: 1-180 menit (optional)
- Digunakan sebagai default jika request tidak include duration
- Bisa di-override per request

---

## 📝 Summary

| Mode | Request Body | Behavior |
|------|--------------|----------|
| **Time-based** | `{ "durationMinutes": 5 }` | Pompa nyala 5 menit → auto-off |
| **Tank Default** | `{}` atau kosong | Gunakan `tank.manualFillDuration` (jika ada) |
| **Manual Mode** | `{}` (tank tanpa duration setting) | Pompa nyala terus → manual stop |

**Rekomendasi:**
- Tank dengan sensor → Pakai manual mode atau durasi sebagai safety limit
- Tank tanpa sensor → HARUS pakai durasi (dari request atau tank settings)

---

## 🔗 Related Endpoints

- `POST /tanks` - Create tank (set default `manualFillDuration`)
- `PUT /tanks/:id` - Update tank settings
- `POST /tanks/:id/manual-fill/start` - Start manual fill
- `POST /tanks/:id/manual-fill/stop` - Stop manual fill
- `GET /tanks/:id/status` - Check current status
- `GET /tanks/:id/logs` - View fill history

---

**Updated:** February 10, 2026  
**Version:** 2.0 - Added duration support
