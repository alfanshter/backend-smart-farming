# 🌾 AUTO DRIP IRRIGATION SYSTEM - Complete Guide

## 📚 Overview

Sistem **Auto Drip Irrigation** memungkinkan penjadwalan penyiraman otomatis berdasarkan:
- ⏰ **Time Slots**: Waktu mulai penyiraman (format HH:MM)
- ⏱️ **Duration**: Durasi penyiraman (menit + detik)
- 📅 **Active Days**: Hari-hari aktif dalam seminggu

Backend menggunakan **node-cron** untuk menjalankan scheduled jobs setiap menit dan akan otomatis trigger penyiraman ketika waktu sesuai jadwal.

---

## 🗄️ Database Schema

### Table: `auto_drip_schedules`

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE
is_active BOOLEAN DEFAULT true
time_slots JSONB NOT NULL DEFAULT '[]'::jsonb
active_days JSONB NOT NULL DEFAULT '[]'::jsonb
user_id UUID NOT NULL
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

**JSONB Format:**
```json
{
  "time_slots": [
    {
      "startTime": "07:00",
      "durationMinutes": 4,
      "durationSeconds": 0
    }
  ],
  "active_days": ["monday", "wednesday", "friday"]
}
```

---

## 🔌 API Endpoints

### Base URL: `/auto-drip`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auto-drip` | Create new auto drip schedule | ✅ Yes |
| GET | `/auto-drip` | Get all schedules (with filters) | ✅ Yes |
| GET | `/auto-drip/active` | Get all active schedules | ✅ Yes |
| GET | `/auto-drip/:id` | Get schedule by ID | ✅ Yes |
| GET | `/auto-drip/zone/:zoneId` | Get schedule by zone ID | ✅ Yes |
| PUT | `/auto-drip/:id` | Update schedule | ✅ Yes |
| PATCH | `/auto-drip/:id/toggle` | Toggle active status | ✅ Yes |
| DELETE | `/auto-drip/:id` | Delete schedule | ✅ Yes |

---

## 📝 API Examples

### 1️⃣ CREATE Auto Drip Schedule

**Request:**
```bash
POST http://localhost:3001/auto-drip
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "zoneId": "a0000000-0000-0000-0000-000000000001",
  "isActive": true,
  "timeSlots": [
    {
      "startTime": "07:00",
      "durationMinutes": 4,
      "durationSeconds": 0
    },
    {
      "startTime": "12:00",
      "durationMinutes": 3,
      "durationSeconds": 30
    }
  ],
  "activeDays": ["monday", "wednesday", "friday"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auto drip schedule created successfully",
  "data": {
    "id": "f8e7d6c5-b4a3-9281-7069-5849c8e7d6c5",
    "zoneId": "a0000000-0000-0000-0000-000000000001",
    "isActive": true,
    "timeSlots": [
      {
        "startTime": "07:00",
        "durationMinutes": 4,
        "durationSeconds": 0
      },
      {
        "startTime": "12:00",
        "durationMinutes": 3,
        "durationSeconds": 30
      }
    ],
    "activeDays": ["monday", "wednesday", "friday"],
    "userId": "admin-user-id",
    "createdAt": "2026-02-09T10:30:00.000Z",
    "updatedAt": "2026-02-09T10:30:00.000Z"
  }
}
```

**Validation Rules:**
- `startTime`: Must be HH:MM format (24-hour), e.g., `07:00`, `17:30`
- `durationMinutes`: Integer >= 0
- `durationSeconds`: Integer >= 0
- `activeDays`: Array of strings (monday, tuesday, wednesday, thursday, friday, saturday, sunday)
- **Note**: One zone can only have ONE auto drip schedule (enforced by backend)

---

### 2️⃣ GET All Schedules

**Request:**
```bash
GET http://localhost:3001/auto-drip
Authorization: Bearer <JWT_TOKEN>

# With filter by zone
GET http://localhost:3001/auto-drip?zoneId=a0000000-0000-0000-0000-000000000001
```

