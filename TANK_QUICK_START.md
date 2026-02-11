# Quick Start - Tank Control System

## 🚀 Setup & Testing (5 menit)

### Step 1: Run Database Migration

```bash
# Masuk ke container PostgreSQL (TimescaleDB)
docker exec -i smartfarming-timescaledb psql -U smartfarming -d smartfarming < migrations/007_create_tank_control_system.sql

# Atau secara interaktif
docker exec -it smartfarming-timescaledb psql -U smartfarming -d smartfarming
\i migrations/007_create_tank_control_system.sql
```

Verifikasi tables sudah dibuat:
```bash
docker exec -i smartfarming-timescaledb psql -U smartfarming -d smartfarming -c "\dt"
# Should show: tanks, tank_statistics, tank_logs
```

### Step 2: Import TankModule ke App

✅ **SUDAH SELESAI** - TankModule sudah di-import ke `src/app.module.ts`

### Step 3: Start Backend

```bash
# Development mode
npm run start:dev

# Or with Docker Compose
docker compose up -d
```

### Step 4: Test dengan Postman

1. **Login as Admin:**
   - Request: `Authentication → Login Admin`
   - Token akan auto-save ke environment

2. **Create Tank:**
   ```
   Request: Tank Control → Create Tank
   ```
   
   Body sudah pre-filled:
   ```json
   {
     "name": "Main Water Tank",
     "description": "Primary water storage tank",
     "deviceId": "{{lastDeviceId}}",
     "sensorDeviceId": "ESP32_SENSOR_001",
     "capacity": 5000,
     "currentLevel": 75,
     "autoFillEnabled": true,
     "autoFillMinLevel": 30,
     "autoFillMaxLevel": 90,
     "manualFillMaxLevel": 95,
     "agitatorEnabled": true
   }
   ```

   **Atau untuk tank tanpa sensor (manual):**
   ```json
   {
     "name": "Secondary Water Tank",
     "description": "Backup water storage tank",
     "deviceId": "{{lastDeviceId}}",
     "capacity": 3000,
     "currentLevel": 50,
     "autoFillEnabled": false,
     "autoFillMinLevel": 30,
     "autoFillMaxLevel": 90,
     "manualFillMaxLevel": 95,
     "manualFillDuration": 30,
     "agitatorEnabled": false
   }
   ```

   **Notes:**
   - `sensorDeviceId`: (Opsional) Device ID untuk sensor level air otomatis
   - `manualFillDuration`: (Opsional) Durasi pengisian manual dalam menit (1-180). Required jika `sensorDeviceId` tidak ada
   - `capacity`: 10 - 100000 liter
   - `name`: Max 100 karakter
   - `autoFillMinLevel`: Max 80%
   - `autoFillMaxLevel`: Min 50%
   - `manualFillMaxLevel`: Min 50%, default 95%

3. **Get Tank Status:**
   ```
   Request: Tank Control → Get Tank Status
   ```
   
   Response akan show:
   - Current level & volume
   - Agitator status
   - Auto fill settings
   - Manual fill availability
   - Today's statistics

4. **Test Agitator (Pengaduk):**
   ```
   Request: Tank Control → Turn ON Agitator
   ```
   
   MQTT command akan dikirim: `AGITATOR_ON`

5. **Test Manual Fill (Pompa Manual):**
   ```
   Request: Tank Control → Start Manual Fill
   ```
   
   MQTT command: `MANUAL_FILL_START` dengan `maxLevel: 89`

6. **Get Today's Statistics:**
   ```
   Request: Tank Control → Get Today Statistics
   ```
   
   Lihat usage & fill metrics

## 🎯 Testing Auto Fill

Auto fill dijalankan via cron scheduler. Untuk testing:

### Option 1: Manual Trigger (Testing)

Update tank level ke < 60% dulu:

```bash
curl -X POST http://localhost:3001/tanks/{tankId}/level \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"level": 55}'
```

Lalu panggil method auto fill check:

```typescript
// Di TankControlUseCase
await this.tankControlUseCase.checkAndTriggerAutoFill();
```

### Option 2: Setup Cron (Production)

Edit `src/app.module.ts` atau buat `TankSchedulerService`:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TankControlUseCase } from './domain/use-cases/TankControlUseCase';

