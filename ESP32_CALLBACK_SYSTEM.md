# 📡 ESP32 Callback System Implementation Guide

## 📋 Ringkasan

Sistem callback ini memastikan bahwa backend **benar-benar tahu** status real hardware ESP32, bukan hanya asumsi bahwa perintah sudah dijalankan.

---

## ❌ Masalah Sebelum Ada Callback

| Skenario | Masalah | Dampak |
|----------|---------|--------|
| Backend kirim START → ESP32 offline | Backend anggap pompa nyala, padahal tidak | Air tidak keluar, tanaman tidak disiram |
| Backend kirim STOP → ESP32 tidak terima | Backend anggap pompa mati, padahal masih nyala | Air terus keluar, boros air |
| ESP32 restart mendadak | Backend tidak tahu pompa mati | Status tidak sinkron |
| Kabel pompa putus | Backend tidak tahu ada masalah | User bingung kenapa tidak ada air |

---

## ✅ Solusi dengan Callback System

### 1. **Flow Komunikasi 2-Arah**

```
Backend                    ESP32
   │                         │
   ├──── START_MANUAL ──────►│  1️⃣ Backend kirim perintah
   │                         │
   │◄──── ACK ───────────────┤  2️⃣ ESP32 terima & kirim ACK
   │                         │
   │                         │  3️⃣ ESP32 nyalakan pompa
   │                         │
   │◄──── WATERING_STARTED ──┤  4️⃣ ESP32 konfirmasi pompa ON
   │                         │
   │        ... nyiram ...   │
   │                         │
   ├──── STOP_MANUAL ───────►│  5️⃣ Backend kirim stop
   │                         │
   │◄──── ACK ───────────────┤  6️⃣ ESP32 terima & kirim ACK
   │                         │
   │                         │  7️⃣ ESP32 matikan pompa
   │                         │
   │◄──── WATERING_STOPPED ──┤  8️⃣ ESP32 konfirmasi pompa OFF + durasi
   │                         │
```

---

## 🔧 Implementasi Backend

### ✅ Yang Sudah Ditambahkan:

#### 1. **MQTT Subscription ke Zone Status**

File: `src/infrastructure/mqtt/MqttService.ts`

```typescript
// Subscribe ke topic zone status (feedback dari ESP32)
await this.mqttClient.subscribe('smartfarm/zone/+/status', (message) => {
  console.log('📡 Zone status message received');
  void this.handleZoneStatus(message);
});
```

#### 2. **Handler untuk 3 Tipe Callback**

**a. ACK Handler** - ESP32 sudah terima perintah
```typescript
private async handleZoneAcknowledgment(data: ZoneStatusPayload): Promise<void> {
  console.log(`✅ ACK received for ${data.command} on zone ${data.zoneId}`);
  // Update command log: ACK received
}
```

**b. STATUS Handler** - Pompa benar-benar ON/OFF
```typescript
private async handleZoneStatusUpdate(data: ZoneStatusPayload): Promise<void> {
  if (data.status === 'WATERING_STARTED') {
    // Pompa benar-benar sudah ON
    // Update database, emit WebSocket, dll
  } else if (data.status === 'WATERING_STOPPED') {
    // Pompa benar-benar sudah OFF
    // Catat actual duration dari ESP32
  }
}
```

**c. ERROR Handler** - ESP32 gagal eksekusi
```typescript
private async handleZoneError(data: ZoneStatusPayload): Promise<void> {
  console.error(`❌ Error: ${data.error}`);
  // Log error, kirim notifikasi, dll
}
```

#### 3. **Database Tracking**

Migration: `migrations/010_create_watering_command_logs.sql`

Tabel `watering_command_logs` untuk tracking:
- ✅ Kapan perintah dikirim (`sent_at`)
- ✅ Kapan ACK diterima (`ack_received_at`)
- ✅ Kapan status dikonfirmasi (`status_confirmed_at`)
- ✅ Durasi sebenarnya dari ESP32 (`actual_duration_seconds`)
- ✅ Error message jika gagal
- ✅ Timeout detection

**View untuk monitoring:**
```sql
-- Lihat command yang bermasalah
SELECT * FROM v_problematic_commands;
```

---

## 📊 Format Payload MQTT

### Topic: `smartfarm/zone/{zoneId}/status`

