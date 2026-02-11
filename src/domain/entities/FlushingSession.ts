export class FlushingSession {
  constructor(
    public id: string,
    public userId: string,
    public durationMinutes: number,
    public status: FlushingStatus,
    public startedAt: Date,
    public completedAt?: Date,
    public totalDurationMinutes?: number,
    public notes?: string,
    public createdAt?: Date,
    public updatedAt?: Date,
  ) {}
}

export enum FlushingStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  STOPPED = 'stopped',
  FAILED = 'failed',
}

export class FlushingLog {
  constructor(
    public id: string,
    public sessionId: string,
    public eventType: FlushingEventType,
    public message: string,
    public metadata?: Record<string, any>,
    public createdAt?: Date,
  ) {}
}

export enum FlushingEventType {
  STARTED = 'started',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STATUS_UPDATE = 'status_update',
}

// Statistics
export interface FlushingStatistics {
  totalSessions: number;
  completedSessions: number;
  stoppedSessions: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  lastFlushingDate?: Date;
}