**Response:**
```json
{
  "success": true,
  "message": "Auto drip schedules retrieved successfully",
  "data": [
    {
      "id": "450db4ff-fc2a-4ba5-8dbc-a81a06302179",
      "zoneId": "a0000000-0000-0000-0000-000000000001",
      "isActive": true,
      "timeSlots": [
        {
          "startTime": "07:00",
          "durationMinutes": 4,
          "durationSeconds": 0
        },
        {
          "startTime": "17:00",
          "durationMinutes": 3,
          "durationSeconds": 30
        }
      ],
      "activeDays": ["monday", "wednesday", "friday"],
      "userId": "admin-user-id",
      "createdAt": "2026-02-09T03:00:00.000Z",
      "updatedAt": "2026-02-09T03:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 3️⃣ GET Active Schedules Only

**Request:**
```bash
GET http://localhost:3001/auto-drip/active
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "Active schedules retrieved successfully",
  "data": [
    { ... }
  ],
  "count": 2
}
```

---

### 4️⃣ GET Schedule by Zone ID

**Request:**
```bash
GET http://localhost:3001/auto-drip/zone/a0000000-0000-0000-0000-000000000001
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule found",
  "data": {
    "id": "450db4ff-fc2a-4ba5-8dbc-a81a06302179",
    "zoneId": "a0000000-0000-0000-0000-000000000001",
    ...
  }
}
```

---

### 5️⃣ UPDATE Schedule

**Request:**
```bash
PUT http://localhost:3001/auto-drip/450db4ff-fc2a-4ba5-8dbc-a81a06302179
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "isActive": false,
  "timeSlots": [
    {
      "startTime": "08:00",
      "durationMinutes": 5,
      "durationSeconds": 0
    }
  ],
  "activeDays": ["monday", "tuesday", "wednesday"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auto drip schedule updated successfully",
  "data": { ... }
}
```

---

### 6️⃣ TOGGLE Active Status

**Request:**
```bash
PATCH http://localhost:3001/auto-drip/450db4ff-fc2a-4ba5-8dbc-a81a06302179/toggle
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule activated successfully",
  "data": {
    "id": "450db4ff-fc2a-4ba5-8dbc-a81a06302179",
    "isActive": true,
    ...
  }
}
```

---

### 7️⃣ DELETE Schedule

**Request:**
```bash
DELETE http://localhost:3001/auto-drip/450db4ff-fc2a-4ba5-8dbc-a81a06302179
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "Auto drip schedule deleted successfully"
}
```

---

## ⚙️ How Auto Scheduling Works

### 🤖 AutoDripSchedulerService

Service ini berjalan di background dan menggunakan **node-cron** untuk cek jadwal setiap menit.

**Workflow:**
1. ⏰ **Every minute** (cron: `* * * * *`), service akan:
   - Ambil semua schedule yang `isActive: true`
   - Cek waktu sekarang (HH:MM)
   - Cek hari sekarang (monday, tuesday, etc.)
   
2. ✅ **Jika match** dengan schedule:
   - Trigger `ZoneControlUseCase.activateZone()`
   - Kirim MQTT command `START_WATERING` ke ESP32
   - Log: `💧 Triggering AUTO DRIP for zone ...`

3. ⏱️ **Auto stop** setelah duration habis (dihandle oleh countdown timer di ZoneControlUseCase)

**Example Logs:**
```
[AutoDripSchedulerService] ⏰ Checking schedules at 2026-02-09T07:00:00.000Z
[AutoDripSchedulerService] Found 2 active schedule(s)
[AutoDripSchedulerService] ✅ Schedule matched! Zone: a0000000-0000-0000-0000-000000000001, Time: 07:00:00 AM
[AutoDripSchedulerService] 💧 Triggering AUTO DRIP for zone a0000000-0000-0000-0000-000000000001 - Duration: 4m 0s
[ZoneControlUseCase] 🚰 Activating zone a0000000-0000-0000-0000-000000000001 (Source: AUTO_DRIP)
[MqttClient] 📤 Publishing to Smartfarming/device1/control: START_WATERING
[AutoDripSchedulerService] ✅ Auto drip watering started for zone a0000000-0000-0000-0000-000000000001
```

---

## 🧪 Testing

### Test Scenario 1: Create Schedule
```bash
curl -X POST http://localhost:3001/auto-drip \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "zoneId": "a0000000-0000-0000-0000-000000000001",
    "isActive": true,
    "timeSlots": [
      {
        "startTime": "07:00",
        "durationMinutes": 4,
        "durationSeconds": 0
      }
    ],
    "activeDays": ["monday", "wednesday", "friday"]
  }'
```

### Test Scenario 2: Get All Active Schedules
```bash
curl -X GET http://localhost:3001/auto-drip/active \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Scenario 3: Toggle Schedule
```bash
curl -X PATCH http://localhost:3001/auto-drip/SCHEDULE_ID/toggle \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔐 Authentication

All endpoints require **JWT authentication**. Include the token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Get Token:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@smartfarming.com",
    "password": "Admin123!"
  }'
```

