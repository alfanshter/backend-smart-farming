/**
 * USE CASE - ControlWateringUseCase
 *
 * Penjelasan:
 * Use Case adalah "apa yang bisa dilakukan sistem".
 * Use case ini mengontrol penyiraman (nyalakan/matikan pompa).
 *
 * Flow:
 * 1. Terima command (deviceId, action: ON/OFF, duration)
 * 2. Validasi device ada dan online
 * 3. Kirim command ke device via MQTT
 * 4. Return hasil
 */

import { Injectable } from '@nestjs/common';
import { DeviceStatus } from '../entities/Device';
import { TimescaleDeviceRepository } from '../../infrastructure/repositories/TimescaleDeviceRepository';
import { MqttClient } from '../../infrastructure/mqtt/MqttClient';

export interface ControlWateringCommand {
  deviceId: string;
  action: 'ON' | 'OFF';
  duration?: number;
}

@Injectable()
export class ControlWateringUseCase {
  constructor(
    private readonly deviceRepository: TimescaleDeviceRepository,
    private readonly mqttClient: MqttClient,
  ) {}

  async execute(
    command: ControlWateringCommand,
  ): Promise<{ success: boolean; message: string }> {
    // 1. Cari device
    const device = await this.deviceRepository.findById(command.deviceId);

    if (!device) {
      return {
        success: false,
        message: 'Device tidak ditemukan',
      };
    }

    // 2. Validasi device online
    if (device.status !== DeviceStatus.ONLINE) {
      return {
        success: false,
        message: `Device dalam status ${device.status}, tidak bisa dikontrol`,
      };
    }

    // 3. Buat payload MQTT
    const payload = {
      action: command.action,
      duration: command.duration || 0,
      timestamp: new Date().toISOString(),
    };

    // 4. Kirim command via MQTT
    try {
      await this.mqttClient.publish(device.mqttTopic, JSON.stringify(payload));

      return {
        success: true,
        message: `Berhasil ${command.action === 'ON' ? 'menyalakan' : 'mematikan'} ${device.name}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Gagal mengirim command: ${errorMessage}`,
      };
    }
  }
}
