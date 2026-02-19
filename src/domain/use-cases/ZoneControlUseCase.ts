/**
 * DOMAIN - Zone Control Use Case
 *
 * Penjelasan:
 * Business logic untuk kontrol manual zona penyiraman dengan countdown timer
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import type { IZoneRepository } from '../interfaces/IZoneRepository';
import type { IDeviceRepository } from '../interfaces/IDeviceRepository';
import type { IMqttClient } from '../interfaces/IMqttClient';
import { ZoneStatus } from '../entities/Zone';

@Injectable()
export class ZoneControlUseCase {
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private zoneStatuses: Map<string, ZoneStatus> = new Map();

  constructor(
    @Inject('IZoneRepository')
    private readonly zoneRepository: IZoneRepository,
    @Inject('IDeviceRepository')
    private readonly deviceRepository: IDeviceRepository,
    @Inject('IMqttClient')
    private readonly mqttClient: IMqttClient,
  ) {}

  /**
   * Aktivasi atau deaktivasi zona penyiraman
   */
  async controlZone(
    zoneId: string,
    isActive: boolean,
    userId: string,
    durationMinutes?: number,
    durationSeconds?: number,
  ): Promise<ZoneStatus> {
    const zone = await this.zoneRepository.findById(zoneId);
    if (!zone) {
      throw new NotFoundException(`Zone with ID ${zoneId} not found`);
    }

    // Check device_id exists
    if (!zone.deviceId) {
      throw new BadRequestException(
        `Zone "${zone.name}" does not have a device assigned`,
      );
    }

    // Check if device exists and is active
    const device = await this.deviceRepository.findById(zone.deviceId);
    if (!device) {
      throw new NotFoundException(`Device ${zone.deviceId} not found`);
    }

    if (!device.isActive) {
      throw new BadRequestException(
        `Device ${device.name} is not active. Please activate device first.`,
      );
    }

    if (isActive) {
      // Aktivasi zona
      return await this.activateZone(
        zone.id,
        durationMinutes ?? zone.durationMinutes,
        durationSeconds ?? zone.durationSeconds,
        'MANUAL',
      );
    } else {
      // Deaktivasi zona
      return await this.deactivateZone(zone.id);
    }
  }

  /**
   * Aktivasi zona dengan countdown timer
   * @param source - Optional source identifier ('MANUAL' or 'AUTO_DRIP')
   */
  async activateZone(
    zoneId: string,
    durationMinutes: number,
    durationSeconds: number,
    _source: string = 'MANUAL',
  ): Promise<ZoneStatus> {
    const zone = await this.zoneRepository.findById(zoneId);
    if (!zone) {
      throw new NotFoundException(`Zone ${zoneId} not found`);
    }

    // Jika zona sudah aktif, hentikan timer lama dulu
    if (this.activeTimers.has(zoneId)) {
      const timer = this.activeTimers.get(zoneId);
      if (timer) clearTimeout(timer);
      this.activeTimers.delete(zoneId);
    }

    const totalSeconds = durationMinutes * 60 + durationSeconds;
    if (totalSeconds === 0) {
      throw new BadRequestException('Duration must be greater than 0');
    }

    const startedAt = new Date();
    const estimatedEndTime = new Date(
      startedAt.getTime() + totalSeconds * 1000,
    );

    // Update zone status
    await this.zoneRepository.update(zoneId, {
      isActive: true,
      durationMinutes,
      durationSeconds,
      startedAt,
      remainingSeconds: totalSeconds,
      updatedAt: new Date(),
    });

    // Send MQTT command to start watering (device already checked above)
    if (zone.deviceId) {
      const device = await this.deviceRepository.findById(zone.deviceId);
      if (device?.mqttTopic) {
        // Topic format: Smartfarming/device1/command
        await this.mqttClient.publish(
          device.mqttTopic,
          JSON.stringify({
            command: 'START_WATERING',
            zoneId: zone.id,
            zoneName: zone.name,
            duration: totalSeconds,
            timestamp: new Date().toISOString(),
          }),
        );
      }
    }

    // Create zone status
    const status: ZoneStatus = {
      zoneId: zone.id,
      name: zone.name,
      isActive: true,
      totalDurationSeconds: totalSeconds,
      remainingSeconds: totalSeconds,
      elapsedSeconds: 0,
      startedAt,
      estimatedEndTime,
    };

    this.zoneStatuses.set(zoneId, status);

    // Set timer untuk auto-deactivate
    const timer = setTimeout(() => {
      this.autoDeactivateZone(zoneId).catch((err) => {
        console.error(
          `[ZoneControl] Auto-deactivate error for zone ${zoneId}:`,
          err,
        );
      });
    }, totalSeconds * 1000);

    this.activeTimers.set(zoneId, timer);

    console.log(
      `[ZoneControl] Zone ${zone.name} activated for ${durationMinutes}m ${durationSeconds}s`,
    );

    return status;
  }

  /**
   * Deaktivasi zona (manual stop)
   */
  private async deactivateZone(zoneId: string): Promise<ZoneStatus> {
    const zone = await this.zoneRepository.findById(zoneId);
    if (!zone) {
      throw new NotFoundException(`Zone ${zoneId} not found`);
    }

    // Clear timer jika ada
    if (this.activeTimers.has(zoneId)) {
      const timer = this.activeTimers.get(zoneId);
      if (timer) clearTimeout(timer);
      this.activeTimers.delete(zoneId);
    }

    // Update zone status
    await this.zoneRepository.update(zoneId, {
      isActive: false,
      remainingSeconds: 0,
      updatedAt: new Date(),
    });

    // Send MQTT command to stop watering
    if (zone.deviceId) {
      const device = await this.deviceRepository.findById(zone.deviceId);
      if (device?.mqttTopic) {
        // Topic format: Smartfarming/device1/command
        await this.mqttClient.publish(
          device.mqttTopic,
          JSON.stringify({
            command: 'STOP_WATERING',
            zoneId: zone.id,
            zoneName: zone.name,
            timestamp: new Date().toISOString(),
          }),
        );
      }
    }

    const status: ZoneStatus = {
      zoneId: zone.id,
      name: zone.name,
      isActive: false,
      totalDurationSeconds: 0,
      remainingSeconds: 0,
      elapsedSeconds: 0,
    };

    this.zoneStatuses.delete(zoneId);

    console.log(`[ZoneControl] Zone ${zone.name} deactivated manually`);

    return status;
  }

  /**
   * Auto-deactivate saat timer habis
   */
  private async autoDeactivateZone(zoneId: string): Promise<void> {
    const zone = await this.zoneRepository.findById(zoneId);
    if (!zone) return;

    await this.zoneRepository.update(zoneId, {
      isActive: false,
      remainingSeconds: 0,
      updatedAt: new Date(),
    });

    // Send MQTT command to stop watering
    if (zone.deviceId) {
      const device = await this.deviceRepository.findById(zone.deviceId);
      if (device?.mqttTopic) {
        // Topic format: Smartfarming/device1/command
        await this.mqttClient.publish(
          device.mqttTopic,
          JSON.stringify({
            command: 'STOP_WATERING',
            zoneId: zone.id,
            zoneName: zone.name,
            reason: 'Timer completed',
            timestamp: new Date().toISOString(),
          }),
        );
      }
    }

    this.activeTimers.delete(zoneId);
    this.zoneStatuses.delete(zoneId);

    console.log(
      `[ZoneControl] Zone ${zone.name} auto-deactivated (timer completed)`,
    );
  }

  /**
   * Get status zona (untuk countdown di frontend)
   */
  async getZoneStatus(zoneId: string): Promise<ZoneStatus> {
    const zone = await this.zoneRepository.findById(zoneId);
    if (!zone) {
      throw new NotFoundException(`Zone ${zoneId} not found`);
    }

    if (!zone.isActive || !zone.startedAt) {
      return {
        zoneId: zone.id,
        name: zone.name,
        isActive: false,
        totalDurationSeconds: 0,
        remainingSeconds: 0,
        elapsedSeconds: 0,
      };
    }

    const totalSeconds = zone.durationMinutes * 60 + zone.durationSeconds;
    const elapsedMs = Date.now() - zone.startedAt.getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    const estimatedEndTime = new Date(
      zone.startedAt.getTime() + totalSeconds * 1000,
    );

    return {
      zoneId: zone.id,
      name: zone.name,
      isActive: zone.isActive,
      totalDurationSeconds: totalSeconds,
      remainingSeconds,
      elapsedSeconds,
      startedAt: zone.startedAt,
      estimatedEndTime,
    };
  }

  /**
   * Get semua zona aktif
   */
  async getActiveZones(): Promise<ZoneStatus[]> {
    const activeZones = await this.zoneRepository.findActiveZones();
    const statuses: ZoneStatus[] = [];

    for (const zone of activeZones) {
      const status = await this.getZoneStatus(zone.id);
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Emergency stop - hentikan semua zona
   */
  async emergencyStopAll(): Promise<{ stopped: number; zones: string[] }> {
    const activeZones = await this.zoneRepository.findActiveZones();
    const stoppedZones: string[] = [];

    for (const zone of activeZones) {
      await this.deactivateZone(zone.id);
      stoppedZones.push(zone.name);
    }

    return {
      stopped: stoppedZones.length,
      zones: stoppedZones,
    };
  }
}
