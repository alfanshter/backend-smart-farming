# 🔄 Flow: Device Registration, MQTT & ESP32

## 📋 Table of Contents
1. [Overview](#overview)
2. [Complete Flow Diagram](#complete-flow-diagram)
3. [Step-by-Step Process](#step-by-step-process)
4. [Code Examples](#code-examples)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

**Konsep Dasar:**
- **Device** = Registrasi perangkat IoT (ESP32) di backend
- **MQTT** = Protokol komunikasi antara ESP32 dan Backend
- **ESP32** = Hardware yang menjalankan sensor & aktuator

**Analogi Sederhana:**
```
Device Registration = Daftar nomor telepon
MQTT Topic = Nomor telepon unik
ESP32 = Handphone yang pakai nomor itu
Message = SMS yang dikirim/diterima
```

---

## 🔄 Complete Flow Diagram

### **1. Skenario Lengkap: Dari Setup sampai Action**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INITIAL SETUP (One Time)                      │
└─────────────────────────────────────────────────────────────────────┘

STEP 1: REGISTER DEVICE di Backend
┌──────────────┐
│   Postman/   │  POST /devices
│   Frontend   │  {
└──────┬───────┘    "name": "Pompa Air Zona 1",
       │            "type": "PUMP",
       │            "mqttTopic": "smartfarm/pump1/command"
       │          }
       ↓
┌──────────────────────────────────────────────────────────────────┐
│  Backend (NestJS)                                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ DeviceController.createDevice()                            │  │
│  │ → Buat Device Entity                                       │  │
│  │ → Simpan ke Repository                                     │  │
│  │ → Return: { id: "abc-123", name: "...", mqttTopic: "..." }│  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
       │
       ↓
    ✅ Device "abc-123" terdaftar dengan topic "smartfarm/pump1/command"


STEP 2: PROGRAM ESP32
┌──────────────┐
│   Arduino    │  Upload code ke ESP32:
│     IDE      │  - WiFi credentials
└──────┬───────┘  - MQTT broker URL
       │          - MQTT topic: "smartfarm/pump1/command"
       │          - Device ID: "abc-123"
       ↓
┌──────────────────┐
│      ESP32       │  Code contains:
│  (Hardware IoT)  │  - Connect WiFi
└──────┬───────────┘  - Connect MQTT
       │              - Subscribe to topic
       ↓              - Publish sensor data
    🔌 ESP32 Ready


┌─────────────────────────────────────────────────────────────────────┐
│                      RUNTIME COMMUNICATION                           │
└─────────────────────────────────────────────────────────────────────┘

A. ESP32 → Backend (Sensor Data)
───────────────────────────────────

┌──────────────────┐
│      ESP32       │  Read Sensor (Soil Moisture = 45%)
│   (Soil Sensor)  │
└────────┬─────────┘
         │
         │ MQTT Publish to "smartfarm/pump1/sensor"
         │ Payload: {
         │   "deviceId": "abc-123",
         │   "type": "SOIL_MOISTURE", 
         │   "value": 45,
         │   "unit": "%"
         │ }
         ↓
    ┌─────────────┐
    │ MQTT Broker │  (HiveMQ / Mosquitto)
    │ (Middleman) │
    └──────┬──────┘
           │
           │ Forward message to subscribers
           ↓
┌──────────────────────────────────────────────────────────────┐
│  Backend (NestJS)                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ MqttService (subscribed to "smartfarm/+/sensor")      │  │
│  │ → handleSensorMessage()                                │  │
│  │ → Parse JSON                                           │  │
│  │ → Create Sensor Entity                                 │  │
│  │ → ProcessSensorDataUseCase.execute()                   │  │
│  │   ├─ Save to SensorRepository                          │  │
│  │   └─ Check if need auto-watering (if < 30%)            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
           │
           │ If moisture < 30%
           ↓
     Auto trigger PUMP ON (go to Flow B)


B. Backend → ESP32 (Control Command)
──────────────────────────────────────

┌──────────────┐
│   Frontend   │  POST /watering/control
│  atau User   │  {
└──────┬───────┘    "deviceId": "abc-123",
       │            "action": "ON",
       │            "duration": 300
       │          }
       ↓
┌──────────────────────────────────────────────────────────────┐
│  Backend (NestJS)                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ WateringController.controlWatering()                   │  │
│  │ → ControlWateringUseCase.execute()                     │  │
│  │   1. Find Device by ID                                 │  │
│  │   2. Validate device exists                            │  │
│  │   3. Build MQTT payload:                               │  │
│  │      {                                                  │  │
│  │        "command": "PUMP_ON",                           │  │
│  │        "duration": 300                                 │  │
│  │      }                                                  │  │
│  │   4. MqttClient.publish()                              │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ MQTT Publish to "smartfarm/pump1/command"
             ↓
    ┌─────────────┐
    │ MQTT Broker │
    └──────┬──────┘
           │
           │ Forward to ESP32
           ↓
┌──────────────────┐
│      ESP32       │  Callback function triggered:
│   (Pump Relay)   │  void callback(char* topic, byte* payload, unsigned int length)
└────────┬─────────┘  {
         │              // Parse JSON
         │              if (command == "PUMP_ON") {
         │                digitalWrite(RELAY_PIN, HIGH); // Turn ON pump
         │                delay(duration * 1000);
         │                digitalWrite(RELAY_PIN, LOW);  // Turn OFF
         │              }
         │            }
         ↓
      💧 PUMP NYALA 300 detik (5 menit)


C. ESP32 → Backend (Status Update)
────────────────────────────────────

┌──────────────────┐
│      ESP32       │  After action completed
└────────┬─────────┘
         │
         │ MQTT Publish to "smartfarm/pump1/status"
         │ Payload: {
         │   "deviceId": "abc-123",
         │   "status": "ONLINE"
         │ }
         ↓
    ┌─────────────┐
    │ MQTT Broker │
    └──────┬──────┘
           │
           ↓
┌──────────────────────────────────────────────────────────────┐
│  Backend (NestJS)                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ MqttService (subscribed to "smartfarm/+/status")       │  │
│  │ → handleDeviceStatus()                                 │  │
│  │ → Update device.status = ONLINE                        │  │
│  │ → Update device.lastSeen = new Date()                  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step Process

### **Phase 1: Setup (Dilakukan Sekali)**

#### Step 1.1: Register Device di Backend

**Kenapa harus register dulu?**
- Backend perlu tahu device mana yang "legal"
- Menyimpan metadata (nama, tipe, MQTT topic)
- Untuk authorization & tracking

**Request:**
```bash
POST http://localhost:3000/devices
Content-Type: application/json

{
  "name": "Pompa Air Zona 1",
  "type": "PUMP",
  "mqttTopic": "smartfarm/pump1/command"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Pompa Air Zona 1",
  "type": "PUMP",
  "mqttTopic": "smartfarm/pump1/command",
  "status": "OFFLINE",
  "isActive": true
}
```

**💡 Penting:** Simpan `id` dan `mqttTopic` untuk dipakai di ESP32!

#### Step 1.2: Program ESP32

Upload code ini ke ESP32 (lihat section Code Examples di bawah).

**Yang perlu disesuaikan:**
1. WiFi SSID & Password
2. MQTT Broker URL & Credentials
3. Device ID (dari response step 1.1)
4. MQTT Topics

---

### **Phase 2: Runtime Communication**

#### **Scenario A: ESP32 Kirim Data Sensor**

**Timeline:**
```
00:00  ESP32 baca sensor → Soil Moisture = 45%
00:01  ESP32 publish ke MQTT topic "smartfarm/pump1/sensor"
00:02  MQTT Broker terima & forward ke Backend
00:03  Backend MqttService.handleSensorMessage() triggered
00:04  Backend save data ke SensorRepository
00:05  Backend cek: 45% > 30% threshold → No action needed
```

**Data Flow:**
```
ESP32 → MQTT Broker → Backend → Database
  45%      (relay)     (save)    (stored)
```

#### **Scenario B: User/Backend Kontrol ESP32**

**Timeline:**
```
00:00  User click "Nyalakan Pompa" di frontend
00:01  Frontend call POST /watering/control
00:02  Backend ControlWateringUseCase validate device
00:03  Backend publish ke MQTT topic "smartfarm/pump1/command"
00:04  MQTT Broker forward ke ESP32
00:05  ESP32 callback triggered → Turn ON relay
00:10  (5 menit kemudian) ESP32 turn OFF relay
00:11  ESP32 publish status "ONLINE" ke MQTT
```

**Data Flow:**
```
User → Frontend → Backend → MQTT Broker → ESP32 → Relay → Pump
                    (validate)  (relay)    (execute) (ON)   💧
```

---

## 💻 Code Examples

### **1. Backend: Create Device (Sudah Ada)**

File: `src/presentation/controllers/DeviceController.ts`

```typescript
@Post()
async createDevice(@Body() dto: CreateDeviceDto) {
  const device = new Device(
    crypto.randomUUID(),
    dto.name,
    dto.type,
    dto.mqttTopic,
    DeviceStatus.OFFLINE,
    dto.isActive ?? true,
    undefined,
    dto.metadata,
  );

  return await this.deviceRepository.create(device);
}
```

### **2. ESP32: Complete Code Example**

File: `esp32_smart_farming.ino`

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============================================
// CONFIGURATION - Sesuaikan dengan setup Anda
// ============================================

// WiFi
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// MQTT Broker (HiveMQ Cloud)
const char* MQTT_BROKER = "6da97578cebb460eab0c5e7cff55862d.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;
const char* MQTT_USERNAME = "alfanshter";
const char* MQTT_PASSWORD = "Alfan@Dinda123";

// Device Info (dari backend response)
const char* DEVICE_ID = "550e8400-e29b-41d4-a716-446655440000";
const char* MQTT_TOPIC_COMMAND = "smartfarm/pump1/command";  // Subscribe (terima)
const char* MQTT_TOPIC_SENSOR = "smartfarm/pump1/sensor";    // Publish (kirim)
const char* MQTT_TOPIC_STATUS = "smartfarm/pump1/status";    // Publish (kirim)

// Hardware Pins
const int SOIL_MOISTURE_PIN = 34;  // Analog pin untuk sensor kelembaban
const int RELAY_PIN = 26;          // Digital pin untuk relay pompa

// ============================================
// GLOBAL VARIABLES
// ============================================
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

unsigned long lastSensorRead = 0;
const long SENSOR_INTERVAL = 5000; // Baca sensor setiap 5 detik

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  
  // Setup pins
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Pastikan relay OFF
  
  // Connect WiFi
  connectWiFi();
  
  // Setup MQTT
  espClient.setInsecure(); // Untuk HiveMQ Cloud (skip certificate validation)
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  
  // Connect MQTT
  connectMQTT();
  
  Serial.println("✅ ESP32 Ready!");
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  // Pastikan MQTT tetap terkoneksi
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();
  
  // Baca sensor setiap interval
  if (millis() - lastSensorRead > SENSOR_INTERVAL) {
    readAndPublishSensor();
    lastSensorRead = millis();
  }
}

// ============================================
// WIFI CONNECTION
// ============================================
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.print("✅ WiFi Connected! IP: ");
  Serial.println(WiFi.localIP());
}

// ============================================
// MQTT CONNECTION
// ============================================
void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    
    String clientId = "ESP32-" + String(DEVICE_ID);
    
    if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
      Serial.println(" Connected!");
      
      // Subscribe ke topic command
      mqttClient.subscribe(MQTT_TOPIC_COMMAND);
      Serial.print("✅ Subscribed to: ");
      Serial.println(MQTT_TOPIC_COMMAND);
      
      // Kirim status ONLINE
      publishStatus("ONLINE");
      
    } else {
      Serial.print(" Failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

// ============================================
// MQTT CALLBACK (Terima Command dari Backend)
// ============================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.println("📥 Message received!");
  Serial.print("Topic: ");
  Serial.println(topic);
  
  // Convert payload to string
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("Payload: ");
  Serial.println(message);
  
  // Parse JSON
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("❌ JSON parse failed: ");
    Serial.println(error.c_str());
    return;
  }
  
  // Extract command
  const char* command = doc["command"];
  int duration = doc["duration"] | 0;
  
  // Execute command
  if (strcmp(command, "PUMP_ON") == 0) {
    Serial.println("💧 Turning ON pump...");
    digitalWrite(RELAY_PIN, HIGH);
    
    if (duration > 0) {
      delay(duration * 1000);
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("💧 Pump turned OFF after " + String(duration) + " seconds");
    }
    
  } else if (strcmp(command, "PUMP_OFF") == 0) {
    Serial.println("🛑 Turning OFF pump...");
    digitalWrite(RELAY_PIN, LOW);
    
  } else {
    Serial.println("❌ Unknown command");
  }
  
  // Kirim status update
  publishStatus("ONLINE");
}

// ============================================
// BACA SENSOR & PUBLISH
// ============================================
void readAndPublishSensor() {
  // Baca nilai analog dari sensor (0-4095)
  int analogValue = analogRead(SOIL_MOISTURE_PIN);
  
  // Konversi ke persentase (0-100%)
  // Asumsi: 4095 = sangat kering (0%), 0 = sangat basah (100%)
  int moisturePercent = map(analogValue, 4095, 0, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);
  
  Serial.print("🌱 Soil Moisture: ");
  Serial.print(moisturePercent);
  Serial.println("%");
  
  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["type"] = "SOIL_MOISTURE";
  doc["value"] = moisturePercent;
  doc["unit"] = "%";
  
  // Convert to string
  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);
  
  // Publish ke MQTT
  if (mqttClient.publish(MQTT_TOPIC_SENSOR, jsonBuffer)) {
    Serial.println("✅ Sensor data published");
  } else {
    Serial.println("❌ Failed to publish sensor data");
  }
}

