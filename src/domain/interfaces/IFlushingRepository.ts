import type { FlushingSession, FlushingStatistics } from '../entities/FlushingSession';

export interface IFlushingRepository {
  // Session management
  create(session: Partial<FlushingSession>): Promise<FlushingSession>;
  findById(id: string): Promise<FlushingSession | null>;
  findRunningSession(userId: string): Promise<FlushingSession | null>;
  findByUserId(userId: string, limit?: number): Promise<FlushingSession[]>;
  update(id: string, data: Partial<FlushingSession>): Promise<FlushingSession>;
  
  // Logs
  createLog(log: {
    sessionId: string;
    eventType: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<void>;
  
  // Statistics
  getStatistics(userId: string): Promise<FlushingStatistics>;
}
