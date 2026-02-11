/**
 * DOMAIN INTERFACE - IAutoDripScheduleRepository
 *
 * Penjelasan:
 * Interface repository untuk Auto Drip Schedule.
 * Mendefinisikan kontrak CRUD operations.
 */

import { AutoDripSchedule } from '../entities/AutoDripSchedule';

export interface IAutoDripScheduleRepository {
  /**
   * Create new auto drip schedule
   */
  create(schedule: AutoDripSchedule): Promise<AutoDripSchedule>;

  /**
   * Find all schedules (with optional filter by userId or zoneId)
   */
  findAll(userId?: string, zoneId?: string): Promise<AutoDripSchedule[]>;

  /**
   * Find schedule by ID
   */
  findById(id: string): Promise<AutoDripSchedule | null>;

  /**
   * Find schedule by zone ID
   */
  findByZoneId(zoneId: string): Promise<AutoDripSchedule | null>;

  /**
   * Find all active schedules
   */
  findAllActive(): Promise<AutoDripSchedule[]>;

  /**
   * Update existing schedule
   */
  update(id: string, schedule: Partial<AutoDripSchedule>): Promise<AutoDripSchedule | null>;

  /**
   * Delete schedule by ID
   */
  delete(id: string): Promise<boolean>;

  /**
   * Toggle schedule active status
   */
  toggleActive(id: string): Promise<AutoDripSchedule | null>;
}
