# 🎉 BERHASIL! Backend Smart Farming dengan Clean Architecture

Selamat! Backend Anda sudah jalan! ✅

## ✨ Yang Sudah Dibuat

### 1. **Domain Layer** (Inti Bisnis)
- ✅ **Entities**: Device, Sensor, WateringSchedule
- ✅ **Interfaces**: IMqttClient, IDeviceRepository, ISensorRepository
- ✅ **Use Cases**: ControlWateringUseCase, GetSensorDataUseCase, ProcessSensorDataUseCase

### 2. **Infrastructure Layer** (Teknologi)
- ✅ **MQTT Client**: Koneksi ke MQTT broker
- ✅ **MQTT Service**: Listener untuk topic sensor & status
- ✅ **Repositories**: In-memory storage (Device, Sensor, Schedule)

### 3. **Application Layer**
- ✅ **DTOs**: CreateDeviceDto, ControlWateringDto, CreateScheduleDto

### 4. **Presentation Layer** (API)
- ✅ **DeviceController**: CRUD devices
- ✅ **WateringController**: Control penyiraman & jadwal

## 🔌 API Endpoints yang Tersedia

```
GET    /                              # Hello World
POST   /devices                       # Buat device baru
GET    /devices                       # List semua device
GET    /devices/:id                   # Detail device
PUT    /devices/:id/activate          # Aktifkan device
PUT    /devices/:id/deactivate        # Nonaktifkan device
DELETE /devices/:id                   # Hapus device
POST   /watering/control              # Kontrol penyiraman
GET    /watering/sensor/:deviceId     # Data sensor
POST   /watering/schedule             # Buat jadwal
GET    /watering/schedule             # List jadwal
GET    /watering/schedule/:id         # Detail jadwal
```

## 📍 Status Saat Ini

**Server**: ✅ JALAN di `http://localhost:3000`  
**MQTT**: ⚠️ Belum konek (perlu install broker)

## 🚀 Next Steps

### A. Install MQTT Broker (Pilih salah satu)

#### Opsi 1: Mosquitto (Local - Recommended untuk development)

```bash
# Install
brew install mosquitto

# Start
brew services start mosquitto

# Test
brew services list | grep mosquitto
```

#### Opsi 2: HiveMQ Cloud (Gratis, tanpa install)

1. Daftar di https://www.hivemq.com/mqtt-cloud-broker/
2. Buat cluster gratis
3. Copy credentials
4. Update `.env`:
```
MQTT_BROKER_URL=mqtts://your-cluster.s2.eu.hivemq.cloud:8883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
```

### B. Test API

#### 1. Buat Device Baru

```bash
curl -X POST http://localhost:3000/devices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pompa Air Zona 1",
    "type": "PUMP",
    "mqttTopic": "smartfarm/pump1"
  }'
```

#### 2. List Devices

```bash
curl http://localhost:3000/devices
```

#### 3. Control Penyiraman

```bash
curl -X POST http://localhost:3000/watering/control \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "DEVICE_ID_DARI_STEP_1",
    "action": "ON",
    "duration": 300
  }'
```

### C. Test dengan ESP32/Arduino

Contoh code ESP32 untuk kirim data sensor:

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* mqtt_server = "localhost"; // atau HiveMQ URL

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  client.setServer(mqtt_server, 1883);
}

void loop() {
  // Baca sensor kelembaban
  int moisture = analogRead(A0);
  
  // Kirim ke backend
  String payload = "{\"deviceId\":\"device-123\",\"type\":\"SOIL_MOISTURE\",\"value\":" + String(moisture) + ",\"unit\":\"%\"}";
  client.publish("smartfarm/device123/sensor", payload.c_str());
  
  delay(5000); // Kirim setiap 5 detik
}
```

## 📚 Penjelasan Clean Architecture (Simple)

```
USER REQUEST → CONTROLLER → USE CASE → REPOSITORY → DATABASE
                ↑             ↑          ↑
           Presentation   Domain    Infrastructure
```

### Kenapa Clean Architecture?

1. **Mudah Test**: Use case bisa ditest tanpa database
2. **Mudah Ganti**: Ganti MySQL ke MongoDB? Tinggal ganti repository!
3. **Mudah Pahami**: Logika bisnis terpisah dari teknologi
4. **Scalable**: Bisa grow tanpa jadi spaghetti code

### Layer Explanation:

- **Domain** = "Apa yang bisa dilakukan sistem?" (penyiraman otomatis, baca sensor)
- **Infrastructure** = "Pakai teknologi apa?" (MQTT, database)
- **Application** = "Format datanya gimana?" (validation, DTOs)
- **Presentation** = "User akses lewat mana?" (REST API)

## 🐛 Troubleshooting

### Error: "MQTT client not connected"
**Solusi**: Install & jalankan MQTT broker (lihat step A di atas)

### Error: Port 3000 already in use
**Solusi**: 
```bash
# Ganti port di .env
PORT=3001

# Atau kill process
lsof -ti:3000 | xargs kill -9
```

### Error: Cannot find module
**Solusi**:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 🎓 Belajar Lebih Lanjut

- **Clean Architecture**: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- **MQTT Protocol**: https://mqtt.org/
- **NestJS**: https://docs.nestjs.com/
- **IoT Smart Farming**: https://www.youtube.com/results?search_query=iot+smart+farming

## 🚀 Upgrade Ideas

1. **Database Real**: Ganti in-memory dengan MongoDB/PostgreSQL
2. **Time-based Schedule**: Implementasi cron job pakai `@nestjs/schedule`
3. **Authentication**: Tambah JWT token
4. **WebSocket**: Real-time updates
5. **Dashboard**: Buat frontend dengan Next.js (ada di folder smart-farming-app)
6. **Notification**: Email/Telegram alert
7. **History Chart**: Grafik data sensor
8. **Docker**: Containerize untuk deployment

## 🎉 Selamat Belajar!

Kalau ada pertanyaan, tinggal tanya! Happy coding! 🚀
