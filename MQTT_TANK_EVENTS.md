# MQTT Tank Events - Auto Update System

## 📡 Overview

Sistem **MQTT Event Feedback** memastikan database selalu terupdate otomatis dari ESP32, **tanpa perlu tunggu frontend**. 

**Problem yang diselesaikan:**
- ✅ Frontend bisa error atau offline
- ✅ Durasi pompa selesai tapi level tidak update
- ✅ Sensor update real-time tidak masuk database

---

## 🔄 Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Backend   │ CONTROL │    ESP32     │  EVENT  │   Backend    │
│             │────────>│   (Device)   │────────>│  (MqttService)│
│ Controller  │  MQTT   │              │  MQTT   │              │
└─────────────┘         └──────────────┘         └──────────────┘
                              │                         │
                              │                         │
                          Execute                   Auto Update
                          (Timer/Pump)              Database
```

### Flow:

1. **Backend → ESP32** (Control)
   - Topic: `smartfarm/tank/{deviceId}/control`
   - Payload: `{ command, tankId, duration }`

2. **ESP32 → Backend** (Event)
   - Topic: `smartfarm/tank/{deviceId}/event`
   - Payload: `{ event, tankId, level, duration }`

3. **Backend Auto Update** (Database)
   - MqttService handle event
   - Update tank level otomatis
   - Log event ke database

---

## 📨 MQTT Topics

### 1. Control Topic (Backend → ESP32)

**Topic:** `smartfarm/tank/{deviceId}/control`

**Subscribe di ESP32:**
```cpp
String deviceId = "TANK_DEVICE_01";
String controlTopic = "smartfarm/tank/" + deviceId + "/control";
mqtt.subscribe(controlTopic.c_str());
```

**Message Format:**
```json
{
  "command": "MANUAL_FILL_START",
  "tankId": "uuid-tank-123",
  "duration": 5
}
```

**Commands:**
- `MANUAL_FILL_START` - Start pompa manual
- `MANUAL_FILL_STOP` - Stop pompa manual
- `AUTO_FILL_START` - Start pompa otomatis
- `AUTO_FILL_STOP` - Stop pompa otomatis
- `AGITATOR_ON` - Nyalakan pengaduk
- `AGITATOR_OFF` - Matikan pengaduk

---

### 2. Event Topic (ESP32 → Backend)

**Topic:** `smartfarm/tank/{deviceId}/event`

**Publish dari ESP32:**
```cpp
String deviceId = "TANK_DEVICE_01";
String eventTopic = "smartfarm/tank/" + deviceId + "/event";

StaticJsonDocument<256> doc;
doc["deviceId"] = deviceId;
doc["tankId"] = tankId;
doc["event"] = "MANUAL_FILL_COMPLETED";
doc["level"] = 85.5;
doc["duration"] = 5;

String payload;
serializeJson(doc, payload);
mqtt.publish(eventTopic.c_str(), payload.c_str());
```

**Message Format:**
```json
{
  "deviceId": "TANK_DEVICE_01",
  "tankId": "uuid-tank-123",
  "event": "MANUAL_FILL_COMPLETED",
  "level": 85.5,
  "duration": 5
}
```

**Events:**
- `MANUAL_FILL_COMPLETED` - Manual fill selesai (timer habis atau manual stop)
- `AUTO_FILL_COMPLETED` - Auto fill selesai (level max tercapai)
- `LEVEL_UPDATE` - Update level dari sensor (real-time)

---

## 🎯 Use Cases

### Use Case 1: Timer Selesai

**Scenario:** User start manual fill dengan durasi 5 menit

**Flow:**

1. Frontend call API:
```bash
POST /tanks/123/manual-fill/start
{ "durationMinutes": 5 }
```

2. Backend publish MQTT:
```json
Topic: smartfarm/tank/TANK_DEVICE_01/control
{
  "command": "MANUAL_FILL_START",
  "tankId": "123",
  "duration": 5
}
```

3. ESP32 execute:
```cpp
digitalWrite(PUMP_PIN, HIGH);
pumpStartTime = millis();
pumpDuration = 5 * 60 * 1000;  // 5 minutes
timerMode = true;
```

4. **ESP32 auto-stop setelah 5 menit:**
```cpp
if (millis() - pumpStartTime >= pumpDuration) {
  digitalWrite(PUMP_PIN, LOW);
  
  // KIRIM EVENT KE BACKEND
  sendTankEvent("MANUAL_FILL_COMPLETED", getCurrentLevel(), 5);
}
```

5. **Backend auto-update database:**
```typescript
// MqttService.handleTankEvent()
case 'MANUAL_FILL_COMPLETED':
  await this.tankControlUseCase.updateLevel(data.tankId, data.level);
  // Database updated! Level = 85.5%
```

**Result:** Database terupdate otomatis tanpa perlu frontend polling!

---

### Use Case 2: Real-time Level Update

**Scenario:** Sensor ultrasonic kirim level setiap 30 detik

**ESP32 Code:**
```cpp
void loop() {
  static unsigned long lastUpdate = 0;
  
  if (millis() - lastUpdate >= 30000) {
    float currentLevel = readSensor();
    sendTankEvent("LEVEL_UPDATE", currentLevel, 0);
    lastUpdate = millis();
  }
}
```

**MQTT Payload:**
```json
{
  "deviceId": "TANK_DEVICE_01",
  "tankId": "123",
  "event": "LEVEL_UPDATE",
  "level": 72.3
}
```

**Backend Auto-Update:**
```typescript
case 'LEVEL_UPDATE':
  await this.tankControlUseCase.updateLevel(data.tankId, data.level);
  console.log(`📊 Tank ${data.tankId} level updated to ${data.level}%`);
