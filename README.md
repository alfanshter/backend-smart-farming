# 🌱 Smart Farming Backend - Clean Architecture + MQTT

Backend untuk sistem penyiraman otomatis menggunakan **Clean Architecture** dan **MQTT Protocol**.

## 📚 Penjelasan Clean Architecture (untuk Newbie)

Clean Architecture itu kayak rumah berlapis:

```
┌─────────────────────────────────────┐
│   PRESENTATION (REST API)           │ ← User/Frontend berinteraksi di sini
├─────────────────────────────────────┤
│   APPLICATION (DTOs, Services)      │ ← Validasi dan format data
├─────────────────────────────────────┤
│   DOMAIN (Entities, Use Cases)      │ ← INTI BISNIS (aturan penyiraman)
├─────────────────────────────────────┤
│   INFRASTRUCTURE (MQTT, Database)   │ ← Teknologi (bisa diganti kapan saja)
└─────────────────────────────────────┘
```

**Kenapa pakai Clean Architecture?**
- ✅ Mudah di-test
- ✅ Mudah ganti teknologi (misal: ganti database, use case tetap sama)
- ✅ Kode lebih rapi dan terstruktur
- ✅ Tim bisa kerja paralel di layer berbeda

## 🏗️ Struktur Folder

```
src/
├── domain/                          # INTI BISNIS
│   ├── entities/                    # Model data (Device, Sensor, Schedule)
│   │   ├── Device.ts
│   │   ├── Sensor.ts
│   │   └── WateringSchedule.ts
│   ├── interfaces/                  # Kontrak/Interface
│   │   ├── IMqttClient.ts
│   │   ├── IDeviceRepository.ts
│   │   ├── ISensorRepository.ts
│   │   └── IWateringScheduleRepository.ts
│   └── use-cases/                   # Logika bisnis utama
│       ├── ControlWateringUseCase.ts
│       ├── GetSensorDataUseCase.ts
│       └── ProcessSensorDataUseCase.ts
│
├── infrastructure/                  # TEKNOLOGI LUAR
│   ├── mqtt/                        # MQTT Client & Service
│   │   ├── MqttClient.ts
│   │   └── MqttService.ts
│   └── repositories/                # Database (in-memory sementara)
│       ├── InMemoryDeviceRepository.ts
│       ├── InMemorySensorRepository.ts
│       └── InMemoryWateringScheduleRepository.ts
│
├── application/                     # LAYER APLIKASI
│   └── dtos/                        # Data Transfer Objects
│       ├── CreateDeviceDto.ts
│       ├── ControlWateringDto.ts
│       └── CreateScheduleDto.ts
│
├── presentation/                    # LAYER PRESENTASI
│   └── controllers/                 # REST API Controllers
│       ├── DeviceController.ts
│       └── WateringController.ts
│
├── SmartFarmingModule.ts           # NestJS Module utama
└── main.ts                          # Entry point
```

## 🚀 Cara Pakai

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup MQTT Broker

**Opsi A: Install Mosquitto (Local)**

```bash
# macOS
brew install mosquitto
brew services start mosquitto
```

**Opsi B: Gunakan HiveMQ Cloud (Gratis)**

1. Daftar di https://www.hivemq.com/mqtt-cloud-broker/
2. Buat cluster
3. Copy URL, username, password
4. Update `.env`

### 3. Setup Environment

```bash
cp .env.example .env
# Edit .env sesuai konfigurasi MQTT broker Anda
```

### 4. Jalankan Server

```bash
pnpm run start:dev
```

Server akan jalan di `http://localhost:3000`

## 📡 MQTT Topics

```
smartfarm/+/sensor    → Device mengirim data sensor
smartfarm/+/status    → Device mengirim status (online/offline)
smartfarm/device123   → Backend mengirim command ke device tertentu
```

**Contoh Payload Sensor:**

```json
{
  "deviceId": "device-123",
  "type": "SOIL_MOISTURE",
  "value": 25.5,
  "unit": "%",
  "metadata": {
    "location": "Zona A"
  }
}
```

**Contoh Payload Command (Backend → Device):**

```json
{
  "action": "ON",
  "duration": 300,
  "timestamp": "2026-01-25T10:00:00Z"
}
```

## 🔌 REST API Endpoints

### Devices

```http
POST   /devices              # Buat device baru
GET    /devices              # List semua device
GET    /devices/:id          # Detail device
PUT    /devices/:id/activate # Aktifkan device
PUT    /devices/:id/deactivate # Nonaktifkan device
DELETE /devices/:id          # Hapus device
```

### Watering

