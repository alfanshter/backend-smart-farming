// ===================================================================
// GARDEN WATERING REPOSITORY INTERFACE
// ===================================================================
// Purpose: Interface for garden watering data access
// Author: Smart Farming Team
// Date: February 11, 2026

import {
  GardenWateringSession,
  GardenWateringLog,
  GardenWateringStatistics,
} from '../entities/GardenWateringSession';

export interface IGardenWateringRepository {
  /**
   * Create a new garden watering session
   */
  create(
    userId: string,
    durationMinutes: number,
    notes?: string,
  ): Promise<GardenWateringSession>;

  /**
   * Find session by ID
   */
  findById(sessionId: string): Promise<GardenWateringSession | null>;

  /**
   * Find currently running session for a user
   */
  findRunningSession(userId: string): Promise<GardenWateringSession | null>;

  /**
   * Get sessions by user ID
   */
  findByUserId(
    userId: string,
    limit?: number,
  ): Promise<GardenWateringSession[]>;

  /**
   * Update session
   */
  update(
    sessionId: string,
    updates: Partial<GardenWateringSession>,
  ): Promise<GardenWateringSession>;

  /**
   * Create a log entry
   */
  createLog(
    sessionId: string,
    eventType: string,
    message?: string,
  ): Promise<GardenWateringLog>;

  /**
   * Get statistics for a user
   */
  getStatistics(userId: string): Promise<GardenWateringStatistics>;
}