// ============================================
// PUBLISH STATUS
// ============================================
void publishStatus(const char* status) {
  StaticJsonDocument<128> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["status"] = status;
  
  char jsonBuffer[128];
  serializeJson(doc, jsonBuffer);
  
  mqttClient.publish(MQTT_TOPIC_STATUS, jsonBuffer);
  Serial.print("📡 Status published: ");
  Serial.println(status);
}
```

### **3. Arduino Libraries yang Dibutuhkan**

Di Arduino IDE, install library berikut:

1. **PubSubClient** (by Nick O'Leary)
   - Tools → Manage Libraries → Search "PubSubClient"

2. **ArduinoJson** (by Benoit Blanchon)
   - Tools → Manage Libraries → Search "ArduinoJson"

3. **WiFi** (Built-in untuk ESP32)

---

## 🔍 MQTT Topics Explained

### **Topic Naming Convention**

Format: `smartfarm/{deviceName}/{messageType}`

**Examples:**
```
smartfarm/pump1/command    → Backend kirim command ke ESP32
smartfarm/pump1/sensor     → ESP32 kirim sensor data ke Backend  
smartfarm/pump1/status     → ESP32 kirim status update ke Backend

smartfarm/sensor1/sensor   → Sensor device kirim data
smartfarm/valve1/command   → Control valve
```

### **Wildcard Topics (Backend Only)**

Backend subscribe pakai wildcard:
```
smartfarm/+/sensor    → Terima dari semua device (pump1, sensor1, dll)
smartfarm/+/status    → Terima status dari semua device
```

ESP32 **TIDAK** boleh pakai wildcard, harus spesifik!

---

## 🐛 Troubleshooting

### **Problem 1: ESP32 tidak terima command**

**Symptoms:**
- Backend kirim command
- ESP32 tidak ada response

**Check:**
1. ESP32 sudah subscribe ke topic yang benar?
   ```cpp
   mqttClient.subscribe("smartfarm/pump1/command");
   ```

2. Backend publish ke topic yang sama?
   ```typescript
   device.mqttTopic === "smartfarm/pump1/command"
   ```

3. MQTT broker connected?
   - Check serial monitor ESP32
   - Check backend logs

**Solution:**
```cpp
// Di ESP32, tambahkan debug di callback:
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.println("=== CALLBACK TRIGGERED ===");
  Serial.print("Topic: ");
  Serial.println(topic);
  // ... rest of code
}
```

### **Problem 2: Backend tidak terima data sensor**

**Symptoms:**
- ESP32 publish sensor data
- Backend tidak save data

**Check:**
1. ESP32 publish ke topic yang benar?
2. Backend subscribe ke wildcard pattern yang cocok?
3. JSON format valid?

**Solution:**
```typescript
// Di MqttService, tambahkan log:
await this.mqttClient.subscribe('smartfarm/+/sensor', (message) => {
  console.log('📥 Sensor message received:', message);
  void this.handleSensorMessage(message);
});
```

### **Problem 3: MQTT Connection Failed**

**Symptoms:**
```
Failed, rc=-2
Failed, rc=-4
```

**Error Codes:**
- `-2` = Connection refused (network issue)
- `-4` = Connection timeout
- `5` = Connection refused (wrong credentials)

**Solution:**
1. Check WiFi connection
2. Check MQTT broker URL & port
3. Check username & password
4. For HiveMQ Cloud, use port `8883` with TLS

### **Problem 4: Device ID Mismatch**

**Symptoms:**
- Backend log: "Device not found"

**Cause:**
ESP32 menggunakan Device ID yang belum terdaftar di backend

**Solution:**
1. Create device di backend dulu via POST /devices
2. Copy ID dari response
3. Paste ke ESP32 code:
   ```cpp
   const char* DEVICE_ID = "550e8400-..."; // ID dari backend
   ```

---

## 📊 Message Format Reference

### **1. Sensor Data (ESP32 → Backend)**

Topic: `smartfarm/{deviceName}/sensor`

```json
{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "SOIL_MOISTURE",
  "value": 45,
  "unit": "%",
  "metadata": {
    "location": "Zona 1",
    "depth": "10cm"
  }
}
```

**Sensor Types:**
- `SOIL_MOISTURE` - Kelembaban tanah
- `TEMPERATURE` - Suhu
- `HUMIDITY` - Kelembaban udara
- `LIGHT` - Intensitas cahaya

### **2. Control Command (Backend → ESP32)**

Topic: `smartfarm/{deviceName}/command`

```json
{
  "command": "PUMP_ON",
  "duration": 300,
  "timestamp": "2026-01-26T10:30:00Z"
}
```

**Commands:**
- `PUMP_ON` - Nyalakan pompa
- `PUMP_OFF` - Matikan pompa
- `VALVE_OPEN` - Buka katup
- `VALVE_CLOSE` - Tutup katup

### **3. Status Update (ESP32 → Backend)**

Topic: `smartfarm/{deviceName}/status`

```json
{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ONLINE"
}
```

**Status Values:**
- `ONLINE` - Device aktif
- `OFFLINE` - Device tidak aktif
- `ERROR` - Device bermasalah
- `MAINTENANCE` - Device sedang maintenance

---

## 🎯 Best Practices

### **1. Topic Design**
✅ **Good:**
```
smartfarm/pump1/command
smartfarm/zone1-sensor/sensor
```

❌ **Bad:**
```
pump1              # Terlalu umum
smart/farm/pump/1  # Terlalu nested
```

### **2. Error Handling ESP32**
```cpp
// Selalu check connection
if (!mqttClient.connected()) {
  connectMQTT();
}