### 1. ACK Payload
```json
{
  "zoneId": "uuid-zone-1",
  "type": "ACK",
  "command": "START_MANUAL",
  "received": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. STATUS Payload - Started
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

### 3. STATUS Payload - Stopped
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

### 4. ERROR Payload
```json
{
  "zoneId": "uuid-zone-1",
  "type": "ERROR",
  "command": "START_MANUAL",
  "error": "Pump malfunction - no current detected",
  "timestamp": "2024-01-15T10:30:01Z"
}
```

---

## 🚀 Langkah Implementasi Selanjutnya

### ❌ Yang BELUM Diimplementasi (TODO):

1. **Timeout Handling**
   ```typescript
   // Jika ESP32 tidak kirim ACK dalam 10 detik
   async controlWatering(zoneId: string, command: string) {
     this.mqttService.publish(`smartfarm/zone/${zoneId}/control`, {...});
     
     const ackPromise = this.waitForAck(zoneId, command);
     const timeout = new Promise((_, reject) => 
       setTimeout(() => reject('Timeout'), 10000)
     );
     
     await Promise.race([ackPromise, timeout]);
   }
   ```

2. **WebSocket Integration**
   ```typescript
   // Emit event ke frontend untuk real-time update
   this.websocketGateway.emit('zone:started', {
     zoneId,
     status: 'WATERING_STARTED'
   });
   ```

3. **Watering History Recording**
   ```typescript
   // Catat actual start/stop time dari ESP32
   await this.wateringHistoryRepository.recordStart(zoneId);
   await this.wateringHistoryRepository.recordStop(zoneId, actualDuration);
   ```

4. **Error Notification**
   ```typescript
   // Kirim notifikasi ke admin jika ESP32 error
   await this.notificationService.sendAlert({
     type: 'ZONE_ERROR',
     message: `ESP32 failed: ${errorMessage}`
   });
   ```

5. **Auto Retry Mechanism**
   ```typescript
   // Retry jika command timeout
   if (timeout && retryCount < 3) {
     await this.retryCommand(zoneId, command);
   }
   ```

---

## 🧪 Testing

### 1. Test Manual dari MQTT Client

**Simulasi ACK:**
```bash
mosquitto_pub -h localhost -t "smartfarm/zone/zone-123/status" -m '{
  "zoneId": "zone-123",
  "type": "ACK",
  "command": "START_MANUAL",
  "received": true,
  "timestamp": "2024-01-15T10:30:00Z"
}'
```

**Simulasi STATUS:**
```bash
mosquitto_pub -h localhost -t "smartfarm/zone/zone-123/status" -m '{
  "zoneId": "zone-123",
  "type": "STATUS",
  "status": "WATERING_STARTED",
  "pumpStatus": "ON",
  "solenoidStatus": "OPEN",
  "timestamp": "2024-01-15T10:30:01Z"
}'
```

**Simulasi ERROR:**
```bash
mosquitto_pub -h localhost -t "smartfarm/zone/zone-123/status" -m '{
  "zoneId": "zone-123",
  "type": "ERROR",
  "command": "START_MANUAL",
  "error": "Pump not responding",
  "timestamp": "2024-01-15T10:30:01Z"
}'
```

### 2. Check Logs

```bash
# Monitor backend logs
docker logs -f backend-smart-farming

# Cari log zona status
docker logs backend-smart-farming | grep "Zone status"
```

### 3. Check Database

```sql
-- Lihat command log terbaru
SELECT * FROM watering_command_logs 
ORDER BY sent_at DESC 
LIMIT 10;

-- Lihat command yang timeout
SELECT * FROM v_problematic_commands;

-- Lihat durasi rata-rata ACK response
SELECT 
  AVG(EXTRACT(EPOCH FROM (ack_received_at - sent_at))) as avg_ack_seconds
FROM watering_command_logs
WHERE ack_received = TRUE;
```

---

## 📈 Monitoring & Analytics

### Query untuk Reliability Metrics:

```sql
-- Success rate perintah
SELECT 
  command,
  COUNT(*) as total,
  SUM(CASE WHEN ack_received THEN 1 ELSE 0 END) as ack_count,
  SUM(CASE WHEN status IS NOT NULL THEN 1 ELSE 0 END) as status_count,
  SUM(CASE WHEN timeout THEN 1 ELSE 0 END) as timeout_count,
  ROUND(100.0 * SUM(CASE WHEN ack_received THEN 1 ELSE 0 END) / COUNT(*), 2) as ack_rate
FROM watering_command_logs
GROUP BY command;
```

```sql
-- Average response time
SELECT 
  zone_id,
  AVG(EXTRACT(EPOCH FROM (ack_received_at - sent_at))) as avg_ack_time,
  AVG(EXTRACT(EPOCH FROM (status_confirmed_at - sent_at))) as avg_total_time
FROM watering_command_logs
WHERE ack_received = TRUE AND status IS NOT NULL
GROUP BY zone_id;
```

---

## 🎯 Keuntungan Sistem Ini

| Fitur | Benefit |
|-------|---------|
| **ACK Confirmation** | Tahu ESP32 benar terima perintah |
| **Status Confirmation** | Tahu pompa benar-benar ON/OFF |
| **Actual Duration** | Durasi sebenarnya dari hardware, bukan asumsi |
| **Error Detection** | ESP32 bisa report masalah hardware |
| **Timeout Detection** | Tahu jika ESP32 offline/bermasalah |
| **Command Tracking** | Audit trail lengkap semua perintah |
| **Real-time Sync** | Frontend selalu sync dengan hardware |
| **Debugging** | Mudah trace masalah dengan logs |

---

## 🔍 Troubleshooting

### Problem: Backend tidak terima callback

**Check:**
1. ESP32 connect ke MQTT broker? 
   ```bash
   mosquitto_sub -h localhost -t "smartfarm/zone/+/status" -v
   ```

2. Topic benar?
   - Harus: `smartfarm/zone/{zoneId}/status`
   - Bukan: `Smartfarming/zone/status`

3. Backend subscribe ke topic?
   ```bash
   # Cek log backend saat startup
   docker logs backend-smart-farming | grep "Subscribed to"
   # Harus ada: ✅ Subscribed to: smartfarm/zone/+/status
   ```

### Problem: ACK diterima tapi status tidak

**Check:**
1. ESP32 benar-benar jalankan perintah?
2. ESP32 kirim 2 message terpisah (ACK + STATUS)?
3. Check di database:
   ```sql
   SELECT * FROM watering_command_logs 
   WHERE ack_received = TRUE AND status IS NULL;
   ```

### Problem: Timeout terus

**Possible causes:**
- ESP32 offline
- MQTT broker down
- Network issue
- Topic salah
- ESP32 code belum implement callback

---

## 📚 References

- ESP32 Implementation: `ESP32_COMPLETE_FLOW.md`
- Migration File: `migrations/010_create_watering_command_logs.sql`
- MQTT Service: `src/infrastructure/mqtt/MqttService.ts`
- Zone Control: `src/domain/use-cases/ZoneControlUseCase.ts`
