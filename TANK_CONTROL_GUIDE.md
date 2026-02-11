# Tank Control System - Sistem Kontrol Tandon

## 📋 Overview

Sistem kontrol tandon lengkap untuk Smart Farming dengan fitur:
- 🔄 **Pengaduk Tandon (Agitator)** - Kontrol ON/OFF untuk mencampur nutrisi
- 🚰 **Pompa Manual** - Pengisian manual dengan batas maksimum yang dapat diatur
- 🤖 **Pengisian Otomatis** - Pengisian otomatis berdasarkan level minimum dan maksimum
- 📊 **Statistik Penggunaan Air** - Tracking harian dan historis penggunaan air

## 🏗️ Architecture

```
Frontend → API Controller → Use Case → Repository → PostgreSQL
                  ↓
               MQTT Client → ESP32 Device
```

### Components

1. **Tank Entity** - Konfigurasi tandon
2. **TankStatistics Entity** - Statistik harian
3. **TankLog Entity** - Log aktivitas
4. **TankController** - REST API endpoints
5. **TankControlUseCase** - Business logic
6. **TankRepository** - Data access layer

## 📊 Database Schema

### Table: `tanks`

```sql
CREATE TABLE tanks (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    device_id VARCHAR(255) NOT NULL,
    capacity NUMERIC(10, 2) NOT NULL,           -- Kapasitas dalam liter
    current_level NUMERIC(5, 2) DEFAULT 0,      -- Level saat ini (0-100%)
    is_active BOOLEAN DEFAULT true,
    
    -- Auto Fill Settings
    auto_fill_enabled BOOLEAN DEFAULT false,
    auto_fill_min_level NUMERIC(5, 2) DEFAULT 60,  -- Mulai isi di 60%
    auto_fill_max_level NUMERIC(5, 2) DEFAULT 90,  -- Berhenti di 90%
    
    -- Manual Fill Settings
    manual_fill_max_level NUMERIC(5, 2) DEFAULT 89, -- Batas pompa manual
    
    -- Agitator Settings
    agitator_enabled BOOLEAN DEFAULT false,
    agitator_status BOOLEAN DEFAULT false,      -- Status saat ini (on/off)
    
    user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `tank_statistics`

```sql
CREATE TABLE tank_statistics (
    id UUID PRIMARY KEY,
    tank_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    total_usage NUMERIC(10, 2) DEFAULT 0,       -- Air terpakai (liter)
    total_filled NUMERIC(10, 2) DEFAULT 0,      -- Air diisi (liter)
    
    average_level NUMERIC(5, 2) DEFAULT 0,
    min_level NUMERIC(5, 2) DEFAULT 100,
    max_level NUMERIC(5, 2) DEFAULT 0,
    
    auto_fill_count INTEGER DEFAULT 0,
    manual_fill_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    UNIQUE(tank_id, date)  -- Satu record per hari
);
```

### Table: `tank_logs`

```sql
CREATE TABLE tank_logs (
    id UUID PRIMARY KEY,
    tank_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    level_before NUMERIC(5, 2) NOT NULL,
    level_after NUMERIC(5, 2) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔌 API Endpoints

### Tank CRUD

```
POST   /tanks              - Create tank
GET    /tanks              - Get all tanks
GET    /tanks/my           - Get my tanks only
GET    /tanks/:id          - Get tank by ID
GET    /tanks/:id/status   - Get real-time status
PUT    /tanks/:id          - Update tank settings
DELETE /tanks/:id          - Delete tank (soft delete)
```

### Control Endpoints

```
POST /tanks/:id/agitator/on         - Turn ON pengaduk
POST /tanks/:id/agitator/off        - Turn OFF pengaduk
POST /tanks/:id/manual-fill/start   - Start pompa manual
POST /tanks/:id/manual-fill/stop    - Stop pompa manual
POST /tanks/:id/auto-fill/stop      - Stop auto fill (emergency)
POST /tanks/:id/level               - Update level (from ESP32)
```

### Statistics & Logs

```
GET /tanks/:id/statistics/today     - Today's statistics
GET /tanks/:id/statistics           - Historical statistics (date range)
GET /tanks/:id/logs                 - Activity logs
```

## 🎮 Usage Examples

### 1. Create Tank

```bash
curl -X POST http://localhost:3001/tanks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Water Tank",
    "description": "Primary irrigation tank",
    "deviceId": "ESP32_TANK_001",
    "capacity": 1000,
    "currentLevel": 75,
    "autoFillEnabled": true,
    "autoFillMinLevel": 60,
    "autoFillMaxLevel": 90,
    "manualFillMaxLevel": 89,
    "agitatorEnabled": true
  }'
```

### 2. Get Tank Status

```bash
curl http://localhost:3001/tanks/{tankId}/status \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "tankId": "uuid",
  "name": "Main Water Tank",
  "capacity": 1000,
  "currentLevel": 75,
  "currentVolume": 750,
  "isActive": true,
  "agitator": {
    "enabled": true,
    "status": false
  },
  "autoFill": {
    "enabled": true,
    "minLevel": 60,
    "maxLevel": 90
  },
  "manualFill": {
    "maxLevel": 89,
    "canFill": true
  },
  "todayUsage": 245,
  "todayFilled": 520
}
```

### 3. Control Agitator

```bash
# Turn ON
curl -X POST http://localhost:3001/tanks/{tankId}/agitator/on \
  -H "Authorization: Bearer $TOKEN"

# Turn OFF
curl -X POST http://localhost:3001/tanks/{tankId}/agitator/off \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Manual Fill

```bash
# Start filling
curl -X POST http://localhost:3001/tanks/{tankId}/manual-fill/start \
  -H "Authorization: Bearer $TOKEN"

# Stop filling
curl -X POST http://localhost:3001/tanks/{tankId}/manual-fill/stop \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Get Today's Statistics

```bash
curl http://localhost:3001/tanks/{tankId}/statistics/today \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "tankId": "uuid",
  "tankName": "Main Water Tank",
  "currentLevel": 75,
  "currentVolume": 750,
  "capacity": 1000,
  "today": {
    "totalUsage": 245,
    "totalFilled": 520,
    "averageLevel": 72,
    "minLevel": 58,
    "maxLevel": 91,
    "autoFillCount": 2,
    "manualFillCount": 1
  }
}
```

## 🔄 Auto Fill Flow

```
1. Cron scheduler runs every minute
2. Check all tanks with autoFillEnabled = true
3. If currentLevel < autoFillMinLevel:
   - Send MQTT: AUTO_FILL_START
   - Increment auto_fill_count
   - Log event
4. ESP32 starts pump
5. ESP32 sends level updates via MQTT
6. When currentLevel >= autoFillMaxLevel:
   - Backend sends MQTT: AUTO_FILL_STOP
   - Log event
   - Update statistics
```

## 📡 MQTT Integration

### Commands (Backend → ESP32)

Topic: `smartfarm/tank/{deviceId}/control`

```json
// Agitator ON
{
  "command": "AGITATOR_ON",
  "tankId": "uuid"
}

// Agitator OFF
{
  "command": "AGITATOR_OFF",
  "tankId": "uuid"
}

// Manual Fill Start
{
  "command": "MANUAL_FILL_START",
  "tankId": "uuid",
  "maxLevel": 89
}

// Manual Fill Stop
{
  "command": "MANUAL_FILL_STOP",
  "tankId": "uuid"
}

// Auto Fill Start
{
  "command": "AUTO_FILL_START",
  "tankId": "uuid",
  "minLevel": 60,
  "maxLevel": 90
}

// Auto Fill Stop
{
  "command": "AUTO_FILL_STOP",
  "tankId": "uuid"
}
```

### Updates (ESP32 → Backend)

Topic: `smartfarm/tank/{deviceId}/status`

```json
// Level Update
{
  "tankId": "uuid",
  "level": 75.5,
  "timestamp": "2026-02-10T10:30:00Z"
}

// Fill Complete
{
  "tankId": "uuid",
  "event": "FILL_COMPLETE",
  "finalLevel": 90
}

// Overflow Warning
{
  "tankId": "uuid",
  "event": "OVERFLOW_WARNING",
  "level": 96
}
```

## 🎨 Frontend Integration

### React Dashboard Example

```tsx
import { useState, useEffect } from 'react';

function TankDashboard({ tankId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // Poll status every 3 seconds
    const interval = setInterval(async () => {
      const response = await fetch(`/tanks/${tankId}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setStatus(data);
    }, 3000);

    return () => clearInterval(interval);
  }, [tankId]);

  return (
    <div className="tank-dashboard">
      <h2>{status?.name}</h2>
      
      {/* Level Indicator */}
      <div className="level-display">
        <div className="level-bar">
          <div 
            className="level-fill" 
            style={{ height: `${status?.currentLevel}%` }}
          />
        </div>
        <p>{status?.currentLevel}%</p>
        <p>{status?.currentVolume}L / {status?.capacity}L</p>
      </div>

      {/* Agitator Control */}
      <div className="agitator-control">
        <h3>Pengaduk</h3>
        <button
          onClick={() => toggleAgitator(tankId, !status?.agitator.status)}
          className={status?.agitator.status ? 'active' : ''}
        >
          {status?.agitator.status ? 'AKTIF ✓' : 'NONAKTIF'}
        </button>
      </div>

      {/* Manual Fill Control */}
      <div className="manual-fill">
        <h3>Pompa Manual</h3>
        <p>Batas maksimum: {status?.manualFill.maxLevel}%</p>
        <button 
          onClick={() => startManualFill(tankId)}
          disabled={!status?.manualFill.canFill}
        >
          Mulai Isi
        </button>
        <button onClick={() => stopManualFill(tankId)}>
          Stop
        </button>
      </div>

      {/* Auto Fill Settings */}
      <div className="auto-fill">
        <h3>Pengisian Otomatis</h3>
        <div className="auto-fill-indicator">
          <div className="min-marker" style={{ bottom: `${status?.autoFill.minLevel}%` }}>
            Min: {status?.autoFill.minLevel}%
          </div>
          <div className="max-marker" style={{ bottom: `${status?.autoFill.maxLevel}%` }}>
            Max: {status?.autoFill.maxLevel}%
          </div>
        </div>
        <p>
          {status?.autoFill.enabled 
            ? '✓ Aktif - Auto isi saat < 60%' 
            : '✗ Nonaktif'}
        </p>
      </div>

      {/* Today Statistics */}
      <div className="statistics">
        <h3>Statistik Hari Ini</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="label">Penggunaan</span>
            <span className="value">{status?.todayUsage}L</span>
          </div>
          <div className="stat-item">
            <span className="label">Pengisian</span>
            <span className="value">{status?.todayFilled}L</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 📊 Statistics Dashboard Example

```tsx
function TankStatistics({ tankId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, [tankId]);

  const fetchStatistics = async () => {
    const response = await fetch(
      `/tanks/${tankId}/statistics/today`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    setStats(data);
  };

  return (
    <div className="tank-statistics">
      <h2>Statistik - {stats?.tankName}</h2>
      
      <div className="today-summary">
        <h3>Hari Ini</h3>
        <div className="metrics">
          <div className="metric">
            <i className="icon-usage"></i>
            <p>Penggunaan Air</p>
            <h4>{stats?.today.totalUsage}L</h4>
          </div>
          <div className="metric">
            <i className="icon-fill"></i>
            <p>Pengisian Air</p>
            <h4>{stats?.today.totalFilled}L</h4>
          </div>
          <div className="metric">
            <i className="icon-robot"></i>
            <p>Auto Fill</p>
            <h4>{stats?.today.autoFillCount}x</h4>
          </div>
          <div className="metric">
            <i className="icon-manual"></i>
            <p>Manual Fill</p>
            <h4>{stats?.today.manualFillCount}x</h4>
          </div>
        </div>

        <div className="level-range">
          <p>Level Range: {stats?.today.minLevel}% - {stats?.today.maxLevel}%</p>
          <p>Average: {stats?.today.averageLevel}%</p>
        </div>
      </div>

      {/* Chart here - use recharts, chart.js, etc */}
    </div>
  );
}
```

## 🔐 Access Control

- **Create/Update/Delete Tank:** Admin or Farmer
- **Control (Agitator, Manual Fill):** Admin or Farmer
- **View Status/Statistics:** Any authenticated user

## ⚡ Performance Tips

1. **Real-time Updates:**
   - Poll `/tanks/:id/status` every 3-5 seconds
   - Use WebSocket for true real-time (future enhancement)

2. **Statistics Caching:**
   - Statistics are aggregated daily
   - Cache today's stats in frontend
   - Refresh every 5 minutes

3. **Database Indexing:**
   - Indexes already created in migration
   - Optimized for date range queries

## 🧪 Testing with Postman

1. Import collection: `Smart-Farming-Complete-API.postman_collection.json`
2. Set environment: `Smart-Farming-Dev.postman_environment.json`
3. Login as admin: `Login Admin` request
4. Navigate to "Tank Control (Tandon)" folder
5. Run requests in order:
   - Create Tank
   - Get Tank Status
   - Turn ON Agitator
   - Start Manual Fill
   - Get Today Statistics

## 🐛 Troubleshooting

### Tank level not updating
- Check MQTT connection
- Verify ESP32 is sending level updates
- Check topic: `smartfarm/tank/{deviceId}/status`

### Auto fill not triggering
- Ensure `autoFillEnabled = true`
- Check current level is below `autoFillMinLevel`
- Verify cron scheduler is running (check logs)

### Statistics not showing
- Check if statistics record exists for today
- Repository auto-creates if missing
- Verify date/time on server

## 📝 TODO / Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Mobile app integration
- [ ] Email/SMS alerts for low level or overflow
- [ ] Multi-tank comparison dashboard
- [ ] Water quality sensors integration
- [ ] Predictive analytics (ML-based usage prediction)
- [ ] Export statistics to CSV/PDF
- [ ] Tank maintenance scheduler

## 📞 Support

For issues or questions, please create an issue on GitHub or contact the development team.
