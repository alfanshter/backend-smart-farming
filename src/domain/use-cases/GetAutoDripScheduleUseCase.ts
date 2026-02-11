/**
 * USE CASE - GetAutoDripScheduleUseCase
 *
 * Penjelasan:
 * Business logic untuk mendapatkan jadwal auto drip.
 * Mendukung get by ID, get all, get by zone ID.
 */

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { AutoDripSchedule } from '../entities/AutoDripSchedule';
import type { IAutoDripScheduleRepository } from '../interfaces/IAutoDripScheduleRepository';

@Injectable()
export class GetAutoDripScheduleUseCase {
  constructor(
    @Inject('IAutoDripScheduleRepository')
    private readonly repository: IAutoDripScheduleRepository,
  ) {}

  async getById(id: string): Promise<AutoDripSchedule> {
    const schedule = await this.repository.findById(id);
    if (!schedule) {
      throw new NotFoundException(`Auto drip schedule with ID ${id} not found`);
    }
    return schedule;
  }

  async getAll(userId?: string, zoneId?: string): Promise<AutoDripSchedule[]> {
    return await this.repository.findAll(userId, zoneId);
  }

  async getByZoneId(zoneId: string): Promise<AutoDripSchedule | null> {
    return await this.repository.findByZoneId(zoneId);
  }

  async getAllActive(): Promise<AutoDripSchedule[]> {
    return await this.repository.findAllActive();
  }
}
