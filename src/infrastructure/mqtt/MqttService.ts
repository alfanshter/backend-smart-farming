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
import { DeviceStatus } from '../../domain/entities/Device';
import { MqttClient } from './MqttClient';
import { InMemoryDeviceRepository } from '../repositories/InMemoryDeviceRepository';

@Injectable()
export class MqttService implements OnModuleInit {
  constructor(
    private readonly mqttClient: MqttClient,
    private readonly processSensorDataUseCase: ProcessSensorDataUseCase,
    private readonly deviceRepository: InMemoryDeviceRepository,
  ) {}

  async onModuleInit() {
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

    // Subscribe ke topic sensor data
    await this.mqttClient.subscribe('smartfarm/+/sensor', async (message) => {
      await this.handleSensorMessage(message);
    });

    // Subscribe ke topic device status
    await this.mqttClient.subscribe('smartfarm/+/status', async (message) => {
      await this.handleDeviceStatus(message);
    });

    console.log('🎧 MQTT Service listening for messages...');
  }

  private async handleSensorMessage(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);

      // Buat Sensor entity
      const sensor = new Sensor(
        crypto.randomUUID(),
        data.deviceId,
        data.type as SensorType,
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
      const data = JSON.parse(message);

      // Update device status
      const device = await this.deviceRepository.findById(data.deviceId);
      if (device) {
        device.updateStatus(data.status as DeviceStatus);
        await this.deviceRepository.update(data.deviceId, device);
        console.log(`📱 Device ${device.name} status: ${data.status}`);
      }
    } catch (error) {
      console.error('Error processing device status:', error);
    }
  }
}
