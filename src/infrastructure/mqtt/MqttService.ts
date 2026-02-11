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
            console.log(`📊 Tank ${data.tankId} level updated to ${data.level}%`);
          }
          break;

        default:
          console.warn(`⚠️  Unknown tank event: ${data.event}`);
      }
    } catch (error) {
      console.error('❌ Error processing tank event:', error);
    }
  }
}
