/**
 * INFRASTRUCTURE - InMemoryWateringScheduleRepository
 */

import { Injectable } from '@nestjs/common';
import { IWateringScheduleRepository } from '../../domain/interfaces/IWateringScheduleRepository';
import { WateringSchedule } from '../../domain/entities/WateringSchedule';

@Injectable()
export class InMemoryWateringScheduleRepository implements IWateringScheduleRepository {
  private schedules: Map<string, WateringSchedule> = new Map();

  async create(schedule: WateringSchedule): Promise<WateringSchedule> {
    this.schedules.set(schedule.id, schedule);
    return schedule;
  }

  async findById(id: string): Promise<WateringSchedule | null> {
    return this.schedules.get(id) || null;
  }

  async findAll(): Promise<WateringSchedule[]> {
    return Array.from(this.schedules.values());
  }

  async findByDeviceId(deviceId: string): Promise<WateringSchedule[]> {
    return Array.from(this.schedules.values()).filter(
      (s) => s.deviceId === deviceId,
    );
  }

  async findActiveSchedules(): Promise<WateringSchedule[]> {
    return Array.from(this.schedules.values()).filter((s) => s.isActive);
  }

  async update(
    id: string,
    updates: Partial<WateringSchedule>,
  ): Promise<WateringSchedule | null> {
    const schedule = this.schedules.get(id);
    if (!schedule) return null;

    const updated = Object.assign(schedule, updates);
    this.schedules.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.schedules.delete(id);
  }
}
