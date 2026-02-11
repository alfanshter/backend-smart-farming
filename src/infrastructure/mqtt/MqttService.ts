/**
 * INFRASTRUCTURE - MqttService
 *
 * Penjelasan:
 * Service ini mendengarkan pesan dari MQTT broker
 * dan memproses data sensor yang masuk.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { Sensor, SensorType } from '../../domain/entities/Sensor';
import { ProcessSensorDataUseCase } from '../../domain/use-cases/ProcessSensorDataUseCase';
import { TankControlUseCase } from '../../domain/use-cases/TankControlUseCase';
import { DeviceStatus } from '../../domain/entities/Device';
import { MqttClient } from './MqttClient';
import { TimescaleDeviceRepository } from '../repositories/TimescaleDeviceRepository';

// Interfaces untuk MQTT message payloads
interface SensorMessagePayload {
  deviceId: string;
  type: SensorType;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

interface DeviceStatusPayload {
  deviceId: string;
  status: DeviceStatus;
}

interface TankEventPayload {
  deviceId: string;
  tankId: string;
  event: 'MANUAL_FILL_COMPLETED' | 'AUTO_FILL_COMPLETED' | 'LEVEL_UPDATE';
  level?: number; // Current level percentage (0-100)
  duration?: number; // Duration in minutes
}

interface ZoneStatusPayload {
  zoneId: string;
  type: 'ACK' | 'STATUS' | 'ERROR';
  command?: string; // START_MANUAL, STOP_MANUAL
  received?: boolean;
  status?: 'WATERING_STARTED' | 'WATERING_STOPPED';
  pumpStatus?: 'ON' | 'OFF';
  solenoidStatus?: 'OPEN' | 'CLOSED';
  totalDuration?: number;
  error?: string;
  timestamp: string;
}

@Injectable()
export class MqttService implements OnModuleInit {
  constructor(
    private readonly mqttClient: MqttClient,
    private readonly processSensorDataUseCase: ProcessSensorDataUseCase,
    private readonly deviceRepository: TimescaleDeviceRepository,
    private readonly tankControlUseCase: TankControlUseCase,
  ) {}

  async onModuleInit() {
    // Tunggu sebentar untuk MQTT client connect dulu
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Cek apakah MQTT client tersedia
    if (!this.mqttClient.isConnected()) {
      console.warn(
        '⚠️  MQTT Service: Broker tidak tersedia, skipping subscription',
      );
      console.log(
        '💡 REST API tetap berfungsi normal. Install MQTT broker untuk IoT features.',
      );
      return;
    }

    try {
      // Subscribe ke topic sensor data
      await this.mqttClient.subscribe('Smartfarming/+/sensor', (message) => {
        console.log('📊 Sensor message received');
        void this.handleSensorMessage(message);
      });
      console.log('✅ Subscribed to: Smartfarming/+/sensor');

      // Subscribe ke topic device status
      await this.mqttClient.subscribe('Smartfarming/+/status', (message) => {
        console.log('📡 Device status message received');
        void this.handleDeviceStatus(message);
      });
      console.log('✅ Subscribed to: Smartfarming/+/status');

      // Subscribe ke topic tank events (feedback dari ESP32)
      await this.mqttClient.subscribe('smartfarm/tank/+/event', (message) => {
        console.log('🚰 Tank event message received');
        void this.handleTankEvent(message);
      });
      console.log('✅ Subscribed to: smartfarm/tank/+/event');

      // Subscribe ke topic zone status (feedback dari ESP32)
      await this.mqttClient.subscribe('smartfarm/zone/+/status', (message) => {
        console.log('📡 Zone status message received');
        void this.handleZoneStatus(message);
      });
      console.log('✅ Subscribed to: smartfarm/zone/+/status');

      console.log('🎧 MQTT Service listening for messages...');
    } catch (error) {
      console.error('❌ Failed to subscribe to MQTT topics:', error);
    }
  }

  private async handleSensorMessage(message: string): Promise<void> {
    try {
      const data = JSON.parse(message) as SensorMessagePayload;

      // Buat Sensor entity
      const sensor = new Sensor(
        crypto.randomUUID(),
        data.deviceId,
        data.type,
        data.value,
        data.unit,
        new Date(),
        data.metadata,
      );

      // Validasi data
      if (!sensor.isValidValue()) {
        console.warn('Invalid sensor value received:', data);
        return;
      }

      // Proses sensor data (simpan & cek auto-watering)
      await this.processSensorDataUseCase.execute(sensor);

      console.log(
        `📊 Sensor data processed: ${sensor.type} = ${sensor.value}${sensor.unit}`,
      );
    } catch (error) {
      console.error('Error processing sensor message:', error);
    }
  }

  private async handleDeviceStatus(message: string): Promise<void> {
    try {
      console.log('🔍 Processing device status message:', message);

      const data = JSON.parse(message) as DeviceStatusPayload;

      // Validasi payload
      if (!data.deviceId || !data.status) {
        console.error('❌ Invalid status payload:', data);
        return;
      }

      // Update device status
      const device = await this.deviceRepository.findById(data.deviceId);

      if (!device) {
        console.error(`❌ Device not found with ID: ${data.deviceId}`);
        return;
      }

      // Update status dan lastSeen
      device.updateStatus(data.status);
      await this.deviceRepository.update(data.deviceId, device);

      console.log(
        `✅ Device "${device.name}" status updated to ${data.status}`,
      );
      console.log(`   Last seen: ${device.lastSeen?.toISOString()}`);
    } catch (error) {
      console.log('❌ Error processing device status:', error);
    }
  }

  private async handleTankEvent(message: string): Promise<void> {
    try {
      console.log('🔍 Processing tank event message:', message);

      const data = JSON.parse(message) as TankEventPayload;

      // Validasi payload
      if (!data.tankId || !data.event) {
        console.error('❌ Invalid tank event payload:', data);
        return;
      }

      switch (data.event) {
        case 'MANUAL_FILL_COMPLETED':
          console.log(
            `✅ Manual fill completed for tank ${data.tankId} after ${data.duration} minutes`,
          );
          // Update level jika ESP32 kirim level terbaru
          if (data.level !== undefined) {
            await this.tankControlUseCase.updateLevel(data.tankId, data.level);
            console.log(`   Level updated to ${data.level}%`);
          }
          break;

        case 'AUTO_FILL_COMPLETED':
          console.log(`✅ Auto fill completed for tank ${data.tankId}`);
          // Update level jika ESP32 kirim level terbaru
          if (data.level !== undefined) {
            await this.tankControlUseCase.updateLevel(data.tankId, data.level);
            console.log(`   Level updated to ${data.level}%`);
          }
          break;

        case 'LEVEL_UPDATE':
          // Real-time level update dari sensor
          if (data.level !== undefined) {
            await this.tankControlUseCase.updateLevel(data.tankId, data.level);
            console.log(
              `📊 Tank ${data.tankId} level updated to ${data.level}%`,
            );
          }
          break;

        default:
          console.warn('⚠️  Unknown tank event:', data.event);
      }
    } catch (error) {
      console.error('❌ Error processing tank event:', error);
    }
  }

  /**
   * Handle zone status callback dari ESP32
   * Menerima ACK, STATUS, dan ERROR events
   */
  private handleZoneStatus(message: string): void {
    try {
      console.log('🔍 Processing zone status message:', message);

      const data = JSON.parse(message) as ZoneStatusPayload;

      // Validasi payload
      if (!data.zoneId || !data.type) {
        console.error('❌ Invalid zone status payload:', data);
        return;
      }

      switch (data.type) {
        case 'ACK':
          this.handleZoneAcknowledgment(data);
          break;

        case 'STATUS':
          this.handleZoneStatusUpdate(data);
          break;

        case 'ERROR':
          this.handleZoneError(data);
          break;

        default:
          console.warn('⚠️  Unknown zone status type:', data.type);
      }
    } catch (error) {
      console.error('❌ Error processing zone status:', error);
    }
  }

  /**
   * Handle ACK dari ESP32 - Perintah sudah diterima
   */
  private handleZoneAcknowledgment(data: ZoneStatusPayload): void {
    console.log(`✅ ACK received for ${data.command} on zone ${data.zoneId}`);
    console.log(`   Timestamp: ${data.timestamp}`);

    // TODO: Update watering_command_logs table
    // await this.updateCommandLog(data.zoneId, data.command, 'ACK_RECEIVED');

    // TODO: Emit WebSocket event ke frontend
    // this.websocketGateway.emit('zone:ack', data);
  }

  /**
   * Handle status update dari ESP32 - Pompa sudah ON/OFF
   */
  private handleZoneStatusUpdate(data: ZoneStatusPayload): void {
    console.log(`🔄 Status update: ${data.status} on zone ${data.zoneId}`);
    console.log(
      `   Pump: ${data.pumpStatus}, Solenoid: ${data.solenoidStatus}`,
    );

    if (data.status === 'WATERING_STARTED') {
      console.log(
        `✅ Zone ${data.zoneId} watering STARTED (confirmed by ESP32)`,
      );

      // TODO: Update database - pompa benar-benar sudah ON
      // await this.updateZoneRealStatus(data.zoneId, 'ACTIVE');

      // TODO: Update watering_history
      // await this.wateringHistoryRepository.recordStart(data.zoneId);

      // TODO: Emit WebSocket
      // this.websocketGateway.emit('zone:started', data);
    } else if (data.status === 'WATERING_STOPPED') {
      console.log(
        `✅ Zone ${data.zoneId} watering STOPPED (confirmed by ESP32)`,
      );
      console.log(`   Total duration: ${data.totalDuration} seconds`);

      // TODO: Update database - pompa benar-benar sudah OFF
      // await this.updateZoneRealStatus(data.zoneId, 'INACTIVE');

      // TODO: Update watering_history dengan actual duration
      // await this.wateringHistoryRepository.recordStop(
      //   data.zoneId,
      //   data.totalDuration
      // );

      // TODO: Emit WebSocket
      // this.websocketGateway.emit('zone:stopped', data);
    }

    // TODO: Update command log
    // await this.updateCommandLog(data.zoneId, null, 'STATUS_CONFIRMED');
  }

  /**
   * Handle error dari ESP32 - Gagal eksekusi perintah
   */
  private handleZoneError(data: ZoneStatusPayload): void {
    console.error(
      `❌ Error on ${data.command} for zone ${data.zoneId}: ${data.error}`,
    );

    // TODO: Log error ke database
    // await this.errorLogRepository.create({
    //   zoneId: data.zoneId,
    //   command: data.command,
    //   error: data.error,
    //   timestamp: data.timestamp
    // });

    // TODO: Kirim notifikasi ke admin
    // await this.notificationService.sendAlert({
    //   type: 'ZONE_ERROR',
    //   zoneId: data.zoneId,
    //   message: `ESP32 failed: ${data.error}`
    // });

    // TODO: Emit WebSocket error event
    // this.websocketGateway.emit('zone:error', data);

    // TODO: Update command log
    // await this.updateCommandLog(data.zoneId, data.command, 'ERROR', data.error);
  }
}
