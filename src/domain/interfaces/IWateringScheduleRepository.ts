/**
 * DOMAIN INTERFACE - IWateringScheduleRepository
 *
 * Penjelasan:
 * Repository untuk jadwal penyiraman.
 */

import { WateringSchedule } from '../entities/WateringSchedule';

export interface IWateringScheduleRepository {
  create(schedule: WateringSchedule): Promise<WateringSchedule>;
  findById(id: string): Promise<WateringSchedule | null>;
  findAll(): Promise<WateringSchedule[]>;
  findByDeviceId(deviceId: string): Promise<WateringSchedule[]>;
  findActiveSchedules(): Promise<WateringSchedule[]>;
  update(
    id: string,
    schedule: Partial<WateringSchedule>,
  ): Promise<WateringSchedule | null>;
  delete(id: string): Promise<boolean>;
}