// Timeout untuk actions
unsigned long startTime = millis();
while (condition && (millis() - startTime < 5000)) {
  // Do something
}
```

### **3. QoS (Quality of Service)**
```cpp
// QoS 0: Fire and forget (fastest, tapi bisa hilang)
mqttClient.publish(topic, message, false);

// QoS 1: At least once (slower, tapi guaranteed)
mqttClient.publish(topic, message, true);
```

Gunakan QoS 1 untuk command penting!

### **4. Payload Size**
- Keep payloads small (<1KB)
- Use efficient JSON (no extra whitespace)
- Don't send unnecessary data

---

## 🚀 Next Steps

1. **Test Flow Lengkap:**
   - Create device via Postman
   - Upload code ke ESP32
   - Monitor serial monitor ESP32
   - Monitor backend logs
   - Test send command

2. **Add More Sensors:**
   - Temperature sensor
   - Light sensor
   - Multiple soil moisture sensors

3. **Implement Scheduling:**
   - Time-based watering
   - Sensor-based automation

4. **Build Dashboard:**
   - Real-time sensor graphs
   - Control buttons
   - Device status monitor

---

## 📚 References

- [MQTT.org](https://mqtt.org/) - MQTT Protocol Documentation
- [PubSubClient Library](https://github.com/knolleary/pubsubclient) - Arduino MQTT Client
- [HiveMQ](https://www.hivemq.com/) - Cloud MQTT Broker
- [ESP32 Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)

---

**Happy IoT Farming! 🌱💧🚀**
