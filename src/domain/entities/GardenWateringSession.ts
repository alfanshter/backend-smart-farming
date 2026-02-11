// ===================================================================
// GARDEN WATERING DOMAIN ENTITIES
// ===================================================================
// Purpose: Domain entities for garden watering system
// Author: Smart Farming Team
// Date: February 11, 2026

/**
 * Garden Watering Session Status Enum
 */
export enum GardenWateringStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  STOPPED = 'stopped',
  FAILED = 'failed',
}

/**
 * Garden Watering Session Entity
 * Represents a single garden watering session
 */
export class GardenWateringSession {
  id: string;
  userId: string;
  durationMinutes: number; // 1-180 minutes
  status: GardenWateringStatus;
  startedAt: Date;
  completedAt?: Date;
  totalDurationMinutes?: number; // Actual duration
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<GardenWateringSession>) {
    Object.assign(this, data);
  }
}

/**
 * Garden Watering Log Entity
 * Logs events during watering session
 */
export class GardenWateringLog {
  id: string;
  sessionId: string;
  eventType: GardenWateringEventType;
  message?: string;
  createdAt: Date;

  constructor(data: Partial<GardenWateringLog>) {
    Object.assign(this, data);
  }
}

/**
 * Garden Watering Event Types
 */
export enum GardenWateringEventType {
  SESSION_STARTED = 'session_started',
  SESSION_COMPLETED = 'session_completed',
  SESSION_STOPPED = 'session_stopped',
  SESSION_FAILED = 'session_failed',
  VALVE_OPENED = 'valve_opened',
  VALVE_CLOSED = 'valve_closed',
  ERROR_OCCURRED = 'error_occurred',
}

/**
 * Garden Watering Statistics Interface
 * Aggregated statistics for dashboard
 */
export interface GardenWateringStatistics {
  totalSessions: number;
  completedSessions: number;
  stoppedSessions: number;
  failedSessions: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  lastWateringDate?: Date;
}
