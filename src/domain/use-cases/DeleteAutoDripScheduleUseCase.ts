/**
 * USE CASE - DeleteAutoDripScheduleUseCase
 *
 * Penjelasan:
 * Business logic untuk menghapus jadwal auto drip.
 */

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { IAutoDripScheduleRepository } from '../interfaces/IAutoDripScheduleRepository';

@Injectable()
export class DeleteAutoDripScheduleUseCase {
  constructor(
    @Inject('IAutoDripScheduleRepository')
    private readonly repository: IAutoDripScheduleRepository,
  ) {}

  async execute(id: string): Promise<void> {
    // 1. Validasi: Schedule harus exist
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Auto drip schedule with ID ${id} not found`);
    }

    // 2. Delete schedule
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Failed to delete schedule with ID ${id}`);
    }
  }
}