```http
POST /watering/control       # Kontrol penyiraman manual
GET  /watering/sensor/:deviceId  # Lihat data sensor
POST /watering/schedule      # Buat jadwal penyiraman
GET  /watering/schedule      # List semua jadwal
GET  /watering/schedule/:id  # Detail jadwal
```

## 📝 Contoh Request

### 1. Buat Device Baru

```bash
curl -X POST http://localhost:3000/devices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pompa Air Zona 1",
    "type": "PUMP",
    "mqttTopic": "smartfarm/pump1",
    "isActive": true
  }'
```

### 2. Kontrol Penyiraman Manual

```bash
curl -X POST http://localhost:3000/watering/control \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-id-here",
    "action": "ON",
    "duration": 300
  }'
```

### 3. Buat Jadwal Time-Based

```bash
curl -X POST http://localhost:3000/watering/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Penyiraman Pagi",
    "deviceId": "device-id-here",
    "type": "TIME_BASED",
    "startTime": "06:00",
    "duration": 600,
    "daysOfWeek": [0, 1, 2, 3, 4, 5, 6],
    "isActive": true
  }'
```

### 4. Buat Jadwal Sensor-Based

```bash
curl -X POST http://localhost:3000/watering/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Auto Watering - Kelembaban Rendah",
    "deviceId": "device-id-here",
    "type": "SENSOR_BASED",
    "moistureThreshold": 30,
    "duration": 300,
    "isActive": true
  }'
```

## 🧪 Testing dengan MQTT Client

Install MQTT client untuk testing:

```bash
npm install -g mqtt
```

**Subscribe ke topic:**

```bash
mqtt subscribe -t 'smartfarm/#' -h localhost -v
```

**Publish sensor data:**

```bash
mqtt publish -t 'smartfarm/device123/sensor' \
  -h localhost \
  -m '{"deviceId":"device-123","type":"SOIL_MOISTURE","value":25.5,"unit":"%"}'
```

## 🎯 Flow Penyiraman Otomatis

### Scenario 1: Sensor-Based (Otomatis berdasarkan kelembaban)

```
1. Sensor di lapangan kirim data kelembaban → MQTT
2. MqttService terima data → ProcessSensorDataUseCase
3. Use case cek jadwal sensor-based yang aktif
4. Jika kelembaban < threshold (misal: 30%):
   → Trigger ControlWateringUseCase
   → Kirim command "ON" ke pompa via MQTT
5. Pompa menyala selama durasi yang ditentukan
```

### Scenario 2: Time-Based (Otomatis berdasarkan jadwal)

```
1. Cron job cek jadwal time-based (bisa pakai @nestjs/schedule)
2. Jika waktu sekarang = waktu jadwal:
   → Trigger ControlWateringUseCase
   → Kirim command "ON" ke pompa via MQTT
3. Pompa menyala selama durasi yang ditentukan
```

### Scenario 3: Manual

```
1. User klik tombol di frontend
2. Frontend kirim POST /watering/control
3. Controller panggil ControlWateringUseCase
4. Use case kirim command via MQTT
5. Pompa menyala/mati sesuai command
```

## 🔄 Penjelasan Flow Data

```
┌─────────┐     MQTT      ┌─────────────┐
│ ESP32   │ ────────────→ │ MqttService │
│ Sensor  │               └──────┬──────┘
└─────────┘                      │
                                 ↓
                        ProcessSensorDataUseCase
                                 │
                    ┌────────────┼────────────┐
                    ↓                         ↓
            Save to Database     Cek Jadwal Sensor-Based
                                         │
                                         ↓ (jika kelembaban rendah)
                              ControlWateringUseCase
                                         │
                                         ↓
                      Publish MQTT → ESP32 Pompa ON
```

## 🛠️ Pengembangan Selanjutnya

1. **Database Real:** Ganti in-memory repository dengan MongoDB/PostgreSQL
2. **Cron Jobs:** Implementasi penjadwalan time-based pakai `@nestjs/schedule`
3. **Authentication:** Tambah JWT untuk security
4. **WebSocket:** Real-time update ke frontend
5. **Logging:** Tambah logger untuk monitoring
6. **Testing:** Unit test & integration test
7. **Docker:** Containerize aplikasi

## 📦 Tech Stack

- **NestJS** - Framework backend
- **TypeScript** - Type-safe JavaScript
- **MQTT** - IoT messaging protocol
- **Clean Architecture** - Software design pattern

## 📖 Belajar Lebih Lanjut

- [Clean Architecture by Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [MQTT Protocol](https://mqtt.org/)
- [NestJS Documentation](https://docs.nestjs.com/)

## 🤝 Contributing

Silakan fork dan submit PR!

## 📄 License

MIT