---

## 🎯 Use Cases

### Use Case 1: Morning & Evening Watering
```json
{
  "timeSlots": [
    {
      "startTime": "06:00",
      "durationMinutes": 5,
      "durationSeconds": 0
    },
    {
      "startTime": "18:00",
      "durationMinutes": 5,
      "durationSeconds": 0
    }
  ],
  "activeDays": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
}
```

### Use Case 2: Weekday Only Watering
```json
{
  "timeSlots": [
    {
      "startTime": "08:00",
      "durationMinutes": 10,
      "durationSeconds": 0
    }
  ],
  "activeDays": ["monday", "tuesday", "wednesday", "thursday", "friday"]
}
```

### Use Case 3: Alternate Day Watering
```json
{
  "timeSlots": [
    {
      "startTime": "07:30",
      "durationMinutes": 8,
      "durationSeconds": 30
    }
  ],
  "activeDays": ["monday", "wednesday", "friday", "sunday"]
}
```

---

## 📊 Database Sample Data

Backend sudah menyediakan 2 sample schedules:

1. **Zona A**: Monday, Wednesday, Friday @ 07:00 & 17:00
2. **Zona B**: Tuesday, Thursday, Saturday @ 06:30 & 18:00

Query untuk lihat data:
```sql
SELECT id, zone_id, is_active, time_slots, active_days 
FROM auto_drip_schedules 
ORDER BY created_at;
```

---

## 🚀 Getting Started

1. **Pastikan backend running:**
   ```bash
   pnpm run start:dev
   ```

2. **Cek service logs:**
   ```
   [AutoDripSchedulerService] 🤖 Auto Drip Scheduler Service initialized
   [AutoDripSchedulerService] ⏰ Cron job started - checking schedules every minute
   ```

3. **Login dan get JWT token:**
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@smartfarming.com","password":"Admin123!"}'
   ```

4. **Create your first schedule:**
   ```bash
   curl -X POST http://localhost:3001/auto-drip \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{ ... }'
   ```

5. **Wait for the scheduled time** and watch the logs! 🎉

---

## 🛠️ Troubleshooting

### Issue: Schedule not triggering
- ✅ Check `is_active: true`
- ✅ Check current day is in `activeDays`
- ✅ Check current time matches `startTime`
- ✅ Check backend logs for errors
- ✅ Check MQTT connection

### Issue: Zone already has schedule
- ❌ Error: "Zone already has an auto drip schedule"
- ✅ Solution: Update existing schedule or delete it first

### Issue: Invalid time format
- ❌ Error: "startTime must be in HH:MM format"
- ✅ Solution: Use 24-hour format like `07:00`, `17:30` (not `7:00` or `5:30 PM`)

---

## 📁 Files Created

### Domain Layer:
- `src/domain/entities/AutoDripSchedule.ts`
- `src/domain/interfaces/IAutoDripScheduleRepository.ts`
- `src/domain/use-cases/CreateAutoDripScheduleUseCase.ts`
- `src/domain/use-cases/GetAutoDripScheduleUseCase.ts`
- `src/domain/use-cases/UpdateAutoDripScheduleUseCase.ts`
- `src/domain/use-cases/DeleteAutoDripScheduleUseCase.ts`

### Infrastructure Layer:
- `src/infrastructure/database/entities/AutoDripScheduleEntity.ts`
- `src/infrastructure/repositories/TimescaleAutoDripScheduleRepository.ts`
- `src/infrastructure/services/AutoDripSchedulerService.ts`

### Application Layer:
- `src/application/dtos/CreateAutoDripScheduleDto.ts`
- `src/application/dtos/UpdateAutoDripScheduleDto.ts`

### Presentation Layer:
- `src/presentation/controllers/AutoDripController.ts`

### Module:
- `src/modules/AutoDripModule.ts`

### Migration:
- `migrations/005_create_auto_drip_schedules_table.sql`

---

## ✅ Summary

✅ **Database table created** with JSONB support
✅ **8 REST API endpoints** implemented
✅ **CRUD operations** complete
✅ **Auto scheduling** with node-cron
✅ **JWT authentication** required
✅ **Sample data** provided
✅ **Clean Architecture** maintained
✅ **TypeORM integration** working
✅ **MQTT integration** for device control

**Total Endpoints:** 8 Auto Drip + 10 Zone Manual = **18 Watering Control Endpoints** 🚀

Happy farming! 🌾💧
