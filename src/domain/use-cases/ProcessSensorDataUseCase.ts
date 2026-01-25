/**
 * USE CASE - ProcessSensorDataUseCase
 *
 * Penjelasan:
 * Use case ini memproses data sensor yang masuk dari MQTT.
 * Akan menyimpan data sensor dan mengecek apakah perlu penyiraman otomatis.
 *
 * Flow:
 * 1. Terima data sensor dari MQTT
 * 2. Simpan ke database
 * 3. Cek jadwal sensor-based yang aktif
 * 4. Jika kelembaban rendah, trigger penyiraman otomatis
 */

import { Injectable } from '@nestjs/common';
import { Sensor } from '../entities/Sensor';
import { ScheduleType } from '../entities/WateringSchedule';
import { ControlWateringUseCase } from './ControlWateringUseCase';
import { InMemorySensorRepository } from '../../infrastructure/repositories/InMemorySensorRepository';
import { InMemoryWateringScheduleRepository } from '../../infrastructure/repositories/InMemoryWateringScheduleRepository';

@Injectable()
export class ProcessSensorDataUseCase {
  constructor(
    private readonly sensorRepository: InMemorySensorRepository,
    private readonly scheduleRepository: InMemoryWateringScheduleRepository,
    private readonly controlWateringUseCase: ControlWateringUseCase,
  ) {}

  async execute(sensorData: Sensor): Promise<void> {
    // 1. Simpan data sensor
    await this.sensorRepository.create(sensorData);

    // 2. Ambil jadwal sensor-based yang aktif untuk device ini
    const schedules = await this.scheduleRepository.findByDeviceId(
      sensorData.deviceId,
    );
    const sensorBasedSchedules = schedules.filter(
      (s) => s.isActive && s.type === ScheduleType.SENSOR_BASED,
    );

    // 3. Cek setiap jadwal
    for (const schedule of sensorBasedSchedules) {
      if (schedule.shouldRunBySensor(sensorData.value)) {
        // 4. Trigger penyiraman otomatis
        await this.controlWateringUseCase.execute({
          deviceId: schedule.deviceId,
          action: 'ON',
          duration: schedule.duration || 300,
        });

        console.log(
          `Auto-watering triggered for device ${schedule.deviceId} (moisture: ${sensorData.value}%)`,
        );
      }
    }
  }
}