@Injectable()
export class TankSchedulerService {
  constructor(
    private readonly tankControlUseCase: TankControlUseCase,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkAutoFill() {
    console.log('⏰ Checking tank auto fill...');
    await this.tankControlUseCase.checkAndTriggerAutoFill();
  }
}
```

Import ke TankModule:

```typescript
@Module({
  imports: [DatabaseModule, MqttModule, ScheduleModule.forRoot()],
  controllers: [TankController],
  providers: [
    TankControlUseCase,
    TankSchedulerService, // <-- Add this
    // ...
  ],
})
export class TankModule {}
```

## 📊 Frontend Dashboard (React Example)

Buat component sederhana untuk testing:

```tsx
// TankDashboard.tsx
import { useState, useEffect } from 'react';

export default function TankDashboard({ tankId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    fetchStatus();

    // Poll every 3 seconds
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [tankId]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`http://localhost:3001/tanks/${tankId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      setStatus(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const toggleAgitator = async (turnOn) => {
    const endpoint = turnOn ? 'on' : 'off';
    await fetch(`http://localhost:3001/tanks/${tankId}/agitator/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    fetchStatus(); // Refresh
  };

  const startManualFill = async () => {
    await fetch(`http://localhost:3001/tanks/${tankId}/manual-fill/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  };

  const stopManualFill = async () => {
    await fetch(`http://localhost:3001/tanks/${tankId}/manual-fill/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>{status.name}</h1>
      
      {/* Level Display */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Water Level</h2>
        <div style={{
          width: '100px',
          height: '300px',
          border: '2px solid #333',
          position: 'relative',
          backgroundColor: '#f0f0f0'
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: `${status.currentLevel}%`,
            backgroundColor: '#4CAF50',
            transition: 'height 0.3s'
          }}></div>
          
          {/* Auto Fill Markers */}
          <div style={{
            position: 'absolute',
            bottom: `${status.autoFill.minLevel}%`,
            width: '100%',
            borderTop: '2px dashed red',
            fontSize: '10px'
          }}>
            Min: {status.autoFill.minLevel}%
          </div>
          <div style={{
            position: 'absolute',
            bottom: `${status.autoFill.maxLevel}%`,
            width: '100%',
            borderTop: '2px dashed blue',
            fontSize: '10px'
          }}>
            Max: {status.autoFill.maxLevel}%
          </div>
        </div>
        <p><strong>{status.currentLevel}%</strong></p>
        <p>{status.currentVolume}L / {status.capacity}L</p>
      </div>

      {/* Agitator Control */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Pengaduk (Agitator)</h2>
        <button 
          onClick={() => toggleAgitator(!status.agitator.status)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: status.agitator.status ? '#4CAF50' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {status.agitator.status ? '✓ AKTIF' : '✗ NONAKTIF'}
        </button>
      </div>

      {/* Manual Fill Control */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Pompa Manual</h2>
        <p>Batas maksimum: {status.manualFill.maxLevel}%</p>
        <button 
          onClick={startManualFill}
          disabled={!status.manualFill.canFill}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            marginRight: '10px',
            cursor: status.manualFill.canFill ? 'pointer' : 'not-allowed'
          }}
        >
          🚰 Mulai Isi
        </button>
        <button 
          onClick={stopManualFill}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ⛔ Stop
        </button>
      </div>

      {/* Auto Fill Info */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Pengisian Otomatis</h2>
        <p>Status: {status.autoFill.enabled ? '✓ Aktif' : '✗ Nonaktif'}</p>
        <p>Mulai isi saat level {'<'} {status.autoFill.minLevel}%</p>
        <p>Berhenti saat level ≥ {status.autoFill.maxLevel}%</p>
      </div>

      {/* Today Statistics */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Statistik Hari Ini</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
            <strong>Penggunaan Air</strong>
            <p style={{ fontSize: '24px', margin: '5px 0' }}>{status.todayUsage}L</p>
          </div>
          <div style={{ padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '5px' }}>
            <strong>Pengisian Air</strong>
            <p style={{ fontSize: '24px', margin: '5px 0' }}>{status.todayFilled}L</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Usage:
```tsx
// App.tsx
import TankDashboard from './TankDashboard';

function App() {
  const tankId = 'your-tank-id-here'; // dari createTank response
  
  return (
    <div className="App">
      <TankDashboard tankId={tankId} />
    </div>
  );
}
```

## 🧪 Testing Checklist

- [ ] Create tank via Postman
- [ ] Get tank status (polling works)
- [ ] Turn ON agitator (check MQTT logs)
- [ ] Turn OFF agitator
- [ ] Start manual fill
- [ ] Stop manual fill
- [ ] Set level to < 60% (trigger auto fill)
- [ ] Check auto fill triggers automatically
- [ ] View today's statistics
- [ ] View activity logs
- [ ] Update tank settings
- [ ] Frontend dashboard displays correctly
- [ ] Real-time polling updates UI

## 🐛 Common Issues

### 1. MQTT commands not sent
```
Error: MQTT client not connected
```

**Solution:** Check MQTT service is running:
```bash
docker-compose ps mqtt
```

### 2. Database connection error
```
Error: relation "tanks" does not exist
```

**Solution:** Run migration:
```bash
psql -U smartfarming -d smartfarming_db -f migrations/007_create_tank_control_system.sql
```

### 3. Authorization error
```
401 Unauthorized
```

**Solution:** Login terlebih dahulu, token akan auto-save di Postman environment.

### 4. Auto fill not triggering

**Solution:** 
1. Check cron scheduler is running
2. Ensure `autoFillEnabled = true`
3. Set level < `autoFillMinLevel`
4. Check backend logs for scheduler activity

## 📝 Next Steps

1. **Connect ESP32:**
   - Subscribe to `smartfarm/tank/{deviceId}/control`
   - Implement AGITATOR_ON/OFF logic
   - Implement MANUAL_FILL_START/STOP logic
   - Send level updates to `smartfarm/tank/{deviceId}/status`

2. **Setup Monitoring:**
   - Add logging service (Winston, Pino)
   - Setup alerts for overflow warnings
   - Create admin dashboard

3. **Enhance Frontend:**
   - Add charts for historical data
   - Implement notifications
   - Add mobile responsive design

## 🎉 Success!

Jika semua step di atas berhasil, Anda sudah memiliki:
- ✅ Tank control system yang lengkap
- ✅ Real-time status monitoring
- ✅ Pengaduk tandon control
- ✅ Pompa manual dengan batas maksimum
- ✅ Pengisian otomatis
- ✅ Statistik penggunaan air
- ✅ Activity logging

Selamat! 🎊
