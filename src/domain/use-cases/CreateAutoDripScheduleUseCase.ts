/**
 * USE CASE - CreateAutoDripScheduleUseCase
 *
 * Penjelasan:
 * Business logic untuk membuat jadwal auto drip baru.
 * Validasi:
 * - Zone harus exist
 * - Zone tidak boleh sudah punya jadwal auto drip
 */

import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { AutoDripSchedule, DayOfWeek } from '../entities/AutoDripSchedule';
import type { IAutoDripScheduleRepository } from '../interfaces/IAutoDripScheduleRepository';
import type { IZoneRepository } from '../interfaces/IZoneRepository';

export interface CreateAutoDripScheduleInput {
  zoneId: string;
  isActive: boolean;
  timeSlots: Array<{
    startTime: string;
    durationMinutes: number;
    durationSeconds: number;
  }>;
  activeDays: DayOfWeek[];
  userId: string;
}

@Injectable()
export class CreateAutoDripScheduleUseCase {
  constructor(
    @Inject('IAutoDripScheduleRepository')
    private readonly autoDripScheduleRepository: IAutoDripScheduleRepository,
    @Inject('IZoneRepository')
    private readonly zoneRepository: IZoneRepository,
  ) {}

  async execute(input: CreateAutoDripScheduleInput): Promise<AutoDripSchedule> {
    // 1. Validasi: Zone harus exist
    const zone = await this.zoneRepository.findById(input.zoneId);
    if (!zone) {
      throw new NotFoundException(`Zone with ID ${input.zoneId} not found`);
    }

    // 2. Validasi: Zone tidak boleh sudah punya jadwal auto drip
    const existingSchedule = await this.autoDripScheduleRepository.findByZoneId(input.zoneId);
    if (existingSchedule) {
      throw new ConflictException(`Zone ${input.zoneId} already has an auto drip schedule. Please update or delete the existing one.`);
    }

    // 3. Create new schedule
    const schedule = new AutoDripSchedule(
      '', // ID akan di-generate oleh database
      input.zoneId,
      input.isActive,
      input.timeSlots,
      input.activeDays,
      input.userId,
      new Date(),
      new Date(),
    );

    return await this.autoDripScheduleRepository.create(schedule);
  }
}
