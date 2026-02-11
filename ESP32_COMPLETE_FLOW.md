# 🎛️ ESP32 Complete System Flow - Smart Farming

Dokumentasi lengkap alur kerja ESP32 untuk semua fitur sistem Smart Farming.

---

## 📋 Daftar Isi

1. [Arsitektur Sistem](#arsitektur-sistem)
2. [MQTT Topics Structure](#mqtt-topics-structure)
3. [Penyiraman Otomatis (Auto Drip)](#1-penyiraman-otomatis-auto-drip)
4. [Penyiraman Manual (Manual Watering)](#2-penyiraman-manual-manual-watering)
5. [Sistem Tandon (Tank Control)](#3-sistem-tandon-tank-control)
6. [Sistem Flushing (Pipe Cleaning)](#4-sistem-flushing-pipe-cleaning)
7. [Sensor Monitoring](#5-sensor-monitoring)
8. [Emergency Stop](#6-emergency-stop)
9. [Complete ESP32 Implementation](#complete-esp32-implementation)

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (NestJS)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   Auto   │  │  Manual  │  │   Tank   │  │ Flushing │        │
│  │   Drip   │  │ Watering │  │ Control  │  │  System  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │              │              │              │
└───────┼─────────────┼──────────────┼──────────────┼──────────────┘
        │             │              │              │
        ▼             ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MQTT BROKER (HiveMQ)                        │
│         smartfarm/{deviceId}/control (Command Topics)            │
│         smartfarm/{deviceId}/event (Feedback Topics)             │
└─────────────────────────────────────────────────────────────────┘
        │             │              │              │
        ▼             ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          ESP32 DEVICES                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Zone 1  │  │  Zone 2  │  │  Tank 1  │  │ Flushing │        │
│  │  ESP32   │  │  ESP32   │  │  ESP32   │  │  ESP32   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │              │              │              │
│  ┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐  ┌───▼──────┐        │
│  │ Solenoid │  │ Solenoid │  │   Pump   │  │  Valves  │        │
│  │  Valve   │  │  Valve   │  │ Agitator │  │ (Open/   │        │
│  │  Relay   │  │  Relay   │  │  Sensor  │  │  Close)  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## MQTT Topics Structure

### Command Topics (Backend → ESP32)
```
smartfarm/zone/{zoneId}/control        → Kontrol zone (solenoid valve)
smartfarm/tank/{deviceId}/control      → Kontrol tank (pump, agitator)
smartfarm/flushing/control             → Kontrol flushing (valve)
```

### Event Topics (ESP32 → Backend)
```
smartfarm/zone/{zoneId}/event          → Feedback dari zone
smartfarm/tank/{deviceId}/event        → Feedback dari tank
smartfarm/flushing/event               → Feedback dari flushing
Smartfarming/{deviceId}/sensor         → Data sensor real-time
Smartfarming/{deviceId}/status         → Status device (online/offline)
```

---

## 1. Penyiraman Otomatis (Auto Drip)

### 🔄 Alur Kerja

```
┌────────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────┐
│  Database  │────▶│ Cron Job    │────▶│   MQTT   │────▶│  ESP32  │
│ (Schedule) │     │ (Check Time)│     │ Publish  │     │ Execute │
└────────────┘     └─────────────┘     └──────────┘     └─────────┘
                         │                                    │
                         │                                    ▼
                         │                           ┌────────────────┐
                         │                           │ Open Solenoid  │
                         │                           │ Start Timer    │
                         │                           └────────────────┘
                         │                                    │
                         │                                    ▼
                         │                           ┌────────────────┐
                         │                           │ Timer Finished │
                         │                           │ Close Solenoid │
                         │                           └────────────────┘
                         │                                    │
                         │                                    ▼
                         │                           ┌────────────────┐
                         │◀──────────────────────────│  Send Event    │
                         │                           │  to Backend    │
                         │                           └────────────────┘
                         ▼
                  ┌──────────────┐
                  │ Update Status│
                  │  to Database │
                  └──────────────┘
```

### 📥 MQTT Command (Backend → ESP32)

**Topic:** `smartfarm/zone/{zoneId}/control`

**Payload START:**
```json
{
  "command": "START_WATERING",
  "zoneId": "uuid-zone-1",
  "duration": 1800,
  "scheduleId": "uuid-schedule-1"
}
```

**Payload STOP:**
```json
{
  "command": "STOP_WATERING",
  "zoneId": "uuid-zone-1"
}
```

### 📤 MQTT Event (ESP32 → Backend)

**Topic:** `smartfarm/zone/{zoneId}/event`

**Payload COMPLETED:**
```json
{
  "event": "WATERING_COMPLETED",
  "zoneId": "uuid-zone-1",
  "scheduleId": "uuid-schedule-1",
  "actualDuration": 1800,
  "timestamp": "2026-02-11T07:30:00Z"
}
```

**Payload STOPPED:**
```json
{
  "event": "WATERING_STOPPED",
  "zoneId": "uuid-zone-1",
  "reason": "Manual stop by user",
  "timestamp": "2026-02-11T07:15:00Z"
}
```

### 💻 ESP32 Code

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Pin Configuration
#define SOLENOID_PIN 26  // GPIO untuk relay solenoid valve
#define LED_PIN 2        // LED indicator

// MQTT Configuration
const char* mqtt_server = "your-mqtt-broker.com";
const int mqtt_port = 8883;
String zoneId = "uuid-zone-1";  // Unique Zone ID
String controlTopic = "smartfarm/zone/" + zoneId + "/control";
String eventTopic = "smartfarm/zone/" + zoneId + "/event";

WiFiClient espClient;
PubSubClient client(espClient);

// State Variables
bool isWatering = false;
unsigned long wateringStartTime = 0;
unsigned long wateringDuration = 0;
String currentScheduleId = "";

void setup() {
  Serial.begin(115200);
  
  // Pin Setup
  pinMode(SOLENOID_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(SOLENOID_PIN, LOW);  // Solenoid OFF
  digitalWrite(LED_PIN, LOW);
  
  // WiFi & MQTT Setup
  setupWiFi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  connectMQTT();
}

void loop() {
  if (!client.connected()) {
    connectMQTT();
  }
  client.loop();
  
  // Check if watering duration exceeded
  if (isWatering) {
    unsigned long elapsed = (millis() - wateringStartTime) / 1000;
    
    if (elapsed >= wateringDuration) {
      stopWatering(true);  // Auto stop - completed
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message on topic: ");
  Serial.println(topic);
  
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.println("JSON parsing failed!");
    return;
  }
  
  String command = doc["command"];
  
  if (command == "START_WATERING") {
    startWatering(
      doc["zoneId"],
      doc["duration"],
      doc["scheduleId"]
    );
  }
  else if (command == "STOP_WATERING") {
    stopWatering(false);  // Manual stop
  }
}

void startWatering(String zId, int duration, String schedId) {
  if (isWatering) {
    Serial.println("Already watering!");
    return;
  }
  
  Serial.println("▶️ Starting watering for " + String(duration) + " seconds");
  
  isWatering = true;
  wateringStartTime = millis();
  wateringDuration = duration;
  currentScheduleId = schedId;
  
  // Open solenoid valve
  digitalWrite(SOLENOID_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);
  
  Serial.println("✅ Solenoid valve OPENED");
}

void stopWatering(bool completed) {
  if (!isWatering) {
    return;
  }
  
  Serial.println("⏹️ Stopping watering");
  
  // Close solenoid valve
  digitalWrite(SOLENOID_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  // Calculate actual duration
  unsigned long actualDuration = (millis() - wateringStartTime) / 1000;
  
  // Send event to backend
  sendWateringEvent(completed, actualDuration);
  
  // Reset state
  isWatering = false;
  wateringStartTime = 0;
  wateringDuration = 0;
  currentScheduleId = "";
  
  Serial.println("✅ Solenoid valve CLOSED");
}

void sendWateringEvent(bool completed, unsigned long actualDuration) {
  StaticJsonDocument<256> doc;
  
  if (completed) {
    doc["event"] = "WATERING_COMPLETED";
  } else {
    doc["event"] = "WATERING_STOPPED";
    doc["reason"] = "Manual stop by user";
  }
  
  doc["zoneId"] = zoneId;
  doc["scheduleId"] = currentScheduleId;
  doc["actualDuration"] = actualDuration;
  doc["timestamp"] = getTimestamp();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  if (client.publish(eventTopic.c_str(), buffer)) {
    Serial.println("📤 Event sent to backend");
  } else {
    Serial.println("❌ Failed to send event");
  }
}

void connectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    
    if (client.connect(zoneId.c_str())) {
      Serial.println("✅ Connected");
      client.subscribe(controlTopic.c_str());
      Serial.println("📥 Subscribed to: " + controlTopic);
    } else {
      Serial.print("❌ Failed, rc=");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

String getTimestamp() {
  // Implement NTP time or use backend timestamp
  return "2026-02-11T07:30:00Z";
}

void setupWiFi() {
  WiFi.begin("your-ssid", "your-password");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected");
}
```

---

## 2. Penyiraman Manual (Manual Watering)

### 🔄 Alur Kerja

```
┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────┐
│ Frontend │────▶│   Backend   │────▶│   MQTT   │────▶│  ESP32  │
│ (Button) │     │ (Validation)│     │ Publish  │     │ Execute │
└──────────┘     └─────────────┘     └──────────┘     └─────────┘
                                                              │
                                                              ▼
                                                     ┌────────────────┐
                                                     │ Open Solenoid  │
                                                     │ Wait for STOP  │
                                                     └────────────────┘
                                                              │
                                                              ▼
                        ┌─────────────────────────────────────┤
                        │                                     │
                        ▼                                     ▼
               ┌─────────────────┐                  ┌─────────────────┐
               │  User Clicks    │                  │ Sensor Detects  │
               │  STOP Button    │                  │  Soil Moisture  │
               └─────────────────┘                  └─────────────────┘
                        │                                     │
                        └────────────┬────────────────────────┘
                                     ▼
                            ┌────────────────┐
                            │ Close Solenoid │
                            │  Send Event    │
                            └────────────────┘
```

### 📥 MQTT Command (Backend → ESP32)

**Topic:** `smartfarm/zone/{zoneId}/control`

**Payload START:**
```json
{
  "command": "START_MANUAL",
  "zoneId": "uuid-zone-1"
}
```

**Payload STOP:**
```json
{
  "command": "STOP_MANUAL",
  "zoneId": "uuid-zone-1"
}
```

---

### 📤 MQTT Callback (ESP32 → Backend)

**Topic:** `smartfarm/zone/{zoneId}/status`

**ESP32 wajib mengirim callback setelah menerima perintah:**

#### ✅ Acknowledgment - Perintah Diterima
```json
{
  "zoneId": "uuid-zone-1",
  "type": "ACK",
  "command": "START_MANUAL",
  "received": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 🟢 Status - Pompa Sudah ON
```json
{
  "zoneId": "uuid-zone-1",
  "type": "STATUS",
  "status": "WATERING_STARTED",
  "pumpStatus": "ON",
  "solenoidStatus": "OPEN",
  "timestamp": "2024-01-15T10:30:01Z"
}
```

#### 🔴 Status - Pompa Sudah OFF
```json
{
  "zoneId": "uuid-zone-1",
  "type": "STATUS",
  "status": "WATERING_STOPPED",
  "pumpStatus": "OFF",
  "solenoidStatus": "CLOSED",
  "totalDuration": 300,
  "timestamp": "2024-01-15T10:35:01Z"
}
```

#### ⚠️ Error - Gagal Eksekusi
```json
{
  "zoneId": "uuid-zone-1",
  "type": "ERROR",
  "command": "START_MANUAL",
  "error": "Pump malfunction",
  "timestamp": "2024-01-15T10:30:01Z"
}
```

---

### 🔄 Flow dengan Callback

```
Backend                     MQTT Broker                    ESP32
   │                             │                            │
   │──── START_MANUAL ──────────►│───────────────────────────►│
   │                             │                            │ 1️⃣ Terima perintah
   │                             │                            │
   │◄──── ACK ──────────────────│◄───────────────────────────│ 2️⃣ Kirim ACK
   │                             │                            │
   │                             │                            │ 3️⃣ Nyalakan pompa
   │                             │                            │
   │◄──── WATERING_STARTED ─────│◄───────────────────────────│ 4️⃣ Konfirmasi pompa ON
   │                             │                            │
   │                             │                            │ ... Pompa menyiram ...
   │                             │                            │
   │──── STOP_MANUAL ───────────►│───────────────────────────►│ 5️⃣ Perintah stop
   │                             │                            │
   │◄──── ACK ──────────────────│◄───────────────────────────│ 6️⃣ Kirim ACK
   │                             │                            │
   │                             │                            │ 7️⃣ Matikan pompa
   │                             │                            │
   │◄──── WATERING_STOPPED ─────│◄───────────────────────────│ 8️⃣ Konfirmasi pompa OFF
   │                             │                            │
```

### 💻 ESP32 Code Implementation

```cpp
// Global variables
String statusTopic = "smartfarm/zone/" + zoneId + "/status";

// Helper function untuk kirim status
void sendStatusCallback(String type, String status, String command = "", String error = "") {
  StaticJsonDocument<256> doc;
  doc["zoneId"] = zoneId;
  doc["type"] = type;
  
  if (type == "ACK") {
    doc["command"] = command;
    doc["received"] = true;
  }
  else if (type == "STATUS") {
    doc["status"] = status;
    if (status == "WATERING_STARTED") {
      doc["pumpStatus"] = "ON";
      doc["solenoidStatus"] = "OPEN";
    } else if (status == "WATERING_STOPPED") {
      doc["pumpStatus"] = "OFF";
      doc["solenoidStatus"] = "CLOSED";
      doc["totalDuration"] = (millis() - wateringStartTime) / 1000;
    }
  }
  else if (type == "ERROR") {
    doc["command"] = command;
    doc["error"] = error;
  }
  
  doc["timestamp"] = getTimestamp();
  
  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(statusTopic.c_str(), buffer);
}

// MQTT Callback handler
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);
  
  String command = doc["command"];
  
  if (command == "START_MANUAL") {
    // 1️⃣ Kirim ACK dulu
    sendStatusCallback("ACK", "", "START_MANUAL");
    delay(100);
    
    // 2️⃣ Eksekusi perintah
    bool success = startManualWatering(doc["zoneId"]);
    
    // 3️⃣ Kirim status hasil
    if (success) {
      sendStatusCallback("STATUS", "WATERING_STARTED");
    } else {
      sendStatusCallback("ERROR", "", "START_MANUAL", "Failed to start pump");
    }
  }
  else if (command == "STOP_MANUAL") {
    // 1️⃣ Kirim ACK dulu
    sendStatusCallback("ACK", "", "STOP_MANUAL");
    delay(100);
    
    // 2️⃣ Eksekusi perintah
    bool success = stopManualWatering();
    
    // 3️⃣ Kirim status hasil
    if (success) {
      sendStatusCallback("STATUS", "WATERING_STOPPED");
    } else {
      sendStatusCallback("ERROR", "", "STOP_MANUAL", "Failed to stop pump");
    }
  }
}

// Function untuk start manual watering
bool startManualWatering(String zId) {
  Serial.println("▶️ Starting MANUAL watering");
  
  // Cek apakah sudah dalam mode watering
  if (isWatering) {
    Serial.println("⚠️ Already watering!");
    return false;
  }
  
  // Aktifkan pompa
  isWatering = true;
  wateringStartTime = millis();
  wateringDuration = 0;  // No duration limit for manual
  
  digitalWrite(SOLENOID_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);
  
  Serial.println("✅ Solenoid valve OPENED (Manual Mode)");
  return true;
}

// Function untuk stop manual watering
bool stopManualWatering() {
  Serial.println("⏹️ Stopping MANUAL watering");
  
  // Matikan pompa
  digitalWrite(SOLENOID_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  isWatering = false;
  unsigned long actualDuration = (millis() - wateringStartTime) / 1000;
  wateringStartTime = 0;
  
  Serial.print("✅ Manual watering stopped. Duration: ");
  Serial.print(actualDuration);
  Serial.println(" seconds");
  
  return true;
}
```

---

### 🔧 Backend Handler untuk Status Callback

**File:** `src/infrastructure/mqtt/MqttService.ts`

```typescript
@Injectable()
export class MqttService implements OnModuleInit {
  
  async onModuleInit() {
    // Subscribe ke status topic dari semua zone
    this.client.subscribe('smartfarm/zone/+/status');
  }

  @MqttSubscribe('smartfarm/zone/+/status')
  async handleZoneStatus(topic: string, payload: Buffer) {
    const data = JSON.parse(payload.toString());
    const { zoneId, type, status, command, error } = data;

    console.log(`📩 Received from ESP32 [${type}]:`, data);

    switch (type) {
      case 'ACK':
        // ESP32 sudah terima perintah
        await this.handleAcknowledgment(zoneId, command, data);
        break;

      case 'STATUS':
        // ESP32 sudah eksekusi (pompa ON/OFF)
        await this.handleStatusUpdate(zoneId, status, data);
        break;

      case 'ERROR':
        // ESP32 gagal eksekusi
        await this.handleError(zoneId, command, error, data);
        break;
    }
  }

  private async handleAcknowledgment(zoneId: string, command: string, data: any) {
    console.log(`✅ ACK received for ${command} on zone ${zoneId}`);
    
    // Update status di database: "COMMAND_RECEIVED"
    // Bisa juga emit WebSocket event ke frontend
  }

  private async handleStatusUpdate(zoneId: string, status: string, data: any) {
    console.log(`🔄 Status update: ${status} on zone ${zoneId}`);

    if (status === 'WATERING_STARTED') {
      // Update database: pompa benar-benar sudah ON
      // Update watering_history: start_time, status = 'ACTIVE'
      // Emit WebSocket: "Pompa Zone X sudah menyala"
      
    } else if (status === 'WATERING_STOPPED') {
      // Update database: pompa benar-benar sudah OFF
      // Update watering_history: end_time, total_duration
      // Emit WebSocket: "Pompa Zone X sudah mati"
    }
  }

  private async handleError(zoneId: string, command: string, error: string, data: any) {
    console.error(`❌ Error on ${command} for zone ${zoneId}: ${error}`);
    
    // Log error ke database
    // Kirim notifikasi ke admin
    // Emit WebSocket error event
  }
}
```

---

### ⏱️ Timeout Handling

**Jika ESP32 tidak kirim callback dalam 10 detik:**

```typescript
// Saat kirim perintah START/STOP
async controlWatering(zoneId: string, command: string) {
  // Kirim MQTT command
  this.mqttService.publish(`smartfarm/zone/${zoneId}/control`, {
    command,
    zoneId
  });

  // Set timeout 10 detik
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('ESP32 tidak merespon')), 10000);
  });

  // Tunggu ACK dari ESP32
  const ackPromise = this.waitForAck(zoneId, command);

  try {
    await Promise.race([ackPromise, timeoutPromise]);
    console.log('✅ ESP32 responded');
    
    // Tunggu lagi untuk status confirmation
    const statusPromise = this.waitForStatus(zoneId);
    await Promise.race([statusPromise, timeoutPromise]);
    console.log('✅ Status confirmed');
    
  } catch (error) {
    console.error('❌ Timeout: ESP32 tidak merespon');
    throw new Error('ESP32 tidak merespon, cek koneksi perangkat');
  }
}
```

---

### ✅ Keuntungan Sistem Callback

| Masalah Tanpa Callback | Solusi Dengan Callback |
|------------------------|------------------------|
| ❌ Backend kirim START tapi ESP32 offline → pompa tidak nyala tapi backend anggap nyala | ✅ Backend tunggu ACK, jika timeout = error |
| ❌ Backend kirim STOP tapi ESP32 tidak terima → pompa terus nyiram | ✅ Backend tahu pompa belum mati, kirim ulang perintah |
| ❌ Tidak tahu status real pompa (ON/OFF) | ✅ Tahu status real dari hardware |
| ❌ Tidak ada error handling | ✅ ESP32 bisa report error (pompa rusak, dll) |
| ❌ Frontend tidak sync dengan hardware | ✅ Frontend update real-time dari callback |

---

### 📊 Database Schema untuk Tracking

**Tabel:** `watering_command_logs`

```sql
CREATE TABLE watering_command_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL,
    command VARCHAR(50) NOT NULL,  -- START_MANUAL, STOP_MANUAL
    
    -- Status tracking
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ack_received_at TIMESTAMPTZ,
    status_confirmed_at TIMESTAMPTZ,
    
    -- Response dari ESP32
    ack_received BOOLEAN DEFAULT FALSE,
    status VARCHAR(50),  -- WATERING_STARTED, WATERING_STOPPED
    error_message TEXT,
    
    -- Metadata
    requested_by UUID,  -- user yang request
    timeout BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (zone_id) REFERENCES zones(id)
);
```

**Query untuk monitoring:**

```sql
-- Cek perintah yang timeout (tidak ada ACK dalam 10 detik)
SELECT * FROM watering_command_logs
WHERE ack_received = FALSE 
  AND sent_at < NOW() - INTERVAL '10 seconds';

-- Cek perintah yang ACK tapi belum dapat status
SELECT * FROM watering_command_logs
WHERE ack_received = TRUE 
  AND status IS NULL
  AND sent_at < NOW() - INTERVAL '15 seconds';
```

---

## 3. Sistem Tandon (Tank Control)

### 🔄 Alur Kerja

```
┌─────────────────────────────────────────────────────────────┐
│                      TANK CONTROL FLOW                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Backend    │
│  Send Start  │
│ Manual Fill  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  MQTT: smartfarm/tank/{deviceId}/control                 │
│  {                                                        │
│    "command": "START_MANUAL_FILL",                       │
│    "tankId": "uuid",                                     │
│    "duration": 1800  // Optional: 30 minutes             │
│  }                                                        │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  ESP32 Tank Device                                        │
│  - Check if pump already running                         │
│  - If duration provided: Start timer                     │
│  - If no duration: Run until manual stop or sensor stop  │
│  - Turn ON pump relay                                    │
└──────────────────────────────────────────────────────────┘
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Timer Mode   │  │ Manual Mode  │  │ Sensor Mode  │
│ (Duration)   │  │ (No Timer)   │  │ (Max Level)  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
  Timer Finish      User STOP         Level Reached
       │                 │                 │
       └─────────────────┴─────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  Stop Pump   │
                  │ Send Event   │
                  └──────┬───────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│  MQTT: smartfarm/tank/{deviceId}/event                   │
│  {                                                        │
│    "event": "MANUAL_FILL_COMPLETED",                     │
│    "tankId": "uuid",                                     │
│    "currentLevel": 4500,  // liters                      │
│    "actualDuration": 1800  // seconds                    │
│  }                                                        │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   Backend    │
                  │Auto-update DB│
                  └──────────────┘
```

### 📥 MQTT Commands (Backend → ESP32)

**Topic:** `smartfarm/tank/{deviceId}/control`

**1. Start Manual Fill (with duration)**
```json
{
  "command": "START_MANUAL_FILL",
  "tankId": "uuid-tank-1",
  "duration": 1800
}
```

**2. Start Manual Fill (no duration - manual stop)**
```json
{
  "command": "START_MANUAL_FILL",
  "tankId": "uuid-tank-1"
}
```

**3. Stop Manual Fill**
```json
{
  "command": "STOP_MANUAL_FILL",
  "tankId": "uuid-tank-1"
}
```

**4. Control Agitator**
```json
{
  "command": "AGITATOR_ON",
  "tankId": "uuid-tank-1"
}
```

```json
{
  "command": "AGITATOR_OFF",
  "tankId": "uuid-tank-1"
}
```

**5. Start Auto Fill**
```json
{
  "command": "START_AUTO_FILL",
  "tankId": "uuid-tank-1"
}
```

**6. Stop Auto Fill**
```json
{
  "command": "STOP_AUTO_FILL",
  "tankId": "uuid-tank-1"
}
```

### 📤 MQTT Events (ESP32 → Backend)

**Topic:** `smartfarm/tank/{deviceId}/event`

**1. Manual Fill Completed**
```json
{
  "event": "MANUAL_FILL_COMPLETED",
  "tankId": "uuid-tank-1",
  "currentLevel": 4500,
  "actualDuration": 1800,
  "timestamp": "2026-02-11T07:30:00Z"
}
```

**2. Auto Fill Completed**
```json
{
  "event": "AUTO_FILL_COMPLETED",
  "tankId": "uuid-tank-1",
  "currentLevel": 5000,
  "timestamp": "2026-02-11T07:30:00Z"
}
```

**3. Level Update (Real-time)**
```json
{
  "event": "LEVEL_UPDATE",
  "tankId": "uuid-tank-1",
  "currentLevel": 3500,
  "timestamp": "2026-02-11T07:30:00Z"
}
```

### 💻 ESP32 Tank Code

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Pin Configuration
#define PUMP_PIN 26          // GPIO untuk pump relay
#define AGITATOR_PIN 27      // GPIO untuk agitator relay
#define SENSOR_TRIG 14       // Ultrasonic sensor TRIG
#define SENSOR_ECHO 12       // Ultrasonic sensor ECHO
#define LED_PIN 2

// Tank Configuration
String tankId = "uuid-tank-1";
String deviceId = "device-tank-1";
float tankMaxCapacity = 5000.0;  // liters
float tankHeight = 200.0;         // cm

// MQTT Topics
String controlTopic = "smartfarm/tank/" + deviceId + "/control";
String eventTopic = "smartfarm/tank/" + deviceId + "/event";

WiFiClient espClient;
PubSubClient client(espClient);

// State Variables
bool isPumping = false;
bool isAgitatorOn = false;
bool isAutoFill = false;
unsigned long pumpStartTime = 0;
unsigned long pumpDuration = 0;  // 0 = no duration limit
String fillMode = "";  // "MANUAL" or "AUTO"

void setup() {
  Serial.begin(115200);
  
  // Pin Setup
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(AGITATOR_PIN, OUTPUT);
  pinMode(SENSOR_TRIG, OUTPUT);
  pinMode(SENSOR_ECHO, INPUT);
  pinMode(LED_PIN, OUTPUT);
  
  digitalWrite(PUMP_PIN, LOW);
  digitalWrite(AGITATOR_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  // WiFi & MQTT Setup
  setupWiFi();
  client.setServer("mqtt-broker.com", 8883);
  client.setCallback(mqttCallback);
  connectMQTT();
}

void loop() {
  if (!client.connected()) {
    connectMQTT();
  }
  client.loop();
  
  // Check pump timer (if duration is set)
  if (isPumping && pumpDuration > 0) {
    unsigned long elapsed = (millis() - pumpStartTime) / 1000;
    
    if (elapsed >= pumpDuration) {
      stopPump(true);  // Timer completed
    }
  }
  
  // Check auto-fill condition
  if (isAutoFill) {
    float currentLevel = getCurrentLevel();
    
    if (currentLevel >= tankMaxCapacity) {
      stopPump(true);  // Max level reached
    }
  }
  
  // Send level update every 30 seconds
  static unsigned long lastLevelUpdate = 0;
  if (millis() - lastLevelUpdate > 30000) {
    sendLevelUpdate();
    lastLevelUpdate = millis();
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.println("JSON parsing failed!");
    return;
  }
  
  String command = doc["command"];
  
  if (command == "START_MANUAL_FILL") {
    int duration = doc["duration"] | 0;  // Default 0 if not provided
    startManualFill(duration);
  }
  else if (command == "STOP_MANUAL_FILL") {
    stopPump(false);  // Manual stop
  }
  else if (command == "START_AUTO_FILL") {
    startAutoFill();
  }
  else if (command == "STOP_AUTO_FILL") {
    stopPump(false);
  }
  else if (command == "AGITATOR_ON") {
    controlAgitator(true);
  }
  else if (command == "AGITATOR_OFF") {
    controlAgitator(false);
  }
}

void startManualFill(int duration) {
  if (isPumping) {
    Serial.println("⚠️ Pump already running!");
    return;
  }
  
  Serial.println("▶️ Starting MANUAL FILL");
  if (duration > 0) {
    Serial.println("⏱️ Duration: " + String(duration) + " seconds");
  } else {
    Serial.println("♾️ No duration limit (manual stop)");
  }
  
  isPumping = true;
  isAutoFill = false;
  fillMode = "MANUAL";
  pumpStartTime = millis();
  pumpDuration = duration;
  
  digitalWrite(PUMP_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);
  
  Serial.println("✅ Pump ON");
}

void startAutoFill() {
  if (isPumping) {
    Serial.println("⚠️ Pump already running!");
    return;
  }
  
  Serial.println("▶️ Starting AUTO FILL (until max level)");
  
  isPumping = true;
  isAutoFill = true;
  fillMode = "AUTO";
  pumpStartTime = millis();
  pumpDuration = 0;
  
  digitalWrite(PUMP_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);
  
  Serial.println("✅ Pump ON (Auto mode)");
}

void stopPump(bool completed) {
  if (!isPumping) {
    return;
  }
  
  Serial.println("⏹️ Stopping pump");
  
  digitalWrite(PUMP_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  unsigned long actualDuration = (millis() - pumpStartTime) / 1000;
  float currentLevel = getCurrentLevel();
  
  // Send event to backend
  sendPumpEvent(completed, actualDuration, currentLevel);
  
  // Reset state
  isPumping = false;
  isAutoFill = false;
  pumpStartTime = 0;
  pumpDuration = 0;
  fillMode = "";
  
  Serial.println("✅ Pump OFF");
}

void controlAgitator(bool turnOn) {
  if (turnOn) {
    Serial.println("▶️ Agitator ON");
    digitalWrite(AGITATOR_PIN, HIGH);
    isAgitatorOn = true;
  } else {
    Serial.println("⏹️ Agitator OFF");
    digitalWrite(AGITATOR_PIN, LOW);
    isAgitatorOn = false;
  }
}

float getCurrentLevel() {
  // Ultrasonic sensor reading
  digitalWrite(SENSOR_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(SENSOR_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(SENSOR_TRIG, LOW);
  
  long duration = pulseIn(SENSOR_ECHO, HIGH);
  float distance = duration * 0.034 / 2;  // cm
  
  // Convert distance to water level
  float waterHeight = tankHeight - distance;
  float level = (waterHeight / tankHeight) * tankMaxCapacity;
  
  // Clamp to valid range
  if (level < 0) level = 0;
  if (level > tankMaxCapacity) level = tankMaxCapacity;
  
  return level;
}

void sendPumpEvent(bool completed, unsigned long actualDuration, float currentLevel) {
  StaticJsonDocument<256> doc;
  
  if (fillMode == "MANUAL") {
    if (completed) {
      doc["event"] = "MANUAL_FILL_COMPLETED";
    } else {
      doc["event"] = "MANUAL_FILL_STOPPED";
    }
  } else if (fillMode == "AUTO") {
    doc["event"] = "AUTO_FILL_COMPLETED";
  }
  
  doc["tankId"] = tankId;
  doc["currentLevel"] = currentLevel;
  doc["actualDuration"] = actualDuration;
  doc["timestamp"] = getTimestamp();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  if (client.publish(eventTopic.c_str(), buffer)) {
    Serial.println("📤 Event sent to backend");
    Serial.println(buffer);
  }
}

void sendLevelUpdate() {
  float currentLevel = getCurrentLevel();
  
  StaticJsonDocument<256> doc;
  doc["event"] = "LEVEL_UPDATE";
  doc["tankId"] = tankId;
  doc["currentLevel"] = currentLevel;
  doc["timestamp"] = getTimestamp();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  client.publish(eventTopic.c_str(), buffer);
  
  Serial.println("📊 Level: " + String(currentLevel) + "L");
}

void connectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    
    if (client.connect(deviceId.c_str())) {
      Serial.println("✅ Connected");
      client.subscribe(controlTopic.c_str());
      Serial.println("📥 Subscribed to: " + controlTopic);
    } else {
      Serial.print("❌ Failed, rc=");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

String getTimestamp() {
  // Use NTP or backend timestamp
  return "2026-02-11T07:30:00Z";
}

void setupWiFi() {
  WiFi.begin("your-ssid", "your-password");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected");
}
```

---

## 4. Sistem Flushing (Pipe Cleaning)

### 🔄 Alur Kerja

```
┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────┐
│ Frontend │────▶│   Backend   │────▶│   MQTT   │────▶│  ESP32  │
│ (Start)  │     │ (Validation)│     │ Publish  │     │ Execute │
└──────────┘     └─────────────┘     └──────────┘     └─────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────┐
                                                   │ Open ALL Valves │
                                                   │  Start Timer    │
                                                   └─────────────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────┐
                                                   │ Water flows     │
                                                   │ through pipes   │
                                                   │ Cleaning debris │
                                                   └─────────────────┘
                                                              │
                                                              ▼
                        ┌─────────────────────────────────────┤
                        │                                     │
                        ▼                                     ▼
               ┌─────────────────┐                  ┌─────────────────┐
               │ Timer Finished  │                  │  User STOP      │
               │  (Completed)    │                  │  (Manual Stop)  │
               └─────────────────┘                  └─────────────────┘
                        │                                     │
                        └────────────┬────────────────────────┘
                                     ▼
                            ┌─────────────────┐
                            │ Close ALL Valves│
                            │   Send Event    │
                            └─────────────────┘
```

### 📥 MQTT Commands (Backend → ESP32)

**Topic:** `smartfarm/flushing/control`

**1. Start Flushing**
```json
{
  "command": "START_FLUSHING",
  "duration": 1800,
  "sessionId": "uuid-session-1"
}
```

**2. Stop Flushing**
```json
{
  "command": "STOP_FLUSHING",
  "sessionId": "uuid-session-1"
}
```

### 📤 MQTT Events (ESP32 → Backend)

**Topic:** `smartfarm/flushing/event`

**1. Flushing Completed**
```json
{
  "event": "FLUSHING_COMPLETED",
  "sessionId": "uuid-session-1",
  "actualDuration": 1800,
  "timestamp": "2026-02-11T07:30:00Z"
}
```

**2. Flushing Stopped**
```json
{
  "event": "FLUSHING_STOPPED",
  "sessionId": "uuid-session-1",
  "actualDuration": 900,
  "reason": "Manual stop by user",
  "timestamp": "2026-02-11T07:15:00Z"
}
```

**3. Flushing Failed**
```json
{
  "event": "FLUSHING_FAILED",
  "sessionId": "uuid-session-1",
  "error": "Valve malfunction",
  "timestamp": "2026-02-11T07:10:00Z"
}
```

### 💻 ESP32 Flushing Code

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Pin Configuration
#define VALVE_1_PIN 26   // Main valve 1
#define VALVE_2_PIN 27   // Main valve 2
#define VALVE_3_PIN 14   // Main valve 3
#define VALVE_4_PIN 12   // Main valve 4
#define LED_PIN 2

// MQTT Topics
String controlTopic = "smartfarm/flushing/control";
String eventTopic = "smartfarm/flushing/event";
String deviceId = "flushing-device-1";

WiFiClient espClient;
PubSubClient client(espClient);

// State Variables
bool isFlushing = false;
unsigned long flushingStartTime = 0;
unsigned long flushingDuration = 0;
String currentSessionId = "";

int valvePins[] = {VALVE_1_PIN, VALVE_2_PIN, VALVE_3_PIN, VALVE_4_PIN};
int numValves = 4;

void setup() {
  Serial.begin(115200);
  
  // Pin Setup
  for (int i = 0; i < numValves; i++) {
    pinMode(valvePins[i], OUTPUT);
    digitalWrite(valvePins[i], LOW);  // All valves closed
  }
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // WiFi & MQTT Setup
  setupWiFi();
  client.setServer("mqtt-broker.com", 8883);
  client.setCallback(mqttCallback);
  connectMQTT();
}

void loop() {
  if (!client.connected()) {
    connectMQTT();
  }
  client.loop();
  
  // Check flushing timer
  if (isFlushing) {
    unsigned long elapsed = (millis() - flushingStartTime) / 1000;
    
    if (elapsed >= flushingDuration) {
      stopFlushing(true);  // Auto stop - completed
    }
    
    // Progress indicator (blink LED)
    if (elapsed % 2 == 0) {
      digitalWrite(LED_PIN, HIGH);
    } else {
      digitalWrite(LED_PIN, LOW);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message on topic: ");
  Serial.println(topic);
  
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.println("JSON parsing failed!");
    return;
  }
  
  String command = doc["command"];
  
  if (command == "START_FLUSHING") {
    startFlushing(
      doc["duration"],
      doc["sessionId"]
    );
  }
  else if (command == "STOP_FLUSHING") {
    stopFlushing(false);  // Manual stop
  }
}

void startFlushing(int duration, String sessionId) {
  if (isFlushing) {
    Serial.println("⚠️ Flushing already running!");
    return;
  }
  
  Serial.println("▶️ Starting flushing for " + String(duration) + " seconds");
  
  isFlushing = true;
  flushingStartTime = millis();
  flushingDuration = duration;
  currentSessionId = sessionId;
  
  // Open ALL valves
  for (int i = 0; i < numValves; i++) {
    digitalWrite(valvePins[i], HIGH);
    Serial.println("✅ Valve " + String(i + 1) + " OPENED");
  }
  
  digitalWrite(LED_PIN, HIGH);
  Serial.println("💧 Flushing in progress...");
}

void stopFlushing(bool completed) {
  if (!isFlushing) {
    return;
  }
  
  Serial.println("⏹️ Stopping flushing");
  
  // Close ALL valves
  for (int i = 0; i < numValves; i++) {
    digitalWrite(valvePins[i], LOW);
    Serial.println("🔒 Valve " + String(i + 1) + " CLOSED");
  }
  
  digitalWrite(LED_PIN, LOW);
  
  // Calculate actual duration
  unsigned long actualDuration = (millis() - flushingStartTime) / 1000;
  
  // Send event to backend
  sendFlushingEvent(completed, actualDuration);
  
  // Reset state
  isFlushing = false;
  flushingStartTime = 0;
  flushingDuration = 0;
  currentSessionId = "";
  
  Serial.println("✅ Flushing stopped");
}

void sendFlushingEvent(bool completed, unsigned long actualDuration) {
  StaticJsonDocument<256> doc;
  
  if (completed) {
    doc["event"] = "FLUSHING_COMPLETED";
  } else {
    doc["event"] = "FLUSHING_STOPPED";
    doc["reason"] = "Manual stop by user";
  }
  
  doc["sessionId"] = currentSessionId;
  doc["actualDuration"] = actualDuration;
  doc["timestamp"] = getTimestamp();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  if (client.publish(eventTopic.c_str(), buffer)) {
    Serial.println("📤 Event sent to backend");
    Serial.println(buffer);
  } else {
    Serial.println("❌ Failed to send event");
  }
}

void connectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    
    if (client.connect(deviceId.c_str())) {
      Serial.println("✅ Connected");
      client.subscribe(controlTopic.c_str());
      Serial.println("📥 Subscribed to: " + controlTopic);
    } else {
      Serial.print("❌ Failed, rc=");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

String getTimestamp() {
  // Use NTP or backend timestamp
  return "2026-02-11T07:30:00Z";
}

void setupWiFi() {
  WiFi.begin("your-ssid", "your-password");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected");
}
```

---

## 5. Sistem Siram Kebun (Garden Watering)

### 🔄 Alur Kerja

```
┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌─────────┐
│ Frontend │────▶│   Backend   │────▶│   MQTT   │────▶│  ESP32  │
│ (Start)  │     │ (Validation)│     │ Publish  │     │ Execute │
└──────────┘     └─────────────┘     └──────────┘     └─────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────┐
                                                   │ Open Sprinklers │
                                                   │  Start Timer    │
                                                   └─────────────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────┐
                                                   │ Water flowing   │
                                                   │ to garden area  │
                                                   └─────────────────┘
                                                              │
                                                              ▼
                        ┌─────────────────────────────────────┤
                        │                                     │
                        ▼                                     ▼
               ┌─────────────────┐                  ┌─────────────────┐
               │ Timer Finished  │                  │  User STOP      │
               │  (Completed)    │                  │  (Manual Stop)  │
               └─────────────────┘                  └─────────────────┘
                        │                                     │
                        └────────────┬────────────────────────┘
                                     ▼
                            ┌──────────────────┐
                            │ Close Sprinklers │
                            │   Send Event     │
                            └──────────────────┘
```

### 📥 MQTT Commands (Backend → ESP32)

**Topic:** `smartfarm/garden/control`

**1. Start Garden Watering**
```json
{
  "command": "START_GARDEN_WATERING",
  "duration": 1800,
  "sessionId": "uuid-session-1"
}
```

**2. Stop Garden Watering**
```json
{
  "command": "STOP_GARDEN_WATERING",
  "sessionId": "uuid-session-1"
}
```

### 📤 MQTT Events (ESP32 → Backend)

**Topic:** `smartfarm/garden/event`

**1. Garden Watering Completed**
```json
{
  "event": "GARDEN_WATERING_COMPLETED",
  "sessionId": "uuid-session-1",
  "actualDuration": 1800,
  "timestamp": "2026-02-11T07:30:00Z"
}
```

**2. Garden Watering Stopped**
```json
{
  "event": "GARDEN_WATERING_STOPPED",
  "sessionId": "uuid-session-1",
  "actualDuration": 900,
  "reason": "Manual stop by user",
  "timestamp": "2026-02-11T07:15:00Z"
}
```

### 💻 ESP32 Garden Watering Code

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Pin Configuration
#define SPRINKLER_1_PIN 26   // Garden sprinkler 1
#define SPRINKLER_2_PIN 27   // Garden sprinkler 2
#define SPRINKLER_3_PIN 14   // Garden sprinkler 3
#define LED_PIN 2

// MQTT Topics
String controlTopic = "smartfarm/garden/control";
String eventTopic = "smartfarm/garden/event";
String deviceId = "garden-device-1";

WiFiClient espClient;
PubSubClient client(espClient);

// State Variables
bool isWatering = false;
unsigned long wateringStartTime = 0;
unsigned long wateringDuration = 0;
String currentSessionId = "";

int sprinklerPins[] = {SPRINKLER_1_PIN, SPRINKLER_2_PIN, SPRINKLER_3_PIN};
int numSprinklers = 3;

void setup() {
  Serial.begin(115200);
  
  // Pin Setup
  for (int i = 0; i < numSprinklers; i++) {
    pinMode(sprinklerPins[i], OUTPUT);
    digitalWrite(sprinklerPins[i], LOW);  // All sprinklers off
  }
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // WiFi & MQTT Setup
  setupWiFi();
  client.setServer("mqtt-broker.com", 8883);
  client.setCallback(mqttCallback);
  connectMQTT();
}

void loop() {
  if (!client.connected()) {
    connectMQTT();
  }
  client.loop();
  
  // Check watering timer
  if (isWatering) {
    unsigned long elapsed = (millis() - wateringStartTime) / 1000;
    
    if (elapsed >= wateringDuration) {
      stopGardenWatering(true);  // Auto stop - completed
    }
    
    // Progress indicator (blink LED slowly)
    if (elapsed % 4 == 0) {
      digitalWrite(LED_PIN, HIGH);
    } else if (elapsed % 2 == 0) {
      digitalWrite(LED_PIN, LOW);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message on topic: ");
  Serial.println(topic);
  
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.println("JSON parsing failed!");
    return;
  }
  
  String command = doc["command"];
  
  if (command == "START_GARDEN_WATERING") {
    startGardenWatering(
      doc["duration"],
      doc["sessionId"]
    );
  }
  else if (command == "STOP_GARDEN_WATERING") {
    stopGardenWatering(false);  // Manual stop
  }
}

void startGardenWatering(int duration, String sessionId) {
  if (isWatering) {
    Serial.println("⚠️ Garden watering already running!");
    return;
  }
  
  Serial.println("▶️ Starting garden watering for " + String(duration) + " seconds");
  
  isWatering = true;
  wateringStartTime = millis();
  wateringDuration = duration;
  currentSessionId = sessionId;
  
  // Turn ON ALL sprinklers
  for (int i = 0; i < numSprinklers; i++) {
    digitalWrite(sprinklerPins[i], HIGH);
    Serial.println("✅ Sprinkler " + String(i + 1) + " ON");
  }
  
  digitalWrite(LED_PIN, HIGH);
  Serial.println("💧 Garden watering in progress...");
}

void stopGardenWatering(bool completed) {
  if (!isWatering) {
    return;
  }
  
  Serial.println("⏹️ Stopping garden watering");
  
  // Turn OFF ALL sprinklers
  for (int i = 0; i < numSprinklers; i++) {
    digitalWrite(sprinklerPins[i], LOW);
    Serial.println("🔒 Sprinkler " + String(i + 1) + " OFF");
  }
  
  digitalWrite(LED_PIN, LOW);
  
  // Calculate actual duration
  unsigned long actualDuration = (millis() - wateringStartTime) / 1000;
  
  // Send event to backend
  sendGardenWateringEvent(completed, actualDuration);
  
  // Reset state
  isWatering = false;
  wateringStartTime = 0;
  wateringDuration = 0;
  currentSessionId = "";
  
  Serial.println("✅ Garden watering stopped");
}

void sendGardenWateringEvent(bool completed, unsigned long actualDuration) {
  StaticJsonDocument<256> doc;
  
  if (completed) {
    doc["event"] = "GARDEN_WATERING_COMPLETED";
  } else {
    doc["event"] = "GARDEN_WATERING_STOPPED";
    doc["reason"] = "Manual stop by user";
  }
  
  doc["sessionId"] = currentSessionId;
  doc["actualDuration"] = actualDuration;
  doc["timestamp"] = getTimestamp();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  if (client.publish(eventTopic.c_str(), buffer)) {
    Serial.println("📤 Event sent to backend");
    Serial.println(buffer);
  } else {
    Serial.println("❌ Failed to send event");
  }
}

void connectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    
    if (client.connect(deviceId.c_str())) {
      Serial.println("✅ Connected");
      client.subscribe(controlTopic.c_str());
      Serial.println("📥 Subscribed to: " + controlTopic);
    } else {
      Serial.print("❌ Failed, rc=");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

String getTimestamp() {
  // Use NTP or backend timestamp
  return "2026-02-11T07:30:00Z";
}

void setupWiFi() {
  WiFi.begin("your-ssid", "your-password");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected");
}
```

---

## 6. Sensor Monitoring

### 📤 MQTT Sensor Data (ESP32 → Backend)

**Topic:** `Smartfarming/{deviceId}/sensor`

**Payload (Real-time sensor data):**
```json
{
  "deviceId": "uuid-device-1",
  "soilMoisture": 65.5,
  "temperature": 28.3,
  "humidity": 72.1,
  "lightIntensity": 850,
  "timestamp": "2026-02-11T07:30:00Z"
}
```

### 💻 ESP32 Sensor Code

```cpp
#include <DHT.h>

// Sensor Pins
#define SOIL_MOISTURE_PIN 34  // Analog pin
#define DHT_PIN 4
#define LIGHT_SENSOR_PIN 35   // Analog pin

DHT dht(DHT_PIN, DHT22);

String sensorTopic = "Smartfarming/" + deviceId + "/sensor";

void setup() {
  // ... (previous setup code)
  
  dht.begin();
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(LIGHT_SENSOR_PIN, INPUT);
}

void loop() {
  // ... (previous loop code)
  
  // Send sensor data every 60 seconds
  static unsigned long lastSensorUpdate = 0;
  if (millis() - lastSensorUpdate > 60000) {
    sendSensorData();
    lastSensorUpdate = millis();
  }
}

void sendSensorData() {
  // Read sensors
  float soilMoisture = readSoilMoisture();
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int lightIntensity = readLightSensor();
  
  // Check if readings are valid
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("❌ Failed to read from DHT sensor!");
    return;
  }
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["soilMoisture"] = soilMoisture;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["lightIntensity"] = lightIntensity;
  doc["timestamp"] = getTimestamp();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  // Publish to MQTT
  if (client.publish(sensorTopic.c_str(), buffer)) {
    Serial.println("📊 Sensor data sent:");
    Serial.println(buffer);
  } else {
    Serial.println("❌ Failed to send sensor data");
  }
}

float readSoilMoisture() {
  int rawValue = analogRead(SOIL_MOISTURE_PIN);
  // Convert to percentage (0-100%)
  // Calibrate these values based on your sensor
  int dryValue = 4095;  // Sensor reading in dry soil
  int wetValue = 1000;  // Sensor reading in wet soil
  
  float moisture = map(rawValue, wetValue, dryValue, 100, 0);
  moisture = constrain(moisture, 0, 100);
  
  return moisture;
}

int readLightSensor() {
  int rawValue = analogRead(LIGHT_SENSOR_PIN);
  // Map to 0-1000 range
  return map(rawValue, 0, 4095, 0, 1000);
}
```

---

## 6. Emergency Stop

### 📥 MQTT Emergency Command

**Topic:** `smartfarm/zone/emergency`

**Payload:**
```json
{
  "command": "EMERGENCY_STOP",
  "reason": "System malfunction detected"
}
```

### 💻 ESP32 Emergency Stop Code

```cpp
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // ... (previous callback code)
  
  if (command == "EMERGENCY_STOP") {
    emergencyStop();
  }
}

void emergencyStop() {
  Serial.println("🚨 EMERGENCY STOP ACTIVATED!");
  
  // Stop ALL operations immediately
  digitalWrite(SOLENOID_PIN, LOW);
  digitalWrite(PUMP_PIN, LOW);
  digitalWrite(AGITATOR_PIN, LOW);
  
  for (int i = 0; i < numValves; i++) {
    digitalWrite(valvePins[i], LOW);
  }
  
  // Reset all state variables
  isWatering = false;
  isPumping = false;
  isAgitatorOn = false;
  isFlushing = false;
  
  // Blink LED rapidly
  for (int i = 0; i < 10; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
  
  Serial.println("✅ All systems stopped");
}
```

---

## Complete ESP32 Implementation

### 🎯 Full Unified ESP32 Code

Berikut adalah implementasi lengkap yang menggabungkan semua fitur:

```cpp
/**
 * ========================================
 *  SMART FARMING - ESP32 UNIFIED SYSTEM
 * ========================================
 * 
 * Features:
 * - Auto Drip Irrigation (Scheduled)
 * - Manual Watering (On-demand)
 * - Tank Control (Pump + Agitator)
 * - Flushing System (Pipe Cleaning)
 * - Sensor Monitoring (Real-time)
 * - Emergency Stop
 * 
 * Author: Smart Farming Team
 * Date: February 11, 2026
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <time.h>

// ========== CONFIGURATION ==========

// WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Broker Configuration
const char* mqtt_server = "6da97578cebb460eab0c5e7cff55862d.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "your_mqtt_username";
const char* mqtt_pass = "your_mqtt_password";

// Device IDs (Change based on device type)
String deviceType = "ZONE";  // Options: "ZONE", "TANK", "FLUSHING"
String deviceId = "device-zone-1";
String zoneId = "uuid-zone-1";  // For zone devices
String tankId = "uuid-tank-1";  // For tank devices

// ========== PIN CONFIGURATION ==========

// Zone Device Pins
#define ZONE_SOLENOID_PIN 26

// Tank Device Pins
#define TANK_PUMP_PIN 26
#define TANK_AGITATOR_PIN 27
#define TANK_SENSOR_TRIG 14
#define TANK_SENSOR_ECHO 12

// Flushing Device Pins
#define FLUSH_VALVE_1 26
#define FLUSH_VALVE_2 27
#define FLUSH_VALVE_3 14
#define FLUSH_VALVE_4 12

// Common Pins
#define LED_PIN 2
#define DHT_PIN 4
#define SOIL_MOISTURE_PIN 34
#define LIGHT_SENSOR_PIN 35

// ========== MQTT TOPICS ==========

String controlTopic;
String eventTopic;
String sensorTopic;
String statusTopic;

// ========== GLOBAL OBJECTS ==========

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHT_PIN, DHT22);

// ========== STATE VARIABLES ==========

// Zone State
bool isWatering = false;
unsigned long wateringStartTime = 0;
unsigned long wateringDuration = 0;
String currentScheduleId = "";

// Tank State
bool isPumping = false;
bool isAgitatorOn = false;
bool isAutoFill = false;
unsigned long pumpStartTime = 0;
unsigned long pumpDuration = 0;
String fillMode = "";

// Flushing State
bool isFlushing = false;
unsigned long flushingStartTime = 0;
unsigned long flushingDuration = 0;
String currentSessionId = "";

// Tank Configuration
float tankMaxCapacity = 5000.0;  // liters
float tankHeight = 200.0;         // cm

// ========== SETUP FUNCTION ==========

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n🌱 Smart Farming ESP32 Starting...");
  Serial.println("Device Type: " + deviceType);
  Serial.println("Device ID: " + deviceId);
  
  // Initialize pins based on device type
  setupPins();
  
  // Setup MQTT topics
  setupMQTTTopics();
  
  // Initialize sensors
  dht.begin();
  
  // Connect to WiFi
  setupWiFi();
  
  // Configure MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  
  // Connect to MQTT
  connectMQTT();
  
  // Configure NTP for timestamps
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  Serial.println("✅ Setup complete!");
}

void setupPins() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  if (deviceType == "ZONE") {
    pinMode(ZONE_SOLENOID_PIN, OUTPUT);
    digitalWrite(ZONE_SOLENOID_PIN, LOW);
    Serial.println("📍 Zone pins configured");
  }
  else if (deviceType == "TANK") {
    pinMode(TANK_PUMP_PIN, OUTPUT);
    pinMode(TANK_AGITATOR_PIN, OUTPUT);
    pinMode(TANK_SENSOR_TRIG, OUTPUT);
    pinMode(TANK_SENSOR_ECHO, INPUT);
    digitalWrite(TANK_PUMP_PIN, LOW);
    digitalWrite(TANK_AGITATOR_PIN, LOW);
    Serial.println("🚰 Tank pins configured");
  }
  else if (deviceType == "FLUSHING") {
    pinMode(FLUSH_VALVE_1, OUTPUT);
    pinMode(FLUSH_VALVE_2, OUTPUT);
    pinMode(FLUSH_VALVE_3, OUTPUT);
    pinMode(FLUSH_VALVE_4, OUTPUT);
    digitalWrite(FLUSH_VALVE_1, LOW);
    digitalWrite(FLUSH_VALVE_2, LOW);
    digitalWrite(FLUSH_VALVE_3, LOW);
    digitalWrite(FLUSH_VALVE_4, LOW);
    Serial.println("💧 Flushing pins configured");
  }
  
  // Sensor pins
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(LIGHT_SENSOR_PIN, INPUT);
}

void setupMQTTTopics() {
  if (deviceType == "ZONE") {
    controlTopic = "smartfarm/zone/" + zoneId + "/control";
    eventTopic = "smartfarm/zone/" + zoneId + "/event";
  }
  else if (deviceType == "TANK") {
    controlTopic = "smartfarm/tank/" + deviceId + "/control";
    eventTopic = "smartfarm/tank/" + deviceId + "/event";
  }
  else if (deviceType == "FLUSHING") {
    controlTopic = "smartfarm/flushing/control";
    eventTopic = "smartfarm/flushing/event";
  }
  
  sensorTopic = "Smartfarming/" + deviceId + "/sensor";
  statusTopic = "Smartfarming/" + deviceId + "/status";
  
  Serial.println("📡 MQTT Topics configured:");
  Serial.println("  Control: " + controlTopic);
  Serial.println("  Event: " + eventTopic);
  Serial.println("  Sensor: " + sensorTopic);
}

// ========== MAIN LOOP ==========

void loop() {
  // MQTT connection check
  if (!client.connected()) {
    connectMQTT();
  }
  client.loop();
  
  // Device-specific loop logic
  if (deviceType == "ZONE") {
    loopZone();
  }
  else if (deviceType == "TANK") {
    loopTank();
  }
  else if (deviceType == "FLUSHING") {
    loopFlushing();
  }
  
  // Send sensor data every 60 seconds
  static unsigned long lastSensorUpdate = 0;
  if (millis() - lastSensorUpdate > 60000) {
    sendSensorData();
    lastSensorUpdate = millis();
  }
  
  // Send heartbeat every 30 seconds
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 30000) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
}

void loopZone() {
  if (isWatering && wateringDuration > 0) {
    unsigned long elapsed = (millis() - wateringStartTime) / 1000;
    
    if (elapsed >= wateringDuration) {
      stopWatering(true);  // Auto stop
    }
  }
}

void loopTank() {
  // Check pump timer
  if (isPumping && pumpDuration > 0) {
    unsigned long elapsed = (millis() - pumpStartTime) / 1000;
    
    if (elapsed >= pumpDuration) {
      stopPump(true);
    }
  }
  
  // Check auto-fill
  if (isAutoFill) {
    float currentLevel = getCurrentLevel();
    
    if (currentLevel >= tankMaxCapacity) {
      stopPump(true);
    }
  }
  
  // Send level update every 30 seconds
  static unsigned long lastLevelUpdate = 0;
  if (millis() - lastLevelUpdate > 30000) {
    sendLevelUpdate();
    lastLevelUpdate = millis();
  }
}

void loopFlushing() {
  if (isFlushing) {
    unsigned long elapsed = (millis() - flushingStartTime) / 1000;
    
    if (elapsed >= flushingDuration) {
      stopFlushing(true);
    }
    
    // Blink LED during flushing
    if (elapsed % 2 == 0) {
      digitalWrite(LED_PIN, HIGH);
    } else {
      digitalWrite(LED_PIN, LOW);
    }
  }
}

// ========== MQTT CALLBACK ==========

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("📨 Message on topic: ");
  Serial.println(topic);
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.println("❌ JSON parsing failed!");
    return;
  }
  
  String command = doc["command"];
  Serial.println("Command: " + command);
  
  // Emergency Stop (all devices)
  if (command == "EMERGENCY_STOP") {
    emergencyStop();
    return;
  }
  
  // Zone Commands
  if (deviceType == "ZONE") {
    if (command == "START_WATERING") {
      startWatering(doc["zoneId"], doc["duration"], doc["scheduleId"]);
    }
    else if (command == "STOP_WATERING") {
      stopWatering(false);
    }
    else if (command == "START_MANUAL") {
      startManualWatering(doc["zoneId"]);
    }
    else if (command == "STOP_MANUAL") {
      stopManualWatering();
    }
  }
  
  // Tank Commands
  else if (deviceType == "TANK") {
    if (command == "START_MANUAL_FILL") {
      int duration = doc["duration"] | 0;
      startManualFill(duration);
    }
    else if (command == "STOP_MANUAL_FILL") {
      stopPump(false);
    }
    else if (command == "START_AUTO_FILL") {
      startAutoFill();
    }
    else if (command == "STOP_AUTO_FILL") {
      stopPump(false);
    }
    else if (command == "AGITATOR_ON") {
      controlAgitator(true);
    }
    else if (command == "AGITATOR_OFF") {
      controlAgitator(false);
    }
  }
  
  // Flushing Commands
  else if (deviceType == "FLUSHING") {
    if (command == "START_FLUSHING") {
      startFlushing(doc["duration"], doc["sessionId"]);
    }
    else if (command == "STOP_FLUSHING") {
      stopFlushing(false);
    }
  }
}

// ========== ZONE FUNCTIONS ==========

void startWatering(String zId, int duration, String schedId) {
  if (isWatering) {
    Serial.println("⚠️ Already watering!");
    return;
  }
  
  Serial.println("▶️ Starting watering for " + String(duration) + " seconds");
  
  isWatering = true;
  wateringStartTime = millis();
  wateringDuration = duration;
  currentScheduleId = schedId;
  
  digitalWrite(ZONE_SOLENOID_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);
  
  Serial.println("✅ Solenoid OPENED");
}

void stopWatering(bool completed) {
  if (!isWatering) return;
  
  Serial.println("⏹️ Stopping watering");
  
  digitalWrite(ZONE_SOLENOID_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  unsigned long actualDuration = (millis() - wateringStartTime) / 1000;
  sendWateringEvent(completed, actualDuration);
  
  isWatering = false;
  wateringStartTime = 0;
  wateringDuration = 0;
  currentScheduleId = "";
  
  Serial.println("✅ Solenoid CLOSED");
}

void startManualWatering(String zId) {
  Serial.println("▶️ Starting MANUAL watering");
  
  isWatering = true;
  wateringStartTime = millis();
  wateringDuration = 0;
  
  digitalWrite(ZONE_SOLENOID_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);
}

void stopManualWatering() {
  Serial.println("⏹️ Stopping MANUAL watering");
  
  digitalWrite(ZONE_SOLENOID_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  unsigned long actualDuration = (millis() - wateringStartTime) / 1000;
  
  StaticJsonDocument<256> doc;
  doc["event"] = "MANUAL_WATERING_STOPPED";
  doc["zoneId"] = zoneId;
  doc["actualDuration"] = actualDuration;
  doc["timestamp"] = getTimestamp();
  
  publishEvent(doc);
  
  isWatering = false;
}

void sendWateringEvent(bool completed, unsigned long actualDuration) {
  StaticJsonDocument<256> doc;
  
  if (completed) {
    doc["event"] = "WATERING_COMPLETED";
  } else {
    doc["event"] = "WATERING_STOPPED";
    doc["reason"] = "Manual stop";
  }
  
  doc["zoneId"] = zoneId;
  doc["scheduleId"] = currentScheduleId;
  doc["actualDuration"] = actualDuration;
  doc["timestamp"] = getTimestamp();
  
  publishEvent(doc);
}

// ========== TANK FUNCTIONS ==========

void startManualFill(int duration) {
  if (isPumping) {
    Serial.println("⚠️ Pump already running!");
    return;
  }
  
  Serial.println("▶️ Starting MANUAL FILL");
  if (duration > 0) {
    Serial.println("⏱️ Duration: " + String(duration) + " seconds");
  }
  
  isPumping = true;
  isAutoFill = false;
  fillMode = "MANUAL";
  pumpStartTime = millis();
  pumpDuration = duration;
  
  digitalWrite(TANK_PUMP_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);
  
  Serial.println("✅ Pump ON");
}

void startAutoFill() {
  if (isPumping) {
    Serial.println("⚠️ Pump already running!");
    return;
  }
  
  Serial.println("▶️ Starting AUTO FILL");
  
  isPumping = true;
  isAutoFill = true;
  fillMode = "AUTO";
  pumpStartTime = millis();
  pumpDuration = 0;
  
  digitalWrite(TANK_PUMP_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);
}

void stopPump(bool completed) {
  if (!isPumping) return;
  
  Serial.println("⏹️ Stopping pump");
  
  digitalWrite(TANK_PUMP_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  unsigned long actualDuration = (millis() - pumpStartTime) / 1000;
  float currentLevel = getCurrentLevel();
  
  sendPumpEvent(completed, actualDuration, currentLevel);
  
  isPumping = false;
  isAutoFill = false;
  pumpStartTime = 0;
  pumpDuration = 0;
  fillMode = "";
  
  Serial.println("✅ Pump OFF");
}

void controlAgitator(bool turnOn) {
  if (turnOn) {
    Serial.println("▶️ Agitator ON");
    digitalWrite(TANK_AGITATOR_PIN, HIGH);
    isAgitatorOn = true;
  } else {
    Serial.println("⏹️ Agitator OFF");
    digitalWrite(TANK_AGITATOR_PIN, LOW);
    isAgitatorOn = false;
  }
}

float getCurrentLevel() {
  digitalWrite(TANK_SENSOR_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TANK_SENSOR_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TANK_SENSOR_TRIG, LOW);
  
  long duration = pulseIn(TANK_SENSOR_ECHO, HIGH);
  float distance = duration * 0.034 / 2;
  
  float waterHeight = tankHeight - distance;
  float level = (waterHeight / tankHeight) * tankMaxCapacity;
  
  if (level < 0) level = 0;
  if (level > tankMaxCapacity) level = tankMaxCapacity;
  
  return level;
}

void sendPumpEvent(bool completed, unsigned long actualDuration, float currentLevel) {
  StaticJsonDocument<256> doc;
  
  if (fillMode == "MANUAL") {
    doc["event"] = completed ? "MANUAL_FILL_COMPLETED" : "MANUAL_FILL_STOPPED";
  } else {
    doc["event"] = "AUTO_FILL_COMPLETED";
  }
  
  doc["tankId"] = tankId;
  doc["currentLevel"] = currentLevel;
  doc["actualDuration"] = actualDuration;
  doc["timestamp"] = getTimestamp();
  
  publishEvent(doc);
}

void sendLevelUpdate() {
  float currentLevel = getCurrentLevel();
  
  StaticJsonDocument<256> doc;
  doc["event"] = "LEVEL_UPDATE";
  doc["tankId"] = tankId;
  doc["currentLevel"] = currentLevel;
  doc["timestamp"] = getTimestamp();
  
  publishEvent(doc);
  
  Serial.println("📊 Level: " + String(currentLevel) + "L");
}

// ========== FLUSHING FUNCTIONS ==========

void startFlushing(int duration, String sessionId) {
  if (isFlushing) {
    Serial.println("⚠️ Flushing already running!");
    return;
  }
  
  Serial.println("▶️ Starting flushing for " + String(duration) + " seconds");
  
  isFlushing = true;
  flushingStartTime = millis();
  flushingDuration = duration;
  currentSessionId = sessionId;
  
  // Open ALL valves
  digitalWrite(FLUSH_VALVE_1, HIGH);
  digitalWrite(FLUSH_VALVE_2, HIGH);
  digitalWrite(FLUSH_VALVE_3, HIGH);
  digitalWrite(FLUSH_VALVE_4, HIGH);
  digitalWrite(LED_PIN, HIGH);
  
  Serial.println("✅ All valves OPENED");
}

void stopFlushing(bool completed) {
  if (!isFlushing) return;
  
  Serial.println("⏹️ Stopping flushing");
  
  // Close ALL valves
  digitalWrite(FLUSH_VALVE_1, LOW);
  digitalWrite(FLUSH_VALVE_2, LOW);
  digitalWrite(FLUSH_VALVE_3, LOW);
  digitalWrite(FLUSH_VALVE_4, LOW);
  digitalWrite(LED_PIN, LOW);
  
  unsigned long actualDuration = (millis() - flushingStartTime) / 1000;
  sendFlushingEvent(completed, actualDuration);
  
  isFlushing = false;
  flushingStartTime = 0;
  flushingDuration = 0;
  currentSessionId = "";
  
  Serial.println("✅ All valves CLOSED");
}

void sendFlushingEvent(bool completed, unsigned long actualDuration) {
  StaticJsonDocument<256> doc;
  
  if (completed) {
    doc["event"] = "FLUSHING_COMPLETED";
  } else {
    doc["event"] = "FLUSHING_STOPPED";
    doc["reason"] = "Manual stop";
  }
  
  doc["sessionId"] = currentSessionId;
  doc["actualDuration"] = actualDuration;
  doc["timestamp"] = getTimestamp();
  
  publishEvent(doc);
}

// ========== SENSOR FUNCTIONS ==========

void sendSensorData() {
  float soilMoisture = readSoilMoisture();
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int lightIntensity = readLightSensor();
  
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("❌ DHT sensor read failed!");
    return;
  }
  
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["soilMoisture"] = soilMoisture;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["lightIntensity"] = lightIntensity;
  doc["timestamp"] = getTimestamp();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  if (client.publish(sensorTopic.c_str(), buffer)) {
    Serial.println("📊 Sensor data sent");
  }
}

float readSoilMoisture() {
  int rawValue = analogRead(SOIL_MOISTURE_PIN);
  int dryValue = 4095;
  int wetValue = 1000;
  
  float moisture = map(rawValue, wetValue, dryValue, 100, 0);
  moisture = constrain(moisture, 0, 100);
  
  return moisture;
}

int readLightSensor() {
  int rawValue = analogRead(LIGHT_SENSOR_PIN);
  return map(rawValue, 0, 4095, 0, 1000);
}

// ========== UTILITY FUNCTIONS ==========

void emergencyStop() {
  Serial.println("🚨 EMERGENCY STOP!");
  
  // Stop ALL devices
  if (deviceType == "ZONE") {
    digitalWrite(ZONE_SOLENOID_PIN, LOW);
  }
  else if (deviceType == "TANK") {
    digitalWrite(TANK_PUMP_PIN, LOW);
    digitalWrite(TANK_AGITATOR_PIN, LOW);
  }
  else if (deviceType == "FLUSHING") {
    digitalWrite(FLUSH_VALVE_1, LOW);
    digitalWrite(FLUSH_VALVE_2, LOW);
    digitalWrite(FLUSH_VALVE_3, LOW);
    digitalWrite(FLUSH_VALVE_4, LOW);
  }
  
  // Reset states
  isWatering = false;
  isPumping = false;
  isAgitatorOn = false;
  isFlushing = false;
  
  // Alert blink
  for (int i = 0; i < 10; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
  
  Serial.println("✅ All systems stopped");
}

void sendHeartbeat() {
  StaticJsonDocument<128> doc;
  doc["deviceId"] = deviceId;
  doc["status"] = "ONLINE";
  doc["timestamp"] = getTimestamp();
  
  char buffer[128];
  serializeJson(doc, buffer);
  
  client.publish(statusTopic.c_str(), buffer);
}

void publishEvent(StaticJsonDocument<256>& doc) {
  char buffer[256];
  serializeJson(doc, buffer);
  
  if (client.publish(eventTopic.c_str(), buffer)) {
    Serial.println("📤 Event sent:");
    Serial.println(buffer);
  } else {
    Serial.println("❌ Failed to send event");
  }
}

String getTimestamp() {
  time_t now;
  struct tm timeinfo;
  
  if (!getLocalTime(&timeinfo)) {
    return "2026-02-11T00:00:00Z";
  }
  
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

void setupWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n✅ WiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    
    if (client.connect(deviceId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("✅ Connected to MQTT");
      
      // Subscribe to control topic
      client.subscribe(controlTopic.c_str());
      Serial.println("📥 Subscribed to: " + controlTopic);
      
      // Subscribe to emergency topic (all devices)
      client.subscribe("smartfarm/zone/emergency");
      
      // Send online status
      sendHeartbeat();
      
    } else {
      Serial.print("❌ Failed, rc=");
      Serial.println(client.state());
      delay(5000);
    }
  }
}
```

---

## 📊 Summary Table

| Fitur | MQTT Command Topic | MQTT Event Topic | ESP32 Action | Auto-Update Backend |
|-------|-------------------|------------------|--------------|---------------------|
| **Auto Drip** | `smartfarm/zone/{zoneId}/control` | `smartfarm/zone/{zoneId}/event` | Open/Close Solenoid | ✅ Yes (WATERING_COMPLETED) |
| **Manual Watering** | `smartfarm/zone/{zoneId}/control` | `smartfarm/zone/{zoneId}/event` | Open/Close Solenoid | ✅ Yes (MANUAL_WATERING_STOPPED) |
| **Tank Manual Fill** | `smartfarm/tank/{deviceId}/control` | `smartfarm/tank/{deviceId}/event` | Run Pump (Timer/Manual) | ✅ Yes (MANUAL_FILL_COMPLETED) |
| **Tank Auto Fill** | `smartfarm/tank/{deviceId}/control` | `smartfarm/tank/{deviceId}/event` | Run Pump (Until Max) | ✅ Yes (AUTO_FILL_COMPLETED) |
| **Tank Agitator** | `smartfarm/tank/{deviceId}/control` | - | ON/OFF Agitator | ❌ No |
| **Flushing** | `smartfarm/flushing/control` | `smartfarm/flushing/event` | Open/Close ALL Valves | ✅ Yes (FLUSHING_COMPLETED) |
| **Garden Watering** | `smartfarm/garden/control` | `smartfarm/garden/event` | Open/Close Sprinklers | ✅ Yes (GARDEN_WATERING_COMPLETED) |
| **Sensor Data** | - | `Smartfarming/{deviceId}/sensor` | Read & Send (60s) | ✅ Yes (Auto-save) |
| **Emergency Stop** | `smartfarm/zone/emergency` | - | Stop ALL Immediately | ❌ No |

---

## 🎯 Key Points

1. **Semua fitur auto-update** ke database via MQTT event feedback
2. **ESP32 tidak perlu koneksi langsung ke database** - hanya MQTT
3. **Backend jadi single source of truth** - semua state di database
4. **Frontend bisa crash** - ESP32 tetap kirim event ke backend
5. **Monitoring real-time** via sensor topic (setiap 60 detik)
6. **Emergency stop** langsung matikan semua device
7. **NTP timestamp** untuk sinkronisasi waktu
8. **Heartbeat** setiap 30 detik untuk monitoring online/offline

---

**✅ DOKUMENTASI LENGKAP SIAP DIGUNAKAN!**