```

**Result:** Dashboard selalu menampilkan level terbaru dari sensor!

---

### Use Case 3: Auto Fill Completed

**Scenario:** Auto fill triggered, pompa stop saat level max tercapai

**ESP32 Code:**
```cpp
void loop() {
  if (autoFillMode && currentLevel >= maxLevel) {
    digitalWrite(PUMP_PIN, LOW);
    
    // KIRIM EVENT
    sendTankEvent("AUTO_FILL_COMPLETED", getCurrentLevel(), 0);
    autoFillMode = false;
  }
}
```

**MQTT Payload:**
```json
{
  "deviceId": "TANK_DEVICE_01",
  "tankId": "123",
  "event": "AUTO_FILL_COMPLETED",
  "level": 90.2
}
```

**Backend Auto-Update:**
```typescript
case 'AUTO_FILL_COMPLETED':
  await this.tankControlUseCase.updateLevel(data.tankId, data.level);
  console.log(`✅ Auto fill completed for tank ${data.tankId}`);
```

---

## 🔧 Backend Implementation

### MqttService.ts

```typescript
async onModuleInit() {
  // Subscribe ke tank events
  await this.mqttClient.subscribe('smartfarm/tank/+/event', (message) => {
    void this.handleTankEvent(message);
  });
}

private async handleTankEvent(message: string): Promise<void> {
  const data = JSON.parse(message);
  
  switch (data.event) {
    case 'MANUAL_FILL_COMPLETED':
      if (data.level !== undefined) {
        await this.tankControlUseCase.updateLevel(data.tankId, data.level);
      }
      break;
      
    case 'AUTO_FILL_COMPLETED':
      if (data.level !== undefined) {
        await this.tankControlUseCase.updateLevel(data.tankId, data.level);
      }
      break;
      
    case 'LEVEL_UPDATE':
      if (data.level !== undefined) {
        await this.tankControlUseCase.updateLevel(data.tankId, data.level);
      }
      break;
  }
}
```

### TankControlUseCase.ts

```typescript
async updateLevel(tankId: string, level: number): Promise<Tank> {
  const tank = await this.getTankById(tankId);
  
  const levelBefore = tank.currentLevel;
  const updatedTank = await this.tankRepository.updateLevel(tankId, level);
  
  // Auto-trigger auto fill jika level < minLevel
  if (tank.autoFillEnabled && level < tank.autoFillMinLevel) {
    await this.startAutoFill(tankId);
  }
  
  // Log level change
  await this.tankRepository.createLog({
    tankId,
    type: TankLogType.LEVEL_UPDATE,
    levelBefore,
    levelAfter: level,
    message: `Level updated from ${levelBefore}% to ${level}%`,
  });
  
  return updatedTank;
}
```

---

## 🛡️ Error Handling

### ESP32 Side

```cpp
void sendTankEvent(String event, float level, int duration) {
  if (!mqtt.connected()) {
    Serial.println("❌ MQTT not connected, reconnecting...");
    connectMQTT();
    return;
  }
  
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
  
  // Publish dengan QoS 1 untuk guarantee delivery
  if (mqtt.publish(eventTopic.c_str(), payload.c_str(), false)) {
    Serial.println("✅ Event sent: " + event);
  } else {
    Serial.println("❌ Failed to send event: " + event);
  }
}
```

### Backend Side

```typescript
private async handleTankEvent(message: string): Promise<void> {
  try {
    const data = JSON.parse(message);
    
    // Validasi payload
    if (!data.tankId || !data.event) {
      console.error('❌ Invalid tank event payload:', data);
      return;
    }
    
    // Process event...
    
  } catch (error) {
    console.error('❌ Error processing tank event:', error);
    // Log error tapi jangan crash service
  }
}
```

---

## ✅ Benefits

| Feature | Without MQTT Events | With MQTT Events |
|---------|-------------------|------------------|
| **Level Update** | Manual frontend polling | Auto-update dari ESP32 |
| **Reliability** | Depend on frontend | Backend always updated |
| **Real-time** | Polling delay (3-5s) | Instant (< 1s) |
| **Frontend Error** | Data loss | Still updated |
| **Offline Mode** | No update | ESP32 keeps sending |
| **Server Load** | High (polling) | Low (event-driven) |

---

## 📊 Monitoring

### Backend Logs

```
✅ Subscribed to: smartfarm/tank/+/event
🎧 MQTT Service listening for messages...

🚰 Tank event message received
🔍 Processing tank event message: {"deviceId":"TANK_DEVICE_01"...}
✅ Manual fill completed for tank 123 after 5 minutes
   Level updated to 85.5%

📊 Tank 123 level updated to 85.5%
```

### ESP32 Logs

```
✅ Pompa ON - Timer 5 menit
...
✅ Pompa OFF - Timer selesai (5 menit)
📤 Event published: MANUAL_FILL_COMPLETED
   Topic: smartfarm/tank/TANK_DEVICE_01/event
   Payload: {"deviceId":"TANK_DEVICE_01","tankId":"123"...}
```

---

## 🔗 Related Files

- `src/infrastructure/mqtt/MqttService.ts` - Event handler
- `src/domain/use-cases/TankControlUseCase.ts` - Update level logic
- `MANUAL_FILL_DURATION_GUIDE.md` - ESP32 implementation
- `Smart-Farming-Complete-API.postman_collection.json` - API testing

---

**Created:** February 10, 2026  
**System:** Smart Farming Tank Control - Auto Update via MQTT
