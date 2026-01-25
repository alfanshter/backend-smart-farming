/**
 * INFRASTRUCTURE - InMemoryWateringScheduleRepository
 */

import { Injectable } from '@nestjs/common';
import { IWateringScheduleRepository } from '../../domain/interfaces/IWateringScheduleRepository';
import { WateringSchedule } from '../../domain/entities/WateringSchedule';

@Injectable()
export class InMemoryWateringScheduleRepository implements IWateringScheduleRepository {
  private schedules: Map<string, WateringSchedule> = new Map();

  create(schedule: WateringSchedule): Promise<WateringSchedule> {
    this.schedules.set(schedule.id, schedule);
    return Promise.resolve(schedule);
  }

  findById(id: string): Promise<WateringSchedule | null> {
    return Promise.resolve(this.schedules.get(id) || null);
  }

  findAll(): Promise<WateringSchedule[]> {
    return Promise.resolve(Array.from(this.schedules.values()));
  }

  findByDeviceId(deviceId: string): Promise<WateringSchedule[]> {
    return Promise.resolve(
      Array.from(this.schedules.values()).filter(
        (s) => s.deviceId === deviceId,
      ),
    );
  }

  findActiveSchedules(): Promise<WateringSchedule[]> {
    return Promise.resolve(
      Array.from(this.schedules.values()).filter((s) => s.isActive),
    );
  }

  update(
    id: string,
    updates: Partial<WateringSchedule>,
  ): Promise<WateringSchedule | null> {
    const schedule = this.schedules.get(id);
    if (!schedule) return Promise.resolve(null);

    const updated = Object.assign(schedule, updates);
    this.schedules.set(id, updated);
    return Promise.resolve(updated);
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(this.schedules.delete(id));
  }
}
