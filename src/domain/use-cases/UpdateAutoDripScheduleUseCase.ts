/**
 * USE CASE - UpdateAutoDripScheduleUseCase
 *
 * Penjelasan:
 * Business logic untuk update jadwal auto drip.
 */

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { AutoDripSchedule, DayOfWeek, TimeSlot } from '../entities/AutoDripSchedule';
import type { IAutoDripScheduleRepository } from '../interfaces/IAutoDripScheduleRepository';

export interface UpdateAutoDripScheduleInput {
  id: string;
  zoneId?: string;
  isActive?: boolean;
  timeSlots?: TimeSlot[];
  activeDays?: DayOfWeek[];
}

@Injectable()
export class UpdateAutoDripScheduleUseCase {
  constructor(
    @Inject('IAutoDripScheduleRepository')
    private readonly repository: IAutoDripScheduleRepository,
  ) {}

  async execute(input: UpdateAutoDripScheduleInput): Promise<AutoDripSchedule> {
    // 1. Validasi: Schedule harus exist
    const existing = await this.repository.findById(input.id);
    if (!existing) {
      throw new NotFoundException(`Auto drip schedule with ID ${input.id} not found`);
    }

    // 2. Update schedule
    const updateData: Partial<AutoDripSchedule> = {};
    if (input.zoneId !== undefined) updateData.zoneId = input.zoneId;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.timeSlots !== undefined) updateData.timeSlots = input.timeSlots;
    if (input.activeDays !== undefined) updateData.activeDays = input.activeDays;

    const updated = await this.repository.update(input.id, updateData);
    if (!updated) {
      throw new NotFoundException(`Failed to update schedule with ID ${input.id}`);
    }

    return updated;
  }

  async toggleActive(id: string): Promise<AutoDripSchedule> {
    const toggled = await this.repository.toggleActive(id);
    if (!toggled) {
      throw new NotFoundException(`Auto drip schedule with ID ${id} not found`);
    }
    return toggled;
  }
}
